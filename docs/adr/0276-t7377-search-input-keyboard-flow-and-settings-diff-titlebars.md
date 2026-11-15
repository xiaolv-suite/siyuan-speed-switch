# ADR 0276：T-7377 搜索框键盘流 Enter 执行与向下直达卡片导航、设置页二级差异弹窗品牌标题栏装配 (v0.48.19)

日期：2026-10-24  
状态：accepted  
任务：T-7377  

## 背景

在第一面板（切换器）与设置大窗的深度使用体验中，发现以下核心键盘交互痛点与标题栏一致性遗漏：
1. **输入框回车与向下直达缺失（Keyboard Deadzone）**：
   - 切换器搜索输入框此前由于 `bindKeydown` 中对输入控件的让位拦截（`target.closest("input") return`），用户在输入搜索词后无法直接按 `Enter` 激活首个匹配项，也无法按 `ArrowDown` 快速切入下方候选卡片，必须按 Tab 键逐级移动焦点；
   - 在命令模式（`>` 或 `》`）下，用户输入命令名称后按回车毫无响应，极度违背用户肌肉记忆与快速切换心智；
2. **设置页二级差异对比弹窗缺少品牌标题栏**：
   - `openDocumentSetDiffDialog`（文档集版本历史对比弹窗）与 `openConfigPackDiffDialog`（配置包差异与选择弹窗）此前仅挂载了 Esc 关闭提示，未接入 `mountPlatformDialogTitleWrap`，呈现原生生硬文本，缺少品牌辨识度。

## 决策

1. **搜索框键盘流极速闭环**：
   - 在 `bindSearchInputComposition` 中扩展键盘事件监听：
     - **`ArrowDown`**：非输入法合成状态下，平滑将焦点转移至下方首个可见候选项（优先 `.sw__card.sw__focused` -> 首张 `.sw__card` -> 首条 `.sw__command-item` -> 首条 `.sw__unified-item` -> 首条 `.sw__doc-item`），并执行视口对齐；
     - **`Enter`**：非输入法合成状态下，一键回车触发首选项执行（命令项优先触发 click、页签卡片优先激活切换、统一搜索项与全库文档项优先打开），并在移动端切换器中完整透传上下文与关闭句柄；
     - **输入法严格让位**：`composing || event.isComposing || event.keyCode === 229` 期间严格放行，杜绝选词或回车上屏干扰；
2. **设置页二级差异弹窗统一装配品牌标题栏**：
   - 在 `openDocumentSetDiffDialog` 装配 `mountPlatformDialogTitleWrap(dialog.element, diffTitle, "v0.48.19", "iconHistory")`；
   - 在 `openConfigPackDiffDialog` 装配 `mountPlatformDialogTitleWrap(dialog.element, this.i18n.configPackDiffTitle || "配置差异", "v0.48.19", "iconSettings")`；
3. **版本升级与集市发版闭环**：
   - 晋级版本为 `v0.48.19`，同步全量中英文文档、更新日志、契约测试与散列快照。

## 证据与验证

1. **专项契约测试**：`tests/search-input-keyboard-flow-and-settings-diff-titlebars.test.cjs` 6/6 通过（含针对 ArrowDown 导航、Enter 直达、移动端透传与双负向探针验证）；
2. **发布版本契约**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
