# 0340. T-7443 悬浮球更多抽屉列表 Home/End/Escape 全键盘导航加固契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7443

## 背景与上下文

在全局悬浮球更多操作抽屉（`sw__floating-ball-more-list`）中，此前虽然支持通过 `ArrowDown` 与 `ArrowUp` 循环移动焦点，并在首项按 `ArrowUp` 回焦搜索框，但在动作列表较长时缺少快速触达首项与末项的 `Home` / `End` 支持；并且当焦点落在列表动作按钮上时，缺少显式的 `Escape` 监听退出抽屉并回焦触发器的闭环。

## 架构决策

1. **Home / End 快速跳转**：
   - 在 `listHost` 的 `keydown` 监听中拦截 `Home` 与 `End`：
     - `Home`：直接将焦点与视口滚动对齐至可见列表首项（`visibleButtons[0]`）；
     - `End`：直接将焦点与视口滚动对齐至可见列表末项（`visibleButtons[visibleButtons.length - 1]`）。
2. **Escape 退出并安全回焦**：
   - 监听 `Escape` 键，阻止事件传播并调用 `closeMore({restoreFocus: true})`，将焦点安全归还至原悬浮球触发器。
3. **门禁与测试**：
   - 新增 `tests/floating-ball-more-keyboard-nav.test.cjs`；
   - 负向验证：若列表中缺少 Escape 或 Home/End 监听，断言必须精准红。

## 后果与影响

- 极大提升悬浮球更多操作面板全键盘操作效率与无障碍闭环；
- 符合桌面控件导航标准规范。
