# 0322. T-7425 文档预览窗格页内查找框阶梯式 Escape 清空与聚焦自动全选加固契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7425

## 背景与上下文

在切换器与文档搜索的右侧常驻预览窗格（`sw__doc-preview`）中，用户可通过 `Ctrl/Cmd + F` 或点击查找按钮唤出页内高亮查找条（`sw__doc-preview-find`）。
此前查找输入框获焦时不会自动选中旧词，且按 `Escape` 键时无视输入框是否有未提交的关键词，直接整体关闭查找条，导致用户想要清空检索重新输入时操作被打断。

## 架构决策

1. **查找输入框获焦自动全选**：
   - 为查找条输入框（`sw__doc-preview-find-input`）增加 `focus` 监听：
     - 若 `input.value` 存在内容，直接调用 `input.select()`。
2. **Escape 键阶梯式调度**：
   - 监听查找框的 `Escape` 按键：
     - 若 `input.value` 非空，清空输入框并即时调用 `runDocPreviewFind` 清除匹配高亮；
     - 若 `input.value` 已为空，调用 `setDocPreviewFindOpen(false)` 收起查找条，安全恢复视图。
3. **门禁与测试**：
   - 新增 `tests/doc-preview-find-keyboard.test.cjs`；
   - 负向验证：若有输入时按 Escape 仍直接关闭查找条，断言必须精准红。

## 后果与影响

- 统一预览窗格页内查找与主搜索框、代码编辑器的阶梯 Escape 交互心智；
- 极大提升文档预览内定位与重搜效率。
