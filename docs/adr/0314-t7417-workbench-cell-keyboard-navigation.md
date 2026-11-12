# 0314. T-7417 工作台编辑态小组件卡片平滑方向键焦点导航契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7417

## 背景与上下文

在第二面板工作台（`openSecondPanel`）的编辑态中，卡片具有 `cell.tabIndex = 0`，此前仅支持使用 `Ctrl/Cmd + 方向键` 进行就地重排。
然而在卡片网格中，用户使用普通无修饰键的 `ArrowRight`、`ArrowDown`、`ArrowLeft`、`ArrowUp`、`Home`、`End` 键无法在相邻组件卡片间平滑切换焦点，只能依靠鼠标点击逐个定位，妨碍了全键盘流畅编排体验。

## 架构决策

1. **小组件卡片平滑焦点导航**：
   - 在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `cell` keydown 处理中：
     - 当捕获非修饰键的 `ArrowRight` / `ArrowDown`：平滑聚焦到下一个组件卡片；
     - 当捕获非修饰键的 `ArrowLeft` / `ArrowUp`：平滑聚焦到上一个组件卡片；
     - 当捕获 `Home` / `End`：分别跳转至首个或最后一个组件卡片；
     - 聚焦后调用 `scrollIntoView({ block: "nearest" })` 保持视口可视。
2. **重排与导航语义分层解耦**：
   - 普通方向键专注光标/焦点导航；
   - `Ctrl/Cmd + 方向键` 专注实体布局移动与重排；
   - 互不抢占冲突，遵循标准桌面控件心智。
3. **门禁与测试**：
   - 新增 `tests/workbench-cell-keyboard-navigation.test.cjs`；
   - 负向验证：若带修饰键时误触发普通导航抢占移动，断言必须精准红。

## 后果与影响

- 工作台编辑态全键盘无障碍可达性达到 100% 顺畅水准；
- 形成导航与重排双轨清晰的键盘操作流。
