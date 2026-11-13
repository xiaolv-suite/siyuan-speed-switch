# ADR 0382：内置片段库新增 macOS 终端三色控制点与表格单元格悬浮高亮 CSS 片段（T-7486）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）致力于持续丰富排版资产库。在笔记创作中，代码块（`NodeCodeBlock`）与表格（`table`）是最常用的结构化排版块。此前：
1. 代码块顶部相对平淡，用户期望有类似 macOS 终端窗口风格的红黄绿经典三色控制按钮质感；
2. 表格斑马纹虽已支持隔行变色，但在鼠标悬停密集单元格时缺乏单元格级别的精准聚焦与微阴影反馈。

## 决策

1. **新增 `swss-builtin-codemac`（macOS 终端三色控制点代码块）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeCodeBlock"]::before`；
   - 运用 `box-shadow` 水平投影偏移（`16px`、`32px`）以纯 CSS 单元素伪类绘制经典 macOS 红（`#ff5f56`）、黄（`#ffbd2e`）、绿（`#27c93f`）三色圆点，同时自动扩充代码块顶部 `28px` 内边距，提供极客级终端美感。

2. **新增 `swss-builtin-tablecell`（表格单元格悬浮高亮与微阴影）**：
   - 目标选择器：`.protyle-wysiwyg table td:hover`；
   - 悬浮时触发 `12%` 主题主色半透明柔和微光填充（`color-mix(in srgb, var(--b3-theme-primary) 12%, transparent)`），并叠加 `1px` 内嵌轮廓高亮，显著增强复杂密集数据表格的可读性与交互精准度。

3. **目录与字典完备结转**：
   - `BUILTIN_SNIPPETS` 官方内置片段库扩充至 38 项；
   - 双语语言文件齐备并登记至死 key 静态扫描白名单。

## 验证

- **契约测试**：`tests/builtin-snippets-mac-tablecell.test.cjs` 3/3 满分通过，验证选择器零冲突、作用域隔离与双语映射；
- **负向验证**：修改分类断言注入故障，确认测试能精准拦截报错，还原后通过。
