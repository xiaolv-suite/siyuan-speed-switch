# 0345. T-7448 片段商店投稿指引弹窗 Escape 兜底与按钮左右方向键流契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7448

## 背景与上下文

在代码片段实验室（`mountSnippetStudio`）的片段商店中，点击“投稿片段”会展开投稿指引浮层（`openSubmitGuide`），浮层包含“复制 JSON 格式”与“取消”两个操作按钮。
此前该浮层未监听 `Escape` 按键，缺少首焦安全取消按钮，且不支持在两个按钮之间使用左右方向键流式移动焦点。

## 架构决策

1. **容器级 Escape 监听安全退出**：
   - 为 `overlay` 挂载 `keydown` 监听，拦截后调用 `overlay.remove()` 安全退出并阻止冒泡。
2. **按钮左右方向键循环导航与默认首焦**：
   - 监听 `ArrowLeft` / `ArrowRight` 在 `[copyJsonBtn, closeBtn]` 按钮间平滑循环流转焦点；
   - 浮层挂载后默认安全聚焦在 `closeBtn`。
3. **门禁与测试**：
   - 新增 `tests/snippet-submit-guide-keyboard.test.cjs`；
   - 负向验证：若投稿指引浮层缺少 Escape 监听绑定，断言必须精准红。

## 后果与影响

- 强化片段实验室商店投稿界面的全键盘闭环；
- 符合桌面二级浮层标准交互规范。
