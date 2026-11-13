# ADR 0469：主切换器卡片列表补齐 Home/End 与 PageUp/PageDown 快捷巡航及 Space 激活（T-7574）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在插件交互一致性审查中发现：
1. 第二面板（工作台）卡片网格与快捷选择器已支持 `Home` / `End` 跳转首末项以及 `PageUp` / `PageDown` 跨步翻页，但主切换器卡片列表仅支持单步的四个方向箭头键；当用户打开数十个页签或全库卡片时，单步导航效率偏低；
2. 依据 W3C WAI-ARIA 复合网格/列表框规范，具备交互行为的聚焦卡片应当允许 `Enter` 与 `Space`（空格键）共同触发激活行为。主切换器此前仅响应了 `Enter`，未对 `Space` 提供一致的激活映射。

## 决策

1. **补齐 Home / End 首尾直达**：
   在卡片列表导航处理中：
   - `Home` 键设置 `next = 0`，瞬移至列表首张卡片；
   - `End` 键设置 `next = cards.length - 1`，瞬移至列表最后一张卡片。
2. **引入 PageUp / PageDown 跨步步长**：
   基于当前网格列数 `colCount` 动态计算单页步长 `const step = Math.max(colCount * 3, 5)`：
   - `PageUp` 向上跳转 `Math.max(0, focusIndex - step)`；
   - `PageDown` 向下跳转 `Math.min(cards.length - 1, focusIndex + step)`。
3. **支持 Space 激活聚焦卡片**：
   与 `Enter` 对齐：`(key === "Enter" || key === " " || key === "Spacebar") && plain` 统一执行 `activateCardByElement`。在输入控件内按空格保留原生文本输入，不会误触卡片激活。

## 验证

- **契约测试**：`tests/switcher-keyboard-nav-extension.test.cjs` 4/4 满分通过，验证 TS/JS 双源的一致性及负向注入拦截；
- **类型检查**：`pnpm exec tsc --noEmit` 0 报错。
