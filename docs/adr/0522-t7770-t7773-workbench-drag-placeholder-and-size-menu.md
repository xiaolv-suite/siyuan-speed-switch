# ADR 0522：工作台卡片拖拽毛玻璃幽灵虚影、放置落点 Bento 轮廓与尺寸型号浮卡微交互（T-7770~T-7773）

## 背景与诉求

在第二面板（工作台看板 Workbench）中，用户频繁编排小组件卡片并调整卡片尺寸型号：
1. **卡片拖拽态（`.sw-home__cell--dragging`）**：此前仅简单设置 `opacity: 0.45`，视觉感知单薄生硬，缺少现代工业级拖拽手感（毛玻璃晶体半透明、缩放微下沉、轻微灰度降噪以及微弱底影）；
2. **放置落点目标（`.sw-home__cell--dragover`）**：此前使用侵入式高饱和度边框与深色阴影，缺少 Bento 体系下的主色动态软虚线边框、复合外发光环（`--sw-focus-glow`）、Bento 双层近远软影（`--sw-shadow-bento`）与微上浮吸引指示；
3. **尺寸型号选择浮层（`.sw-home__size-menu`）**：此前沿用旧式的原生浮层风格，未接入 Bento 体系的白卡浮起（`--sw-card-float-bg`）、14px 圆角、`var(--sw-shadow-bento)` 深度柔影与毛玻璃模糊；选项列表缺少 hover 平滑微位移 `translateX(1.5px)` 与 active 按压缩放 `scale(0.98)`；
4. **尺寸预览瓦片（`.sw__size-tile`）**：此前边框与圆角生硬，未统合主题语义色晶格与精微外阴影。

## 架构决策与设计

1. **工作台卡片拖拽毛玻璃幽灵虚影与放置落点 Bento 轮廓升级（T-7770）**：
   - 在 `src/styles/_11-ui-polish.scss` 中声明 `.sw-home .sw-home__cell--dragging`：
     - `opacity: 0.52;`
     - `transform: scale(0.985);`
     - `border-color: color-mix(in srgb, var(--sw-color-accent, var(--b3-theme-primary)) 60%, transparent);`
     - `box-shadow: var(--sw-shadow-xs);`
     - `filter: grayscale(0.2);`
     - `transition: transform $sw-dur-fast $sw-ease, opacity $sw-dur-fast $sw-ease, filter $sw-dur-fast $sw-ease;`
   - 在 `src/styles/_11-ui-polish.scss` 中声明 `.sw-home .sw-home__cell--dragover`：
     - `outline: 2px dashed var(--sw-color-accent, var(--b3-theme-primary)) !important;`
     - `outline-offset: -2px;`
     - `background: color-mix(in srgb, var(--sw-color-accent, var(--b3-theme-primary)) 12%, var(--sw-card-float-bg, var(--b3-theme-surface))) !important;`
     - `box-shadow: var(--sw-focus-glow), var(--sw-shadow-bento) !important;`
     - `transform: scale(1.008) !important;`
     - `transition: transform $sw-dur-fast $sw-ease, box-shadow $sw-dur-fast $sw-ease, background-color $sw-dur-fast $sw-ease, outline-color $sw-dur-fast $sw-ease;`

2. **工作台尺寸型号菜单 Bento 白卡浮层与选项微动效加固（T-7771）**：
   - 在 `src/styles/_11-ui-polish.scss` 中统合 `.sw-home__size-menu, .sw__sort-menu`：
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `border: 1px solid var(--sw-color-line-soft, var(--b3-border-color));`
     - `border-radius: var(--sw-radius-card, 14px);`
     - `box-shadow: var(--sw-shadow-bento);`
     - `backdrop-filter: var(--sw-blur-md, blur(8px));`
     - `animation: swPaletteScaleIn $sw-dur-base $sw-ease;`
   - 选项 `.sw__sort-menu-option` 声明：
     - `min-height: 32px;`
     - `border-radius: var(--sw-radius-sm, 6px);`
     - `&:hover { background: var(--sw-color-accent-soft, var(--sw-accent-soft)); color: var(--sw-color-accent, var(--b3-theme-primary)); transform: translateX(1.5px); }`
     - `&:active { transform: translateX(1.5px) scale(0.98); }`
     - `&[aria-checked="true"] { color: var(--sw-color-accent, var(--b3-theme-primary)); font-weight: var(--sw-weight-semibold, 600); }`

3. **尺寸预览瓦片主色微光晶格与选中态高亮统合（T-7772）**：
   - 瓦片 `.sw__size-tile` 统合为 4px 圆角、精微外阴影与主题语义色动态派生 16% 半透明晶格背景。

4. **契约测试、破坏性负向探针与无障碍闭环（T-7773）**：
   - 新增专项测试 `tests/workbench-drag-placeholder-and-size-menu-contract.test.cjs`；
   - 注入三重破坏性负向验证探针：拦截丢失 Bento 软影、丢失悬停微位移与丢失落点发光环违规；
   - `@media (prefers-reduced-motion: reduce)` 全面覆盖拖拽虚影与尺寸菜单。

## 验证与门禁结果

- 契约测试：`tests/workbench-drag-placeholder-and-size-menu-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 20 套专项契约测试矩阵：60/60 100% PASS；
- 8 套核心样式门禁：63/63 100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 生产构建与可复现审计：3/3 严格一致；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过。
