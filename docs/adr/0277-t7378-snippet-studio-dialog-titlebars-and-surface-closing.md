# ADR 0277：T-7378 片段实验室全二级弹窗统一品牌标题栏装配与全表面视觉 100% 闭环收口 (v0.48.20)

日期：2026-10-24  
状态：accepted  
任务：T-7378  

## 背景

在快门中枢 Epoch 6 联邦规范推进过程中，第一面板切换器（包括移动端与主弹窗）、第二面板工作台及商店、设置大窗及其二级差异对比弹窗均已完成了品牌标题栏规范（`.lv-dialog-title-wrap`，包含 22×22 星际深紫底白标 + 标题 + 版本徽章 + Esc 关闭提示）的装配。
然而，代码审计发现：作为独立按需加载 chunk 的第三面板片段实验室（`src/snippet-studio-ui.js`），其下所有的二级原生 Dialog 弹窗均未接入品牌标题栏规范：
1. `openLeaveDialog`（未保存改动离开确认弹窗）；
2. `openConflictDialog`（保存冲突差异对比弹窗）；
3. `openGistRecoveryDialog`（Gist 写入状态异常恢复弹窗）；
4. `restoreBackup`（片段备份恢复差异预览弹窗）；
5. `importFile` 导入计划弹窗。

这导致用户在片段实验室进行冲突处理、备份恢复、导入或离开保存时，弹出的窗口依然是原生简陋文本，破坏了整体视觉的一致性与产品辨识度。

## 决策

1. **片段实验室全二级弹窗装配品牌标题栏与关闭提示**：
   - 引入 `mountPlatformDialogTitleWrap` 与 `mountPlatformDialogCloseHint`；
   - `openLeaveDialog`：装配 `mountPlatformDialogTitleWrap(dialog.element, t("snippetLeaveTitle") || "未保存的改动", "v0.48.20", "iconCode")`；
   - `openConflictDialog`：装配 `mountPlatformDialogTitleWrap(dialog.element, t("snippetConflictTitle") || "检测到冲突", "v0.48.20", "iconCode")`；
   - `openGistRecoveryDialog`：装配 `mountPlatformDialogTitleWrap(dialog.element, t("snippetGistRecoveryTitle") || "Gist 写入状态恢复", "v0.48.20", "iconCloud")`；
   - `restoreBackup`：装配 `mountPlatformDialogTitleWrap(dialog.element, t("snippetRestorePreview") || "恢复备份预览", "v0.48.20", "iconHistory")`；
   - `importFile` 导入计划弹窗：装配 `mountPlatformDialogTitleWrap(dialog.element, t("snippetImportPackage") || "导入代码片段", "v0.48.20", "iconUpload")`；
2. **全表面 Dialog 品牌视觉 100% 闭环收口**：
   - 至此，小驴雷切全表面的全部一级大窗与全部二级交互/差异对比弹窗均 100% 装配品牌统一标题栏，达成视觉一致性完全收口；
3. **版本号晋级（v0.48.20）**：
   - 晋级版本为 `v0.48.20`，同步更新全量中英文文档、更新日志、契约测试与散列快照。

## 证据与验证

1. **专项契约测试**：`tests/snippet-studio-dialog-titlebars-contract.test.cjs` 6/6 通过（含针对全部 5 个二级弹窗的装配断言与双负向探针验证）；
2. **发版契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
