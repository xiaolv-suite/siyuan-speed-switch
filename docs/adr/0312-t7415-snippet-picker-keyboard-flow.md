# 0312. T-7415 片段选择器搜索框双向键盘流与空结果 Enter 清空自愈契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7415

## 背景与上下文

在第三面板代码片段实验室（`mountSnippetStudio`）的片段选择器（`openPicker`）中，用户通过顶部搜索框（`query`）实时过滤内置与原生片段。
此前搜索框聚焦时不会自动选中旧词；且从输入框按 `ArrowDown` 无法直接平滑移动至第一项片段，列表首项按 `ArrowUp` 亦无法逆向返回搜索框；同时搜索无匹配时按 `Enter` 键静默无响应，容易造成卡在空列表抽屉中的操作阻滞。

## 架构决策

1. **搜索框获焦自动全选**：
   - 为片段选择器 `query` 输入框绑定 `focus` 事件：
     - 若 `query.value` 存在内容，直接调用 `query.select()`。
2. **搜索框 ⇄ 列表双向键盘流**：
   - 当焦点在 `query` 上按 `ArrowDown` 时，平滑聚焦到列表首个片段（`.sw-studio__catalog-item`）；
   - 当焦点在列表首项（`index === 0`）按 `ArrowUp` 时，逆向平滑回焦搜索框 `query`。
3. **空结果 Enter 自愈清空**：
   - 当 `doc.activeElement === query` 且检索词无任何匹配项时，按下 `Enter` 键自动清空 `query.value = ""` 并重置渲染，恢复全量片段列表。
4. **门禁与测试**：
   - 新增 `tests/snippet-picker-keyboard-flow.test.cjs`；
   - 负向验证：若首项 ArrowUp 缺少 index === 0 判定直接抢占，断言必须精准红。

## 后果与影响

- 代码片段选择器全键盘检索体验大幅提升；
- 保持跨表面一致的 Enter 自愈与双向方向键流。
