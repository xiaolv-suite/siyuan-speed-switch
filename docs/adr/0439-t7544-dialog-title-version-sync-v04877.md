# ADR 0439：T-7544 全表面二级弹窗标题栏品牌版本徽标统一升级至 v0.48.77 与本地封验

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在完成 T-7541（第二面板工作台空态全键盘无障碍 Enter/Space 快速打开组件商店加固）、T-7542（内置代码片段库新增任务列表进度导轨与待办项轻质感卡片 CSS 片段）与 T-7543（代码片段实验室导出 usercss 支持 @var range 数值区间与单位格式化校验）后，工作台空态全键盘可用性、任务列表与待办卡片视觉质感、以及 UserCSS 规范级范围滑块参数格式化能力全面落地。

本任务作为发布就绪里程碑，统一升级版本至 `v0.48.77`，完成本地生产构建与门限校准，并同步更新真实思源客户端插件目录。

## 决策

1. **全表面二级弹窗标题栏品牌版本徽标对齐**：
   在 `src/index.ts`、`src/second-panel-ui.ts`、`src/home-store-ui.ts`、`src/home-config-form.ts`、`src/doc-search-ui.ts`、`src/settings-sections.ts`、`src/snippet-studio-ui.js` 以及编译镜像 `.js` 文件中，将全部 18 处 `mountPlatformDialogTitleWrap` 版本参数统一升级至 `"v0.48.77"`。

2. **版本元数据与多语言全量升级**：
   - `package.json` 与 `plugin.json`：精确晋级至 `0.48.77`；
   - `README.md` 与 `README.en-US.md`：版本徽标、最近版本声明、本次更新要点精确对齐 `0.48.77`；
   - `CHANGELOG.md`、`docs/CHANGELOG.md` 与 `docs/CHANGELOG.en-US.md`：建立独立的 `v0.48.77` 发布更新章节；
   - `ROADMAP.md`：演进基线结转为 `v0.48.77`；
   - `docs/release-readiness.md`：记录 `v0.48.77` 评估日期与散列快照。

3. **包体门限与余量维持**：
   - 维持 `RAW_BUNDLE_BUDGET_BYTES`: `1262 KiB`（dist/index.js 为 1,288,627 B，处于 1,292,288 B 内，余量 3,661 B）；
   - 维持 `ARCHIVE_BUDGET_BYTES`: `678 KiB`（package.zip 为 691,691 B，处于 694,272 B 内，余量 2,581 B >= 2000 B）；
   - 维持 `COMPRESSED_ENTRY_BUDGET_BYTES`: `348 KiB`（compressed index.js 为 346,575 B，处于 356,352 B 内，余量 9,777 B）。

4. **本地闭环与离线保护**：
   - 严格遵循用户指令：不执行 `git push` 或线上发版，仅在本地仓库更新并保持离线封存；
   - 生产产物直通拷贝至本地思源实际运行目录 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。

## 验证

- `tests/dialog-title-version-sync.test.cjs` 2/2 通过（含负向探针验证）；
- `tests/release-version-bump-contract.test.cjs` 5/5 通过；
- `pnpm exec tsc --noEmit` 零报错；
- `pnpm run repro:audit` 3/3 绝对一致；
- `pnpm test` 9530 项测试 100% 全绿；
- `pnpm run verify:release` 全流程 14 道严苛门禁全部 PASS。
