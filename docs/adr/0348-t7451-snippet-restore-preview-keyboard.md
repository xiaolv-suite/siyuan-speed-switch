# 0348. T-7451 代码片段备份恢复预览弹窗 Escape 退出与 ⌘Enter 快捷恢复契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7451

## 背景与上下文

在代码片段实验室中，点击“恢复备份”会调出差异比对与备份恢复预览弹窗（`openRestorePreview`），弹窗展示变更行列表并提供“取消”与“恢复选中的片段”按钮。
此前该弹窗未在 `dialog.element` 上监听 `Escape` 键安全退出，且缺少 `⌘Enter` / `Ctrl+Enter` 快捷恢复提交与两个按钮间的左右方向键流转。

## 架构决策

1. **容器级 Escape 监听安全退出**：
   - 监听 `Escape` 键调用 `close()` 安全销毁弹窗并清理句柄。
2. **⌘Enter 快捷恢复与按钮左右流**：
   - 监听 `⌘Enter` / `Ctrl+Enter` 直接触发 `confirmButton.click()` 提交恢复；
   - 监听 `ArrowLeft` / `ArrowRight` 在取消与确认按钮间平滑循环流转焦点。
3. **门禁与测试**：
   - 新增 `tests/snippet-restore-preview-keyboard.test.cjs`；
   - 负向验证：若恢复预览弹窗缺少 Escape 监听，断言必须精准红。

## 后果与影响

- 强化片段实验室备份恢复操作界面的全键盘闭环。
