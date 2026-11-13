# ADR 0464：消除工作台全局 Keydown 的 Layout Thrashing 与计算优化（T-7569）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

性能审查中发现：
1. `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `onWorkbenchKeydown` 在每次全局按键事件触发时，优先调用 `isTopmostDialog()`；
2. `isTopmostDialog` 内部首先对全部 `.b3-dialog__container` 进行 `getComputedStyle` 样式过滤，并在后续 `.sort()` 比较器中成对重复计算 `getComputedStyle(element).zIndex`（产生 $O(N \log N)$ 次强制布局回流读取），导致全局任何按键输入（包括与工作台无关的外部按键）均承受巨大的同步布局重排开销；
3. 容器包含判断 `(!dialog.element.contains(target) && !openerElement?.contains(target))` 被排在昂贵的布局检查之后。

## 决策

1. **零成本范围预检提前短路**：
   将 `(!dialog.element.contains(target) && !openerElement?.contains(target))` 移至最前；当事件发生于工作台外部且非原触发源时，直接 0ms 提前返回，绝不触发任何 DOM 树扫描或样式读取；
2. **单层单次 O(N) 极速扫描**：
   在 `isTopmostDialog` 中：
   - 当 `containers.length <= 1` 时，直接返回 `true`，跳过所有 `getComputedStyle`；
   - 彻底废除 `.sort()` 比较器内的多次调用，改为单层线性扫描，每个容器仅读取一次样式，维护最高 z-index，将算法复杂度降至线性 $O(N)$。

## 验证

- **契约测试**：`tests/workbench-keydown-thrashing-elimination.test.cjs` 3/3 满分通过，验证短路执行顺序、单次扫描与负向探针；
- **回流测试**：`tests/workbench-cell-shortcut-keys.test.cjs` 保持全绿。
