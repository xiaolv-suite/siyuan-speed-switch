# ADR 0527：移动端底部抽屉与手势滑块 Bento 浮化、条目微位移与触控反馈（T-7790~T-7793）

## 背景与诉求

在移动端场景下，收藏抽屉（`.sw__mobile-sheet`）与排序弹窗（`.sw__mobile-sort-sheet`）作为挂载在 `body` 上的半屏工作面，是用户单手触达和快速整理高频内容的重要门户：
1. **抽屉容器缺少 Bento 浮层质感与统一阴影**：此前移动端抽屉采用固定 `background: var(--b3-theme-surface)` 与硬编码黑阴影（`0 -14px 36px rgba(55, 65, 100, .16)`），未接入 Bento 体系下的白卡浮起（`--sw-card-float-bg`）、毛玻璃滤镜（`--sw-blur-lg`）与 `--sw-shadow-bento` 深度柔影；
2. **手势拖拽手柄缺少触感扩张与主题联动**：半屏拖拽指示手柄（`.sw__mobile-sheet-handle`）此前采用固定的 2px 小圆角与简单浅色底，未达到全圆角软胶囊标准（`--sw-platform-radius-pill, 999px`），且缺少悬停/触摸时的 `scaleX(1.15)` 视觉可拖拽扩张指示；
3. **抽屉条目与排序选项缺少微触感与独立白卡**：列表项（`.sw__mobile-sheet-item` 与 `.sw__mobile-sort-option`）此前仅使用普通行底色，缺少 1.5px 顺滑横向微位移、图标 `scale(1.08)` 放大与 `scale(0.98)` 按压弹性反馈；角标未对齐 `tabular-nums` 等宽排版与药丸晶格；关闭按钮缺少 `scale(0.94)` 按压回弹。

## 架构决策与设计

1. **移动端底部抽屉 Bento 白卡浮起、顶部柔和边线与微光切面升级（T-7790）**：
   - 在 `src/styles/_05-settings-widgets.scss` 中声明 `.sw__mobile-sheet, .sw__mobile-sort-sheet`：
     - `background: var(--sw-card-float-bg, var(--b3-theme-surface));`
     - `-webkit-backdrop-filter: var(--sw-blur-lg); backdrop-filter: var(--sw-blur-lg);`
     - `border-top: 1px solid var(--sw-color-line-soft, color-mix(in srgb, var(--b3-border-color) 45%, transparent));`
     - `box-shadow: var(--sw-rim-light, inset 0 1px 0 0 rgba(255, 255, 255, 0.12)), var(--sw-shadow-bento);`
     - 彻底清除硬编码阴影字面量。

2. **半屏手势拖拽手柄胶囊晶格与微反光加固（T-7791）**：
   - 为 `.sw__mobile-sheet .sw__mobile-sheet-handle, .sw__mobile-sort-sheet .sw__mobile-sheet-handle` 声明：
     - `width: 36px; height: 4px;` 保持标准 36px 物理宽度；
     - `border-radius: var(--sw-platform-radius-pill, 999px);` 全圆角软胶囊规范；
     - `background: color-mix(in srgb, var(--sw-color-accent, var(--b3-theme-primary)) 45%, var(--b3-theme-on-surface-light, #999));`
     - `box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);`
     - `&:hover { opacity: 0.85; transform: scaleX(1.15); }` 触控/悬停扩张。

3. **移动抽屉选项条目与排序项 Bento 独立卡片与按压微位移加固（T-7792）**：
   - 为 `.sw__mobile-sheet-item` 与 `.sw__mobile-sort-option` 声明：
     - `min-height: 44px;`（排序项 46px）触控热区保真；
     - `border-radius: var(--sw-radius-md, 8px);`
     - `&:hover { background: var(--sw-color-accent-soft); border-color: ...; color: var(--sw-color-accent); transform: translateX(1.5px); }`
     - `&:active { transform: translateX(1.5px) scale(0.98); }` 物理触感反馈；
     - 悬停图标 `svg` 平滑放大 `scale(1.08)`；
   - 计数角标 `.sw__mobile-sheet-count` 声明 18px 紧凑药丸、等宽字体（`--sw-font-mono`）、`tabular-nums` 与 28% 主题色精微边框；
   - 关闭按钮 `.sw__mobile-sheet-close` 声明全圆角软胶囊与 active `scale(0.94)` 按压回弹。

4. **契约测试、三重破坏性负向探针与无障碍闭环（T-7793）**：
   - 新增专项测试 `tests/mobile-sheet-bento-contract.test.cjs`（4/4 PASS）；
   - 注入三重破坏性负向验证探针：拦截丢失 hover `translateX(1.5px)` 位移、丢失白卡底色与丢失手柄胶囊规格违规；
   - 在 `_05-settings-widgets.scss` 与 `_11-ui-polish.scss` 的 `@media (prefers-reduced-motion: reduce)` 中全面接管抽屉容器、条目、手柄与关闭按钮。

## 验证与门禁结果

- 契约测试：`tests/mobile-sheet-bento-contract.test.cjs` 4/4 PASS（含三重破坏性负向探针）；
- 25 套专项契约测试矩阵：84/84 100% PASS；
- 8 套核心样式门禁：33/33 100% PASS；
- 全量测试套件：`node tests/run-tests.cjs` 9,812 passed, 0 failed, 1 skipped (100% 绿灯)；
- 5 套 Chromium 真实冒烟测试：全部 100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过；
- 边界审计：`integration-boundary-audit` 50/50 全绿通过；
- 产物预算：`dist/index.js` 1,303,163 B（自律线 1276 KiB 内，余量 3,461 B），`package.zip` 683,731 B（门禁 684 KiB 内，余量 16,685 B）。
