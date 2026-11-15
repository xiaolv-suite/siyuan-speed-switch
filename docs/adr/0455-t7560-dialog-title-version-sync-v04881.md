# ADR 0455：T-7560 全表面二级弹窗标题栏品牌版本徽标统一升级至 v0.48.81 与本地封验

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在完成 T-7557（第二面板工作台小组件卡片标题栏长按呼出快捷操作菜单手势加固）、T-7558（内置代码片段库新增引用块悬停平移与列表圆点微动效 CSS 片段）与 T-7559（代码片段实验室导出 usercss 支持 @var number 数值参数精度校验与默认值格式化）后，工作台小组件卡片长按上下文菜单手势、引用块与无序列表排版动效、以及 UserCSS 规范级数值校验能力全面落地。

本任务作为发布就绪里程碑，统一升级版本至 `v0.48.81`，完成本地生产构建与门限校准，并同步更新真实思源客户端插件目录。

## 决策

1. **全表面二级弹窗标题栏品牌版本徽标对齐**：
   在 `src/index.ts`、`src/second-panel-ui.ts`、`src/home-store-ui.ts`、`src/home-config-form.ts`、`src/doc-search-ui.ts`、`src/settings-sections.ts`、`src/snippet-studio-ui.js` 以及编译镜像 `.js` 文件中，将全部 18 处 `mountPlatformDialogTitleWrap` 版本参数统一升级至 `"v0.48.81"`。

2. **版本元数据与多语言全量升级**：
   - `package.json` 与 `plugin.json`：精确晋级至 `0.48.81`；
   - `README.md` 与 `README.en-US.md`：版本徽标、最近版本声明、本次更新要点精确对齐 `0.48.81`；
   - `CHANGELOG.md`、`docs/CHANGELOG.md` 与 `docs/CHANGELOG.en-US.md`：建立独立的 `v0.48.81` 发布更新章节；
   - `ROADMAP.md`：演进基线结转为 `v0.48.81`；
   - `docs/release-readiness.md`：记录 `v0.48.81` 评估日期与散列快照。

3. **包体门限与余量维持**：
   - 维持 `RAW_BUNDLE_BUDGET_BYTES`: `1262 KiB`（dist/index.js 为 1,289,141 B，处于 1,292,288 B 内，余量 3,147 B）；
   - 维持 `ARCHIVE_BUDGET_BYTES`: `680 KiB`（package.zip 为 693,419 B，处于 696,320 B 内，余量 2,901 B >= 2000 B）；
   - 维持 `COMPRESSED_ENTRY_BUDGET_BYTES`: `348 KiB`（compressed index.js 为 346,733 B，处于 356,352 B 内，余量 9,619 B）。

4. **本地闭环与离线保护**：
   - 严格遵循用户指令：不执行 `git push` 或线上发版，仅在本地仓库更新并保持离线封存；
   - 生产产物直通拷贝至本地思源实际运行目录 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。

## 验证

- `tests/dialog-title-version-sync.test.cjs` 2/2 通过（含负向探针验证）；
- `tests/release-version-bump-contract.test.cjs` 5/5 通过；
- `pnpm exec tsc --noEmit` 零报错；
- `pnpm run repro:audit` 3/3 绝对一致；
- `pnpm test` 9560 项测试 100% 全绿；
- `pnpm run verify:release` 全流程 14 道严苛门禁全部 PASS。
