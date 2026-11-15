# ADR 0447：T-7552 全表面二级弹窗标题栏品牌版本徽标统一升级至 v0.48.79 与本地封验

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在完成 T-7549（第二面板工作台小组件卡片聚焦态全键盘 F/C 键快速折叠与配置加固）、T-7550（内置代码片段库新增嵌入块悬浮微发光与标签渐变药丸 CSS 片段）与 T-7551（代码片段实验室导出 usercss 支持 @var color 颜色格式化与校验）后，工作台小组件卡片快捷键操作流、嵌入块与标签排版微质感、以及 UserCSS 规范级颜色校验能力全面落地。

随着内置代码片段扩充至 70 项及双语词条扩充，`package.zip` 达到 692,656 B。本任务同步完成归档预算校准（678 KiB -> 680 KiB），将版本统一升级至 `v0.48.79`，完成本地生产构建与门限校准，并同步更新真实思源客户端插件目录。

## 决策

1. **全表面二级弹窗标题栏品牌版本徽标对齐**：
   在 `src/index.ts`、`src/second-panel-ui.ts`、`src/home-store-ui.ts`、`src/home-config-form.ts`、`src/doc-search-ui.ts`、`src/settings-sections.ts`、`src/snippet-studio-ui.js` 以及编译镜像 `.js` 文件中，将全部 18 处 `mountPlatformDialogTitleWrap` 版本参数统一升级至 `"v0.48.79"`。

2. **版本元数据与多语言全量升级**：
   - `package.json` 与 `plugin.json`：精确晋级至 `0.48.79`；
   - `README.md` 与 `README.en-US.md`：版本徽标、最近版本声明、本次更新要点精确对齐 `0.48.79`；
   - `CHANGELOG.md`、`docs/CHANGELOG.md` 与 `docs/CHANGELOG.en-US.md`：建立独立的 `v0.48.79` 发布更新章节；
   - `ROADMAP.md`：演进基线结转为 `v0.48.79`；
   - `docs/release-readiness.md`：记录 `v0.48.79` 评估日期与散列快照。

3. **包体门限与余量校准**：
   - 维持 `RAW_BUNDLE_BUDGET_BYTES`: `1262 KiB`（dist/index.js 为 1,288,994 B，处于 1,292,288 B 内，余量 3,294 B）；
   - 微调 `ARCHIVE_BUDGET_BYTES`: 由 `678 KiB` 校准至 `680 KiB`（696,320 B，package.zip 为 692,656 B，健康余量 3,664 B >= 2000 B）；
   - 维持 `COMPRESSED_ENTRY_BUDGET_BYTES`: `348 KiB`（compressed index.js 为 346,667 B，处于 356,352 B 内，余量 9,685 B）。

4. **本地闭环与离线保护**：
   - 严格遵循用户指令：不执行 `git push` 或线上发版，仅在本地仓库更新并保持离线封存；
   - 生产产物直通拷贝至本地思源实际运行目录 `D:\SIYUAN\data\plugins\siyuan-speed-switch/`。

## 验证

- `tests/dialog-title-version-sync.test.cjs` 2/2 通过（含负向探针验证）；
- `tests/release-version-bump-contract.test.cjs` 5/5 通过；
- `tests/bundle-optimization-and-headroom-contract.test.cjs` 4/4 通过；
- `pnpm exec tsc --noEmit` 零报错；
- `pnpm run repro:audit` 3/3 绝对一致；
- `pnpm test` 9545 项测试 100% 全绿；
- `pnpm run verify:release` 全流程 14 道严苛门禁全部 PASS。
