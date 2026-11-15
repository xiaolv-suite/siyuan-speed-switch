# ADR 0401：内置片段库新增标签药丸胶囊与外链对角箭头微交互 CSS 片段（T-7506）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版与微交互能力：
1. 思源原生标签（`[data-type="tag"]`）表现为普通带有 `#` 前缀的带底色文字，在视觉流中与常规正文的边界感不足，缺乏现代卡片笔记的精致胶囊感；
2. 外部超链接（`a[href^="http"]`）与库内双链、块引用没有明显区分，读者点击时无法预判是否会离开当前思源笔记环境打开外部浏览器。

## 决策

1. **新增 `swss-builtin-tagpill`（标签药丸胶囊微边框与悬浮微动效）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="tag"]`；
   - 归属分类：`tag`；
   - 视觉设计：采用 `border-radius: 999px` 胶囊药丸轮廓、`color-mix` 派生主题主色半透明微底色与 `1px` 柔和边框，并在 `:hover` 时赋予 `-1px` 向上微浮动与加深底色微交互。

2. **新增 `swss-builtin-extlinkicon`（外链对角箭头指示符与悬浮位移）**：
   - 目标选择器：`.protyle-wysiwyg a[href^="http"]::after`；
   - 归属分类：`typography`；
   - 视觉设计：在所有 http/https 外链尾部自动追加优雅轻量对角箭头 ` ↗`，并在悬浮时平滑向右上平移 `translate(1px, -1px)` 并提亮透明度，提供清晰的外跳预判认知。

3. **目录与字典完备结转**：
   - `BUILTIN_SNIPPETS` 官方内置片段库扩充至 48 项；
   - 双语语言文件（`zh-CN.json` 与 `en.json`）齐备，死 key 扫描全面覆盖；
   - `tests/snippet-studio-model.test.cjs` 资产规模全面更新至 48 项。

## 验证

- **契约测试**：`tests/builtin-snippets-tagpill-extlink.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **模型测试**：`tests/snippet-studio-model.test.cjs` 22/22 绿灯；
- **全量测试**：9450 项测试全数通过，无任何失败回归。
