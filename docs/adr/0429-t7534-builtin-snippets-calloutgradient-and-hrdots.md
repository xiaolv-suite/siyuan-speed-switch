# ADR 0429：内置代码片段库新增提示块双色渐变卡片与居中三点分割线 CSS 片段（T-7534）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. Callout 提示块（`.b3-callout`）在常规纯色单线左边框之外，缺少从星际主色渐变至温暖金橙色的纵向双色渐变现代卡片视觉；
2. 分割线（`NodeThematicBreak`）在常规实线或渐变细线之外，缺少经典出版物排版中居中三圆点（`•••`）微字距呼吸动效。

## 决策

1. **新增 `swss-builtin-calloutgradient`（提示块双色渐变微边框与阴影卡片）**：
   - 目标选择器：`.protyle-wysiwyg .b3-callout`；
   - 归属分类：`quote`；
   - 视觉设计：采用 `border-image: linear-gradient(180deg, var(--b3-theme-primary), color-mix(in srgb, var(--b3-theme-primary) 40%, #ff9800)) 1` 声明高能双色渐变指示条，5% 主色轻微底色。

2. **新增 `swss-builtin-hrdots`（分割线居中三点微律动艺术排版）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeThematicBreak"]::before`；
   - 归属分类：`divider`；
   - 视觉设计：伪元素居中输出 `content: "•••"`，声明 `0.6em` 字距与半透明主色，悬浮时平滑展开至 `0.8em`。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 62 项，双语词条完备。

## 验证

- **契约测试**：`tests/builtin-snippets-calloutgradient-hrdots.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
