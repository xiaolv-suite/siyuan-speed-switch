# ADR 0523：工作台场景预设按钮胶囊化、浮层 Bento 软影与工具栏状态统合（T-7774~T-7777）

## 背景与诉求

在第二面板（工作台看板 Workbench）进入编辑模式时，顶部工具栏提供“场景预设”（`.sw-home__preset-btn`）、“恢复默认”（`.sw-home__restore-default`）与“清空全部”（`.sw-home__clear-btn`）等核心布局操作：
1. **工具栏按钮质感分散**：此前各按钮仅使用原生简单文本按钮样式，未接入统一的软胶囊规范（`--sw-platform-radius-pill, 999px`）、白卡底色（`--sw-card-float-bg`）与精微阴影（`--sw-shadow-xs`），缺少悬停抬升与按压物理触感；
2. **场景预设弹出菜单（`.b3-menu.sw-home__presets-menu`）**：此前直接调用宿主原生菜单，未注入 Bento 体系下的独立浮起白卡感（`--sw-card-float-bg`、14px 大圆角、`var(--sw-shadow-bento)` 深度近远柔影与 8px 毛玻璃模糊）；菜单项缺少悬停平滑横向微位移与按压缩放触觉反馈；
3. **危险/中性操作语义分层**：清空全部属于破坏性操作，此前与中性按钮在工具栏中缺乏分明的语义描边与底色隔离，需以柔和半透明危险色进行视觉降噪与层级分离。

## 架构决策与设计

1. **场景预设按钮软胶囊规范与悬浮/按压触觉动效加固（T-7774）**：
   - 源码接线：在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 中，实例化 `new Menu("swWorkbenchPresets")` 后显式挂载 `sw-home__presets-menu` 专属类名，并保证两端同构一致；
   - 按钮样式：在 `src/styles/_11-ui-polish.scss` 中为 `.sw-home .sw-home__preset-btn` 声明：
     - `min-height: var(--sw-control-h-md, 26px);`
     - `padding: var(--sw-space-2xs, 2px) var(--sw-space-md, 8px);`
     - `border-radius: var(--sw-platform-radius-pill, 999px);`
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `color: var(--sw-color-accent, var(--b3-theme-primary));`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:hover { transform: translateY(-1px); box-shadow: var(--sw-shadow-sm); }`
     - `&:active { transform: translateY(0) scale(0.96); }`

2. **场景预设浮层 Bento 白卡浮起、深度柔影与选项平滑微位移加固（T-7775）**：
   - 在 `src/styles/_11-ui-polish.scss` 中声明 `.b3-menu.sw-home__presets-menu`：
     - `border: 1px solid var(--sw-color-line-soft, var(--b3-border-color));`
     - `border-radius: var(--sw-radius-card, 14px);`
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `box-shadow: var(--sw-shadow-bento);`
     - `backdrop-filter: var(--sw-blur-md, blur(8px));`
     - `padding: var(--sw-space-sm, 6px);`
     - `min-width: 180px;`
   - 选项 `.b3-menu__item` 声明：
     - `min-height: 32px;`
     - `padding: var(--sw-space-xs, 4px) var(--sw-space-md, 8px);`
     - `border-radius: var(--sw-radius-sm, 6px);`
     - `&:hover { background: var(--sw-color-accent-soft, var(--sw-accent-soft)); color: var(--sw-color-accent, var(--b3-theme-primary)); transform: translateX(1.5px); }`
     - `&:active { transform: translateX(1.5px) scale(0.98); }`
     - 图标 `.b3-menu__icon` 前景色联动主题主色。

3. **工作台编辑工具栏清空与恢复按钮胶囊规格与状态统合（T-7776）**：
   - 恢复按钮 `.sw-home__restore-default` 对齐为全圆角软胶囊与白卡底色；
   - 清空按钮 `.sw-home__clear-btn` 声明语义危险色前景色与 `color-mix(in srgb, var(--b3-theme-error) 30%, transparent)` 柔和边框，hover 注入 10% 半透明危险色柔光。

4. **契约测试、破坏性负向探针与无障碍闭环（T-7777）**：
   - 新增专项测试 `tests/workbench-scene-presets-bento-contract.test.cjs`；
   - 注入三重破坏性负向验证探针：拦截丢失 Bento 软影、丢失悬停微位移与丢失胶囊规格违规；
   - `@media (prefers-reduced-motion: reduce)` 全面覆盖预设按钮、恢复/清空按钮与预设菜单。

## 验证与门禁结果

- 契约测试：`tests/workbench-scene-presets-bento-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 21 套专项契约测试矩阵：64/64 100% PASS；
- 8 套核心样式门禁：63/63 100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过。
