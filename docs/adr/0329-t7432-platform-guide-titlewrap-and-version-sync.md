# 0329. T-7432 平台引导弹窗标题包装与全表面二级弹窗标题统一升级契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7432

## 背景与上下文

在平台快速开始指南弹窗（`openPlatformGuide`）中，此前仅挂载了关闭按键提示（`mountPlatformDialogCloseHint`），未挂载品牌标题栏与版本徽标包装（`mountPlatformDialogTitleWrap`）。
这导致用户在切换器、工作台或片段实验室点击“快速开始”或“帮助”打开指南时，指南弹窗呈现基础原生标题栏，缺少品牌图标与版本角标，视觉规范与全工程其他 17 处二级弹窗不统一。

## 架构决策

1. **平台引导弹窗装配品牌标题包装**：
   - 在 `src/index.ts` 与 `src/index.js` 的 `openPlatformGuide` 中增加：
     - `mountPlatformDialogTitleWrap(dialog.element, this.i18n.platformGuideTitle || "快速开始", "v0.48.48", "iconHelp")`；
     - 统一呈现帮助图标（`iconHelp`）与版本角标。
2. **全表面二级弹窗标题栏版本号对齐**：
   - 全面排查并将所有二级弹窗标题包装统一对齐升级至 `v0.48.48`。
3. **门禁与测试**：
   - 更新 `tests/dialog-title-version-sync.test.cjs` 验证 18 处调用点；
   - 负向验证：若有任何一处二级弹窗残留旧版本号 `v0.48.47`，断言必须精准红。

## 后果与影响

- 全平台所有二级模态弹窗达到 100% 绝对一致的视觉与品牌规格；
- 用户在查阅快速开始指南时获得一致的沉浸美学体验。
