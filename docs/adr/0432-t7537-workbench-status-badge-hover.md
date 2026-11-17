# ADR 0432：第二面板工作台小组件卡片标题栏状态徽标悬停手势与语义颜色高亮加固（T-7537）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，小组件标题栏展示数据时效徽标（`.sw__home-source-health`，如“最新”、“缓存”、“过期”）。此前：
1. 状态徽标表现为静态圆角边框胶囊，缺少鼠标悬停交互反馈；
2. 缺乏悬浮微抬升与三色语义（fresh / cached / stale）半透明微底色高亮。

## 决策

1. **时效状态徽标悬停微浮动**：
   在 `src/styles/_06-widgets-store.scss` 中为 `.sw__home-source-health` 声明：
   - `transition: transform, background-color, box-shadow;`
   - `&:hover`: `transform: translateY(-1px)` 与 `box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08)`。

2. **三色语义微底色渗透**：
   - `.is-fresh:hover`: 10% 翠绿微底色；
   - `.is-cached:hover`: 10% 宝石蓝微底色；
   - `.is-stale:hover`: 10% 暖琥珀微底色。

## 验证

- **契约测试**：`tests/workbench-status-badge-hover.test.cjs` 2/2 满分通过，验证 hover 浮动与三色底色声明及负向注入拦截；
- **全量样式测试**：样式回归测试全数通过。
