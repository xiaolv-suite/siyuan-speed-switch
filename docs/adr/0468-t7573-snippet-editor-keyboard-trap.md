# ADR 0468：Snippet Studio 代码编辑器键盘陷阱消除与焦点环修复（T-7573）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在全表面无障碍体验与键盘可用性排查中发现：
1. Snippet Studio 代码编辑区 `editor`（textarea）为了支持 Tab 与 Shift+Tab 进行代码缩进，在 keydown 中拦截了所有 Tab 键。根据 WCAG 2.1.2（No Keyboard Trap）准则，当焦点进入编辑器后，纯键盘用户无法通过 Tab 键跳出编辑器区域，形成死锁陷阱；
2. 在 `editor` 中按 `Escape` 键会直接冒泡到外部工作室弹窗 `onStudioKeydown`，意外弹出草稿离开提示或直接关闭工作室，导致用户丢失上下文或误关工作区；
3. `src/styles/_11-ui-polish.scss` 将 `.sw-studio__editor-frame .sw-studio__editor` 设置为 `outline: none !important; box-shadow: none !important;`，且外层 `.sw-studio__editor-frame` 缺少 `:focus-within` 高亮，键盘聚焦时完全隐形，无法判断焦点位置。

## 决策

1. **Escape 优先跳焦与键盘陷阱消除**：
   在 `editor` 的 `keydown` 监听中拦截 `Escape` 键：
   - 若查找替换条 `findBar` 处于展开状态，优先关闭查找替换条；
   - 否则调用 `event.preventDefault()` 与 `event.stopPropagation()`，防止事件冒泡至工作室关闭守卫；
   - 调用 `editor.blur()` 并将焦点转移至外层容器 `editorFrame.focus()`（注入 `tabindex="-1"`），使用户可以通过后续 Tab / Shift+Tab 轻松漫游到周围按钮或表单项。
2. **容器级 2px 品牌高可见度焦点环**：
   为 `.sw-studio__editor-frame` 声明 `&:focus, &:focus-within` 样式：
   - `border-color: var(--b3-theme-primary);`
   - `box-shadow: 0 0 0 2px color-mix(in srgb, var(--b3-theme-primary) 35%, transparent);`
   使代码编辑器在聚焦时具备高可见度的 2px 品牌焦点轮廓。

## 验证

- **契约测试**：`tests/snippet-editor-keyboard-trap.test.cjs` 4/4 满分通过，验证 tabindex 注入、Escape 优先失焦、焦点环样式及负向注入拦截；
- **回归测试**：`tests/snippet-editor-tab-indent.test.cjs` 与 `tests/snippet-editor-shortcuts.test.cjs` 保持全绿。
