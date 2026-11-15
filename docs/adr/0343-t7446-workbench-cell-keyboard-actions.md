# 0343. T-7446 工作台编辑态单元格 Enter 快捷配置与 Delete 快捷移除契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7446

## 背景与上下文

在工作台（第二面板）编辑布局状态下，每个小组件卡片单元格拥有 `tabIndex = 0`，支持方向键移动焦点与 `Ctrl/Cmd + 方向键` 重排。
此前聚焦在单元格锚点时，若用户希望直接打开该组件的配置弹窗或从布局中移除组件，只能手动按 Tab 寻找内部的小把手按钮。缺少直接在单元格上的 `Enter` 快捷配置与 `Delete` / `Backspace` 快捷移除支持。

## 架构决策

1. **Enter 快捷配置**：
   - 当事件目标即为单元格本身时，按 `Enter` 自动寻址其工具栏首个配置按钮并触发点击，秒级弹出配置窗口。
2. **Delete / Backspace 快捷移除**：
   - 当事件目标即为单元格本身时，按 `Delete` 或 `Backspace` 调用 `this.removeHomeInstance(inst.instanceId)` 并重新渲染面板，安全快捷移除。
3. **门禁与测试**：
   - 新增 `tests/workbench-cell-keyboard-actions.test.cjs`；
   - 负向验证：若单元格未绑定 Delete / Backspace 移除逻辑，断言必须精准红。

## 后果与影响

- 极大提升工作台编辑模式下的全键盘布局管理效率。
