# 0323. T-7426 全局悬浮球首层快捷动作栏方向键循环焦点流与 Escape 退出契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7426

## 背景与上下文

全局悬浮球展开后，呈现首层常用动作栏（`sw__floating-ball-first-layer`）及“更多操作”触发钮。
此前当用户焦点通过 Tab 进入首层动作栏后，按下方向键（ArrowLeft / ArrowRight / ArrowUp / ArrowDown）无法在相邻快捷按钮间平滑循环切换，按 `Escape` 也无法主动将焦点交还给主触发悬浮球按钮。

## 架构决策

1. **首层按钮方向键循环流转**：
   - 为 `firstLayerHost` 挂载 `keydown` 监听：
     - 当捕获 `ArrowRight` / `ArrowDown` 时向后循环聚焦；
     - 当捕获 `ArrowLeft` / `ArrowUp` 时向前循环聚焦；
     - 仅在非抽屉展开态（`!open`）时生效，避免与二级更多抽屉冲突。
2. **Escape 退出并回焦悬浮球**：
   - 在首层动作栏按 `Escape` 键时，自动将焦点安全交还给悬浮球触发器（`.sw-fab-trigger`）。
3. **门禁与测试**：
   - 新增 `tests/floating-ball-first-layer-keyboard.test.cjs`；
   - 负向验证：若更多抽屉打开时依然抢占首层方向键，断言必须精准红。

## 后果与影响

- 悬浮球快捷交互在桌面与外接物理键盘设备上实现 100% 全键盘可达；
- 与二级更多抽屉形成分层明确的焦点管理。
