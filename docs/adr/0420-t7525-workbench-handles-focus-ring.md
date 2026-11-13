# ADR 0420：第二面板工作台小组件网格拖拽与调整把手键盘焦点样式强化（T-7525）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，小组件卡片支持拖拽重排与右下角网格缩放把手（`.sw-home__cell-resize-handle`），且支持通过键盘 Tab 聚焦与按键调整。此前：
1. 调整把手与拖拽把手仅设置了 `&:hover` 悬停动效与 `:active` 按压动效；
2. 当用户通过键盘焦点遍历到调整把手或拖拽把手时，缺少显式的高可见度焦点环指示，无法明确确认当前焦点停留位置；
3. 不符合 WCAG 2.2 操作把手键盘焦点可见性规范。

## 决策

1. **调整把手键盘焦点环强化**：
   在 `src/styles/_05-settings-widgets.scss` 为 `.sw-home__cell-resize-handle` 声明 `&:focus` 与 `&:focus-visible`：
   `box-shadow: 0 0 0 2px color-mix(in srgb, var(--b3-theme-primary) 35%, transparent);` 并保持 `scale(1.15)` 醒目微缩放。

2. **拖拽把手与工具按钮焦点环对齐**：
   为 `.sw-home .sw-home__tool--drag` 与 `.sw-home__tool` 补充统一的主题主色 2px 柔和微光焦点环，确保全键盘操作下的清晰感知。

## 验证

- **契约测试**：`tests/workbench-handles-focus-ring.test.cjs` 2/2 满分通过，验证调整把手、拖拽把手与工具按钮焦点环声明及负向注入拦截；
- **全量样式测试**：样式回归测试全数通过。
