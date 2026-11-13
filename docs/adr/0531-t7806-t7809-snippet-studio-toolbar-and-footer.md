# ADR 0531：代码片段实验室主顶栏工具项与状态底栏 Bento 现代化（T-7806~T-7809）

## 背景与诉求

代码片段实验室（`.sw-studio`）的主顶栏（`.sw-studio__header`）与主状态底栏（`.sw-studio__footer`）是整个实验室工作面的边界外壳与控制中枢：
1. **顶栏主操作按钮缺少软胶囊规格与触感反馈**：顶部操作栏按钮（`.sw-studio__header-actions .sw-studio__button`，包含新建、导入、导出、格式化等）此前采用常规 8px 矩形圆角，缺少全圆角软胶囊规范（`--sw-platform-radius-pill, 999px`）、白卡浮起底色（`--sw-card-float-bg`）与 active `scale(0.96)` 触觉弹性微缩放；
2. **状态底栏缺少微底分层与等宽指示微光**：主状态底栏（`.sw-studio__footer`）此前采用较深实色背景，缺少统一微底托盘（`--sw-bg-tinted`）与顶部柔和分割线（`--sw-color-line-soft`）；状态信息文本（`.sw-studio__status`）缺少等宽数字排版（`tabular-nums`）与极光呼吸色点第二通道；
3. **顶栏与各分段标题条缺少统一柔和边界**：主标题栏（`.sw-studio__header`）与各主分段标题条（`.sw-studio__section-bar`）分割线未统合至 `--sw-color-line-soft`。

## 架构决策与设计

1. **实验室主操作按钮全圆角软胶囊与弹性触觉加固（T-7806）**：
   - 在 `src/styles/_snippet-studio.scss` 中声明 `.sw-studio__header-actions .sw-studio__button`：
     - `border-radius: var(--sw-platform-radius-pill, 999px);`
     - `background: var(--sw-card-float-bg, var(--b3-theme-background));`
     - `border: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `box-shadow: var(--sw-shadow-xs);`
     - `min-height: var(--sw-control-h-md, 32px);`
     - `padding: var(--sw-space-xs, 4px) var(--sw-space-lg, 12px);`
     - `&:hover { border-color: var(--studio-accent); color: var(--studio-accent); background: var(--studio-accent-soft); box-shadow: var(--sw-shadow-sm); transform: translateY(-0.5px); }`
     - `&:active:not(:disabled) { transform: scale(0.96); }`
     - `&.is-primary { background: var(--studio-accent); color: var(--b3-theme-on-primary, #fff); border-color: var(--studio-accent); }`
   - 通用按钮 `.sw-studio__button` 统合声明白卡底色与 active `translateY(1px) scale(0.96)`；
   - 在 `_11-ui-polish.scss` 中同步对齐抛光规则。

2. **状态底栏 Bento 微底质感、边框与等宽状态文本加固（T-7807）**：
   - 状态底栏 `.sw-studio__footer`：
     - `background: var(--sw-bg-tinted, var(--studio-surface-strong));`
     - `border-top: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `box-shadow: var(--sw-rim-light, inset 0 1px 0 0 rgba(255, 255, 255, 0.08));`
   - 状态文本 `.sw-studio__status`：
     - `font-family: var(--sw-font-mono, monospace);`
     - `font-variant-numeric: tabular-nums;`
     - `display: inline-flex; align-items: center; gap: var(--sw-space-sm, 6px);`
     - `&::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.85; flex-shrink: 0; }`
     - 完整保留既有 4 态颜色标记（`loading/busy/ready/blocked/error`）。

3. **顶部标题栏与分段标题条微底微光边框对齐升级（T-7808）**：
   - 顶部标题栏 `.sw-studio__header`：
     - `background: var(--sw-bg-tinted, color-mix(in srgb, var(--b3-theme-background) 88%, var(--studio-surface)));`
     - `border-bottom: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `box-shadow: var(--sw-rim-light, inset 0 -1px 0 0 rgba(255, 255, 255, 0.06));`
   - 分段标题条 `.sw-studio__section-bar`：
     - `border-bottom: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `padding-bottom: var(--sw-space-sm, 6px);`

4. **契约测试、三重破坏性负向探针与无障碍闭环（T-7809）**：
   - 新增专项测试 `tests/snippet-studio-toolbar-and-footer-contract.test.cjs`（4/4 PASS）；
   - 注入三重破坏性负向验证探针：拦截顶栏按钮丢失胶囊规格、状态底栏丢失等宽排版与状态底栏丢失微底托盘违规；
   - 在 `_11-ui-polish.scss` 的 `@media (prefers-reduced-motion: reduce)` 中覆盖 `.sw-studio__header-actions .sw-studio__button`。

## 验证与门禁结果

- 契约测试：`tests/snippet-studio-toolbar-and-footer-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 29 套专项契约测试矩阵：111/111 100% PASS；
- 8 套核心样式门禁：31/31 100% PASS；
- 全量测试套件：`node tests/run-tests.cjs` 9,828 passed, 0 failed, 1 skipped (100% 绿灯)；
- 5 套 Chromium 真实冒烟测试：全部 100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过；
- 产物预算：`dist/index.js` 1,303,163 B（自律线 1276 KiB 内，余量 3,461 B），`package.zip` 684,445 B（门禁 684 KiB + 1024 B drift 容差内）。
