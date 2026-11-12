# ADR 0398：代码片段实验室冲突面板全键盘流与操作按钮无障碍加固（T-7503）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）在保存发生冲突时会弹出冲突解决对话框（`openConflictDialog`），展示最新基线与本地草稿的差异行。此前：
1. 差异容器（`.sw-studio__conflict-diff`）不可通过键盘聚焦，全键盘用户无法借助方向键滚动检视多达数十行的代码差异；
2. 缺乏对话框焦点环（Focus Trap）闭环，按下 `Tab` 会泄漏焦点到遮罩下方的背部页面控件。

## 决策

1. **差异内容容器无障碍化与键盘滚动**：
   - 为 `diffBox` 声明 `tabIndex = 0`、`role="region"` 与双语 `aria-label`；
   - 监听 `ArrowDown`/`ArrowUp`/`PageDown`/`PageUp` 键盘滚动，并在 `src/styles/_snippet-studio.scss` 中声明 `:focus-visible` 2px 轮廓环。

2. **冲突弹窗 Tab / Shift+Tab 焦点环捕获**：
   - 监听弹窗 `keydown` 事件中的 `Tab` 键，将 `diffBox` 与操作按钮（继续编辑、创建副本、放弃重载、取消）组合为有序焦点环，首尾平滑循环，彻底消除焦点逃逸。

## 验证

- **契约测试**：`tests/snippet-conflict-keyboard-flow.test.cjs` 3/3 满分通过，验证 tabIndex、滚动监听、Tab 焦点捕获与 SCSS 伪类；
- **负向验证**：修改 tabIndex 属性断言注入故障，确认测试精准拦截，还原后通过。
