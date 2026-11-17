# ADR 0369：T-7472 全表面二级弹窗标题栏品牌版本徽标统一升级至 v0.48.59 与本地封验

## 背景与上下文

小驴雷切建立了全工程二级弹窗标题栏品牌化规范（ADR 0260 / T-7360 / T-7405 系列）：全表面所有通过 `mountPlatformDialogTitleWrap` 挂载的二级弹窗（包括小组件商店、小组件配置表单、文档搜索保存编辑、设置中心差异对比、代码片段实验室 Gist 恢复/离开确认/冲突检测/备份恢复预览/片段导入策略选择等 18 处弹窗）必须统一展示当前正式版本徽标。

在完成 T-7469（第二面板小组件卡片长按手势与移动端右键菜单交互加固）、T-7470（内置片段库新增折叠标题指示微动效与数学公式块卡片美化）与 T-7471（动作画板多页签批量关闭前置校验与安全焦点回退加固）后，全工程新一轮无障碍交互与微质感加固全面落地。本任务作为发布就绪里程碑，统一升级版本至 `v0.48.59`，完成本地生产构建并同步更新真实思源客户端插件目录。

**用户最高指示**：暂时不要上传 GitHub，仅在本地仓库更新与提交，等待解封通知。

## 架构决策与实现

1. **全表面二级弹窗品牌版本徽标统一升级**：
   在 `src/index.ts`、`src/second-panel-ui.ts`、`src/home-store-ui.ts`、`src/home-config-form.ts`、`src/doc-search-ui.ts`、`src/settings-sections.ts`、`src/snippet-studio-ui.js` 以及编译镜像 `.js` 文件中，将全部 18 处 `mountPlatformDialogTitleWrap` 版本参数统一升级至 `"v0.48.59"`。
2. **全工程元数据与多语言文档对齐**：
   - `package.json` 与 `plugin.json`：精确晋级至 `0.48.59`；
   - `README.md` 与 `README.en-US.md`：版本徽标、最近版本声明、本次更新要点精确对齐 `0.48.59`；
   - `CHANGELOG.md`、`docs/CHANGELOG.md` 与 `docs/CHANGELOG.en-US.md`：建立独立的 `v0.48.59` 发布更新章节；
   - `ROADMAP.md`：演进基线结转为 `v0.48.59`；
   - `docs/release-readiness.md`：记录 `v0.48.59` 评估日期与散列快照。
3. **真实思源客户端运行环境同步**：
   将 `dist/` 最新产物与 65,989 字节殿堂级头像完整同步至 `D:\SIYUAN\data\plugins\siyuan-speed-switch`。
4. **严格本地封存与遵从封禁指示**：
   - 生产构建与可复现打包在本地执行（`dist/index.js` 为 1,282,402 字节，`package.zip` 为 678,935 字节，严格低于 665 KiB / 1255 KiB 门限）；
   - 严格禁止执行 `git push`，所有更新本地提交，等待用户通知后再行推送。

## 验证与证据

1. `tests/dialog-title-version-sync.test.cjs`：2/2 满分全绿（负向验证探针确认旧版本号无残留）；
2. `tests/release-version-bump-contract.test.cjs`：5/5 满分全绿（双语文档与元数据 100% 对齐）；
3. `pnpm exec tsc --noEmit`：0 错误通过；
4. `scripts/check-release-readiness.cjs`：产物大小与记录绝对吻合；
5. 全量自动化测试套件：9377 项测试 9376 通过 / 0 失败 / 1 跳过。
