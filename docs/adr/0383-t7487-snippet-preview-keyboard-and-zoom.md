# ADR 0383：代码片段实验室预览窗格全键盘 Tab 焦点环与视口缩放加固（T-7487）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码片段实验室（Snippet Studio）的右侧预览区域承载着“已保存”与“草稿”双栏实时对比。此前：
1. 预览窗格（`sw-studio__preview-pane`）为普通不可聚焦容器，全键盘用户使用 `Tab` 遍历时无法定位到预览视图，无法使用键盘滚动检视长文档样例；
2. 缺乏视口比例缩放热键，用户在不同 DPI 或密集排版下难以放大观察微小细节（如 1px 边框或微动效）。

## 决策

1. **预览窗格无障碍焦点环与键盘滚动**：
   - 为双栏窗格（`savedPane` 与 `draftPane`）声明 `tabIndex = 0`、`role="region"` 与双语 `aria-label`；
   - 在 `src/styles/_snippet-studio.scss` 中补充 `&:focus-visible` 2px 主题色外轮廓，保证焦点可见性；
   - 监听窗格上的 `ArrowDown`/`ArrowUp`/`PageDown`/`PageUp` 按键，实现平滑的内容垂直滚动。

2. **预览视口快捷缩放流**：
   - 监听预览区域的 `Ctrl/Cmd + =`（放大 +10%）、`Ctrl/Cmd + -`（缩小 -10%）与 `Ctrl/Cmd + 0`（复位 1.0）；
   - 通过 CSS 变量 `--sw-preview-zoom` 与 `iframe.style.transform = scale(...)` 实现硬件加速视口缩放，缩放比例有界钳制在 50% ~ 200% 之间。

## 验证

- **契约测试**：`tests/snippet-preview-keyboard-and-zoom.test.cjs` 3/3 满分通过，验证 tabIndex、滚动按键监听与缩放快捷键；
- **负向验证**：修改缩放重置预期注入故障，确认测试能精准拦截报错，还原后通过。
