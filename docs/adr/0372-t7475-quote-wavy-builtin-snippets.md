# ADR 0372：T-7475 内置片段库新增金句大双引号装饰与波浪下划线重点标记 CSS 片段

## 背景与上下文

小驴雷切第三面板（代码片段实验室 Snippet Studio）内置片段库是思源笔记创作者进行正文微质感美化的核心资产。
根据社区创作者的高频反馈：
1. 引用名言金句时，缺少古典优雅的大双引号背景装饰水印；
2. 标注核心关键词时，原生直线下划线过于机械，缺少具有视觉跳动感的波浪形重点标记（Wavy Underline）。

## 架构决策与实现

1. **精选并设计两项原生 CSS 片段**：
   - `swss-builtin-quote-gold`（金句大双引号精致引述）：
     ```css
     .protyle-wysiwyg [data-type="NodeBlockquote"] {
       position: relative;
       padding: 1em 1.5em 1em 2.5em;
       font-style: italic;
       border-inline-start: none;
       background: color-mix(in srgb, var(--b3-theme-surface) 92%, var(--b3-theme-primary, #3575f0) 8%);
       border-radius: 8px;
     }
     .protyle-wysiwyg [data-type="NodeBlockquote"]::before {
       content: "“";
       position: absolute;
       inset-inline-start: 0.3em;
       inset-block-start: -0.1em;
       font-size: 3em;
       font-family: Georgia, serif;
       line-height: 1;
       color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 45%, transparent);
       pointer-events: none;
     }
     ```
   - `swss-builtin-wavy-underline`（波浪线重点下划线）：
     ```css
     .protyle-wysiwyg u,
     .protyle-wysiwyg [data-type*="u"] {
       text-decoration: underline wavy var(--b3-theme-primary, #3575f0);
       text-underline-offset: 4px;
       text-decoration-thickness: 1.5px;
     }
     ```
2. **纯粹 CSS 变量化与双语支持**：
   - 全部颜色变量引用 `--b3-theme-*`，支持明暗色模式 100% 自动自适应；
   - 在 `zh-CN.json` 与 `en.json` 中配置清晰的双语名称与说明字段；
   - 在 `tests/i18n.test.cjs` 的 `ALLOWED_UNUSED` 数组中登记白名单。

## 验证与证据

1. `tests/builtin-snippets-quote-wavy.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. `tests/snippet-studio-model.test.cjs`：22/22 满分全绿（`BUILTIN_SNIPPETS` 扩展至 32 项）；
3. `tests/i18n.test.cjs`：11/11 满分全绿。
