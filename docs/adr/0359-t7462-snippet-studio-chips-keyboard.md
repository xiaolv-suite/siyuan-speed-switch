# ADR 0359：T-7462 片段实验室过滤选择器全键盘流与 Escape 阶梯清空加固

## 背景与上下文

在代码片段实验室（Snippet Studio）的片段选择与浏览抽屉中，用户需要对来源（所有/内建/我的）、类型（CSS/JS）、分类（15 种分类：排版、表格、代码、高亮等）和排序方式进行高频筛选。
此前该区域的搜索输入框获焦时不会自动选中旧词，按 `Escape` 键无论是否有输入词均无法清空，且从搜索框无法通过键盘快速直达下方卡片列表；同时多项筛选下拉框缺少 `Home` / `End` 极速跳选能力，破坏了全键盘操作的连续性。

## 架构决策与实现

1. **搜索框获焦自动全选与阶梯式 Escape 退出**：
   在 `src/snippet-studio-ui.js` 中：
   - 监听 `query` 搜索框的 `focus` 事件，存在内容时执行 `query.select()`；
   - 监听 `keydown` 中的 `Escape`：
     - 若 `query.value` 存在文本，清空输入框并即时重置 `committedQuery` 与 `render()`，清空当前过滤；
     - 若 `query.value` 已为空，调用 `closePicker()` 安全退出选择器抽屉。
2. **ArrowDown / Enter 快速直达卡片列表**：
   在搜索框中按 `ArrowDown` 或 `Enter` 时，平滑将焦点赋予卡片列表中的首个可用按钮（`list.querySelector("button:not(:disabled)")`）。
3. **过滤下拉框组 Home/End 极速跳选**：
   为 `[source, language, category, catalogSort]` 统一挂载键盘监听：
   - 按 `Home` 键：直接选择首项（`input.selectedIndex = 0`，如“全部分类”），触发即时 `render()`；
   - 按 `End` 键：直接选择末项（`input.selectedIndex = input.options.length - 1`），触发即时 `render()`。

## 验证与证据

1. `tests/snippet-studio-chips-keyboard.test.cjs`：4/4 满分全绿（含真实负向验证探针）；
2. 保持与整体片段实验室生命周期和脏稿守卫兼容。
