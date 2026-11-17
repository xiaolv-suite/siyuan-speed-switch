# ADR 0470：移动端防误触热区扩展（44px）与 SiYuan 宿主手势隔离（T-7575）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在移动端触控一致性审查与手势体验排查中发现：
1. 移动端搜索清除按钮（`.sw__search-clear`，20×20px）与过滤按钮（`.sw__search-filter-btn`，28×28px）物理尺寸较小，远低于 WCAG 2.5.5 及 iOS HIG / Material Design 建议的最小触控目标（44×44px / 48×48px），在手机端触摸时极易产生误点与脱靶；
2. 思源笔记移动端内核（3.8.x+）具备内置的从屏幕边缘横向侧滑呼出左右工作区侧栏的手势机制。在插件的主切换器、工作台和组件商店内进行触控、横向拖拽或卡片滑动时，因缺乏手势边界标识，极易误触发思源宿主的侧栏呼出动画，破坏插件内部的滑动手感。

## 决策

1. **触控热区伪元素透明扩展（44×44px）**：
   在 `src/styles/_03-switcher-mobile.scss` 中，为 `.sw__search-clear` 与 `.sw__search-filter-btn` 声明居中对齐的 `&::before` 伪元素：
   ```scss
   &::before {
       content: "";
       position: absolute;
       top: 50%;
       left: 50%;
       transform: translate(-50%, -50%);
       width: 44px;
       height: 44px;
       min-width: 44px;
       min-height: 44px;
   }
   ```
   在保持视觉紧凑、美观的同时，将点击事件感应区扩展至无障碍标准的 44×44px。
2. **移动端宿主手势隔离（data-prevent-swipe）**：
   与悬浮球手势隔离协议（T-6778 / ADR 0071）统一，为移动端切换器、工作台和组件商店容器注入 `data-prevent-swipe="true"`：
   - `src/mobile-switcher-ui.ts` / `.js`：对 `dialog.element` 与 `.sw__mobile` 注入属性；
   - `src/second-panel-ui.ts` / `.js`：对 `dialog.element` 与 `.sw-home` 注入属性；
   - `src/home-store-ui.ts` / `.js`：对 `storeDialog.element` 与 `.sw-home-store` 注入属性；
   确保在插件容器内的滑动事件流被宿主侧滑状态机识别并放行。

## 验证

- **契约测试**：`tests/mobile-touch-and-swipe-isolation.test.cjs` 4/4 满分通过，涵盖 SCSS 伪元素与 TS/JS 属性注入及负向注入拦截；
- **类型检查**：`pnpm exec tsc --noEmit` 0 报错。
