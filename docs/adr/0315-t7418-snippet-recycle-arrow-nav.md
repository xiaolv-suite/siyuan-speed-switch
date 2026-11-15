# 0315. T-7418 代码片段回收站列表上下方向键流式焦点移动契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7418

## 背景与上下文

在代码片段实验室（`mountSnippetStudio`）的回收站抽屉（`openRecycleViewer`）中，展示被删除或冲突备份的片段条目。
此前用户在列表中只能使用 Tab 键在各行按钮（恢复、彻底删除）之间逐一聚焦，当回收站有多条历史记录时，无法使用标准的 `ArrowDown` / `ArrowUp` 键在行操作按钮间平滑切换，造成移动成本高。

## 架构决策

1. **列表操作按钮方向键流式导航**：
   - 在 `openRecycleViewer` 的 `keydown` 监听中：
     - 当捕获 `ArrowDown` 或 `ArrowUp` 且焦点位于 `list` 内部时：
     - 获取全部可用操作按钮集合 `listButtons`；
     - 计算下一个焦点索引 `nextIdx = (idx + (delta) + length) % length`；
     - 触发 `listButtons[nextIdx].focus({preventScroll: true})` 并调用 `scrollIntoView({block: "nearest"})`。
2. **门禁与测试**：
   - 新增 `tests/snippet-recycle-arrow-nav.test.cjs`；
   - 负向验证：若未限定在 list 内部时误接管头部按钮，断言必须精准红。

## 后果与影响

- 极大提升代码片段回收站全键盘批量清理与恢复体验；
- 保持标准的流式无障碍循环导航。
