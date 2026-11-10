# ADR 0275：T-7376 全二级弹窗品牌标题栏装配、移动端版本对齐与主切换器 IME 深度防御 (v0.48.18)

日期：2026-10-24  
状态：accepted  
任务：T-7376  

## 背景

在快门中枢 Epoch 6 联邦规范（T-7361、T-7362、T-7375，ADR 0260、0261、0274）明确全表面 Dialog 统一品牌标题栏（`.lv-dialog-title-wrap`）的基准下，系统性代码审计发现了以下跨表面体验与边界缺陷：
1. **二级核心弹窗缺失品牌标题栏**：
   - 小组件配置弹窗（`openHomeConfigForm`）
   - 小组件独立预览弹窗（`openStoreWidgetPreview`）
   - 组件健康监控大窗（`openHomeHealthDetails`）
   - 保存搜索编辑弹窗（`openSavedSearchEditor`）
   上述四大二级弹窗此前均仅装配了 `mountPlatformDialogCloseHint`，但漏调了 `mountPlatformDialogTitleWrap`，导致标题栏呈现为原生粗糙文本，缺失 22×22 星际深紫底白标与紧凑版本胶囊，破坏了小驴全表面设计语言的统一性；
2. **移动端切换器弹窗版本号陈旧失修**：
   - `src/index.ts` 移动端切换器弹窗标题栏装配调用被硬编码留存在了 `v0.48.9`，与主表面及真实版本脱节；
3. **主切换器中文输入法（IME）Escape 误清空风险**：
   - 在 `bindSearchInputComposition` 的 keydown 处理中，拦截 Escape 清空输入框仅校验了 `if (composing) return;`。在 Windows/Chromium 等部分 WebView 下，用户正在输入法拼音候选阶段按下 Escape 撤销候选窗时，`event.isComposing` 或 `event.keyCode === 229` 尚未被 `composing` 状态捕获，导致正在输入的查询词被全部清空并误触发空搜索。

## 决策

1. **全面装配四大二级核心弹窗统一品牌标题栏**：
   - 在 `openHomeConfigForm` 中装配 `mountPlatformDialogTitleWrap(dialog.element, `${this.i18n.homeConfig || "配置"} · ${def.title || inst.moduleId}`, "v0.48.18", formIconName)`，精准继承组件专属矢量图标；
   - 在 `openStoreWidgetPreview` 中装配 `mountPlatformDialogTitleWrap(dialog.element, `${this.i18n.homeStorePreview || "预览"} · ${def.title || moduleId}`, "v0.48.18", "iconPlugin")`；
   - 在 `openHomeHealthDetails` 中装配 `mountPlatformDialogTitleWrap(dialog.element, this.i18n.homeHealthDetailsTitle || "小组件健康监控", "v0.48.18", "iconHeart")`；
   - 在 `openSavedSearchEditor` 中装配 `mountPlatformDialogTitleWrap(dialog.element, this.i18n.searchSavedEditTitle || "编辑保存的搜索", "v0.48.18", "iconFilter")`；
2. **移动端切换器版本号对齐**：
   - 修复 `src/index.ts` 移动端切换器弹窗标题栏版本号，全面升级对齐至 `"v0.48.18"`；
3. **主切换器中文输入法（IME）Escape 深度加固**：
   - 强化 Escape 键清空防线为 `if (composing || event.isComposing || event.keyCode === 229) return;`，与 `ActionPalette` 及组件商店的防守策略保持绝对一致；
4. **版本升级与集市发版闭环**：
   - 晋级版本为 `v0.48.18`，同步更新全量中英文文档、更新日志、契约测试、散列快照与发布矩阵。

## 证据与验证

1. **专项契约测试**：`tests/dialog-title-wrap-expansion-and-ime-defense.test.cjs` 全覆盖，含针对 4 大弹窗装配、移动端版本对齐、IME Escape 深度防御等断言，以及独立负向验证（注入违规确认测试真的失败）；
2. **发布版本契约**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality-batch-audit` (50/50)、`release-batch-audit` (49/49)、`integration-boundary-audit` (50/50) 全量 PASS。
