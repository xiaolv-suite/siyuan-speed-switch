# 0317. T-7420 设置中心配置差异与文档集差异弹窗 Escape 关闭与安全首焦契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7420

## 背景与上下文

在设置中心中，有两个模态对比弹窗：
1. **文档集历史版本差异弹窗（`openDocumentSetDiffDialog`）**；
2. **配置包导入差异预览弹窗（`openConfigPackDiffDialog`）**。
此前两处模态对话框容器级别均未显式监听 `Escape` 按键，且打开后焦点未主动置于取消按钮，用户需通过鼠标点击取消按钮或宿主顶栏关闭，全键盘退出不流畅。

## 架构决策

1. **容器级 Escape 监听与拦截**：
   - 在 `openDocumentSetDiffDialog` 与 `openConfigPackDiffDialog` 中：
     - 为 `dialog.element` 挂载 `keydown` 监听；
     - 捕获 `Escape` 时阻止事件默认行为及冒泡，调用 `dialog.destroy()` 安全退出。
2. **安全首焦自动定位**：
   - 弹窗构建完成后自动执行 `cancelBtn.focus({preventScroll: true})`；
   - 保证焦点落在无副作用的安全动作上，可直接按 Enter 或 Space 关闭，也可按 Tab 切换到提交动作。
3. **门禁与测试**：
   - 新增 `tests/diff-dialogs-escape-and-focus.test.cjs`；
   - 负向验证：若差异弹窗缺少 Escape 监听或未声明 cancelBtn 聚焦，断言必须精准红。

## 后果与影响

- 统一差异对比弹窗的全键盘退出与安全首焦；
- 遵循 WCAG 模态框无障碍标准。
