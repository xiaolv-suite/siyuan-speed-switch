# ADR 0408：第二面板工作台组件卡片键盘方向键边界巡航导航平滑滚动与指示加固（T-7513）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，用户通过键盘方向键与 Tab 流浏览小组件网格。此前：
1. 卡片间导航仅支持单步左右上下与 `Home` / `End`，当工作台组件较多（例如 10～20 张卡片）时，缺少 `PageUp` / `PageDown` 跨屏翻页步进导航能力；
2. 如果小组件内部包含输入框（如带搜索框的插件或文本框），当焦点在输入框内部时，用户按左右方向键移动光标或按 Home/End 会被外层卡片按键监听劫持，导致跳出当前卡片；
3. `scrollIntoView` 仅传 `{block: "nearest"}`，在多列流式容器或自适应宽度下可能导致横向视口跳动；
4. 顶栏工具栏支持左右循环，但缺乏 `Home` / `End` 直达首尾按钮的能力。

## 决策

1. **工作台网格 PageUp / PageDown 跨步步进**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 中增加 `PageDown`（步进 +4）与 `PageUp`（步进 -4）导航，快速在卡片网格中巡航。

2. **卡片内部输入元素键盘防劫持保护**：
   当 `key.target !== cell` 且 `key.target` 属于 `INPUT`、`TEXTAREA` 或 `SELECT` 时，直接 `return`，确保组件内输入框文本光标自由移动。

3. **双向平滑滚动与横向防抖**：
   卡片聚焦滚动更新为 `{block: "nearest", inline: "nearest"}`，消除横向视口多余平移。

4. **顶栏工具条 Home / End 支持**：
   顶栏工具栏增加 `Home`（直达首个可用按钮）与 `End`（直达末尾按钮）快捷导航。

## 验证

- **契约测试**：`tests/workbench-grid-boundary-cruise-keyboard.test.cjs` 4/4 满分通过，验证 PageUp/Down 步进、输入框保护拦截、滚动选项与负向注入拦截；
- **全量测试**：`tests/workbench-toolbar-and-grid-keyboard-flow.test.cjs` 3/3 绿灯。
