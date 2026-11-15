# ADR 0509：设置页双层微底、左侧标签栏白底浮起与面板 Bento 浮卡（T-7718~T-7721）

## 背景与诉求

设置面板（Settings Dialog）是用户配置个性化参数、快捷键与存储管理的重要控制中心：
- 设置页此前采用单一底色，未贯穿现代双层微底体系（浅色托底、白卡浮起）；
- 左侧标签栏（`.sw-settings__tabs`）激活项此前仅有简单的主色浅底文字变色，缺少像系统分段器般的圆角白底浮起与阴影浮动质感；
- 右侧各面板卡片（`.sw-settings__panel`）与组卡片（`.sw-settings__group-card`）此前圆角与阴影较为平淡，未能与参考图 Bento 软影体系呼应；
- 设置弹窗外框容器在非全屏自适应与全屏铺满时，需与切换器、工作台保持相同的 18px 大圆角、内层 1px 微光切面（Rim Light）以及全屏沉浸消线。

## 架构决策与设计

1. **设置页双层微底与左侧激活标签白底浮起（T-7718）**：
   - 在 `src/styles/_02-settings.scss` 中将 `.sw-settings` 根容器背景接入 `var(--sw-bg-tinted, var(--sw-page-bg, var(--b3-theme-background)))`，形成带轻微同族色相的微底托盘；
   - 激活标签 `.sw-settings__tab.is-active` 升级为 `background: var(--sw-card-float-bg, ...)` 白底圆角块，并注入 `box-shadow: var(--sw-shadow-xs)` 柔和微阴影，使导航当前选中的焦点跃然浮起。

2. **设置右侧面板 Bento 浮卡与组卡片分层（T-7719）**：
   - 右侧各设置面板 `.sw-settings__panel` 升级为白卡浮起（`var(--sw-card-float-bg)`）与 Bento 深度软影（`var(--sw-shadow-bento)`）；
   - 圆角统合为 `var(--sw-radius-card, 14px)`；
   - 内部组卡片 `.sw-settings__group-card` 采用柔和边框与底色差自然分隔，消除生硬实线。

3. **设置弹窗微光切面与全屏沉浸消线（T-7720）**：
   - 在 `src/styles/_04-fab-fullscreen-soft.scss` 中针对 `.b3-dialog__container.sw-settings-dialog:not(.sw-dialog--fullscreen)` 声明 18px 大圆角与内发光 1px 微光切面（`box-shadow: var(--sw-shadow-bento), inset 0 0 0 1px ...`）；
   - 全屏模式下声明 `border: none !important; border-radius: 0 !important; box-shadow: none !important;`，实现四边零缝隙纯粹沉浸。

4. **契约测试与负向验证（T-7721）**：
   - 新增专项测试 `tests/settings-bento-card-and-tabs-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当设置面板丢失 Bento 软影或激活标签白底浮起规则被篡改时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/settings-bento-card-and-tabs-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 8 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
