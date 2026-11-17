# ADR 0441：内置代码片段库新增引用块悬挂大引号与行内代码霓虹微光 CSS 片段（T-7546）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. 引用块（`NodeBlockquote`）虽然此前已有金色微光与闭合下引号，但缺少经典杂志报刊式左上角悬挂半透明超大上引号（“）的排版样式；
2. 行内代码片段（`code`）多为普通灰色底色，缺乏类似暗黑赛博风格的微透明边框与柔和霓虹微光投影。

## 决策

1. **新增 `swss-builtin-quotehanging`（引用块悬挂大引号艺术标记）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeBlockquote"]::before`；
   - 归属分类：`quote`；
   - 视觉设计：利用 `content: "“"` 伪元素，左上角绝对定位 `top: -8px; left: 8px; font-size: 3em`，使用 Times 经典衬线体与 22% 半透明主色，并设置 `pointer-events: none` 杜绝遮挡正文光标。

2. **新增 `swss-builtin-inlineneon`（行内代码霓虹边框与微光投影）**：
   - 目标选择器：`.protyle-wysiwyg code`；
   - 归属分类：`code`；
   - 视觉设计：赋予 1px 半透明主色微边框与 `box-shadow: 0 0 6px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 20%, transparent)`，悬停时微光扩散至 10px。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 68 项，双语词条完备无死 key。

## 验证

- **契约测试**：`tests/builtin-snippets-quotehanging-inlineneon.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿；`tests/i18n.test.cjs` 11/11 全绿。
