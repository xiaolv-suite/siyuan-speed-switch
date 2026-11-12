# ADR 0477：超宽屏防拉伸上限、按钮防连击节流、空态快捷清空与视口聚焦同步（T-7589~T-7592）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在全方位复审评估指导下，继续推进交互深水区微体验与极限场景排障：
1. **超宽带鱼屏拉伸失真（T-7589）**：在 4K 或 21:9 超宽屏下，自适应按 90% 比例计算出的居中弹窗宽度突破 3000px，导致卡片分布过度稀疏、视线跨度过大；
2. **高频卡片按钮连击竞争（T-7590）**：在卡片置顶与关闭等高频按钮上快速连续点击时，第二次点击可能在卡片 DOM 重排瞬间误伤相邻卡片，或触发重复事件回调；
3. **穿透搜索空态死胡同（T-7591）**：当用户输入带前缀的穿透语法（如 `^不存在的块`）且查无结果时，页面缺少快捷清空按钮，导致用户必须反复退格才能返回页签列表；
4. **视口滚动与单一视觉焦点同步（T-7592）**：卡片在键盘导航与快速漫游时，必须确保单一视觉焦点 `sw__focused` 与 `aria-current="true"` 严格单真源，并基于绝对视口差值滚动。

## 决策

1. **自适应超宽屏最大保护上限（T-7589）**：
   - 在 `src/settings-model.js` 的 `resolvePanelSize` 中引入 `maxWidth` 约束：当且仅当自适应宽度超过传入的 `maxWidth`（如 1600px）时优雅截断，既防止带鱼屏拉伸变形，又保留 `fullscreen` 全屏 100% 铺满视口能力。
2. **卡片按钮忙态防连击节流保护（T-7590）**：
   - 在 `src/index.ts` 与 `src/index.js` 为卡片上的置顶按钮（`pinBtn`）与关闭按钮（`closeBtn`）引入 180ms 忙态节流锁 `pinBusy` / `closeBusy`，阻断高频二次点击。
3. **空态一键清空检索操作栏（T-7591）**：
   - 在 `src/doc-search-ui.ts` 与 `src/doc-search-ui.js` 的 `appendDocResultsEmpty` 中，在穿透搜索查无结果时增加 `.sw__search-empty-clear-bar` 操作栏，点击一键清空输入框并重获焦点，秒级返回页签列表。
4. **视口焦点同步与契约闭环（T-7592）**：
   - 固化 `focusCard` 的 `sw__focused` 与 `aria-current` 同步契约，完善 `tests/ux-deep-polish-contract.test.cjs` 契约保障与负向验证探针。

## 验证

- 新增专项契约测试 `tests/ux-deep-polish-contract.test.cjs` 5/5 满分通过；
- 全量自动化测试（9,622 项测试）100% PASS；
- 14 道发布总门禁 `pnpm run verify:release` 100% 满分通过；
- 产物热同步至 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。
