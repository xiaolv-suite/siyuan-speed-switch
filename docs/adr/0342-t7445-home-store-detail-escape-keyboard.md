# 0342. T-7445 组件商店卡片 Enter 选中与详情窗格 Escape 回焦双向流契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7445

## 背景与上下文

小组件商店（`openHomeWidgetStore`）采用左目录（搜索、分类、卡片列表）与右详情窗格的主从布局。
此前当用户使用方向键导航至卡片锚点时，按 Enter 或 Space 无法直接触发卡片选中与详情渲染；且当焦点进入右侧详情窗格（例如查看配置、操作添加按钮）后，按 Escape 无法退出详情返回目录，导致键盘操作闭环断裂。

## 架构决策

1. **卡片 Enter/Space 选中响应**：
   - 在 `bindStoreCardKeyboard` 中拦截 `Enter` / `Space`：
     - 当事件目标即为卡片本身时，阻止默认滚动并调用 `card.click()`，即时选中组件并在详情窗格渲染完整卡片与预览。
2. **详情窗格 Escape 回焦目录卡片**：
   - 在 `detailPane` 监听 `keydown`：
     - 捕获 `Escape` 时阻止冒泡与默认行为，优先寻找目录中处于选中态的卡片（`.sw-home-store__card.is-selected`）；
     - 将焦点安全赋予该卡片（`selectedCard.focus({preventScroll: true})`），打通主从视图双向全键盘回路。
3. **门禁与测试**：
   - 新增 `tests/home-store-detail-escape-keyboard.test.cjs`；
   - 负向验证：若详情窗格缺少 Escape 监听，断言必须精准红。

## 后果与影响

- 极大提升组件商店主从窗格的全键盘交互顺畅度与无障碍支持。
