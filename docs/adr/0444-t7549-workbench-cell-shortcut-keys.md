# ADR 0444：第二面板工作台小组件卡片聚焦态全键盘 F/C 键快速折叠与配置加固（T-7549）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，小组件卡片已支持方向键导航、PageUp/Down 跨步与 Enter 直通操作。此前：
1. 折叠操作仅绑定在 Space / `[` / `]`，缺少符合英文记忆习惯的单键助记键 `F`（Fold）；
2. 打开小组件配置对话框需要按 Tab 深入找到齿轮按钮或折叠态下的复杂回退，缺乏直接按 `C`（Configure）极速弹出的单键快捷键。

## 决策

1. **扩展卡片聚焦单键助记流**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `cell` keydown 监听中：
   - 增加 `f` / `F` 判定：当卡片获得焦点时，按 `f` / `F` 直接触发 `.sw__home-module-fold` 按钮的 click 事件，实现折叠/展开；
   - 增加 `c` / `C` 判定：当卡片获得焦点时，按 `c` / `C` 直接触发 `.sw__home-module-config` 或 `.sw-home__cell-tools button` 的 click 事件，极速打开小组件配置对话框；
2. **输入保护**：
   严格受 `key.target === cell` 守卫门控，卡片内部若有输入框或表单控件，按字母键绝不被拦截。

## 验证

- **契约测试**：`tests/workbench-cell-shortcut-keys.test.cjs` 2/2 满分通过，验证 F/C 按键判定与负向探针；
- **回流测试**：`tests/workbench-cell-keyboard-actions.test.cjs` 保持全绿。
