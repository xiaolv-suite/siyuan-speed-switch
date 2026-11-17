# 0303. T-7406 切换器空态引导卡片全键盘无障碍导航契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7406

## 背景与上下文

当用户关闭全部页签或切换器处于无卡片空态时，界面会渲染空态引导卡片区（`.sw__empty-action`）与速查胶囊条（`.sw__empty-syntax-chip`）。
此前这些引导操作仅能通过鼠标点击，键盘方向键（ArrowRight/ArrowLeft/ArrowDown/ArrowUp）与 Escape 键在按钮上无法平滑移动，首个按钮也无法通过按 ArrowUp 顺畅回焦顶部的搜索输入框，造成空态下全键盘流中断。

## 架构决策

1. **空态操作全键盘流驱动**：
   - 在 `src/index.ts` 与 `src/index.js` 的 `buildEmptyState` 中：
     - 为空态操作按钮与速查胶囊挂载统一键盘调度；
     - `ArrowRight` / `ArrowDown`：平滑聚焦到下一个操作按钮；
     - `ArrowLeft` / `ArrowUp`：聚焦到上一个按钮，当处于首项时按 ArrowUp 自动平滑向上回焦搜索框（`.sw__search`）；
     - `Escape`：直接平滑回焦搜索框。
2. **门禁与测试**：
   - 新增 `tests/empty-state-keyboard-navigation.test.cjs`；
   - 负向验证：若空态操作项缺少键盘导航分支或首项无法向上回焦搜索框，断言必须精准红。

## 后果与影响

- 切换器在无页签空态下依然保持 100% 顺畅的纯键盘交互；
- 符合 WCAG 2.1 键盘无障碍可达性要求。
