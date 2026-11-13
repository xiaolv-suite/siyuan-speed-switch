# ADR 0436：第二面板工作台空态全键盘无障碍 Enter/Space 快速打开组件商店加固（T-7541）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，当用户清空所有小组件卡片（`cells.length === 0`）时，界面渲染 `.sw-home__empty` 容器（展示空态文案、推荐小组件卡片及“打开组件商店”按钮）。此前：
1. 工具栏的 `ArrowDown` 快捷导航仅查询 `.sw-home__cell`，若网格无任何卡片则键盘焦点停滞在工具栏；
2. `.sw-home__empty` 未声明 `tabIndex = 0`，全键盘巡航无法直接聚焦空态区域；
3. 空态区域缺乏直接响应 `Enter` 或 `Space` 快速触发商店或首选操作的能力，且无法在按 `ArrowUp` 时平滑回焦顶栏工具栏。

## 决策

1. **工作台空态容器可聚焦与无障碍强化**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 中：
   - 为 `.sw-home__empty` 显式设置 `tabIndex = 0`；
   - 监听 `empty` 元素上的 `keydown` 事件：
     - 按 `Enter` 或 `Space` 时，自动提取并模拟点击 `.sw-home__empty-store`（或推荐/恢复默认首要按钮），无缝直达小组件商店；
     - 按 `ArrowUp` 时，自动将焦点逆向送回顶栏工具条的第一个有效按钮。

2. **工具栏 ArrowDown 优雅降级**：
   在工具条 `bar` 键盘监听中，当 `root.querySelector(".sw-home__cell")` 为空时，优雅降级为聚焦 `.sw-home__empty` 容器并平滑滚入视口。

3. **视觉焦点环规范**：
   在 `src/styles/_05-settings-widgets.scss` 中为 `.sw-home__empty:focus-visible` 声明：
   - `outline: none;`
   - `border-color: var(--b3-theme-primary);`
   - `box-shadow: 0 0 0 2px color-mix(in srgb, var(--b3-theme-primary) 35%, transparent);`。

## 验证

- **契约测试**：`tests/workbench-empty-keyboard-flow.test.cjs` 5/5 满分通过，涵盖属性设置、Enter/Space/ArrowUp/ArrowDown 流转与负向注入拦截；
- **回流测试**：`tests/workbench-toolbar-and-grid-keyboard-flow.test.cjs` 3/3 保持全绿。
