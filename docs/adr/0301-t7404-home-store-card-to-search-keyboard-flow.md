# 0301. T-7404 小组件商店卡片列表 ArrowUp 逆向直达搜索框与 Escape 闭环契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7404

## 背景与上下文

在第二面板小组件商店（`sw-home-store`）中，此前搜索框支持按下 `ArrowDown` 或 `Enter` 键平滑下移聚焦首张可见组件卡片。
但当焦点处于卡片列表的首张卡片（`index === 0`）时，按下 `ArrowUp` 键会循环翻滚至列表末尾，无法逆向回到顶部的搜索输入框（`.sw-home-store__search input`）；此外，卡片聚焦时缺少对 `Escape` 键的响应支持，无法一键清空搜索词。

## 架构决策

1. **首卡逆向直达搜索框**：
   - 在 `src/home-store-ui.ts` 与 `src/home-store-ui.js` 的 `bindStoreCardKeyboard` 处理中：
     - 当捕获 `ArrowUp` 或 `ArrowLeft` 且当前处于首张卡片（`index === 0`）时，向上寻址 `.sw-home-store__search input`，并执行 `searchInput.focus()`；
     - 彻底打通“商店搜索框 ➔ (ArrowDown/Enter) ➔ 首张卡片 ➔ (ArrowUp) ➔ 商店搜索框”的双向键盘直达流。
2. **卡片列表 Escape 阶梯式清空**：
   - 当卡片处于焦点状态时按 `Escape`，若搜索框有输入内容，调用 `clearSearchButton.click()` 快速清空过滤词并将焦点送回输入框。
3. **门禁与测试**：
   - 新增 `tests/home-store-card-to-search-keyboard-flow.test.cjs`；
   - 负向验证：若首张卡片按 ArrowUp 未交还焦点给输入框，断言必须精准红。

## 后果与影响

- 小组件商店全键盘无障碍操作体验完全闭环；
- 与主切换器、动作画板保持统一的双向键盘交互心智。
