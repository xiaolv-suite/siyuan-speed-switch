# ADR 0453：内置代码片段库新增引用块悬停平移与列表圆点微动效 CSS 片段（T-7558）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. 引用块（`[data-type="NodeBlockquote"]`）在鼠标悬停时通常为静态，缺少轻微交互位移与动态半透明底色扩散反馈；
2. 无序列表（`[data-subtype="u"]`）项目符号小圆点原生较小且静态，悬停列表项时缺乏视觉吸引力与焦点聚拢感。

## 决策

1. **新增 `swss-builtin-quotehover`（引用块悬停平移与微渐变底色）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeBlockquote"]:hover`；
   - 归属分类：`quote`；
   - 视觉设计：增加平滑过渡 `transition: transform 0.18s ease, background-color 0.18s ease`，悬停时向右平移 `transform: translateX(3px)` 并注入 6% 主色微透明底色。

2. **新增 `swss-builtin-listbulletpulse`（无序列表圆点微缩放与主色高光）**：
   - 目标选择器：`.protyle-wysiwyg [data-subtype="u"] > [data-type="NodeListItem"] > .protyle-action`；
   - 归属分类：`list`；
   - 视觉设计：默认圆点图标赋予主色文字前景，列表项悬停时圆点图标放大 `transform: scale(1.25)`，形成呼吸般的聚焦感。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 74 项，双语词条完备无死 key。

## 验证

- **契约测试**：`tests/builtin-snippets-quotehover-listbulletpulse.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿；`tests/i18n.test.cjs` 11/11 全绿。
