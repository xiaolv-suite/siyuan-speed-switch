# 0299. T-7402 全屏模式顶栏右上角安全避让与双预览框单例彻底根治契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7402

## 背景与上下文

在思源笔记桌面端（Windows / Linux 等 Electron 宿主）新版本中，全屏及无边框窗口右上角原生绘制了窗口控制按钮（最小化 `-`、最大化/还原 `□`、关闭 `×`，占据约 138px 宽度）。此前雷切弹窗全屏（`.sw-dialog--fullscreen` / `.sw--fullscreen`）时：
1. 顶栏操作区（`.sw-platform-header__actions`，包含内核状态、设置、快速开始、Esc 退出）紧贴最右上角，与思源系统级窗口控制按钮发生严重的重叠挤压与遮挡冲突；
2. 在宽屏桌面切换器装配中，由于预览窗格单例清理范围局限于 `surfaceScope`，当 `scrollElement` 离线预装配时无法扫描到外部存在的预览窗格，偶发两个“文档速览”预览框并存（一个滞留于卡片流内部，一个渲染在右侧独立栏）。

## 架构决策

1. **全屏模式顶栏右上角安全避让**：
   - 在 `src/styles/_platform-shell.scss` 中针对全屏模式注入显式安全内边距：
     ```scss
     :is(.speed-switch.sw--fullscreen, .sw-dialog--fullscreen) .sw-platform-header,
     .b3-dialog__container.sw-dialog--fullscreen .sw-platform-header {
         padding-right: calc(140px + var(--sw-platform-space-4, 16px));
     }
     ```
   - 保证顶栏操作区整体向左平移 140px 以上，留出完整的思源系统控制区，彻底消灭遮挡。
2. **全视口与装配前单例强排他销毁**：
   - 在 `src/doc-search-ui.ts` 与 `src/doc-search-ui.js` 的 `mountDocPreviewPane` 中，将单例清理作用域扩大至顶层弹窗与文档根范围（`speed-switch` / `b3-dialog__container` / `document`），强制清除所有非当前单例的 `.sw__doc-preview`；
   - 在 `src/index.ts` 与 `src/index.js` 的 `renderList` 装配 `layout` 前，主动清扫 `scrollElement` 内部任何残留的 `.sw__doc-preview`，彻底消除双预览框的生存土壤。
3. **门禁与测试**：
   - 新增 `tests/fullscreen-header-avoidance-and-preview-singleton.test.cjs`；
   - 负向验证：若全屏避让未达 140px 或预览排他回退为局部浅层，断言必须精准红。

## 后果与影响

- 全屏状态下顶栏与思源原生窗口控制按钮视觉分明、操作互不干扰；
- 彻底杜绝双预览框并存现象，确保工作面始终保持单一纯净的阅读窗格。
