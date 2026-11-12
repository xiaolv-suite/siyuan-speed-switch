# ADR 0445：内置代码片段库新增嵌入块悬浮微光与双色渐变标签药丸 CSS 片段（T-7550）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. 块引述/嵌入块（`[data-type="NodeBlockQueryEmbed"]`）原生边框较平淡，缺乏左侧主色指示条与鼠标悬停柔和光晕；
2. 标签元素（`span[data-type="tag"]`）虽然此前已有基本药丸样式，但缺少半透明双色微渐变背景与微抬升悬停手势。

## 决策

1. **新增 `swss-builtin-embedshadow`（嵌入块悬浮光晕与主色指示条）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeBlockQueryEmbed"]`；
   - 归属分类：`layout`；
   - 视觉设计：赋予左侧 `3px solid var(--b3-theme-primary, #3575f0)` 主色垂直指示条，并在悬停时平滑呈现 `box-shadow: 0 4px 18px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 18%, transparent)`。

2. **新增 `swss-builtin-taggradient`（双色微渐变艺术标签药丸）**：
   - 目标选择器：`.protyle-wysiwyg span[data-type="tag"]`；
   - 归属分类：`tag`；
   - 视觉设计：采用 `linear-gradient(135deg, color-mix(in srgb, var(--b3-theme-primary) 14%, transparent), color-mix(in srgb, var(--b3-theme-primary) 4%, transparent))` 双色微渐变背景，`12px` 胶囊圆角，悬停时微抬升 `translateY(-1px)` 与轻投影。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 70 项，双语词条完备无死 key。

## 验证

- **契约测试**：`tests/builtin-snippets-embedshadow-taggradient.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿；`tests/i18n.test.cjs` 11/11 全绿。
