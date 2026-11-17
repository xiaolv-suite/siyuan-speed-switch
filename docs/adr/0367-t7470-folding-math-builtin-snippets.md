# ADR 0367：T-7470 内置片段库新增折叠标题指示微动效与数学公式块卡片美化

## 背景与上下文

小驴雷切第三面板（代码片段实验室 Snippet Studio）致力于为思源笔记创作者提供精美、安全且零外部依赖的纯 CSS 原生美化体验。
根据链滴社区高频需求走查：
1. 思源原生折叠标题缺少明显的折叠状态指示箭头与微动效，在大纲型长笔记中不易快速识别收起状态；
2. 数学公式块（KaTeX display block）在正文中缺乏容器卡片感，与正文段落交织时呼吸感不足。

## 架构决策与实现

1. **精选并设计两项原生 CSS 片段**：
   - `swss-builtin-foldheading`（折叠标题微光指示器）：
     ```css
     .protyle-wysiwyg [data-type="NodeHeading"][fold="1"]::after {
       content: " ▾";
       color: var(--b3-theme-primary, #3575f0);
       font-size: 0.85em;
       opacity: 0.75;
       display: inline-block;
       transition: transform 0.2s ease;
     }
     .protyle-wysiwyg [data-type="NodeHeading"][fold="1"] {
       border-bottom: 1px dashed color-mix(in srgb, var(--b3-theme-primary, #3575f0) 40%, transparent);
     }
     ```
   - `swss-builtin-mathblock`（数学公式块科技微卡片）：
     ```css
     .protyle-wysiwyg [data-type="NodeMathBlock"] {
       background: color-mix(in srgb, var(--b3-theme-surface) 90%, var(--b3-theme-primary, #3575f0) 5%);
       border: 1px solid var(--b3-border-color, #e2e8f0);
       border-radius: 10px;
       padding: 1em 1.4em;
       margin-block: 0.8em;
       box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
     }
     .protyle-wysiwyg [data-type="NodeMathBlock"] .katex-display {
       margin: 0;
     }
     ```
2. **纯粹 CSS 变量化与双语支持**：
   - 全部颜色变量引用 `--b3-theme-*` 与 `--b3-border-color`，支持明暗色模式 100% 自动自适应；
   - 在 `zh-CN.json` 与 `en.json` 中配置清晰的双语名称与说明字段；
   - 在 `tests/i18n.test.cjs` 的 `ALLOWED_UNUSED` 数组中登记白名单。

## 验证与证据

1. `tests/builtin-snippets-folding-math.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. `tests/snippet-studio-model.test.cjs`：22/22 满分全绿（`BUILTIN_SNIPPETS` 扩展至 30 项）；
3. `tests/i18n.test.cjs`：11/11 满分全绿。
