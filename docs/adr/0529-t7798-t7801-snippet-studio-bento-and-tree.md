# ADR 0529：代码片段实验室代码树、分类过滤胶囊与诊断面板 Bento 现代化（T-7798~T-7801）

## 背景与诉求

代码片段实验室（`.sw-studio`）是插件开发与 CSS 实验的高阶工作面：
1. **代码树条目缺少顺滑位移触感**：左侧代码片段列表项（`.sw-studio__library-item`）此前仅做简单背景变化，缺少统一的 Bento 白卡浮起（`--sw-card-float-bg`）、8px 圆角与 hover 1.5px 平滑横向微位移 / active `scale(0.98)` 弹性触觉反馈；
2. **过滤标签未达到全圆角软胶囊规范**：分类过滤按钮（`.sw-studio__library-filter`）此前采用 8px 圆角，缺少全平台统合的全圆角软胶囊规范（`--sw-platform-radius-pill, 999px`）与 `scale(0.96)` 按压回弹；片段计数角标缺少 `tabular-nums` 等宽排版；
3. **诊断控制台与冲突面板缺少 Bento 浮层质感**：底部诊断控制台（`.sw-studio__diagnostics`）与冲突比对容器（`.sw-studio__conflict-diff`）此前采用浅色半透明背景与常规边框，缺少 Bento 白卡浮起、10px/14px 圆角与标准低层级柔影。

## 架构决策与设计

1. **实验室代码片段树条目 Bento 浮卡与触感微位移升级（T-7798）**：
   - 在 `src/styles/_snippet-studio.scss` 中声明 `.sw-studio__library-item`：
     - `background: var(--sw-card-float-bg, var(--b3-theme-background));`
     - `border: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `border-radius: var(--sw-radius-md, 8px);`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:hover { background: var(--studio-accent-soft); border-color: ...; transform: translateX(1.5px); box-shadow: var(--sw-shadow-sm); }`
     - `&:active { transform: translateX(1.5px) scale(0.98); }`
   - 开关按钮 `.sw-studio__library-toggle` 统合为全圆角软胶囊并提供 active `scale(0.96)`；复制按钮 `.sw-studio__library-copy` 提供 active `scale(0.95)`。

2. **实验室过滤分类胶囊软胶囊化与等宽数字排版（T-7799）**：
   - 过滤分类按钮 `.sw-studio__library-filter` 升级为全圆角软胶囊（`--sw-platform-radius-pill, 999px`）、白卡底色、`--sw-shadow-xs` 柔影与 active `scale(0.96)` 物理触感；
   - 计数角标 `.sw-studio__library-count` 声明 `font-family: var(--sw-font-mono, monospace)` 与 `tabular-nums` 等宽排版。

3. **诊断控制台与冲突比对 Bento 浮卡加固（T-7800）**：
   - 诊断控制台 `.sw-studio__diagnostics` 声明白卡浮起（`--sw-card-float-bg`）、10px 控件圆角与 `--sw-shadow-xs`；
   - 诊断行 `.sw-studio__diagnostics-row` 声明 hover `translateX(1.5px)` 与 active `scale(0.98)`，行号绑定 `--sw-font-mono` 与 `tabular-nums`；
   - 冲突比对容器 `.sw-studio__conflict-diff` 统合为 14px 卡片大圆角、白卡底色与 `--sw-shadow-xs`。

4. **契约测试、三重破坏性负向探针与无障碍闭环（T-7801）**：
   - 新增专项测试 `tests/snippet-studio-bento-and-tree-contract.test.cjs`（4/4 PASS）；
   - 注入三重破坏性负向验证探针：拦截丢失 hover `translateX(1.5px)` 位移、丢失分类过滤胶囊规格与丢失控制台白卡底色违规；
   - 在 `_11-ui-polish.scss` 的 `@media (prefers-reduced-motion: reduce)` 中全面接管树条目、分类胶囊与诊断行。

## 验证与门禁结果

- 契约测试：`tests/snippet-studio-bento-and-tree-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 27 套专项契约测试矩阵：95/95 100% PASS；
- 8 套核心样式门禁：33/33 100% PASS；
- 全量测试套件：`node tests/run-tests.cjs` 9,820 passed, 0 failed, 1 skipped (100% 绿灯)；
- 5 套 Chromium 真实冒烟测试：全部 100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过；
- 产物预算：`dist/index.js` 1,303,163 B（自律线 1276 KiB 内，余量 3,461 B），`package.zip` 684,067 B（门禁 684 KiB 内，余量 16,349 B）。
