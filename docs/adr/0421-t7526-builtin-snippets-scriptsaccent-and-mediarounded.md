# ADR 0421：内置代码片段库新增上下标主色强调与音视频媒体卡片圆角微边框 CSS 片段（T-7526）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. 学术笔记与化学/数学文档中的上下标（`[data-type="sup"]`, `[data-type="sub"]`）原生字号缩小但与普通文字并无色彩或衬底差异，缺少文献索引角标与学术注记的胶囊质感；
2. 插入的音视频媒体播放器（`[data-type="NodeVideo"]`, `[data-type="NodeAudio"]`）原生直角无边框，在深色或多卡片布局中缺乏精致的容器包裹感。

## 决策

1. **新增 `swss-builtin-scriptsaccent`（上下标主色强调与半透明微底色）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="sup"], .protyle-wysiwyg [data-type="sub"]`；
   - 归属分类：`typography`；
   - 视觉设计：采用 `color: var(--b3-theme-primary)`、`font-weight: 600`、`border-radius: 3px` 与 8% 主色半透明底色，悬停时微提亮至 18%。

2. **新增 `swss-builtin-mediarounded`（音视频媒体卡片圆角微边框与悬浮微光）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeVideo"], .protyle-wysiwyg [data-type="NodeAudio"]`；
   - 归属分类：`layout`；
   - 视觉设计：声明 `border-radius: 8px`、`overflow: hidden` 与 20% 主色边框，悬停时触发 15% 主色氛围微光。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 58 项，双语词条完备。

## 验证

- **契约测试**：`tests/builtin-snippets-scriptsaccent-mediarounded.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
