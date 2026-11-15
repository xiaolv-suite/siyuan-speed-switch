# 0318. T-7421 悬浮球更多抽屉搜索框获焦自动全选与列表项 ArrowUp/Down 双向流闭环契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7421

## 背景与上下文

在全局悬浮球展开的“更多操作”抽屉（`.sw__floating-ball-more`）中，用户通过顶部搜索框（`searchInput`）实时过滤可用动作列表（`listHost`）。
此前搜索框聚焦时不会自动选中旧文本，必须手动退格清空；且当焦点进入动作列表的按钮后，按 `ArrowDown` / `ArrowUp` 无法在相邻可见动作间切换，列表首项亦无法按 `ArrowUp` 顺畅回焦搜索框，全键盘流存在断点。

## 架构决策

1. **搜索框获焦自动全选**：
   - 在 `src/floating-ball-panel.js` 中为 `searchInput` 绑定 `focus` 事件：
     - 若 `searchInput.value` 存在内容，直接调用 `searchInput.select()`。
2. **列表项上下方向键循环流与首项回焦**：
   - 为 `listHost` 容器挂载 `keydown` 监听：
     - 捕获 `ArrowDown` / `ArrowUp` 时，获取当前所有未隐藏的可用按钮集合；
     - 当处于首项（`idx === 0`）且按 `ArrowUp` 时，拦截并平滑回焦搜索框 `searchInput`；
     - 其余情况下在可用按钮间循环流转焦点并调用 `scrollIntoView({block: "nearest"})`。
3. **门禁与测试**：
   - 新增 `tests/floating-ball-more-keyboard-flow.test.cjs`；
   - 负向验证：若首项 ArrowUp 缺少 `idx === 0` 判定直接全局抢占，断言必须精准红。

## 后果与影响

- 悬浮球更多抽屉全键盘流转（搜索框 ⇄ 动作列表）100% 闭环；
- 符合 WCAG 模态面板标准交互体验。
