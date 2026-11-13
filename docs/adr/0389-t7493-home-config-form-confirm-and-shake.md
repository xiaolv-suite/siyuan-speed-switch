# ADR 0389：第二面板小组件配置表单重置默认二次确认与动态校验微动效加固（T-7493）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

小组件配置表单（`openHomeConfigForm`）用于为带有 `configSchema` 的组件提供定制化参数编辑（例如 RSS 订阅源、天气地理坐标、自定义每日古籍语录等）。此前：
1. 点击“恢复默认”（`homeConfigReset`）按钮时，表单立即静默覆写为默认值，缺乏误触确认，可能导致用户此前细致配置的个人参数被误清空；
2. 保存时若存在原生 `invalid` 字段（如非法必填或格式错误），仅调用了浏览器 `reportValidity()`，在复杂多字段表单中缺乏醒目的表单层抖动与反馈微动效。

## 决策

1. **恢复默认二次确认保护**：
   - 在 `src/home-config-form.ts` 与 `src/home-config-form.js` 中，点击重置按钮时检测当前是否有修改或自定义字段，若存在则调用 `window.confirm(this.i18n.homeConfigResetConfirm)` 二次确认防误触；
   - 补充双语国际化文案：中文“确定恢复默认配置吗？”，英文“Reset configuration to defaults?”。

2. **保存失败整表轻量抖动微动效**：
   - 当检测到表单内包含 `input:invalid, select:invalid` 时，动态为 `root` 挂载 `.sw-form--shake` 动效类，触发 `±4px` 水平物理弹性抖动；
   - 在 `src/styles/_05-settings-widgets.scss` 中声明规范 `@keyframes sw-form-shake`，并在 `prefers-reduced-motion: reduce` 下自动归零停用，兼顾趣味性与无障碍规范。

## 验证

- **契约测试**：`tests/home-config-form-confirm-shake.test.cjs` 2/2 满分通过，验证二次确认拦截、TS/JS 镜像同步与 SCSS 动画类；
- **负向验证**：修改类名断言注入故障，确认测试精准拦截，还原后通过。
