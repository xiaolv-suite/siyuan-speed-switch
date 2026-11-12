# ADR 0465：优化 clampOversizedIcons 读写交替回流与按需批处理（T-7570）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在性能审查中发现：
1. `src/util.js` 的 `clampOversizedIcons` 函数负责遍历所有 `<svg>` 图标，在同一个 `forEach` 循环体内对每个图标先执行 `svg.getBoundingClientRect()`（强制样式重算与布局读取），若超标立即执行 `setAttribute` 与 `style.setProperty`（使 DOM 布局失效）；
2. 循环中下一个 `<svg>` 再次读取 `getBoundingClientRect()` 时，浏览器被迫立即刷新几何信息，产生严重的读写交替回流（Layout Thrashing）；
3. `home-config-form` 中的 MutationObserver 每次触发直接同步调用 `clampOversizedIcons`，缺乏微任务或动画帧级别的防抖保护。

## 决策

1. **两阶段读写分离批处理**：
   在 `src/util.js` 中将 `clampOversizedIcons` 重构为明确的两阶段管道：
   - **Phase 1（读取阶段）**：纯读取所有 `<svg>` 的 `getBoundingClientRect()`，检查匹配与目标尺寸，将其收集到 `toFix` 数组，期间绝对不产生任何 DOM 写入；
   - **Phase 2（写入阶段）**：统一批量写入属性与内联样式，使布局失效操作集中在末尾，消除多轮交替重排。
2. **配置弹窗 RAF 防抖**：
   在 `src/home-config-form.ts` 与 `src/home-config-form.js` 中，为 `iconClampObserver` 增加 `requestAnimationFrame` 防抖合并，并在表单销毁时可靠取消动画帧。

## 验证

- **契约测试**：`tests/icon-clamping-batching.test.cjs` 3/3 满分通过，验证读写分离与 RAF 防抖；
- **回流测试**：`tests/workbench-keydown-thrashing-elimination.test.cjs` 保持全绿。
