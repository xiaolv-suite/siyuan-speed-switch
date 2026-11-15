# ADR 0397：内置片段库新增代码明亮高亮与块引用专属主色下划线 CSS 片段（T-7502）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）致力于针对思源核心知识网络与代码阅读场景持续提供高水准排版。此前：
1. 代码块在暗色主题下，字符串与数值与周围代码区分度不够高，容易视觉疲劳；
2. 块引用（`[data-type="block-ref"]`）作为思源核心双链网络链接，原生与普通文档超链接缺乏明确的视觉区分。

## 决策

1. **新增 `swss-builtin-codevibrant`（代码高亮明亮字符串与数值强调）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeCodeBlock"] .hljs-string` 与 `.hljs-number`；
   - 采用经典 One Dark 柔和明亮绿（`#98c379`）与暖橙（`#d19a66`），大幅增强多行代码在暗色背景下的辨识度。

2. **新增 `swss-builtin-blockrefaccent`（块引用链接专属主色下划线）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="block-ref"]`；
   - 采用 `1.5px` 主题主色半透明下划线，并在悬停时加深至全不透明，赋予双链引用专属的视觉层级。

3. **目录与字典完备结转**：
   - `BUILTIN_SNIPPETS` 官方内置片段库扩充至 46 项；
   - 双语语言文件齐备并登记至死 key 静态扫描白名单。

## 验证

- **契约测试**：`tests/builtin-snippets-codevibrant-blockref.test.cjs` 3/3 满分通过，验证选择器零冲突、作用域隔离与双语映射；
- **负向验证**：修改分类断言注入故障，确认测试精准拦截，还原后通过。
