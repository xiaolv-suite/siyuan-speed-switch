# ADR 0478：移动端视口防遮挡、在途检索状态感知与悬浮球防闪烁闭环（T-7593~T-7596）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在全面复审评估的收尾阶段，对系统剩余的边角体验痛点与微交互细节进行全面清零闭环：
1. **移动端软键盘遮挡输入（T-7593）**：移动端在弹起虚拟键盘时，视口高度发生剧烈收缩，若无动态视口处理，底部的快捷栏或输入框容易被键盘遮挡或顶出屏幕可视区域；
2. **样式层软键盘状态适配（T-7594）**：样式层需要动态响应 `--sw-visual-viewport-h`，在键盘弹起时对 `.sw-mobile-switcher-dialog` 与 `.sw__mobile.sw-keyboard-open` 施加最大高度保护；
3. **穿透检索在途状态感知（T-7595）**：向内核发起异步大纲解析或 SQL 查询期间，若无即时状态变化，用户难以感知系统是否正在工作，容易产生“卡死”误判；
4. **悬浮球多弹窗连开合帧防闪烁（T-7596）**：多层二级弹窗快速连续开关时，`suspendFABForDialog` 深度计数器的微时序切换可能引发悬浮球短暂闪烁。

## 决策

1. **移动端 Visual Viewport 动态自适应（T-7593）**：
   - 在 `src/mobile-switcher-ui.ts` 与 `src/mobile-switcher-ui.js` 中接入 `window.visualViewport` 的 resize 监听；
   - 键盘弹起（高度差 > 150px）时动态设置 `--sw-visual-viewport-h` 并追加 `sw-keyboard-open` 状态类，输入框平滑居中；弹窗注销时同步彻底释放监听器（`disposeVisualViewport()`）。
2. **移动端视口样式限制（T-7594）**：
   - 在 `src/styles/_03-switcher-mobile.scss` 中锁定 `.sw-mobile-switcher-dialog` 的 `max-height: var(--sw-visual-viewport-h, 100dvh) !important;`。
3. **在途请求状态感知与呼吸光晕（T-7595）**：
   - 在 `src/doc-search-ui.ts` 与 `src/doc-search-ui.js` 的 `runDocSearchFetch` 期间，采用鸭子类型保护为输入框设置 `aria-busy="true"`并在 `finally` 必定清理；
   - 在 `src/styles/_11-ui-polish.scss` 中为 `input.sw__search[aria-busy="true"]` 增加 1px 底色隔离与 28% 品牌色柔和呼吸微光晕。
4. **悬浮球延迟合帧恢复防闪烁（T-7596）**：
   - 在 `src/index.ts` 与 `src/index.js` 的 `suspendFABForDialog` 中，当 `fabModalDepth === 0` 时通过 `requestAnimationFrame` 延迟至下一帧合帧判定，若下一帧依然无模态才真正显示悬浮球，彻底消除多弹窗连开闪烁。

## 验证

- 新增专项契约测试 `tests/comprehensive-optimization-closure.test.cjs` 5/5 满分通过（包含正向逻辑与负向注入探针）；
- 修正 `tests/release-candidate-hash-audit.test.cjs` 权威预算门限引用（1266 KiB raw / 684 KiB zip）；
- 全量自动化测试（9,627 项测试）100% PASS；
- 14 道发布总门禁 `pnpm run verify:release` 100% 满分通过；
- 产物热同步至 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。
