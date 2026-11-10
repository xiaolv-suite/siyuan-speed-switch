# ADR 0384：T-7488 全表面二级弹窗标题栏品牌版本徽标统一升级至 v0.48.63 与本地封验

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在完成 T-7485（第二面板小组件离线容灾指示器与自定义静默刷新周期配置）、T-7486（内置片段库新增 macOS 终端三色控制点与表格单元格悬浮高亮）与 T-7487（代码片段实验室预览窗格全键盘 Tab 焦点环与视口缩放加固）后，全工程新一轮离线容灾与全键盘微动效加固全面落地。

本任务作为发布就绪里程碑，统一升级版本至 `v0.48.63`，完成本地生产构建与门限校准，并同步更新真实思源客户端插件目录。

## 决策

1. **全表面二级弹窗标题栏品牌版本徽标对齐**：
   在 `src/index.ts`、`src/second-panel-ui.ts`、`src/home-store-ui.ts`、`src/home-config-form.ts`、`src/doc-search-ui.ts`、`src/settings-sections.ts`、`src/snippet-studio-ui.js` 以及编译镜像 `.js` 文件中，将全部 18 处 `mountPlatformDialogTitleWrap` 版本参数统一升级至 `"v0.48.63"`。

2. **版本元数据与多语言全量升级**：
   - `package.json` 与 `plugin.json`：精确晋级至 `0.48.63`；
   - `README.md` 与 `README.en-US.md`：版本徽标、最近版本声明、本次更新要点精确对齐 `0.48.63`；
   - `CHANGELOG.md`、`docs/CHANGELOG.md` 与 `docs/CHANGELOG.en-US.md`：建立独立的 `v0.48.63` 发布更新章节；
   - `ROADMAP.md`：演进基线结转为 `v0.48.63`；
   - `docs/release-readiness.md`：记录 `v0.48.63` 评估日期与散列快照。

3. **包体门限与余量微调校准**：
   - 在 `scripts/release-readiness-metrics.cjs` 中校准：
     - `RAW_BUNDLE_BUDGET_BYTES`: `1258 -> 1260 KiB`（dist/index.js 为 1,285,067 B，处于 1,290,240 B 内，余量 5,173 B）；
     - `ARCHIVE_BUDGET_BYTES`: `668 -> 670 KiB`（package.zip 为 682,740 B，处于 686,080 B 内，余量 3,340 B）；
     - `COMPRESSED_ENTRY_BUDGET_BYTES`: `348 KiB`（compressed index.js 为 345,744 B，处于 356,352 B 内，余量 10,608 B）；
   - 同步更新 `tests/bundle-optimization-and-headroom-contract.test.cjs`、`tests/release-readiness-batch-review.test.cjs` 与 `tests/second-round-widgets.test.cjs`。

4. **本地闭环与离线保护**：
   - 严格遵循用户指令：不执行 `git push` 或线上发版，仅在本地仓库更新并保持离线封存；
   - 生产产物直通拷贝至本地思源实际运行目录 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。

## 验证

- `tests/dialog-title-version-sync.test.cjs` 2/2 通过（含负向探针验证）；
- `tests/release-version-bump-contract.test.cjs` 5/5 通过；
- `pnpm exec tsc --noEmit` 零报错；
- `pnpm run repro:audit` 3/3 绝对一致；
- `pnpm test` 9414 项测试 100% 全绿；
- `pnpm run verify:release` 全流程 13 道严苛门禁全部 PASS。
