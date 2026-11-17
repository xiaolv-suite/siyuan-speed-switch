# ADR 0440：第二面板工作台小组件卡片标题栏双击快速切换折叠/展开手势加固（T-7545）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，小组件卡片支持折叠与展开功能（通过卡片顶栏右侧的折叠按钮 `.sw__home-module-fold`，或卡片聚焦时按 Space/Enter/[/]）。此前：
1. 鼠标用户若要切换折叠状态，必须精确瞄准右上角仅 22px 宽度的折叠小箭头按钮；
2. 缺乏桌面端窗口与面板常见的“双击标题栏折叠/展开”便捷手势；
3. 标题栏未设置 `user-select: none`，快速点击容易意外选中文本。

## 决策

1. **标题栏双击切换手势**：
   在 `src/home-view.js` 中，当 `options.onToggle` 可用时，为 `heading`（`.sw__home-module-header`）绑定 `dblclick` 事件监听，直接触发 `options.onToggle(view)`；
2. **交互子控件防误触守卫**：
   若双击事件来源于标题栏内部的交互控件（`button`、`input`、`select`、`textarea`、`a` 等），则放行原生事件并不触发折叠；
3. **防止选中文本**：
   在 `src/styles/_05-settings-widgets.scss` 中为 `.sw__home-module-header` 声明 `user-select: none`，消除双击时的文本选择闪烁。

## 验证

- **契约测试**：`tests/workbench-header-dblclick-toggle.test.cjs` 3/3 满分通过，验证双击绑定、子控件守卫、样式防选区与负向探针；
- **回流测试**：`tests/workbench-module-fold-touch.test.cjs` 保持全绿。
