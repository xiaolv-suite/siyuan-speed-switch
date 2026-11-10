# ADR 0511：悬浮球首层动作 Bento 软影、更多面板 18px 大圆角与数字槽物理机械键帽（T-7726~T-7729）

## 背景与诉求

悬浮球（Floating Ball / FAB）及其展开的“首层动作”与“更多动作”面板，是用户在任何工作场景下随手唤起高频操作的全局入口：
- 首层扇形/环形动作项（`.sw__floating-ball-action`）此前采用 12px 圆角与简单单层阴影，未能与参考图双层微底白卡浮起及 Bento 深度软影统合；
- 展开的“更多面板”（`.sw__floating-ball-more`）此前采用 16px 圆角，与全局 18px 面板级大圆角及微光切面存在微小偏差；
- 更多面板前 9 个操作行的数字直达槽徽标（`data-digit`）仅有简单的 1px 平面线框，缺少与动作画板对齐的 2px 物理机械键帽立体下沉底边与渐变浮层。

## 架构决策与设计

1. **首层动作白卡浮起与 14px Bento 软影（T-7726）**：
   - 在 `src/styles/_04-fab-fullscreen-soft.scss` 中将 `.sw__floating-ball-action` 圆角统合为 `var(--sw-radius-card, 14px)`；
   - 背景升级为 `var(--sw-card-float-bg)`，阴影接入 `var(--sw-shadow-bento)`；
   - 悬浮态（`:hover`）注入 `transform: translateY(-1px);` 与多层柔光，增强轻微抬升反馈。

2. **更多动作面板 18px 大圆角与微反光切面（T-7727）**：
   - 在 `src/styles/_floating-ball-more.scss` 中将 `.sw__floating-ball-more` 圆角对齐为 `var(--sw-radius-panel, 18px)`；
   - 阴影组合 `var(--sw-shadow-bento)` 与内层微切面 `var(--sw-rim-light)`，配合 `backdrop-filter: var(--sw-blur-lg)` 实现通透沉浸的玻璃质感。

3. **数字直达槽立体机械键帽标准统合（T-7728）**：
   - 将 `.sw__floating-ball-more-row[data-digit]::before` 升级为标准立体机械键帽（Keycap）：
     - `border-bottom: 2px solid color-mix(in srgb, var(--b3-border-color) 85%, #000 15%);`
     - `background: linear-gradient(180deg, color-mix(in srgb, var(--b3-theme-surface) 96%, #fff 4%), color-mix(in srgb, var(--b3-theme-surface) 88%, var(--b3-theme-background) 12%));`
     - `box-shadow: 0 1px 1px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15);`
     - 锁定 `font-variant-numeric: tabular-nums`；
   - 与动作画板、卡片角标达成全平台一致的机械键帽触感。

4. **契约测试与负向验证（T-7729）**：
   - 新增专项测试 `tests/floating-ball-bento-and-keycap-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当动作卡片丢失 Bento 软影或数字槽芯片丢失 2px 物理键帽底边时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/floating-ball-bento-and-keycap-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 10 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
