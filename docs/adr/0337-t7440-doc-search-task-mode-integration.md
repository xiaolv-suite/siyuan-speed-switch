# 0337. T-7440 全库文档搜索与万能搜索执行流集成待办穿透模式契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7440

## 背景与上下文

在 T-7439 实现了 `SEARCH_MODES.TASK` 的语法解析与 SQL 请求规划后，需要将其接入搜索请求执行管道（`runDocSearchFetch`）、结果行渲染（`renderDocResultItem`）及速查指引路由（`activateDocResultItem`）。
同时，响应 Issue #17 中关于万能搜索直达 Task Horizon 今日任务的建议，在待办搜索态下无缝聚合来自 Task Horizon 的今日待办任务，达成双向闭环。

## 架构决策

1. **待办穿透执行通道**：
   - 在 `runDocSearchFetch` 中，当 `penetrationPlan.mode === SEARCH_MODES.TASK` 时，向内核发送待办专用 SQL 查询；
   - 提取并归一化聚合结果。
2. **Task Horizon 今日待办智能前置**：
   - 探测 `window.TaskHorizon`（`protocol === "task-horizon"`）；
   - 若就绪且包含今日任务，根据用户输入过滤并优先前置展示，标注 `今日任务视界 · 🔥高优`；
   - 按 `id` 去重合并。
3. **速查指引（?模式）交互路由**：
   - 在 `activateDocResultItem` 中拦截 `help-task`，自动将输入框前缀置为 `-` 并触发检索。
4. **结果行视觉渲染对齐**：
   - `doc.kind === "task"` 时，标签展示 `this.i18n.searchModeTask || "待办"`。
5. **门禁与测试**：
   - 新增 `tests/doc-search-task-mode-integration.test.cjs`；
   - 负向验证：若缺少 Task Horizon 协议校验或 help-task 分支，断言必须精准红。

## 后果与影响

- 全库文档与万能搜索完整支持待办任务穿透检索；
- 官方 Task Horizon 今日待办秒级聚合展示，回车直达任务所在块。
