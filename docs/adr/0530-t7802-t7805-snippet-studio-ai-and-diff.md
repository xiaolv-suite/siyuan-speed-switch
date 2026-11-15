# ADR 0530：代码片段实验室 AI 助手伴侣栏与代码对比 Diff Bento 现代化（T-7802~T-7805）

## 背景与诉求

代码片段实验室（`.sw-studio`）的 AI 伴侣栏（`.sw-studio__ai`）与候选对比视图（`.sw-studio__diff`）是智能片段生成与迭代的核心工作面：
1. **AI 伴侣栏缺少双层微底与弹性触感**：右侧 AI 助手伴侣栏（`.sw-studio__ai`）此前采用半透明混色背景与常规边线，缺少统一的微底托盘（`--sw-bg-tinted`）与柔和分割线；折叠展开切换手柄（`.sw-studio__ai-collapse-toggle`）缺少白卡底色（`--sw-card-float-bg`）、标准低层级柔影（`--sw-shadow-xs`）与 hover `scale(1.08)` / active `scale(0.94)` 弹性触觉微缩放；
2. **提示词输入框与结果面板缺少白卡浮层质感与外发光环**：提示词输入框（`.sw-studio__prompt`）、AI 结果容器（`.sw-studio__ai-result`）与空状态占位（`.sw-studio__ai-empty`）此前采用常规背景与 8px 圆角，缺少 10px 控件统一圆角、白卡浮起底色与聚焦态 `--sw-focus-glow` 外发光微环；
3. **候选对比 Hunk 审查头部未达到全圆角软胶囊规范**：候选比对头部（`.sw-studio__diff-hunk-head`）缺少白卡浮起底色、全圆角软胶囊规范（`--studio-radius-pill, 999px`）与低层级柔影；对比代码行（`.sw-studio__diff-row`）缺少平台等宽字体（`--sw-font-mono`）统一与悬浮行级精微背景高光指示。

## 架构决策与设计

1. **AI 伴侣栏 Bento 浮卡底座与折叠手柄弹性触感升级（T-7802）**：
   - 在 `src/styles/_snippet-studio.scss` 中声明 `.sw-studio__ai`：
     - `background: var(--sw-bg-tinted, color-mix(in srgb, var(--studio-surface) 78%, var(--b3-theme-background)));`
     - `border-left: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `box-shadow: var(--sw-rim-light, none);`
   - 升级折叠切换手柄 `.sw-studio__ai-collapse-toggle`：
     - `background: var(--sw-card-float-bg, var(--studio-surface));`
     - `border: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `border-radius: var(--sw-radius-sm, 6px);`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:hover { transform: scale(1.08); border-color: var(--studio-accent); color: var(--studio-accent); background: var(--studio-accent-soft); }`
     - `&:active { transform: scale(0.94); }`

2. **提示词输入框与结果面板白卡浮起与微光外发光聚焦环加固（T-7803）**：
   - 提示词输入框 `.sw-studio__prompt`：
     - `background: var(--sw-card-float-bg, var(--b3-theme-background));`
     - `border: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `border-radius: var(--sw-radius-control, 10px);`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:focus { outline: none; border-color: var(--studio-accent); box-shadow: var(--sw-focus-glow); }`
   - AI 结果面板 `.sw-studio__ai-result`：
     - `background: var(--sw-card-float-bg, var(--b3-theme-background));`
     - `border: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `border-radius: var(--sw-radius-control, 10px);`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:focus { outline: none; border-color: var(--studio-accent); box-shadow: var(--sw-focus-glow); }`
   - AI 空状态卡片 `.sw-studio__ai-empty`：
     - `background: var(--sw-card-float-bg, color-mix(in srgb, var(--studio-surface) 60%, var(--b3-theme-background)));`
     - `border: 1px dashed var(--sw-color-line-soft, var(--studio-line));`
     - `border-radius: var(--sw-radius-control, 10px);`
     - `box-shadow: var(--sw-shadow-xs);`
   - 在 `src/styles/_11-ui-polish.scss` 中同步对齐 `.sw-studio__prompt` 的 10px 圆角与白卡聚焦环规范。

3. **候选对比 Hunk 审查头部白卡胶囊化与对比行等宽触觉加固（T-7804）**：
   - Hunk 审查头部 `.sw-studio__diff-hunk-head`：
     - `background: var(--sw-card-float-bg, var(--b3-theme-background));`
     - `border: 1px solid var(--sw-color-line-soft, var(--studio-line));`
     - `border-radius: var(--studio-radius-pill, 999px);`（无缝兼容历史单行断言契约）
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:hover { border-color: var(--studio-accent); color: var(--studio-accent); background: var(--studio-accent-soft); box-shadow: var(--sw-shadow-sm); }`
     - `&:active { transform: scale(0.96); }`
   - 对比代码行 `.sw-studio__diff-row`：
     - 接入 `font-family: var(--sw-font-mono, var(--b3-font-family-code, monospace));`
     - 添加 `transition: background-color $sw-dur-fast $sw-ease;` 与 hover 背景高光指示；
     - 严格保持 `&__diff-ln`、`&__diff-row.is-del`、`&__diff-row.is-ins` 的单行源码形态以保障历史契约探针稳定。

4. **契约测试、三重破坏性负向探针与无障碍闭环（T-7805）**：
   - 新增专项测试 `tests/snippet-studio-ai-and-diff-contract.test.cjs`（4/4 PASS）；
   - 注入三重破坏性负向验证探针：拦截提示词输入框丢失白卡底色、折叠手柄丢失缩放动效与 Hunk 头部丢失胶囊规格违规；
   - 在 `_11-ui-polish.scss` 的 `@media (prefers-reduced-motion: reduce)` 中覆盖 `.sw-studio__ai-collapse-toggle`、`.sw-studio__diff-hunk-head`、`.sw-studio__prompt` 与 `.sw-studio__ai-result`。

## 验证与门禁结果

- 契约测试：`tests/snippet-studio-ai-and-diff-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 28 套专项契约测试矩阵：107/107 100% PASS；
- 8 套核心样式门禁：31/31 100% PASS；
- 全量测试套件：`node tests/run-tests.cjs` 9,824 passed, 0 failed, 1 skipped (100% 绿灯)；
- 5 套 Chromium 真实冒烟测试：全部 100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过；
- 产物预算：`dist/index.js` 1,303,163 B（自律线 1276 KiB 内，余量 3,461 B），`package.zip` 684,332 B（门禁 684 KiB + 1024 B drift 容差内）。
