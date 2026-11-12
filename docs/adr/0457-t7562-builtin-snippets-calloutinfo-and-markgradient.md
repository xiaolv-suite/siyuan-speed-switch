# ADR 0457：内置代码片段库新增信息提示块微光卡片与文本高亮渐变 CSS 片段（T-7562）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. 信息类提示块（`[data-type="NodeBlockquote"][data-subtype="info"]`）在思源中常承载核心提示，此前缺少专属海蓝立体指示条与柔和边框投影；
2. 文本高亮标记（`span[data-type="mark"]`）原生黄色底色较单调，缺少双色暖调渐变、圆角及跨行完整克隆（`box-decoration-break: clone`）支持。

## 决策

1. **新增 `swss-builtin-calloutinfo`（信息提示块海蓝微光卡片）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeBlockquote"][data-subtype="info"]`；
   - 归属分类：`quote`；
   - 视觉设计：赋予左侧 `4px solid #1890ff` 海蓝指示条，8% 海蓝半透明底色，`6px` 圆角，及 `box-shadow: 0 2px 8px color-mix(in srgb, #1890ff 15%, transparent)`。

2. **新增 `swss-builtin-markgradient`（文本高亮渐变衬底与圆角）**：
   - 目标选择器：`.protyle-wysiwyg span[data-type="mark"]`；
   - 归属分类：`typography`；
   - 视觉设计：采用 `linear-gradient(120deg, color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, #ffeb3b), color-mix(in srgb, var(--b3-theme-primary, #3575f0) 10%, #fff59d))` 暖调微渐变，设置 `border-radius: 4px` 与 `box-decoration-break: clone`。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 76 项，双语词条完备无死 key。

## 验证

- **契约测试**：`tests/builtin-snippets-calloutinfo-markgradient.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿；`tests/i18n.test.cjs` 11/11 全绿。
