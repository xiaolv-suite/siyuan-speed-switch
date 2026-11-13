# ADR 0520：实验室数据治理菜单 Bento 浮层、回收站快照白卡浮起与操作胶囊（T-7762~T-7765）

## 背景与诉求

在第三面板（代码片段实验室 Snippet Studio）中，开发者频繁使用数据治理菜单（导入、导出、重置、快照备份）以及已删除片段的回收站（Recycle Vault）：
- 数据治理菜单浮层（`.sw-studio__data-menu-actions`）此前采用简单的平淡阴影与纯色背景，未接入 Bento 深度阴影（`--sw-shadow-bento`）与白卡浮起（`--sw-card-float-bg`），菜单选项缺少交互微动效位移；
- 回收站中的历史快照条目（`.sw-studio__recycle-item`）此前仅使用简单底边框分隔，缺少 Bento 体系下的独立浮起白卡感（`--sw-card-float-bg`、8px 圆角与 `--sw-shadow-xs`）以及悬浮轻微抬升效果；
- 回收站行内恢复/彻底删除操作按钮（`.sw-studio__recycle-actions .sw-studio__button`）缺少全圆角胶囊规格（`--studio-radius-pill`）与按压触觉微反馈。

## 架构决策与设计

1. **实验室数据治理菜单 Bento 浮层与位移微动效升级（T-7762）**：
   - 在 `src/styles/_11-ui-polish.scss` 中将 `.sw-studio__data-menu-actions` 升级为 `var(--sw-card-float-bg)` 白卡浮起、14px Bento 圆角、`var(--sw-shadow-bento)` 深度柔和浮层以及 8px 毛玻璃质感；
   - 菜单选项按钮在 hover 态注入 `transform: translateX(1.5px)` 顺滑横向微位移反馈。

2. **回收站快照条目白卡浮起与悬浮微动效加固（T-7763）**：
   - 在 `src/styles/_snippet-studio.scss` 中将 `.sw-studio__recycle-item` 升级为独立白卡条目：声明 `var(--sw-card-float-bg)` 白卡底色、8px 圆角与 `var(--sw-shadow-xs)` 柔和微阴影；
   - 注入 hover 态 `transform: translateY(-0.5px)` 轻微抬升与阴影扩展微动效。

3. **回收站操作按钮全圆角胶囊与按压反馈统合（T-7764）**：
   - 为 `.sw-studio__recycle-actions .sw-studio__button` 规范全圆角软胶囊规格 `border-radius: var(--studio-radius-pill, 999px)`；
   - 注入 `:active { transform: scale(0.96); }` 触觉回弹微动效。

4. **契约测试与负向验证探针（T-7765）**：
   - 新增专项测试 `tests/snippet-studio-data-menu-and-recycle-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当数据治理菜单丢失 Bento 软影或回收站条目丢失白卡浮起底色时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/snippet-studio-data-menu-and-recycle-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 19 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
