# ADR 0412：第二面板工作台小组件配置表单重置与保存操作全键盘流加固（T-7517）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，用户点击组件工具栏的齿轮图标会打开小组件配置表单（`openHomeConfigForm`）。此前：
1. 底部的“恢复默认”、“取消”与“保存”按钮之间缺少左右方向键循环对焦流；
2. 用户在表单常规单行 `INPUT` 框修改数值或文本后，必须通过鼠标点击或按 `Ctrl+Enter` 才能保存，未支持单行输入框直接按 `Enter` 快速提交；
3. 缺少一键重置当前表单默认值的键盘快捷方式（如 `Alt+R`）；
4. 操作按钮缺少无障碍 `aria-label` 明确标识。

## 决策

1. **按钮组左右方向键循环与 Enter/Space 原生激发**：
   在 `src/home-config-form.ts` 与 `src/home-config-form.js` 的 `keydown` 监听中补充 `ArrowLeft` / `ArrowRight` 循环，聚焦在按钮组时顺畅移动焦点。

2. **单行输入框 Enter 极速提交**：
   支持在单行 `INPUT` 输入框（排除 textarea）按下 `Enter` 且 `!save.disabled` 时直接触发保存，符合大众表单操作直觉。

3. **Alt+R 快捷恢复默认**：
   支持按下 `Alt+R` 快捷触发恢复默认，并继承既有的二次确认与字段重置逻辑。

4. **无障碍语义补全**：
   为 `reset`、`cancel` 与 `save` 按钮分别补充 `aria-label` 属性。

## 验证

- **契约测试**：`tests/home-config-form-keyboard-flow.test.cjs` 4/4 满分通过，包含按钮方向键流、单行回车保存、Alt+R 快捷键与负向注入拦截；
- **全量测试**：`tests/home-config-form-keyboard.test.cjs` 2/2、`tests/home-config-form-confirm-shake.test.cjs` 2/2 绿灯。
