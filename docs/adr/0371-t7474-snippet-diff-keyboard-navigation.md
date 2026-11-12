# ADR 0371：T-7474 代码片段实验室版本差异对比浮层全键盘流与 Escape 安全回退

## 背景与上下文

在代码片段实验室（Snippet Studio）中，当用户利用 AI 生成候选改动、拉取 Gist 差异或进行历史对比时，界面会呈现行级差异面板（`aiDiffPanel` / `sw-studio__diff`），其中包含各个独立的 diff hunk 块与切换接受按钮（`sw-studio__diff-hunk-head`）。
此前该差异面板未声明键盘可聚焦属性，且未监听按键流，用户在审阅差异时必须频繁使用鼠标点击各个 hunk 按钮，按下 `Escape` 键无法直接收起差异并回到代码编辑现场，导致多模态审阅流存在交互割裂。

## 架构决策与实现

1. **差异面板键盘聚焦与 Escape 退出回焦**：
   在 `src/snippet-studio-ui.js` 中：
   - 为 `aiDiffPanel` 声明 `tabIndex = 0`，成为合法的全键盘操作容器；
   - 监听 `Escape` 按键：调用 `hideAIDiffPanel()` 收起差异面板，并自动将焦点无缝恢复给代码编辑器 `editor.focus()`。
2. **差异块快速跳转流（Home/End 与上下/jk）**：
   - 监听 `Home` 键：直达首个差异块控制头 `hunkButtons[0]`；
   - 监听 `End` 键：直达末尾差异块控制头 `hunkButtons[hunkButtons.length - 1]`；
   - 监听 `ArrowDown` 与 `j` 键：向下平滑循环聚焦差异块；
   - 监听 `ArrowUp` 与 `k` 键：向上平滑循环聚焦差异块。

## 验证与证据

1. `tests/snippet-diff-keyboard-nav.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. 保持与 AI 差异多轮迭代（T-6917）及局部采纳契约完全兼容。
