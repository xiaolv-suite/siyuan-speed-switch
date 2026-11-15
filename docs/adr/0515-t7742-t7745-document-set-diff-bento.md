# ADR 0515：文档集预览区微底分层、差异对比行 Bento 浮卡与胶囊操作按钮（T-7742~T-7745）

## 背景与诉求

文档集（Document Sets）管理抽屉中的现场恢复预览与版本差异对比（Diff）面板，是用户确认回滚与恢复现场的关键决策视图：
- 现场恢复预览区（`.sw-setting__doc-set-preview`）此前采用单一背景与生硬实线边框，缺乏底色差自然分层；
- 版本差异对比行（`.sw-doc-set-diff__line`）为普通的单层框，缺少像参考图卡片般的白卡浮起（`--sw-card-float-bg`）与柔和微阴影（`--sw-shadow-xs`）；
- 差异对比操作栏（`.sw-doc-set-diff__actions`）中的按钮缺少现代全圆角软胶囊规范与按压物理反馈。

## 架构决策与设计

1. **文档集预览区微底分层与柔和内边距（T-7742）**：
   - 在 `src/styles/_02-settings.scss` 中将 `.sw-setting__doc-set-preview` 边框调整为 `var(--sw-color-line-soft)` 柔和半透明线；
   - 容器背景采用带轻微层次的自然微底，圆角统合为 8px。

2. **版本差异对比行白卡浮起与悬浮触感（T-7743）**：
   - 将 `.sw-doc-set-diff__line` 升级为 `background: var(--sw-card-float-bg)` 白卡浮起与 `box-shadow: var(--sw-shadow-xs)` 柔和微阴影；
   - 悬浮态（`:hover`）注入 `transform: translateY(-0.5px);` 与阴影加深反馈。

3. **差异回滚操作区全圆角胶囊与按压微动效（T-7744）**：
   - 为 `.sw-doc-set-diff__actions .b3-button` 声明全圆角胶囊规格 `border-radius: var(--sw-platform-radius-pill, 999px)`；
   - 注入 `:active { transform: scale(0.96); }` 触觉级弹性微动效。

4. **契约测试与负向验证（T-7745）**：
   - 新增专项测试 `tests/document-set-diff-bento-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当差异对比行丢失白卡浮起或操作按钮胶囊规格被篡改时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/document-set-diff-bento-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 14 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
