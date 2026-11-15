# ADR 0425：内置代码片段库新增提示块主色卡片与链接虚线下划线 CSS 片段（T-7530）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. Callout 提示块（`[data-subtype="callout"]`）原生样式仅为普通引用块外观，缺少醒目的主题主色竖线与卡片悬停微浮动；
2. 正文链接（`span[data-type="a"]`）原生常带有固化的实线下划线，缺乏现代文献与科技排版中优雅的虚线下划线及悬浮转实线动效。

## 决策

1. **新增 `swss-builtin-calloutcolored`（提示块现代主色卡片与悬浮微浮动）**：
   - 目标选择器：`.protyle-wysiwyg [data-subtype="callout"]`；
   - 归属分类：`quote`；
   - 视觉设计：采用 `border-left: 4px solid var(--b3-theme-primary)` 主色醒目指示条、8% 主色与表面混合底色，悬停时触发 `transform: translateY(-1px)` 悬浮微抬升与轻微阴影。

2. **新增 `swss-builtin-linkdashed`（文档链接虚线下划线与悬停平滑实线）**：
   - 目标选择器：`.protyle-wysiwyg span[data-type="a"]`；
   - 归属分类：`typography`；
   - 视觉设计：采用 `border-bottom: 1px dashed` 柔和虚线，悬浮时平滑过渡为实线与全不透明主色高亮。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 60 项，双语词条完备。

## 验证

- **契约测试**：`tests/builtin-snippets-calloutcolored-linkdashed.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
