# ADR 0375：T-7479 内置片段库新增渐变彩色滚动条与正文大写首字母下沉 CSS 片段

## 背景与上下文

小驴雷切第三面板（代码片段实验室 Snippet Studio）通过开箱即用的内置片段库赋能用户打造专属精致排版风格。
根据社区创作者的高频需求：
1. 希望首段开头文字具备图书出版物般的“首字大写下沉（Drop Cap）”排版，提升正文阅读仪式感；
2. 编辑器默认滚动条单调，需要具备赛博微光感的主题色渐变细滚动条。

## 架构决策与实现

1. **精选并设计两项原生 CSS 片段**：
   - `swss-builtin-dropcap`（正文首字古典大写下沉）：
     ```css
     .protyle-wysiwyg [data-node-index="0"][data-type="NodeParagraph"]::first-letter {
       float: left;
       font-size: 3.2em;
       line-height: 0.85;
       padding-inline-end: 0.15em;
       font-family: Georgia, "Songti SC", serif;
       font-weight: bold;
       color: var(--b3-theme-primary, #3575f0);
     }
     ```
   - `swss-builtin-gradient-bar`（微光渐变精致滚动条）：
     ```css
     .protyle-wysiwyg ::-webkit-scrollbar { width: 6px; height: 6px; }
     .protyle-wysiwyg ::-webkit-scrollbar-thumb {
       border-radius: 999px;
       background: linear-gradient(180deg, var(--b3-theme-primary, #3575f0), color-mix(in srgb, var(--b3-theme-primary, #3575f0) 30%, transparent));
     }
     .protyle-wysiwyg ::-webkit-scrollbar-thumb:hover {
       background: var(--b3-theme-primary, #3575f0);
     }
     ```
2. **纯粹 CSS 变量化与双语支持**：
   - 全部颜色变量引用 `--b3-theme-*`，支持明暗色模式 100% 自动自适应；
   - 在 `zh-CN.json` 与 `en.json` 中配置清晰的双语名称与说明字段；
   - 在 `tests/i18n.test.cjs` 的 `ALLOWED_UNUSED` 数组中登记白名单。

## 验证与证据

1. `tests/builtin-snippets-dropcap-gradient.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. `tests/snippet-studio-model.test.cjs`：22/22 满分全绿（`BUILTIN_SNIPPETS` 扩展至 34 项）；
3. `tests/i18n.test.cjs`：11/11 满分全绿。
