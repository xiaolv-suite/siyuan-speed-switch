# 0327. T-7430 片段实验室 Gist 状态恢复弹窗 Escape 兜底与按钮导航契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7430

## 背景与上下文

在代码片段实验室（`mountSnippetStudio`）中，当向 GitHub Gist 写入发生不可恢复的超时或网络异常时，系统会为安全起见将 Gist 设为锁定状态，并提供“Gist 写入状态恢复”（`openGistRecoveryDialog`）弹窗。
此前该弹窗仅聚焦于默认的“保持锁定”按钮，但未在容器级别监听 `Escape` 按键，用户按 Escape 无法退出弹窗；同时两个操作按钮（确认解锁、保持锁定）之间不支持使用左右方向键循环移动。

## 架构决策

1. **容器级 Escape 监听安全退出**：
   - 为 `openGistRecoveryDialog` 的 `dialog.element` 挂载 `Escape` 监听，拦截后调用 `dialog.destroy()` 安全退出。
2. **按钮左右方向键循环流转**：
   - 监听 `ArrowLeft` / `ArrowRight` 按键，在 `[confirm, keepLocked]` 按钮间平滑循环流转焦点。
3. **门禁与测试**：
   - 新增 `tests/snippet-gist-recovery-keyboard.test.cjs`；
   - 负向验证：若 Gist 恢复弹窗缺少 Escape 监听绑定，断言必须精准红。

## 后果与影响

- 强化异常状态恢复界面的全键盘闭环；
- 符合标准模态对话框交互规范。
