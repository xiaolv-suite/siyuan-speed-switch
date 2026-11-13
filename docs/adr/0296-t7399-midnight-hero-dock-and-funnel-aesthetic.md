# 0296. T-7399 工作台知识蒸馏漏斗与全尺寸英雄位午夜黑金美学装配契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7399（落实 Issue #17 中枢统领专项建议）

## 背景与上下文

小驴快门中枢在 Issue #17 中下发了全生态美学升级指引：
1. 吸收最初参考图顶部的**午夜深蓝黑底色（`#1B1E2E`）**与金色微光星芒（`#FACC15`）；
2. 强化工作台全尺寸英雄位（Full Hero Dock）与渐进知识蒸馏漏斗（`knowledge-funnel`）的尊荣高级质感；
3. 为条目注入 `translateX(2px)` 悬浮微动效与金色半透明微光，兼顾暗色高对比度与科技感。

## 架构决策

1. **类名智能装配**：
   - 在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 中：
     - 当组件属于暗色材质、或为 `external-local-time`、或为 `knowledge-funnel`、或当前布局档位为 `sizeKey === "full"`（英雄位）时，强制装配 `.sw-home__cell--midnight`；
2. **样式渲染与动效强化**：
   - 在 `src/styles/_11-ui-polish.scss` 中为 `.sw-home__cell--midnight` 补充悬浮位移与背景平滑过渡；
   - 保证普通浅色卡片不被误染，严格维持调色板隔离。
3. **门禁与测试**：
   - 新增 `tests/midnight-hero-dock-and-funnel-aesthetic.test.cjs`；
   - 负向验证：普通白底卡片或普通 medium 尺寸组件绝不得被错误附上 midnight 类名。

## 后果与影响

- 达成中枢视觉质感要求，工作台知识漏斗与核心英雄位兼具高级感与操作辨识度；
- 完全保持思源主题 `--b3` 变量体系兼容。
