# 0324. T-7427 组件配置表单弹窗 ⌘Enter 快捷保存与 Escape 退出闭环契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7427

## 背景与上下文

在工作台小组件商店中，用户可点击配置按钮进入小组件的个性化配置表单弹窗（`openHomeConfigForm`）。
此前弹窗容器级别未显式监听 `Escape` 键盘退出，且在修改配置字段后用户无法使用通用的 `⌘Enter` / `Ctrl+Enter` 快捷提交表单，必须用鼠标点击“保存”按钮，影响了全键盘流体验。

## 架构决策

1. **⌘Enter 快捷保存提交**：
   - 为 `dialog.element` 挂载 `keydown` 监听：
     - 当捕获 `(ctrlKey || metaKey) && Enter` 且保存按钮非禁用（`!save.disabled`）时；
     - 阻止默认行为与冒泡，直接调用 `save.click()` 执行校验并安全落盘。
2. **Escape 快捷退出安全兜底**：
   - 捕获 `Escape` 按键时，阻止冒泡并调用 `dialog.destroy()` 关闭配置弹窗。
3. **文本框首焦自动全选**：
   - 在 `initialFocusTimer` 中聚焦首个字段时，若首个字段为文本输入框且有内容，自动调用 `first.select()`。
4. **门禁与测试**：
   - 新增 `tests/home-config-form-keyboard.test.cjs`；
   - 负向验证：若 ⌘Enter 缺少 `!save.disabled` 守卫导致未变更时误触保存，断言必须精准红。

## 后果与影响

- 小组件参数配置表单实现快捷键无缝提交与安全退出；
- 保持跨表面表单标准一致性。
