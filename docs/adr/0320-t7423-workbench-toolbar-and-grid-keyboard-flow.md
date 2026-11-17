# 0320. T-7423 工作台顶栏工具条与小组件网格 ArrowDown/Up 双向流闭环契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7423

## 背景与上下文

在第二面板工作台（`openSecondPanel`）中，顶栏工具条（`bar`）包含编辑切换、清空全部、场景预设、重试等多个操作按钮。
此前工具条按钮未声明左右方向键循环导航，焦点也无法通过 `ArrowDown` 顺畅落入下方的组件网格首张卡片；同时首张卡片按 `ArrowUp` 无法逆向回焦至顶栏按钮，造成顶栏与组件网格间的键盘割裂。

## 架构决策

1. **顶栏工具条左右循环与下落网格**：
   - 为 `bar` 声明 `role="toolbar"` 与 `aria-label`；
   - 监听 `bar` 的 `keydown` 事件：
     - `ArrowRight` / `ArrowLeft`：在顶栏可用按钮集合中循环流转焦点；
     - `ArrowDown`：平滑聚焦到工作台首个组件卡片（`.sw-home__cell`）并调用 `scrollIntoView({block: "nearest"})`。
2. **首张卡片向上逆向回焦工具栏**：
   - 在卡片 `keydown` 监听中：
     - 当捕获 `ArrowUp` 且处于首张卡片（`idx === 0`）时，逆向平滑回焦顶栏首个可用按钮。
3. **门禁与测试**：
   - 新增 `tests/workbench-toolbar-and-grid-keyboard-flow.test.cjs`；
   - 负向验证：若首张卡片 ArrowUp 缺少 `idx === 0` 判定必定精准红。

## 后果与影响

- 工作台顶栏与组件网格构成完整的无缝全键盘双向流；
- 全键盘无障碍体验进一步夯实。
