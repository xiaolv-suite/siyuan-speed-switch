# ADR 0402：代码片段实验室备份还原预览面板全选快捷键与键盘流加固（T-7507）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在代码片段实验室（Snippet Studio）的备份还原流程中，用户在导入包含多个片段的 JSON 备份时会打开 `openRestorePreview` 差异比对弹窗。此前：
1. 用户在面对大量待恢复差异项时，若只想恢复单项或快速全部勾选/全部取消，只能逐项点击复选框；
2. 在弹窗内按下 `Ctrl+A` / `Cmd+A` 会触发浏览器默认全选整个宿主窗口文字，而非全选待恢复项目列表；
3. 键盘无法在列表复选框之间通过方向键 `ArrowUp` / `ArrowDown` 循环跳转或通过 `Home` / `End` 快速到达首尾项；
4. 复选框缺乏无障碍 `aria-label` 明确标识。

## 决策

1. **Ctrl+A / Cmd+A 全选与反选极速切换**：
   - 监听弹窗内部的 `(ctrlKey || metaKey) && key.toLowerCase() === "a"`；
   - 阻止宿主默认文本全选事件，读取列表内所有复选框；
   - 当全部已勾选时一键全取消，否则一键全选。

2. **复选框键盘流循环与首尾跳转**：
   - 支持 `ArrowUp` / `ArrowDown` 在复选框之间循环移焦（`preventScroll: true`）；
   - 支持 `Home` 键直达第一项复选框、`End` 键直达最后一项复选框。

3. **无障碍语义补全**：
   - 为每个片段行复选框注入 `aria-label="${restoreRowText(row)}"`；
   - 为主开关设置复选框注入 `aria-label="${t('snippetRestoreSettings')}"`。

## 验证

- **契约测试**：`tests/snippet-restore-select-all-keyboard.test.cjs` 4/4 满分通过，验证全选逻辑、上下方向键与首尾跳转以及负向注入拦截；
- **全量测试**：9454 项测试全数通过，无任何回归。
