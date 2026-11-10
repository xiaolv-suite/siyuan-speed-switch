# ADR 0526：移动端切换器底部操作栏 Bento 浮动底座、白卡条目与工具栏快捷芯片胶囊化（T-7786~T-7789）

## 背景与诉求

移动端切换器（`.speed-switch.sw__mobile`）在竖屏单手操作下，底部快捷操作栏（`.sw__quick-actions`）与顶栏芯片区（`.sw__mobile-toolbar`）是用户高频触发动作与切换工作上下文的核心抓手：
1. **底部操作栏缺少 Bento 浮层质感**：此前移动端底栏直接继承桌面级平铺底色与扁平实线边框，缺少 Bento 体系下的白卡浮起（`--sw-card-float-bg`）、顶部大圆角（18px）与微光切面（`--sw-rim-light`）；
2. **动作条目缺少独立白卡与触控弹性**：底栏内的条目（`.sw__quick-action`）此前直接继承桌面规则，高度容易受桌面控件高度干扰，且按下时缺少移动端标准的物理下沉微缩放反馈（`scale(0.94)`）；
3. **顶栏快捷芯片圆角不规范**：移动端顶栏的收藏、日记、设置与指南按钮（`.sw__mobile-fav-btn, .sw__journal-btn, .sw__settings-btn, .sw__help-guide-btn`）此前采用固定的 16px 圆角与实线边框，未接入全平台统合的全圆角软胶囊规格（`--sw-platform-radius-pill, 999px`）与 `scale(0.96)` 按压动效。

## 架构决策与设计

1. **移动端切换器底部操作栏 Bento 浮动底座与微光切面升级（T-7786）**：
   - 在 `src/styles/_11-ui-polish.scss` 中针对 `.speed-switch.sw__mobile .sw__quick-actions` 声明：
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `-webkit-backdrop-filter: var(--sw-blur-md); backdrop-filter: var(--sw-blur-md);`
     - `border-top: 1px solid var(--sw-color-line-soft, color-mix(in srgb, var(--b3-border-color) 45%, transparent));`
     - `border-radius: var(--sw-radius-panel, 18px) var(--sw-radius-panel, 18px) 0 0;`
     - `box-shadow: var(--sw-rim-light, inset 0 1px 0 0 rgba(255, 255, 255, 0.08)), var(--sw-shadow-bento);`
     - `min-height: 52px;`
     - 严格保留 `env(safe-area-inset-bottom, 0px)` 全面屏底部手势条避让与软键盘弹起隐藏联动。

2. **移动端快捷操作条目独立白卡浮起与按压弹性触觉反馈加固（T-7787）**：
   - 为 `.speed-switch.sw__mobile .sw__quick-action` 声明：
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `border: 1px solid var(--sw-color-line-soft, color-mix(in srgb, var(--b3-border-color) 45%, transparent));`
     - `border-radius: var(--sw-radius-md, 8px);`
     - `box-shadow: var(--sw-shadow-xs);`
     - `min-height: 44px; height: auto;`（摆脱桌面 34px 行高干扰，保真触控热区）
     - 悬停：`background: var(--sw-color-accent-soft); color: var(--sw-color-accent);`，图标 `scale(1.08)` 放大
     - 按下：`&:active:not(:disabled) { transform: scale(0.94); }` 物理弹性触觉压缩
     - 激活态：`&[aria-pressed="true"]` 保持主题色柔底与 `--sw-focus-glow`。

3. **移动端工具栏快捷芯片软胶囊化与触觉动效加固（T-7788）**：
   - 对 `.speed-switch.sw__mobile .sw__mobile-toolbar :is(.sw__mobile-fav-btn, .sw__journal-btn, .sw__settings-btn, .sw__help-guide-btn)` 声明：
     - `border-radius: var(--sw-platform-radius-pill, 999px);` 全圆角软胶囊规格
     - `height: 36px; min-width: 34px; padding: 0 10px;`（严格吻合行2高度标准）
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `box-shadow: var(--sw-shadow-xs);`
     - `&:active { transform: scale(0.96); }`
   - 对排序按钮 `.sw__sort-btn` 统合 10px 控件圆角、白卡底色与 active `scale(0.96)`。

4. **契约测试、三重破坏性负向探针与无障碍闭环（T-7789）**：
   - 新增专项测试 `tests/mobile-bottom-bar-bento-contract.test.cjs`（4/4 PASS）；
   - 注入三重破坏性负向验证探针：拦截丢失 active scale(0.94) 按压反馈、丢失白卡底座与丢失胶囊规格违规；
   - 在 `@media (prefers-reduced-motion: reduce)` 中全面接管移动端底栏动作条目与顶栏芯片。

## 验证与门禁结果

- 契约测试：`tests/mobile-bottom-bar-bento-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 24 套专项契约测试矩阵：80/80 100% PASS；
- 8 套核心样式门禁：33/33 100% PASS；
- 全量测试套件：`node tests/run-tests.cjs` 9,808 passed, 0 failed, 1 skipped (100% 绿灯)；
- 5 套 Chromium 真实冒烟测试：全部 100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过；
- 产物预算：`dist/index.js` 1,303,163 B（自律线 1276 KiB 内，余量 3,461 B），`package.zip` 683,366 B（门禁 684 KiB 内，余量 17,050 B）。
