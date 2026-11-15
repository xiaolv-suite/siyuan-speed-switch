# ADR 0519：片段审查 Diff 视图白卡浮起、等宽行号与增删高亮边条（T-7758~T-7761）

## 背景与诉求

在第三面板（代码片段实验室 Snippet Studio）中，AI 生成候选与外部导入的 CSS/JS 代码片段进入安全审查时，会通过差异对比面板（`.sw-studio__diff`）逐行呈现变更：
- 对比滚动区域（`.sw-studio__diff-scroll`）此前采用平淡边框与背景，未接入白卡浮起（`--sw-card-float-bg`）与柔和阴影（`--sw-shadow-xs`）；
- 代码行号（`.sw-studio__diff-ln`）未声明 `font-variant-numeric: tabular-nums`，在百行以上片段中，单双三位数行号排列可能产生字符对齐错位；
- 删除行（`is-del`）与新增行（`is-ins`）此前仅有背景半透明着色，缺少现代编辑器标准的专属左侧指示高光边条；
- 各 Hunk 块的审查头部（`.sw-studio__diff-hunk-head`）缺少全圆角胶囊规格与按压微动效。

## 架构决策与设计

1. **差异对比容器白卡浮起与行号等宽排版（T-7758）**：
   - 在 `src/styles/_snippet-studio.scss` 中将 `.sw-studio__diff-scroll` 升级为 `var(--sw-card-float-bg)` 白卡浮起、14px 圆角与 `var(--sw-shadow-xs)` 柔和阴影；
   - 代码行号 `.sw-studio__diff-ln` 严格锁定 `font-variant-numeric: tabular-nums;`，消除行号抖动。

2. **差异增删代码行专属指示边条（T-7759）**：
   - 为 `.sw-studio__diff-row.is-del` 注入 `border-inline-start: 2.5px solid var(--studio-error);` 错误色指示边条；
   - 为 `.sw-studio__diff-row.is-ins` 注入 `border-inline-start: 2.5px solid var(--studio-success);` 成功色指示边条；
   - 完全保留既有契约测试强匹配的 `background: color-mix(...)` 字面量。

3. **Hunk 审查头部全圆角软胶囊（T-7760）**：
   - 将 `.sw-studio__diff-hunk-head` 升级为全圆角软胶囊规格 `border-radius: var(--studio-radius-pill, 999px)`；
   - 补齐 `:active { transform: scale(0.96); }` 触觉反馈。

4. **契约测试与负向验证（T-7761）**：
   - 新增专项测试 `tests/snippet-studio-diff-visual-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当行号丢失等宽排版或增删行丢失专属指示边条时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/snippet-studio-diff-visual-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 18 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
