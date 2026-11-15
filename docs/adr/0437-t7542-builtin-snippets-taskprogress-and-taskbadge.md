# ADR 0437：内置代码片段库新增任务列表进度导轨与待办项轻质感卡片 CSS 片段（T-7542）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. 待办任务列表（`[data-type="NodeList"][data-subtype="t"]`）在原生渲染中缺乏整体层级导轨，长清单中视觉边界较弱；
2. 单个任务项（`[data-type="NodeTaskListItem"]`）缺乏独立的圆角卡片感与鼠标悬停互动反馈。

## 决策

1. **新增 `swss-builtin-taskprogress`（任务列表进度导轨与悬停微光）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeList"][data-subtype="t"]`；
   - 归属分类：`list`；
   - 视觉设计：左侧赋予 `2.5px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, transparent)` 导轨，内边距 `8px`，悬停时导轨平滑过渡至 100% 主色。

2. **新增 `swss-builtin-taskbadge`（待办项轻质感卡片与微渗透底色）**：
   - 目标选择器：`.protyle-wysiwyg [data-type="NodeTaskListItem"]`；
   - 归属分类：`list`；
   - 视觉设计：声明 `border-radius: 6px` 与 `padding: 2px 6px`，鼠标悬停时平滑渗透 5% 主色轻微底色。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 66 项，双语词条完备无死 key。

## 验证

- **契约测试**：`tests/builtin-snippets-taskprogress-taskbadge.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿；`tests/i18n.test.cjs` 11/11 全绿。
