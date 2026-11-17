# ADR 0409：内置代码片段库新增未完成待办主色指示条与有序列表序号胶囊 CSS 片段（T-7514）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器列表与待办工作流排版质感：
1. 思源原生未完成待办事项（`NodeTaskListItem[data-subtype="u"]`）与普通无序列表项区分度有限，在长篇清单中难以一眼抓住焦点；
2. 有序列表（`[data-subtype="o"]`）数字序号表现为无衬底的裸露数字，缺乏现代设计系统中的序号胶囊标识感。

## 决策

1. **新增 `swss-builtin-taskpending`（待办任务未完成项主色指示条与悬停背景）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeTaskListItem"][data-subtype="u"]`；
   - 归属分类：`list`；
   - 视觉设计：在未完成项左侧增加 `border-left: 2.5px solid color-mix(in srgb, var(--b3-theme-primary) 45%, transparent)` 与 `padding-left: 6px`，悬停时加深边框并提供 4% 微底色高亮。

2. **新增 `swss-builtin-numlistaccent`（有序列表序号胶囊微底色与主题色）**：
   - 目标选择器：`.protyle-wysiwyg [data-subtype="o"] > [data-type="NodeListItem"] > .protyle-action`；
   - 归属分类：`list`；
   - 视觉设计：为有序列表数字序号赋予 `color: var(--b3-theme-primary)`、`font-weight: 600`、`border-radius: 4px` 与 `8%` 半透明微底色，悬停时底色加深至 `15%`。

3. **零冲突与全量目录同步**：
   - 经与 `tests/builtin-snippets-batch5.test.cjs` 的反冲突规则比对，两项选择器均严格独立，杜绝与既有 `taskdone` 或 `task` 片段打架；
   - 内置片段库扩充至 52 项，中英文多语言词条同步。

## 验证

- **契约测试**：`tests/builtin-snippets-taskpending-numlistaccent.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
