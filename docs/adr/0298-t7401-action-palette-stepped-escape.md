# 0298. T-7401 动作画板（⌘K）阶梯式 Escape 清空机制与契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7401

## 背景与上下文

在次级动作画板（⌘K / Action Palette）中，此前只要按下 `Escape` 键，画板便会立即无条件关闭。
但在高频键盘操作中，当用户输入了部分查询关键词（例如输入错误或想要更换命令）并下意识按下 `Escape` 时，用户的意图通常是“清空当前搜索词以重新检索”，而非直接退出画板。直接退出会导致画板关闭、焦点丢失，用户不得不再次按 ⌘K 重新唤出，造成严重的体验挫败。

## 架构决策

1. **状态机阶梯式调度**：
   - 在 `src/action-palette-navigation.js` 中新增意图 `PALETTE_KEY_ACTIONS.CLEAR`；
   - 当捕获 `Escape` 按键时：
     - 若 `state.query` 非空（`query.length > 0`），返回 `intent: CLEAR`，清空 `query`，重置 `filteredActions` 为全量动作列表，重置选中光标 `selectedIndex: 0`；
     - 仅当 `state.query` 已经为空时，才返回 `intent: CLOSE` 关闭画板。
2. **UI 视图同步与输入框重置**：
   - 在 `src/action-palette-ui.js` 中捕获 `CLEAR` 意图，直接同步清空 `searchInput.value = ""` 并重绘动作列表；
   - 保证焦点稳定停留在搜索框内。
3. **门禁与测试**：
   - 新增 `tests/action-palette-stepped-escape-contract.test.cjs`；
   - 负向验证：若输入非空时按 Escape 依然直接触发 CLOSE 意图，断言必须精准红。

## 后果与影响

- 动作画板与主切换器保持一致的阶梯式 Escape 优雅心智；
- 极大提升纯键盘流检索动作时的容错度与流畅感。
