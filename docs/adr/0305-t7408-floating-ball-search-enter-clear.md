# 0305. T-7408 全局悬浮球更多操作抽屉空态重置与回车清空自愈契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7408

## 背景与上下文

在全局悬浮球（Floating Ball）唤出“更多操作”抽屉（`.sw__floating-ball-more`）中，用户可通过顶部的搜索框过滤可用动作。
此前当搜索词无任何结果命中时，按 `Enter` 键无任何反馈，用户处于被困在空列表的迟滞状态。

## 架构决策

1. **空态回车自愈恢复**：
   - 在 `src/floating-ball-panel.js` 的 `searchInput` keydown 处理中：
     - 当捕获 `Enter` 且当前列表中无可见可用动作项（`!firstVisible`）时；
     - 若搜索框有输入内容，阻止默认提交，自动清空 `searchInput.value = ""` 与内部 `searchQuery`，并即时触发 `filterRows()` 恢复全部动作列表。
2. **门禁与测试**：
   - 新增 `tests/floating-ball-search-enter-clear-contract.test.cjs`；
   - 负向验证：若无可见项且有输入词时按 Enter 依然不执行清空，断言必须精准红。

## 后果与影响

- 极大提升悬浮球更多操作抽屉在复杂检索场景下的容错自愈能力；
- 形成 Escape 清空与 Enter 无结果自愈的双重保护网。
