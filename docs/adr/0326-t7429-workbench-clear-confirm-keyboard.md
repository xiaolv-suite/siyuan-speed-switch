# 0326. T-7429 工作台清空布局确认弹窗安全首焦与 Escape 退出契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7429

## 背景与上下文

在第二面板工作台编辑态中，工具栏提供“清空全部”危险操作按钮（`.sw-home__clear-btn`），点击后呼出二次确认弹窗（`confirmDialog`）。
此前该确认弹窗未显式监听 `Escape` 键盘退出，且弹窗打开后未主动聚焦在具有安全兜底语义的“取消”按钮上，用户需通过鼠标定位取消，降低了破坏性操作的安全防误触体验。

## 架构决策

1. **安全首焦主动定位**：
   - 在弹窗构建挂载后，自动执行 `cancelBtn.focus({preventScroll: true})`；
   - 保证焦点默认落在无副作用的安全动作上，按 Enter 或 Space 即可快速安全退出。
2. **显式 Escape 键兜底退出**：
   - 为 `confirmDialog.element` 挂载 `keydown` 监听：
     - 捕获 `Escape` 时阻止冒泡并调用 `confirmDialog.destroy()` 安全退出。
3. **门禁与测试**：
   - 新增 `tests/workbench-clear-confirm-keyboard.test.cjs`；
   - 负向验证：若清空确认弹窗未聚焦取消按钮，断言必须精准红。

## 后果与影响

- 为工作台破坏性清空动作增加全键盘防误触屏障；
- 遵循 WCAG 破坏性模态安全设计标准。
