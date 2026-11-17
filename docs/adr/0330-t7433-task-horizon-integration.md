# 0330. T-7433 对接 Task Horizon 官方协议与 setTaskStatus 写入回调契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7433

## 背景与上下文

根据 Issue #17 中小驴全生态统领中枢指令及 Task Horizon (任务视界) 插件官方规范：
Task Horizon 通过 `window.TaskHorizon`（`protocol === "task-horizon"`, `apiVersion === 1`）公开了 `getTodayTasks()` 与 `setTaskStatus(blockId, statusId)` 接口。
为实现用户在雷切超级工作台与悬浮条上直接查看今日任务并在单键勾选时调用官方写入队列（保证与任务视界内部状态、循环规则和白板一致），雷切需对齐对接。

## 架构决策

1. **适配器安全注册与 800ms 熔断保护**：
   - 在 `src/home-external-adapters.ts` 与 `src/home-external-adapters.js` 中注册 `task-horizon-today`；
   - 通过 `wrapEcosystemModuleRead` 注入 800ms 超时熔断与 try-catch 隔离，防止异常拖垮雷切；
   - 提取任务条目带 `source: "task-horizon"`、`blockId`、`done` 与 `action` 回调。
2. **消费侧单键勾选与文档跳转联动**：
   - 在 `toggleHomeTaskBlock` 中，若来源为 `task-horizon`，直接调用 `window.TaskHorizon.setTaskStatus(blockId, targetStatus)`；
   - 在 `handleHomeItemAction` 中，点击任务条目自动解析 `blockId` 并秒级打开对应思源文档块。
3. **门禁与测试**：
   - 新增 `tests/task-horizon-integration.test.cjs`；
   - 负向验证：若 Task Horizon 写入缺少 protocol 校验导致误调，断言必须精准红。

## 后果与影响

- 达成与 Task Horizon 官方去中心化点对点直连；
- 零快门强依赖，彻底杜绝破坏性越权写入。
