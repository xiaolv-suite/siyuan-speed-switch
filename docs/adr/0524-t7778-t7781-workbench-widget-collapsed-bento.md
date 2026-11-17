# ADR 0524：工作台小组件折叠态紧凑胶囊行高、角标晶格与折叠按钮触觉动效（T-7778~T-7781）

## 背景与诉求

在第二面板（工作台看板 Workbench）中，用户可通过点击折叠按钮（`.sw__home-module-fold`）、按快捷键（`Space`、`[`、`]`）或双击标头将不常用的组件卡片收起折叠（`.sw-home__cell--collapsed`）：
1. **折叠态卡片高度与留白分散**：此前仅简单通过 `.sw-home__cell-body { display: none !important; }` 隐藏内容，单元格未严格约束 34px 紧凑胶囊上限，垂直内边距未对齐，缺少 Bento 体系下的白卡浮起（`--sw-card-float-bg`）与精微阴影（`--sw-shadow-xs`）；
2. **条目计数/统计回显角标（`.sw__home-collapsed-badge`）**：此前仅简单显示数字，缺少全圆角胶囊药丸规范、等宽字体（`--sw-font-mono`）、`tabular-nums` 防抖动排版与主题色 28% 半透明微光边框；
3. **折叠展开按钮触感单薄**：`.sw__home-module-fold` 按钮在悬停与按下时缺少平滑缩放反馈与主题主色微光联动。

## 架构决策与设计

1. **工作台小组件折叠态紧凑胶囊行高与微浮起加固（T-7778）**：
   - 在 `src/styles/_11-ui-polish.scss` 中声明 `.sw-home .sw-home__cell--collapsed`：
     - `min-height: var(--sw-control-h, 34px);`
     - `max-height: var(--sw-control-h, 34px);`
     - `padding-block: var(--sw-space-2xs, 2px);`
     - `justify-content: center;`
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `border-color: var(--sw-color-line-soft, color-mix(in srgb, var(--b3-border-color) 45%, transparent));`
     - `box-shadow: var(--sw-shadow-xs);`
     - `.sw__home-module-header { margin-bottom: 0 !important; }`
     - `&:hover { box-shadow: var(--sw-shadow-sm); transform: translateY(-0.5px); }`

2. **折叠条目计数/统计角标主色微光晶格与等宽药丸加固（T-7779）**：
   - 在 `src/styles/_11-ui-polish.scss` 中声明 `.sw-home .sw__home-collapsed-badge`：
     - `height: 18px; line-height: 18px;`
     - `padding: 0 var(--sw-space-sm, 6px);`
     - `border-radius: var(--sw-platform-radius-pill, 999px);`
     - `background: var(--sw-color-accent-soft, color-mix(in srgb, var(--b3-theme-primary) 12%, transparent));`
     - `color: var(--sw-color-accent, var(--b3-theme-primary));`
     - `border: 1px solid color-mix(in srgb, var(--sw-color-accent, var(--b3-theme-primary)) 28%, transparent);`
     - `font-family: var(--sw-font-mono, monospace);`
     - `font-size: var(--sw-font-2xs, 10px);`
     - `font-weight: var(--sw-weight-semibold, 600);`
     - `font-variant-numeric: tabular-nums;`
     - `box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);`

3. **折叠展开切换按钮悬浮/激活触觉微反馈与主题色联动（T-7780）**：
   - 在 `src/styles/_11-ui-polish.scss` 中为 `.sw-home .sw__home-module-fold` 声明：
     - `border-radius: var(--sw-radius-sm, 6px);`
     - `transition: transform $sw-dur-fast $sw-ease, background-color $sw-dur-fast $sw-ease, color $sw-dur-fast $sw-ease;`
     - `&:hover { background: var(--sw-color-accent-soft, var(--sw-accent-soft)); color: var(--sw-color-accent, var(--b3-theme-primary)); transform: scale(1.08); }`
     - `&:active { transform: scale(0.94); }`

4. **契约测试、破坏性负向探针与无障碍闭环（T-7781）**：
   - 新增专项测试 `tests/workbench-widget-collapsed-bento-contract.test.cjs`；
   - 注入三重破坏性负向验证探针：拦截丢失白卡底色、丢失等宽数字排版与丢失缩放动效违规；
   - `@media (prefers-reduced-motion: reduce)` 全面接管折叠卡片与按钮动效。

## 验证与门禁结果

- 契约测试：`tests/workbench-widget-collapsed-bento-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 22 套专项契约测试矩阵：68/68 100% PASS；
- 8 套核心样式门禁：63/63 100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过。
