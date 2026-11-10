# ADR 0462：次级弹窗全量接入悬浮球避让与 onToggleAction 空指针防御（T-7567）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码质量排查中发现：
1. 第二面板（工作台主弹窗）与快速捕获弹窗（`openQuickCapture`）此前在创建时未调用 `suspendFABForDialog()`，导致在模态弹窗开启期间，悬浮球仍然浮于表单和按钮上方，造成视觉杂乱并引发误触；
2. 浮动球动作开关处理函数 `onToggleAction` 直接执行 `current.actions[surface].map(...)`，未对 `current` 或 `actions[surface]` 进行空值校验，当配置处于初始化空态或不完全时直接抛出 `TypeError` 崩溃。

## 决策

1. **工作台与快速捕获接入 FAB 避让**：
   - 在 `src/second-panel-ui.ts` / `src/second-panel-ui.js` 的 `openSecondPanel` 构造时调用 `suspendFABForDialog()`，并在 `destroyCallback` 中成对调用 `releaseFab()`；
   - 在 `src/index.ts` / `src/index.js` 的 `openQuickCapture` 构造时调用 `suspendFABForDialog()`，并在 `destroyCallback` 中成对调用 `releaseFab()`。
2. **浮动球动作映射安全兜底**：
   - 提取 `const surfaceActions = current?.actions?.[surface] || []`；
   - 杜绝空指针异常，确保初次加载与默认配置状态下平稳写入。

## 验证

- **契约测试**：`tests/fab-suspension-and-null-safety.test.cjs` 4/4 满分通过，验证工作台与快速捕获的 FAB 挂起释放与空指针防御；
- **类型检查**：`pnpm exec tsc --noEmit` 0 错误。
