# ADR 0413：内置代码片段库新增引用大闭引号装饰与渐变分割线微动效 CSS 片段（T-7518）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. 块引用（`NodeBlockquote`）虽然已有前置左竖线或首大双引号，但缺少经典的右下角半透明闭合引号艺术装饰；
2. 分割线（`NodeThematicBreak`）原生表现为纯单色细线，缺少两端羽化虚化渐变与悬浮微缩放交互。

## 决策

1. **新增 `swss-builtin-quoteaccent`（块引用右下角主题主色大闭引号装饰）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeBlockquote"]::after`；
   - 归属分类：`quote`；
   - 视觉设计：在引用块右下角追加定位大闭双引号 `”`，采用 `2.4em` 字号、Georgia 衬线字体、`25%` 主题主色半透明度，并在 `:hover` 时加深至 `45%`，赋予典雅排版质感。

2. **新增 `swss-builtin-dividerpulse`（分割线双向羽化渐变与悬浮微加粗）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeThematicBreak"] > hr`；
   - 归属分类：`divider`；
   - 视觉设计：采用 `90deg` 双向透明渐变、中间 80% 主色圆角细条，悬停时 `scaleY(1.5)` 弹性微动效加粗。

3. **零冲突与全量目录同步**：
   - 选择器严格独立，不与既有片段冲突；
   - 内置片段库扩充至 54 项，双语词条完备。

## 验证

- **契约测试**：`tests/builtin-snippets-quoteaccent-dividerpulse.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
