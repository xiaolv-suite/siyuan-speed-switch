# ADR 0393：第二面板工作台组件卡片键盘移动步长提示与拖拽把手微动效加固（T-7497）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）编辑态中，用户可以通过鼠标拖拽把手或全键盘方向键（`Ctrl/Cmd + Arrow`）对小组件进行自由重排。此前：
1. 键盘重排后，回执仅显示笼统的“移动组件”，未呈现卡片移动后的实际序列号与总卡片数，用户难以获知当前组件所处的绝对排位；
2. 拖拽把手（`.sw-home__tool--drag`）仅设置了光标样式，缺乏鼠标悬停抬升与按压微缩放的触觉级（haptic-like）动效反馈。

## 决策

1. **移动操作步长与序列位阶动态回执**：
   - 在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `commitMove` 中，动态计算移动后目标卡片的索引：
     ```typescript
     const pos = result.list.findIndex((c) => c.instanceId === inst.instanceId);
     layoutOpLabel = `${this.i18n.homeHistoryMove} (${pos + 1}/${result.list.length})`;
     ```
   - 提供直观的序号反馈（如“移动组件 (3/7)”），提升全键盘盲操编排确定性。

2. **拖拽把手触觉物理反馈微动效**：
   - 在 `src/styles/_05-settings-widgets.scss` 中增强 `.sw-home__tool--drag`：
     - 悬停（`&:hover`）时呈现 `translateY(-1px)` 悬浮微抬升与轻阴影；
     - 按压（`:active`）时触发 `scale(0.96)` 物理下压形变，松手恢复，强化拖动起跳手感。

## 验证

- **契约测试**：`tests/workbench-card-move-step.test.cjs` 2/2 满分通过，验证步长格式回执、TS/JS 镜像及 SCSS 悬停/按压动效；
- **负向验证**：修改步长序号断言注入故障，确认测试精准拦截，还原后通过。
