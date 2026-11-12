# 0335. T-7438 工作台健康监控弹窗 Escape 退出与键盘流加固契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7438

## 背景与上下文

在工作台小组件健康详情监控弹窗（`openHomeHealthDetails`）中，此前仅支持在展开诊断预览子浮层时按 Escape 退出预览，但在健康监控列表主弹窗上缺少显式的容器级 `Escape` 键盘监听；当焦点落在非按钮或列表区域时按 Escape 无法安全退出弹窗。

## 架构决策

1. **容器级 Escape 监听安全退出**：
   - 为 `openHomeHealthDetails` 的 `dialog.element` 显式挂载 `keydown` 监听：
     - 当 `event.key === "Escape"` 时，阻止默认行为与冒泡，安全调用 `dialog.destroy()`；
     - 触发由 `destroyCallback` 设定的焦点回退，安全恢复至工作台底栏状态条。
2. **门禁与测试**：
   - 新增 `tests/home-health-dialog-escape.test.cjs`；
   - 负向验证：若弹窗容器未绑定 Escape 退出，断言必须精准红。

## 后果与影响

- 补齐工作台小组件健康监控全生命周期的全键盘安全退出闭环。
