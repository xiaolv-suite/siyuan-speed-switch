# 0352. T-7455 动作画板键盘状态机扩展 Home/End 首末项快速跳转契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7455

## 背景与上下文

次级动作画板（Raycast 风格 ⌘K 面板）在动作项数量较多时，用户通常依赖上下方向键移动光标。此前导航状态机（`action-palette-navigation.js`）支持了 `ArrowDown` / `ArrowUp` 循环包裹（wrap-around），但缺少快速直达动作列表首项与末项的 `Home` 与 `End` 调度意图。

## 架构决策

1. **状态机扩展 Home 与 End 意图**：
   - 当捕获 `event.key === "Home"` 时，将 `selectedIndex` 置为 `0`（非空列表）；
   - 当捕获 `event.key === "End"` 时，将 `selectedIndex` 置为 `filteredActions.length - 1`（非空列表）；
   - 返回标准 `PALETTE_KEY_ACTIONS.NAVIGATE` 意图，通知渲染层平滑滚动到对应 DOM 节点。
2. **纯状态机无副作用保障**：
   - 保持纯函数无 DOM 依赖，空列表安全兜底为 `-1`。
3. **门禁与测试**：
   - 新增 `tests/action-palette-home-end-navigation.test.cjs`；
   - 负向验证：若状态机未识别 Home/End 按键，断言必须精准红。

## 后果与影响

- 动作画板键盘导航体验更符合专业效率工具操作习惯。
