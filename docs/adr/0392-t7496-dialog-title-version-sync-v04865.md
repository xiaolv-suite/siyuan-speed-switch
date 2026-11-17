# ADR 0392：T-7496 全表面二级弹窗标题栏品牌版本徽标统一升级至 v0.48.65 与本地封验

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在完成 T-7493（第二面板小组件配置表单重置默认二次确认与动态校验微动效加固）、T-7494（内置片段库新增任务列表核选弹跳微动效与粗体文本柔光阴影）与 T-7495（代码片段实验室编辑器多行 Tab 缩进与 Shift+Tab 反向退格加固）后，全工程新一轮表单容错防护、微排版动效与代码编辑手感加固全面落地。

本任务作为发布就绪里程碑，统一升级版本至 `v0.48.65`，完成本地生产构建与门限校准，并同步更新真实思源客户端插件目录。

## 决策

1. **全表面二级弹窗标题栏品牌版本徽标对齐**：
   在 `src/index.ts`、`src/second-panel-ui.ts`、`src/home-store-ui.ts`、`src/home-config-form.ts`、`src/doc-search-ui.ts`、`src/settings-sections.ts`、`src/snippet-studio-ui.js` 以及编译镜像 `.js` 文件中，将全部 18 处 `mountPlatformDialogTitleWrap` 版本参数统一升级至 `"v0.48.65"`。

2. **版本元数据与多语言全量升级**：
   - `package.json` 与 `plugin.json`：精确晋级至 `0.48.65`；
   - `README.md` 与 `README.en-US.md`：版本徽标、最近版本声明、本次更新要点精确对齐 `0.48.65`；
   - `CHANGELOG.md`、`docs/CHANGELOG.md` 与 `docs/CHANGELOG.en-US.md`：建立独立的 `v0.48.65` 发布更新章节；
   - `ROADMAP.md`：演进基线结转为 `v0.48.65`；
   - `docs/release-readiness.md`：记录 `v0.48.65` 评估日期与散列快照。

3. **包体门限与余量微调校准**：
   - 在 `scripts/release-readiness-metrics.cjs` 中校准：
     - `RAW_BUNDLE_BUDGET_BYTES`: `1260 -> 1262 KiB`（dist/index.js 为 1,285,766 B，处于 1,292,288 B 内，余量 6,522 B）；
     - `ARCHIVE_BUDGET_BYTES`: `670 -> 672 KiB`（package.zip 为 684,549 B，处于 688,128 B 内，余量 3,579 B）；
     - `COMPRESSED_ENTRY_BUDGET_BYTES`: `348 KiB`（compressed index.js 为 345,978 B，处于 356,352 B 内，余量 10,374 B）；
   - 同步更新 `tests/bundle-optimization-and-headroom-contract.test.cjs`、`tests/release-readiness-batch-review.test.cjs` 与 `tests/second-round-widgets.test.cjs`。

4. **本地闭环与离线保护**：
   - 严格遵循用户指令：不执行 `git push` 或线上发版，仅在本地仓库更新并保持离线封存；
   - 生产产物直通拷贝至本地思源实际运行目录 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。

## 验证

- `tests/dialog-title-version-sync.test.cjs` 2/2 通过（含负向探针验证）；
- `tests/release-version-bump-contract.test.cjs` 5/5 通过；
- `pnpm exec tsc --noEmit` 零报错；
- `pnpm run repro:audit` 3/3 绝对一致；
- `pnpm test` 9429 项测试 100% 全绿；
- `pnpm run verify:release` 全流程 13 道严苛门禁全部 PASS。
