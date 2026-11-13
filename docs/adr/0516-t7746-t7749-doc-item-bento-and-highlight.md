# ADR 0516：全库搜索卡片双层微底白卡浮起、能量指示光条与高亮主题色（T-7746~T-7749）

## 背景与诉求

在第一面板（切换器 Switcher）的文档检索与穿透搜索结果列表（`.sw__doc-item`）中：
- 搜索结果卡片此前采用传统平面边框与灰阶底色，未接入现代双层微底白卡浮起（`--sw-card-float-bg`）与 Bento 深度软影（`--sw-shadow-bento`）；
- 悬停动效较为生硬，缺少上浮位移与柔光弥散；
- 命中关键词的高亮标记（`<mark>`）背景与边框此前采用了通用颜色，未对齐项目主题强调色语义；
- 卡片左侧的双色能量渐变指示光条需在悬浮时平滑展开。

## 架构决策与设计

1. **全库搜索卡片白卡浮起与 Bento 深度软影（T-7746）**：
   - 在 `src/styles/_03-switcher-mobile.scss` 与 `src/styles/_11-ui-polish.scss` 中将 `.sw__doc-item` 背景升级为 `var(--sw-card-float-bg, var(--b3-theme-surface))`，圆角统合为 14px，阴影收敛至 `var(--sw-shadow-bento)`；
   - 悬浮态（`:hover`）注入 `transform: translateY(-2px);` 与多层弥散光晕。

2. **左侧能量指示光条与展开动效统合（T-7747）**：
   - 严格保留 `.sw__doc-item::before` 的星际紫到钛金黄金色渐变能量条（`linear-gradient(180deg, ...)`）与 8px 微光阴影；
   - 悬浮与聚焦时触发 `opacity: 1; transform: scaleY(1);` 平滑展开，增强视觉锁定感。

3. **关键词命中 mark 接入主题强调色（T-7748）**：
   - 将 `.sw__doc-item .sw__doc-title mark` 的背景色与内边框高亮接入 `var(--sw-color-accent, var(--b3-theme-primary))`，提升密集字符中的命中可读性。

4. **契约测试与负向验证（T-7749）**：
   - 新增专项测试 `tests/doc-item-bento-and-highlight-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当搜索卡片丢失 Bento 软影或关键词高亮丢失主题语义色时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/doc-item-bento-and-highlight-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 15 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
