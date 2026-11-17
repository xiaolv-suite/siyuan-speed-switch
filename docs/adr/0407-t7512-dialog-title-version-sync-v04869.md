# ADR 0407：T-7512 全表面二级弹窗标题栏品牌版本徽标统一升级至 v0.48.69 与本地封验

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在完成 T-7509（第二面板工作台小组件卡片标题超长省略与悬停完整气泡提示加固）、T-7510（内置代码片段库新增折叠块引用与荧光笔划词强调 CSS 片段）与 T-7511（代码片段实验室导出 usercss 头部配置项键值校验与导出通知加固）后，工作台卡片排版防溢出、阅读微排版质感与代码片段导出健壮性全面落地。

本任务作为发布就绪里程碑，统一升级版本至 `v0.48.69`，完成本地生产构建与门限校准，并同步更新真实思源客户端插件目录。

## 决策

1. **全表面二级弹窗标题栏品牌版本徽标对齐**：
   在 `src/index.ts`、`src/second-panel-ui.ts`、`src/home-store-ui.ts`、`src/home-config-form.ts`、`src/doc-search-ui.ts`、`src/settings-sections.ts`、`src/snippet-studio-ui.js` 以及编译镜像 `.js` 文件中，将全部 18 处 `mountPlatformDialogTitleWrap` 版本参数统一升级至 `"v0.48.69"`。

2. **版本元数据与多语言全量升级**：
   - `package.json` 与 `plugin.json`：精确晋级至 `0.48.69`；
   - `README.md` 与 `README.en-US.md`：版本徽标、最近版本声明、本次更新要点精确对齐 `0.48.69`；
   - `CHANGELOG.md`、`docs/CHANGELOG.md` 与 `docs/CHANGELOG.en-US.md`：建立独立的 `v0.48.69` 发布更新章节；
   - `ROADMAP.md`：演进基线结转为 `v0.48.69`；
   - `docs/release-readiness.md`：记录 `v0.48.69` 评估日期与散列快照。

3. **包体门限与余量维持**：
   - 维持 `RAW_BUNDLE_BUDGET_BYTES`: `1262 KiB`（dist/index.js 为 1,286,651 B，处于 1,292,288 B 内，余量 5,637 B）；
   - 维持 `ARCHIVE_BUDGET_BYTES`: `675 KiB`（package.zip 为 687,106 B，处于 691,200 B 内，余量 4,094 B >= 2000 B）；
   - 维持 `COMPRESSED_ENTRY_BUDGET_BYTES`: `348 KiB`（compressed index.js 为 346,176 B，处于 356,352 B 内，余量 10,176 B）。

4. **本地闭环与离线保护**：
   - 严格遵循用户指令：不执行 `git push` 或线上发版，仅在本地仓库更新并保持离线封存；
   - 生产产物直通拷贝至本地思源实际运行目录 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。

## 验证

- `tests/dialog-title-version-sync.test.cjs` 2/2 通过（含负向探针验证）；
- `tests/release-version-bump-contract.test.cjs` 5/5 通过；
- `pnpm exec tsc --noEmit` 零报错；
- `pnpm run repro:audit` 3/3 绝对一致；
- `pnpm test` 9466 项测试 100% 全绿；
- `pnpm run verify:release` 全流程 14 道严苛门禁全部 PASS。
