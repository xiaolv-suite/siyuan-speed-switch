# ADR 0528：小组件商店分类胶囊分段栏、主从分栏与规格瓦片 Bento 现代化（T-7794~T-7797）

## 背景与诉求

第二面板小组件商店（`.sw-home-store`）是用户探索、配置并装配生态卡片到工作台的大型中枢面板：
1. **分类标签栏激活态残留旧伪下划线**：此前分类胶囊分段栏（`.sw-home-store__tab`）激活态与生态专区（`[data-tab-key="ecosystem"]`）激活态残留拟物化的 `box-shadow: inset 0 -2px 0 var(--lv-brand)` 伪下划线，未接入全平台统一的白卡浮起（`--sw-card-float-bg`）与 `--sw-shadow-xs` 柔和分段规范；
2. **主从分栏中缝重叠边框与目录卡片平铺**：此前目录（`.sw-home-store__catalog`）右边框与详情（`.sw-home-store__detail`）左边框相邻，造成 2px 实线中缝重叠；目录内的卡片条目采用普通背景，缺少独立白卡层次与 hover 1.5px 顺滑微位移；
3. **规格尺寸选择瓦片缺少触觉弹性与微光**：详情区内的尺寸选择瓦片（`.sw-home-store__size`）此前采用固定内边距与无单位过渡，未接入 10px 控件圆角、白卡底色、`scale(0.95)` 物理弹性压缩与选中态 `--sw-focus-glow` 外发光环。

## 架构决策与设计

1. **商店分类胶囊分段栏与生态专区 Bento 白卡浮起与阴影升级（T-7794）**：
   - 在 `src/styles/_08-home-store-cards.scss` 中针对 `.sw-home-store__tab[data-tab-key="ecosystem"].is-active` 声明：
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `color: var(--lv-brand, #8B5CF6);`
     - `box-shadow: var(--sw-shadow-xs), 0 0 0 1px color-mix(in srgb, var(--lv-brand, #8B5CF6) 24%, transparent);`
     - 彻底清除拟物化 `box-shadow: inset 0 -2px 0` 伪下划线。

2. **商店主从分栏消线规整与白卡浮层升级（T-7795）**：
   - 消除详情区左侧边框：`border-left: none;`，中缝由目录区单侧 `border-right: 1px solid var(--sw-color-line-soft)` 统一承接，消除 2px 堆叠厚重感；
   - 目录卡片 `.sw-home-store__catalog .sw-home-store__card` 声明：
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `border: 1px solid var(--sw-color-line-soft, color-mix(in srgb, var(--b3-border-color) 45%, transparent));`
     - `border-radius: var(--sw-radius-md, 8px);`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:hover { background: var(--sw-color-accent-soft); border-color: ...; transform: translateX(1.5px); box-shadow: var(--sw-shadow-sm); }`
     - `&:active { transform: translateX(1.5px) scale(0.98); }`
     - 选中卡片 `&.is-active` 采用 `box-shadow: 0 0 0 1.5px var(--sw-color-accent), var(--sw-shadow-xs)` 替代旧版 `inset 3px 0 0` 粗条。

3. **尺寸选择规格条目与详情操作胶囊触觉动效加固（T-7796）**：
   - 为 `.sw-home-store__size` 声明：
     - `border-radius: var(--sw-radius-control, 10px);`
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `border: 1px solid var(--sw-color-line-soft, color-mix(in srgb, var(--b3-border-color) 45%, transparent));`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:hover { transform: translateY(-0.5px); border-color: ...; box-shadow: var(--sw-focus-glow); }`
     - `&:active { transform: scale(0.95); }`
     - 选中态 `&.is-selected, &[data-selected="true"]` 绑定 `--sw-focus-glow` 与主题柔底。

4. **契约测试、三重破坏性负向探针与无障碍闭环（T-7797）**：
   - 新增专项测试 `tests/store-category-and-detail-bento-contract.test.cjs`（4/4 PASS）；
   - 修复 `tests/store-bento-card-and-dialog-contract.test.cjs` 负向探针跨块匹配缺陷；
   - 注入三重破坏性负向验证探针：拦截丢失 hover `translateX(1.5px)` 位移、丢失生态标签白卡底色与丢失尺寸瓦片 active `scale(0.95)` 违规；
   - 在 `_11-ui-polish.scss` 的 `@media (prefers-reduced-motion: reduce)` 中全面接管商店分段标签、目录卡片与尺寸瓦片。

## 验证与门禁结果

- 契约测试：`tests/store-category-and-detail-bento-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 26 套专项契约测试矩阵：91/91 100% PASS；
- 8 套核心样式门禁：33/33 100% PASS；
- 全量测试套件：`node tests/run-tests.cjs` 9,816 passed, 0 failed, 1 skipped (100% 绿灯)；
- 5 套 Chromium 真实冒烟测试：全部 100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过；
- 产物预算：`dist/index.js` 1,303,163 B（自律线 1276 KiB 内，余量 3,461 B），`package.zip` 683,861 B（门禁 684 KiB 内，余量 16,555 B）。
