# ADR 0379：内置片段库新增赛博暗色发光边框与半透明毛玻璃卡片 CSS 片段（T-7483）

## 状态

已采纳 (Accepted) - 2026-10-28

## 背景

代码片段实验室（Snippet Studio）作为雷切插件的核心视觉资产库，致力于为思源笔记创作者提供即开即用、自适应主题的纯 CSS 美化片段。

为进一步丰富排版表现力，本次面向“当前块聚焦”与“嵌入块质感”两大核心高频诉求进行扩展：
1. 编辑区选中块时，思源原生仅有平淡虚线或纯边框，缺乏呼吸感与赛博聚焦点；
2. 嵌入块（`NodeBlockQueryEmbed`）在思源中作为文档引用的重要载体，默认缺乏现代卡片毛玻璃背景与阴影层级。

## 决策

1. **新增 `swss-builtin-neonglow`（赛博霓虹选中块发光边框）**：
   - 目标选择器：`.protyle-wysiwyg [data-node-id].protyle-wysiwyg--select`；
   - 采用主题主色 `var(--b3-theme-primary)` 与 `color-mix(in srgb, ..., 50%, transparent)` 构建平滑扩散的 12px 霓虹微光阴影；
   - 配合 `transition: box-shadow 0.2s ease` 赋予块聚焦以呼吸动效。

2. **新增 `swss-builtin-frostedglass`（半透明毛玻璃嵌入块卡片）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeBlockQueryEmbed"]`；
   - 采用 `backdrop-filter: blur(8px)` 与 `-webkit-backdrop-filter: blur(8px)` 构建硬件加速毛玻璃虚化；
   - 搭配表面半透明背景与 `border-radius: 10px` 圆角，呈现轻盈通透的卡片质感。

3. **模型与语言全覆盖**：
   - `BUILTIN_SNIPPETS` 内置片段库扩充至 36 项；
   - 双语语言文件补齐名称与描述 key，并注册至静态死 key 检测白名单。

## 验证

- **契约测试**：`tests/builtin-snippets-neon-glass.test.cjs` 3/3 满分通过，验证选择器零冲突、protyle 作用域隔离与双语映射；
- **负向验证**：修改模型分类注入故障，验证测试断言真实拦截并失败，还原后满分通过。
