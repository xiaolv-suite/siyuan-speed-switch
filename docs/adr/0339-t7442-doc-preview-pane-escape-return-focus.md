# 0339. T-7442 文档预览窗格 Escape 回焦搜索卡片双向键盘流闭环契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7442

## 背景与上下文

在切换器与文档搜索界面中，当用户使用键盘 Tab 键进入右侧文档预览窗格（`sw__doc-preview`）或使用页内查找条查找后，如果想安全返回左侧搜索结果列表继续浏览，此前缺少统一的键盘回退通道。用户按 Escape 时如果查找条未展开，事件直接被忽略或穿透，导致焦点滞留在预览窗格内。

## 架构决策

1. **预览窗格容器级 Escape 监听**：
   - 在 `mountDocPreviewPane` 中为 `pane` 容器监听 `keydown`；
   - 当 `event.key === "Escape"` 且页内查找条处于隐藏态时：
     - 拦截并阻止默认行为与冒泡；
     - 读取 `docPreviewLastItems.get(scrollElement)` 获取触发当前预览的目标卡片或结果行；
     - 若该元素仍连接在 DOM 中，将焦点精准赋予该元素（`focus({preventScroll: true})`）；
     - 若已断开，兜底回焦至 `scrollElement` 首个可用条目。
2. **门禁与测试**：
   - 新增 `tests/doc-preview-pane-escape-return-focus.test.cjs`；
   - 负向验证：若未在 pane 绑定 Escape 回焦，断言必须精准红。

## 后果与影响

- 彻底打通左侧搜索结果卡片与右侧预览窗格之间的全键盘双向流转闭环；
- 符合 WCAG 模态与非模态辅助工作区焦点回退无障碍规范。
