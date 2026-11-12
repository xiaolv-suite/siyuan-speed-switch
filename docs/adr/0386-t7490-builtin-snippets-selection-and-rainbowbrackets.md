# ADR 0386：内置片段库新增正文划词选中微光与代码块彩虹嵌套标点 CSS 片段（T-7490）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）致力于提供精致、高辨识度且对视觉友好的 CSS 美化方案。此前：
1. 思源默认正文划词选中底色较为突兀（部分主题为高饱和色块），容易遮挡文字下方的细线条与笔画；
2. 代码块内嵌套层级（括号、分号、冒号等标点）缺乏区分度，在阅读多层函数或嵌套对象时容易迷失层级。

## 决策

1. **新增 `swss-builtin-selectionglow`（正文划词选中微光高亮）**：
   - 目标选择器：`.protyle-wysiwyg ::selection`；
   - 采用主题主色 `var(--b3-theme-primary)` 与 `color-mix(in srgb, ..., 28%, transparent)` 柔光渲染；
   - 设置 `color: inherit` 保留字符原有前景与语法高亮，既具辨识度又不遮蔽字形。

2. **新增 `swss-builtin-rainbowbrackets`（代码块彩虹嵌套标点与括号）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeCodeBlock"] .hljs-punctuation` 与 `.hljs-bracket`；
   - 将常规标点与括号分别赋予主题主色与暖色渐进调和色（`color-mix(in srgb, var(--b3-theme-primary) 80%, #ff5f56)`），形成自然清晰的层级区分。

3. **目录与字典完备结转**：
   - `BUILTIN_SNIPPETS` 官方内置片段库扩充至 40 项；
   - 双语语言文件齐备并登记至死 key 静态扫描白名单。

## 验证

- **契约测试**：`tests/builtin-snippets-selection-rainbow.test.cjs` 3/3 满分通过，验证选择器零冲突、作用域隔离与双语映射；
- **负向验证**：修改分类断言注入故障，确认测试能精准拦截报错，还原后通过。
