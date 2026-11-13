# ADR 0433：内置代码片段库新增任务复选框触控热区与表格首列强调 CSS 片段（T-7538）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）持续扩展思源编辑器排版质感与现代微动效：
1. 任务列表项的勾选动作容器（`.protyle-action--task`）原生无明显圆角或悬浮微光，触控点击反馈较平；
2. 数据表格（`table`）中第一列通常承载主键或行标签，原生无层级区分，视觉扫描成本高。

## 决策

1. **新增 `swss-builtin-taskcheckbox`（任务复选框触控热区微缩放与主色底色）**：
   - 目标选择器：`.protyle-wysiwyg .protyle-action--task`；
   - 归属分类：`list`；
   - 视觉设计：采用 `border-radius: 4px`，悬浮时 `transform: scale(1.12)` 与 15% 主色半透明底色。

2. **新增 `swss-builtin-tablefirstcol`（表格首列键名序号加粗与专属主色竖线）**：
   - 目标选择器：`.protyle-wysiwyg table td:first-child`；
   - 归属分类：`table`；
   - 视觉设计：赋予首列 `font-weight: 600`、4% 主色微底色、主色文字与 25% 半透明右侧装饰细线，悬停时底色微加深至 8%。

3. **零冲突与全量目录同步**：
   - 选择器与既有片段完全隔离零冲突；
   - 内置片段库扩充至 64 项，双语词条完备。

## 验证

- **契约测试**：`tests/builtin-snippets-taskcheckbox-tablefirstcol.test.cjs` 4/4 满分通过，验证选择器零冲突、作用域隔离、双语映射与负向注入拦截；
- **全量测试**：`tests/snippet-studio-model.test.cjs` 22/22 全绿。
