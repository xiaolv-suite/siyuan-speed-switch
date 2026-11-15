# 0309. T-7412 动作画板搜索框获焦自动全选与空匹配结果 Enter 自愈清空契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7412

## 背景与上下文

在次级动作画板（⌘K）中，用户快速过滤与执行动作。
此前用户多次唤出或点击搜索框时，若已有检索词，无法自动全选文本，必须按 Backspace 清空；
当输入的搜索词在当前画板内无任何匹配结果时（`filteredActions.length === 0`），按 `Enter` 键静默无响应，用户卡在空列表结果中。

## 架构决策

1. **搜索框获焦自动全选**：
   - 在 `src/action-palette-ui.js` 中为 `searchInput` 绑定 `focus` 事件：
     - 若 `searchInput.value` 存在内容，直接调用 `searchInput.select()`。
2. **空匹配结果 Enter 自愈清空恢复**：
   - 在 `src/action-palette-navigation.js` 的 `dispatchPaletteKey` 处理中：
     - 当捕获 `Enter` 键且无当前选中动作（`!targetAction`）时：
     - 若存在检索词（`state.query.length > 0`），派发 `PALETTE_KEY_ACTIONS.CLEAR` 意图，自动清空检索词并恢复全量默认动作列表。
3. **门禁与测试**：
   - 新增 `tests/action-palette-search-select-and-enter-clear.test.cjs`；
   - 负向验证：若空匹配时按 Enter 仍为 NOOP 且不清空，断言必须精准红。

## 后果与影响

- 动作画板键盘操作流更加丝滑高效；
- 与悬浮球抽屉、主切换器搜索框保持一致的空态自愈心智。
