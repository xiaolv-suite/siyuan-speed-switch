# ADR 0424：第二面板工作台小组件卡片标题栏折叠指示器 hover 与 focus 动效触感加固（T-7529）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，各小组件卡片标题栏包含折叠指示按钮（`.sw__home-module-fold`），用于就地收起/展开卡片内容。此前：
1. 折叠按钮仅声明了基础几何尺寸与内边距，缺少鼠标悬浮（`:hover`）高亮底色与微缩放动效；
2. 缺乏键盘聚焦（`:focus-visible`）焦点环，键盘 Tab 遍历至折叠按钮时缺乏明确焦点视觉指示；
3. 缺少按压（`:active`）物理触感反馈。

## 决策

1. **悬浮与按压微动效**：
   在 `src/styles/_09-store-preview-polish.scss` 中为 `.sw-home .sw-home__cell .sw__home-module-fold` 增加：
   - `border-radius: var(--sw-radius-sm, 6px);`
   - `transition: background-color, color, transform, box-shadow;`
   - `&:hover`: 主色前景色、12% 主色半透明底色与 `transform: scale(1.08)`；
   - `&:active`: `transform: scale(0.94)` 弹性微缩放。

2. **无障碍键盘焦点环**：
   声明 `&:focus` 与 `&:focus-visible`：
   `box-shadow: 0 0 0 2px color-mix(in srgb, var(--b3-theme-primary) 35%, transparent);`，确保纯键盘操作时焦点清晰可见。

## 验证

- **契约测试**：`tests/workbench-module-fold-touch.test.cjs` 2/2 满分通过，验证 hover/focus/active 声明与负向注入拦截；
- **全量样式测试**：样式回归测试全数通过。
