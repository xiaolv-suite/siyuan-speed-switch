# ADR 0363：T-7466 内置片段库新增链滴精品呼叫盒与双栏响应式卡片 CSS 片段

## 背景与上下文

小驴雷切第三面板（代码片段实验室 Snippet Studio）内置了一套精品 CSS 代码片段库（`BUILTIN_SNIPPETS`），供用户开箱即用或安全分叉定制。
根据链滴思源社区的真实写作痛点：
1. 原生引述块视觉单调，用户迫切需要具备彩色左光标、圆角阴影与柔和底色的“呼叫盒 / 提示框（Callout Box）”；
2. 缺乏轻量零插件的“双栏 / 多栏并排布局卡片（Multi-Column Cards）”，长图文无法自适应并列展示。

## 架构决策与实现

1. **精选并设计两项原生 CSS 片段**：
   - `swss-builtin-callout`（微质感彩色提示框）：
     ```css
     .protyle-wysiwyg [data-type="NodeBlockquote"] {
       border-inline-start: 4px solid var(--b3-theme-primary, #3575f0);
       border-radius: 0 10px 10px 0;
       background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 6%, var(--b3-theme-surface, transparent));
       padding: 0.8em 1.2em;
       box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
     }
     .protyle-wysiwyg [data-type="NodeBlockquote"] > div {
       line-height: 1.7;
       color: var(--b3-theme-on-surface, currentColor);
     }
     ```
   - `swss-builtin-multicolumn`（并排双栏图文卡片）：
     ```css
     .protyle-wysiwyg [data-subtype="row"] {
       display: flex;
       flex-wrap: wrap;
       gap: 12px;
     }
     .protyle-wysiwyg [data-subtype="row"] > [data-type] {
       flex: 1 1 calc(50% - 12px);
       min-width: 240px;
       border: 1px solid var(--b3-border-color, #e2e8f0);
       border-radius: 12px;
       padding: 12px;
       background: var(--b3-theme-surface, #fff);
       box-sizing: border-box;
     }
     ```
2. **纯粹 CSS 变量化与双语支持**：
   - 全部颜色变量引用 `--b3-theme-*` 与 `--b3-border-color`，支持明暗色模式 100% 自动自适应；
   - 在 `zh-CN.json` 与 `en.json` 中配置清晰的双语名称与说明字段；
   - 在 `tests/i18n.test.cjs` 的 `ALLOWED_UNUSED` 数组中登记白名单。

## 验证与证据

1. `tests/builtin-snippets-callout.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. `tests/snippet-studio-model.test.cjs`：22/22 满分全绿（`BUILTIN_SNIPPETS` 扩展至 28 项）；
3. `tests/i18n.test.cjs`：11/11 满分全绿。
