# ADR 0456：第二面板工作台小组件卡片聚焦态按 M 键快捷呼出上下文菜单加固（T-7561）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，小组件卡片已支持 `F`（折叠/展开）、`C`（打开配置对话框）、`R`（强制刷新数据）等单键助记键盘流。此前：
1. 呼出卡片右键操作菜单（`openWidgetContextMenu`，包含刷新、配置、移除等聚合动作）必须使用鼠标右键点击或触控长按 500ms；
2. 全键盘用户缺乏快速弹出上下文菜单的单键快捷操作。

## 决策

1. **单键助记按键 M 绑定菜单呼出**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `cell` keydown 监听中：
   - 增加 `m` / `M` 判定；
   - 当卡片获取焦点且按 `m` / `M` 时，读取当前卡片视口矩形 `cell.getBoundingClientRect()`，在卡片水平中央、顶部向下 24px 处精确弹出 `openWidgetContextMenu`；
2. **输入隔离防护**：
   严格受 `key.target === cell` 守卫门控，内部任何输入控件（如输入框、搜索框）输入字符 M 绝不触发菜单。

## 验证

- **契约测试**：`tests/workbench-cell-shortcut-keys.test.cjs` 2/2 满分通过，验证 F/C/M 完整按键矩阵与负向拦截；
- **全量测试**：`tests/workbench-card-longpress-menu.test.cjs` 保持全绿。
