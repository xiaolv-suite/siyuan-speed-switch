# 0311. T-7414 保存搜索编辑弹窗表单获焦全选与 Enter 快捷保存闭环契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7414

## 背景与上下文

在文档搜索过滤视图中，用户可点击“保存的搜索”并打开编辑弹窗（`openSavedSearchEditor`）修改名称、查询语句或限制笔记本范围。
此前在输入框中获焦时不会自动选中旧文本，需手动反复删除；且在修改完查询或名称后按 `Enter` 键无法直接提交保存，必须按 Tab 寻址或鼠标点击保存按钮，破坏了全键盘流体验。

## 架构决策

1. **输入框获焦自动全选**：
   - 在 `src/doc-search-ui.ts` 与 `src/doc-search-ui.js` 中：
     - 为名称框（`nameField.input`）与查询框（`queryField.input`）挂载 `focus` 事件：
     - 若输入框非空，自动调用 `field.select()`。
2. **Enter 回车快捷保存**：
   - 监听名称框与查询框的 `keydown` 事件：
     - 当捕获 `Enter` 键且保存按钮可用（`!saveBtn.disabled`）且非输入法拼音候选时；
     - 阻止默认回车行为，直接触发 `saveBtn.click()` 提交保存并关闭弹窗。
3. **门禁与测试**：
   - 新增 `tests/saved-search-editor-keyboard.test.cjs`；
   - 负向验证：若 Enter 在 saveBtn 禁用时依然误提交，断言必须精准红。

## 后果与影响

- 保存搜索编辑体验更加灵敏敏捷；
- 遵循通用表单全键盘交互模式。
