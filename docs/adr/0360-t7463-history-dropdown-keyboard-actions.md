# ADR 0360：T-7463 切换器历史下拉列表 Home/End 导航与 Delete 快捷单项清理流闭环

## 背景与上下文

在切换器顶栏的时钟图标（最近打开与撤销关闭历史下拉面板 `sw__history-panel`）中，展示了最近打开与最近关闭的文档列表。
此前该浮层仅具备 `Escape` 监听退出与鼠标点击打开，键盘操作缺少上下方向键流转、`Home` / `End` 极速直达；此外，当用户需要从列表中移除失效或隐私文档时，必须用鼠标点击条目唤出右键菜单或点击操作项，缺少全键盘单项清理捷径。

## 架构决策与实现

1. **历史浮层全键盘双向循环流与 Home/End 极速直达**：
   在 `src/index.ts`（及镜像 `src/index.js`）的 `setupOpenHistoryDropdown` 中加固键盘监听：
   - 按 `Home` 键：直接将焦点授予首个可用条目（`buttons[0]`）；
   - 按 `End` 键：直接将焦点授予末尾条目（`buttons[buttons.length - 1]`）；
   - 按 `ArrowDown` / `ArrowRight`：在面板各按钮间向下/向右平滑循环移动焦点；
   - 按 `ArrowUp` / `ArrowLeft`：在面板各按钮间向上/向左平滑循环移动焦点。
2. **Delete / Backspace 快捷单项清理与焦点平滑过渡**：
   - 在 `renderItem` 中为条目挂载 `data-history-key`、`data-history-source` 与 `data-root-id`；
   - 当焦点位于历史条目（`.sw__history-item`）上按 `Delete` 或 `Backspace` 时：
     - 自动识别其来源（`open` 或 `closed`）并调用对应的 `removeOpenHistoryEntry` / `removeClosedHistoryEntry`；
     - 自动触发 `refreshOpenHistoryDropdowns()` 重新渲染；
     - 平滑将焦点赋予相邻条目（`Math.min(currentIdx, nextButtons.length - 1)`），若列表已空则安全回焦到触发按钮 `trigger`。

## 验证与证据

1. `tests/history-dropdown-keyboard-actions.test.cjs`：4/4 满分全绿（含真实负向验证探针）；
2. `tests/kernel-widgets-wiring.test.cjs`：100/100 保持全绿。
