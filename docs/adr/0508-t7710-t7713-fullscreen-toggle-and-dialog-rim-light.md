# ADR 0508：全屏切换 RAF 节流锁、弹窗 Bento 软影微光切面与沉浸全屏消线（T-7710~T-7713）

## 背景与诉求

在多表面窗口的尺寸适配与全屏原地切换中存在两项关键视觉与并发体验细节：
1. **原地切换连击防抖**：用户连续高速点击顶栏全屏/还原按钮（`.sw__fullscreen-btn`）时，若无帧锁保护，可能导致中间帧重绘时容器计算错位或视口动画闪烁；
2. **弹窗外框悬浮深度与全屏沉浸纯粹性**：
   - 非全屏自适应弹窗容器（`.b3-dialog__container.sw-platform-dialog:not(.sw-dialog--fullscreen)`）此前缺少顶级微光切面（Rim Light）与 18px 大圆角，与内部 Bento 浮层未形成内外呼应；
   - 全屏铺满模式下（`.sw-dialog--fullscreen`），外边框、阴影与圆角若未彻底抹平，会导致边缘残留细线缝隙，破坏无界沉浸感。

## 架构决策与设计

1. **全屏切换按钮 RAF 连击节流锁（T-7710）**：
   - 在 `src/index.ts` 与 `src/index.js` 的 `bindSwitcherFullscreenToggle` 中引入 `let isToggling = false;` 状态锁；
   - 切换开始时立即加锁，在 `window.requestAnimationFrame` 下一帧渲染完成后解锁，消除并发连击抖动。

2. **自适应弹窗 Bento 悬浮阴影与 1px 微光切面（T-7711）**：
   - 在 `src/styles/_platform-shell.scss` 中针对 `.b3-dialog__container.sw-platform-dialog:not(.sw-dialog--fullscreen)` 声明：
     - `border-radius: var(--sw-radius-panel, 18px);`
     - `border: 1px solid color-mix(in srgb, var(--sw-platform-accent) 22%, var(--b3-border-color));`
     - `box-shadow: var(--sw-shadow-bento), inset 0 0 0 1px color-mix(in srgb, var(--b3-theme-surface) 60%, transparent);`
     - `transition: width $sw-dur-base $sw-ease, height $sw-dur-base $sw-ease;`；
   - 注入高质感内发光微切面，平滑过渡尺寸变换。

3. **全屏铺满状态零缝隙沉浸（T-7712）**：
   - 为 `.b3-dialog__container.sw-platform-dialog.sw-dialog--fullscreen` 严格抹平所有边缘外框：
     `border: none !important; border-radius: 0 !important; box-shadow: none !important;`；
   - 确保全屏时真正实现四边零缝隙满屏铺展。

4. **契约测试与负向验证（T-7713）**：
   - 新增专项测试 `tests/fullscreen-toggle-and-dialog-rim-light-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当全屏切换节流锁丢失或全屏时残留外边框，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/fullscreen-toggle-and-dialog-rim-light-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 6 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
