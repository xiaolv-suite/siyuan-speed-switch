# ADR 0417：内置代码片段库新增行内代码卡片背景与挂件嵌入块悬浮微光 CSS 片段（T-7522）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器行内元素与块级排版质感：
1. 行内代码（`span[data-type="code"]`）原生表现为纯文字与极淡底色，在多层级笔记或混合排版中难以一眼识别变量与配置键；
2. 挂件嵌入块（`[data-type="NodeWidget"]`，包括 IFrame、自制挂件或外部嵌入卡片）原生无显式边框，容易与正文其他卡片产生层级黏连。

## 决策

1. **新增 `swss-builtin-inlinecodecard`（行内代码微质感卡片与主色边框）**：
   - 目标选择器：`.protyle-wysiwyg span[data-type="code"]`；
   - 归属分类：`code`；
   - 视觉设计：采用 `font-family-code`、`border-radius: 5px`、`8%` 主色与表面混合底色及 `22%` 半透明细边框，悬停时边框与底色轻微提亮，突出代码关键字。

2. **新增 `swss-builtin-embedglow`（挂件嵌入块圆角外边框与悬浮微光）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeWidget"]`；
   - 归属分类：`layout`；
   - 视觉设计：采用 `border-radius: 8px`、`overflow: hidden` 与 `25%` 主色边框，悬停时触发 `box-shadow: 0 4px 16px` 柔和主题色微光。

3. **零冲突与全量目录同步**：
   - 选择器与既有 `inlinecode`（`code` 标签）及 `frostedglass`（`NodeBlockQueryEmbed`）零冲突；
   - 内置片段库扩充至 56 项，双语词条完备。

## 验证

- **契约测试**：`tests/builtin-snippets-inlinecodecard-embedglow.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
