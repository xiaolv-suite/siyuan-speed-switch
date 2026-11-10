# 0316. T-7419 片段实验室离开与冲突确认弹窗 Escape 兜底与全键盘导航契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7419

## 背景与上下文

在代码片段实验室（`mountSnippetStudio`）中，有两个关键确认弹窗：
1. **未保存离开弹窗（`openLeaveDialog`）**：保存/放弃/取消三选一；
2. **版本冲突检测弹窗（`openConflictDialog`）**：继续编辑/另存副本/放弃重载/取消四选一。
此前冲突弹窗容器级别未显式挂载 `Escape` 键盘监听，且两处弹窗内的操作按钮之间无法通过左右方向键平滑循环移动，降低了全键盘流体验。

## 架构决策

1. **冲突弹窗显式 Escape 兜底取消**：
   - 为 `openConflictDialog` 的 `dialog.element` 挂载 `Escape` 监听：
     - 触发最安全的 `cancelButton.click()` 退出冲突对话框，回焦至代码编辑器。
2. **多动作按钮左右方向键循环移动**：
   - 在 `openLeaveDialog` 与 `openConflictDialog` 的 keydown 处理中：
     - 当捕获 `ArrowLeft` / `ArrowRight` 时，在未禁用的动作按钮集合内循环推进焦点；
     - `nextIdx = (idx + delta + total) % total`。
3. **门禁与测试**：
   - 新增 `tests/snippet-leave-and-conflict-keyboard.test.cjs`；
   - 负向验证：若冲突弹窗缺少 Escape 监听绑定，断言必须精准红。

## 后果与影响

- 强化片段安全确认界面的全键盘闭环；
- 符合 WCAG 模态对话框交互规范。
