# ADR 0514：侧栏面板列表双层微底、活跃项白卡浮起与折叠气泡 Bento 浮化（T-7738~T-7741）

## 背景与诉求

在第一面板（切换器 Switcher）的左侧面板列表（`.sw__dock`）中，承载着文档树、大纲、书签、反链与第三方插件视图入口：
- 侧栏此前采用单层底色，未能接入平台整体双层微底体系（浅色托底、白卡浮起）；
- 激活项（`.sw__dock-item.sw__active`）此前只有文字变色与淡底，缺少与系统图标轨一致的圆角背景块与柔和微阴影；
- 折叠模式（44px 图标条）下鼠标 hover 浮出面板名称气泡（`.sw__dock-flyout`）此前采用 4px 硬边框和旧阴影，缺乏现代 Bento 深度浮层的精致感；
- 折叠切换手柄（`.sw__dock-toggle`）需要全圆角胶囊规格与 `:active` 缩放微反馈。

## 架构决策与设计

1. **侧栏面板微底托底与活跃项白卡浮起（T-7738）**：
   - 在 `src/styles/_11-ui-polish.scss` 中将 `.sw__dock` 背景接入 `var(--sw-bg-tinted)` 浅色同族托底；
   - 激活项 `.sw__dock-item.sw__active` 升级为 `var(--sw-card-float-bg)` 白底浮起圆角块与 `var(--sw-shadow-xs)` 柔和微阴影，使活跃项清晰浮于微底之上。

2. **折叠图标条 hover 气泡 Bento 浮化与 8px 圆角（T-7739）**：
   - 在 `src/styles/_03-switcher-mobile.scss` 中将 `.sw__dock-flyout` 升级为 8px 圆角、`var(--sw-card-float-bg)` 白卡浮起与 `var(--sw-shadow-bento)` 深度软影；
   - 边框微调为 `var(--sw-color-line-soft)` 柔和半透明线。

3. **折叠切换手柄全圆角胶囊与按压微动效（T-7740）**：
   - 将 `.sw__dock-toggle` 声明全圆角胶囊规范 `border-radius: var(--sw-platform-radius-pill, 999px)`；
   - 补齐 `:active { transform: scale(0.92); }` 触觉级弹性微动效。

4. **契约测试与负向验证（T-7741）**：
   - 新增专项测试 `tests/dock-rail-bento-and-flyout-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当侧栏活跃项丢失白底浮起背景或折叠气泡丢失 Bento 软影时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/dock-rail-bento-and-flyout-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 全部 13 套契约测试：100% PASS；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
