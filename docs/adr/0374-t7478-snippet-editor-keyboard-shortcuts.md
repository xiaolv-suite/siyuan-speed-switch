# ADR 0374：T-7478 代码片段实验室编辑器 ⌘S 快捷保存、⌘⇧C 快速复制与 ⌘Enter 格式化流

## 背景与上下文

在第三面板（代码片段实验室 Snippet Studio）的文本代码编辑器中，开发者高频编写与调试 CSS/JS 片段。
此前编辑器虽然支持了 Tab 两空格缩进与 Ctrl+S 保存，但在全文复制、格式化排版与查找替换时，仍需频繁移出焦点点击工具栏小按钮，破坏了连续编程流。

## 架构决策与实现

1. **开发者专属快捷键管线**：
   在 `src/snippet-studio-ui.js` 的 `editor` `keydown` 监听中：
   - `Ctrl/Cmd + Shift + C`：一键触发 `copyText(draft.content || editor.value)` 全文复制代码，并在底部状态栏反馈 `snippetCopied`；
   - `Ctrl/Cmd + Enter`：一键触发 `formatButton.click()` 自动规范化排版；
   - `Ctrl/Cmd + F`：一键调用 `toggleFindBar()` 展开页内查找替换栏并聚焦查询框。
2. **输入法安全保护**：
   所有快捷键在 `composing`（中文输入法候选）阶段均保持放行（不截断输入法内部组合）。

## 验证与证据

1. `tests/snippet-editor-shortcuts.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. 保持与既有 Tab 缩进（T-7410）与历史撤销（T-6957）完全兼容。
