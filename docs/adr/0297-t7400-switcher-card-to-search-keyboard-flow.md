# 0297. T-7400 切换器首行卡片 ArrowUp 逆向直达搜索框全键盘流闭环契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7400

## 背景与上下文

在切换器（第一面板）中，用户在搜索框聚焦时按下 `ArrowDown` 键，焦点会平滑下移至首张页签卡片或首条结果行；
然而此前当焦点位于首行页签卡片（`focusIndex - colCount < 0`）时，按下 `ArrowUp` 键的处理为 `Math.max(focusIndex - colCount, 0)`，导致焦点始终硬卡在第 0 项，无法向上交还给顶部的搜索输入框（`sw__search`）。这造成了全键盘操作流的单向卡死。

## 架构决策

1. **双向键盘流闭环**：
   - 在 `src/index.ts` 与 `src/index.js` 的卡片网格 keydown 处理中：
     - 当按下 `ArrowUp` 且没有水平流相邻元素时，检测当前卡片是否已处于首行（`focusIndex - colCount < 0`）；
     - 若处于首行，向上寻找当前工作面所属的 `.sw__search` 输入框，并直接调用 `searchInput.focus()` 交还焦点；
     - 若未找到输入框，回退为聚焦第 0 张卡片。
2. **门禁与契约测试**：
   - 新增 `tests/switcher-card-to-search-keyboard-flow.test.cjs`；
   - 负向验证：若卡片在首行时依然硬锁在第 0 张卡片而不交还焦点给输入框，断言必须精准红。

## 后果与影响

- 彻底打通“搜索框 ➔ (ArrowDown) ➔ 首行卡片 ➔ (ArrowUp) ➔ 搜索框”的双向全键盘无缝直达体验；
- 符合标准无障碍键盘交互规范（WAI-ARIA Pattern）。
