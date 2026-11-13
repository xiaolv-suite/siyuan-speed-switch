# ADR 0449：内置代码片段库新增图片卡片画框衬底与代码行号右对齐 CSS 片段（T-7554）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. 图片元素（`[data-type="NodeImage"]`）此前已有圆角与悬停放大，但缺少独立外层半透明画框衬底、细边框与悬停微光卡片感；
2. 代码块（`[data-type="NodeCodeBlock"]`）左侧行号文本（`.protyle-linenumber__rows`）默认为居左或常规透明度，缺乏专业 IDE 常见的右对齐与 65% 柔和文字透明度。

## 决策

1. **新增 `swss-builtin-imgcard`（图片画框卡片衬底与微发光边框）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeImage"]`；
   - 归属分类：`image`；
   - 视觉设计：赋予 `padding: 6px`、90% 半透明表面底色、`10px` 圆角，悬停时主色边框与柔和微光投影 `box-shadow: 0 4px 14px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 12%, transparent)`。

2. **新增 `swss-builtin-codelineright`（代码块行号右对齐与柔和透明度）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeCodeBlock"] .protyle-linenumber__rows`；
   - 归属分类：`code`；
   - 视觉设计：行号区域声明 `text-align: right`、`padding-right: 8px` 与 `opacity: 0.65`，形成清晰垂直参考线。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 72 项，双语词条完备无死 key。

## 验证

- **契约测试**：`tests/builtin-snippets-imgcard-codelineright.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿；`tests/i18n.test.cjs` 11/11 全绿。
