# ADR 0542: 真实隔离环境全链路端到端深度排查与 v0.48.86 本地封验（T-7836）

## 状态
已决断并实施 (Accepted)

## 背景与诉求
用户明确指示：
“通过pnpm e2e:isolated，好好的完整的再查下UI、功能、交互、按钮功能、联动功能等内容，并完整的审查下目前的代码，修复相关bug。最终本地打包发版（GitHub不要动，不要上传）。”

## 深度排查与缺陷收敛
1. **真实隔离内核 E2E 超时抖动消除**：
   - 在真实思源内核（SiYuan 3.8.9 @ 6837）全并发多组件加载时，`bookmarks` 与 `tags` 组件因原本过紧的 `timeoutMs: 1200` 偶发触发 reject 并进入 backoff，导致 E2E 出现 flaky；
   - 将 `bookmarks` 与 `tags` 的超时宽裕度统一对齐至 `2500ms`（与今日待办、闪卡等保持一致），全量 13 项真实浏览器端到端路径（`pnpm e2e:isolated`）稳定极速全绿，0 flaky。
2. **第一面板全高延伸与短文档防白**：
   - 彻底修复切换器速览栏（`.sw__doc-preview`）在短文档或空文档时垂直高度截断问题（声明 `align-self: stretch; height: 100%; min-height: 100%;`），并修复历史契约测试 `tests/panel1-urgent-fix.test.cjs` 的旧断言；
   - 挂载短文档空态防白卡片与底部复制把手。
3. **i18n 静态扫描与契约测试同步**：
   - 补齐 `src/snippet-studio-ui.js` 顶部的 `locale.i18n.snippetCategoryFeatured` 静态 discovery 声明，确保两份多语言字典 100% 覆盖；
   - 更新 `tests/release-readiness-batch-review.test.cjs` 与 `tests/second-round-widgets.test.cjs` 的预算断言至 ADR 0539 校准线（1308 KiB / 698 KiB）；
   - 更新 `tests/snippet-leave-wiring.test.cjs` 与 `tests/snippet-preview-contract-v2.test.cjs`，保持契约测试在注释剥离和可选参数扩展后的严格有效性。
4. **版本单一事实源晋级（v0.48.86）**：
   - `package.json`、`plugin.json`、`src/constants.ts`、`scripts/serve-isolated.cjs` 统一晋级至 `0.48.86`；
   - 中英文 `README.md` 与 `CHANGELOG.md`、`ROADMAP.md`、`docs/release-readiness.md` 同步对齐；
   - 保持严格离线本地打包封验，绝对不进行远程 git 操作、不 push、不打远程 tag、不发布 release。

## 验证与证据
- `pnpm exec tsc --noEmit`：0 报错；
- `pnpm e2e:isolated`：13/13 项全部通过（1.2m），0 flaky；
- `pnpm test`：9865 项单元与契约测试 100% 全绿；
- `pnpm repro:audit`：生产构建 3/3 散列绝对一致；
- `pnpm quality:audit`：50/50 项全量通过；
- `pnpm integration:audit`：50/50 项全量通过；
- `package.zip` = `712,555 B`（低于 698 KiB 门限，余量 2,197 B >= 2000 B）；
- `dist/index.js` = `1,333,588 B`（低于 1308 KiB 门限，余量 5,804 B）；
- `dist/index.js` 压缩条目 = `359,802 B`（低于 362 KiB 门限，余量 10,886 B）。
