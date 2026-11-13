# 0349. T-7452 代码片段包导入策略弹窗安全首焦与 ⌘Enter 快捷导入契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7452

## 背景与上下文

在导入外部 JSON 代码片段包时，系统会弹出导入策略选择弹窗（`chooseImportMode`），提供合并（merge）、分叉新建（fork）和全量覆盖（overwrite）选项。
此前该弹窗默认将焦点赋予可能造成覆盖的确认按钮（`confirm.focus()`），存在误触风险；且不支持按 `⌘Enter` / `Ctrl+Enter` 快捷执行导入，两个操作按钮之间也缺少左右方向键流式移动。

## 架构决策

1. **安全默认首焦取消按钮**：
   - 弹窗呈现时自动聚焦安全的取消按钮（`cancel.focus({preventScroll: true})`），避免用户按回车直接触发潜在的覆盖导入。
2. **⌘Enter 快捷导入与按钮左右流**：
   - 监听 `(event.ctrlKey || event.metaKey) && event.key === "Enter"` 快捷以当前选中的导入策略提交；
   - 监听 `ArrowLeft` / `ArrowRight` 在取消和确认导入按钮之间平滑循环流转焦点。
3. **门禁与测试**：
   - 新增 `tests/snippet-import-mode-keyboard.test.cjs`；
   - 负向验证：若弹窗默认聚焦 confirm 按钮或缺少 ⌘Enter 快捷确认，断言必须精准红。

## 后果与影响

- 提高批量导入过程中的数据安全性与键盘无障碍友好度。
