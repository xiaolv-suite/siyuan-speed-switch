# 0328. T-7431 工作台组件健康监控诊断预览浮层 Escape 退出与摘要文本框获焦全选契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7431

## 背景与上下文

在工作台小组件健康详情监控（`openHomeHealthDetails`）弹窗中，点击某条目右侧的“复制诊断”按钮会展开诊断预览浮层（`sw-home-health__preview`），供用户查看诊断详情、手动复制或点击复制按钮。
此前该浮层未监听 `Escape` 按键，用户按 Escape 无法退出预览返回列表；且只读的诊断摘要文本框（`sw-home-health__summary`）在获焦时未自动全选，用户手动全选复制不够便捷；同时缺少 `⌘Enter` / `Ctrl+Enter` 快捷复制提交。

## 架构决策

1. **浮层级 Escape 退出与回焦**：
   - 为 `preview` 挂载 `keydown` 监听：
     - 捕获 `Escape` 时阻止默认行为与冒泡，触发 `cancel.click()` 销毁预览浮层并安全回焦触发按钮。
2. **快捷复制与摘要框获焦全选**：
   - 监听 `⌘Enter` / `Ctrl+Enter` 直接触发 `copy.click()` 执行剪贴板写入；
   - 摘要文本框 `summaryField` 绑定 `focus` 自动 `select()`，进入即全选。
3. **门禁与测试**：
   - 新增 `tests/home-health-diagnostic-preview-keyboard.test.cjs`；
   - 负向验证：若浮层缺少 Escape 监听绑定，断言必须精准红。

## 后果与影响

- 极大提升诊断报告查看、复制与返回的键盘操作闭环；
- 符合桌面控件交互标准。
