# 0331. T-7434 动作画板接入 Task Horizon 今日任务直达与极速动作契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7434

## 背景与上下文

为了响应 Issue #17 的小驴全生态互联建议，在动作画板（⌘K）中打通任务管理链路。
当用户在思源任何页面或卡片上唤出画板时，除了原有的“继续漫游”以外，应支持一键查看与切入 Task Horizon 今日待办任务（快捷键 `⌥H`）。

## 架构决策

1. **画板预设动作注册**：
   - 在 `src/action-palette-model.js` 的 `getBuiltinActionDefinitions` 中增加：
     - `{id: "task-horizon-today", section: s.OPEN, label: lk("taskHorizon"), icon: "iconCheck", shortcut: "⌥H", supportedKinds: ALL_KINDS, platforms: ALL_PLATFORMS}`。
2. **安全执行器与 800ms 熔断**：
   - 在 `src/index.ts` 与 `src/index.js` 中声明 `executeTaskHorizonToday`：
     - 探测 `getBridgeSafely("taskHorizon") || window.TaskHorizon`；
     - 未安装时友好提示，已安装时优先调用 `openView("checklist")` 或 800ms 探测首个今日待办并直接秒级打开所在文档块。
3. **门禁与测试**：
   - 新增 `tests/action-palette-task-horizon.test.cjs`；
   - 负向验证：若画板缺少 task-horizon-today 动作定义，断言必须精准红。

## 后果与影响

- 动作画板无缝衔接个人任务管理；
- 符合零快门依赖生态协同范式。
