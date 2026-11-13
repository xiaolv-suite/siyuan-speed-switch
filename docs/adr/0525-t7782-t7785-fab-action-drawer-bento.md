# ADR 0525：悬浮球更多动作面板 Bento 白卡浮起、选项微位移与管理胶囊（T-7782~T-7785）

## 背景与诉求

悬浮球从屏幕边缘呼出的“更多操作面板”（`.sw__floating-ball-more`）是用户在任意工作现场快速检索并触发动作的全局中枢：
1. **搜索框底色与聚焦环分散**：此前 `.sw__floating-ball-more-search` 采用传统输入框背景与实线边框，未接入 Bento 体系下的白卡浮起（`--sw-card-float-bg`）与主题色复合外发光环（`--sw-focus-glow`）；
2. **动作条目缺少白卡层次**：面板内的动作行（`.sw__floating-ball-action.is-more-item`）此前仅使用简单列表底色，缺少 Bento 体系下的独立浮起白卡感（`--sw-card-float-bg`、8px 圆角与 `--sw-shadow-xs`），且悬停时仅采用普通下位移，与次级动作画板及尺寸菜单的 1.5px 顺滑横向微位移规范不一致；
3. **管理动作按钮形态不一**：底部的“管理快捷动作”按钮（`.sw__floating-ball-more-manage`）此前采用 8px 圆角矩形，缺少全平台统合的全圆角软胶囊规格（`--sw-platform-radius-pill, 999px`）与微抬升反馈。

## 架构决策与设计

1. **悬浮球更多操作搜索框 Bento 白卡底色与发光焦点环升级（T-7782）**：
   - 在 `src/styles/_floating-ball-more.scss` 中声明 `.sw__floating-ball-more-search`：
     - `background: var(--sw-card-float-bg, var(--b3-theme-background));`
     - `border: 1px solid var(--sw-color-line-soft, color-mix(in srgb, var(--b3-border-color) 45%, transparent));`
     - `border-radius: var(--sw-radius-control, 10px);`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:focus { outline: none; border-color: var(--sw-color-accent, var(--b3-theme-primary)); box-shadow: var(--sw-focus-glow); }`
     - 平滑过渡 `border-color, box-shadow, background-color`。

2. **更多动作卡片条目 Bento 独立白卡浮起与横向微位移加固（T-7783）**：
   - 在 `src/styles/_floating-ball-more.scss` 中为 `.sw__floating-ball-action.is-more-item` 声明：
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `border: 1px solid var(--sw-color-line-soft, color-mix(in srgb, var(--b3-border-color) 45%, transparent));`
     - `border-radius: var(--sw-radius-md, 8px);`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:hover:not(:disabled) { background: var(--sw-color-accent-soft, var(--sw-accent-soft)); border-color: color-mix(in srgb, var(--sw-color-accent, var(--b3-theme-primary)) 40%, transparent); transform: translateX(1.5px); box-shadow: var(--sw-shadow-sm); }`
     - `&:active:not(:disabled) { transform: translateX(1.5px) scale(0.98); }`
     - 图标 `.sw__floating-ball-action-icon svg` 在 hover 时平滑放大 `scale(1.08)` 并高亮主色。

3. **悬浮球快捷动作管理按钮全圆角胶囊与微反光边缘加固（T-7784）**：
   - 为 `.sw__floating-ball-more-manage` 声明全圆角软胶囊规范 `border-radius: var(--sw-platform-radius-pill, 999px)`；
   - 接入白卡浮起底色、主题色前景色与 `--sw-shadow-xs`；
   - 悬停态保持 `box-shadow: var(--sw-rim-light, ...), var(--sw-shadow-xs)` 微反光边缘与 `-1px` 微抬升；按下获得 `scale(0.96)` 物理微动效。

4. **契约测试、破坏性负向探针与无障碍闭环（T-7785）**：
   - 新增专项测试 `tests/fab-action-drawer-bento-contract.test.cjs`；
   - 注入三重破坏性负向验证探针：拦截丢失微位移、丢失白卡底色与丢失胶囊规格违规；
   - `@media (prefers-reduced-motion: reduce)` 全面接管更多面板搜索框、动作条目与管理按钮。

## 验证与门禁结果

- 契约测试：`tests/fab-action-drawer-bento-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 23 套专项契约测试矩阵：72/72 100% PASS；
- 8 套核心样式门禁：63/63 100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过。
