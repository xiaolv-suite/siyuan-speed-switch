# ADR 0506：移动端软键盘输入态避让、全面屏安全区加固与触控保真（T-7702~T-7705）

## 背景与诉求

在触控与移动端真实使用场景中，切换器抽屉面板（`.sw__mobile`）存在三处关键细节体验痛点：
1. **软键盘挤压视口**：手机端弹出输入法时，键盘占据视口 40%~50% 空间，底栏快捷动作条（`.sw__quick-actions`）若仍常驻占据高度，将导致搜索命中列表被压缩至仅剩极窄单行，无法舒适浏览；
2. **全面屏 Home 条遮挡**：主流 iOS 与 Android 全面屏手机底部带有系统级 Home 手势横条，底栏按钮若仅声明基础内边距，容易与系统手势热区重叠引起误触；
3. **关闭按钮触控热区偏差**：移动端顶栏关闭按钮视觉尺寸为 34×32px，在小屏下轻触偶发偏差，缺少扩大至 44px 移动端无障碍标准热区的伪元素护盾。

## 架构决策与设计

1. **软键盘输入态底栏自动避让（T-7702）**：
   - 在 `src/styles/_03-switcher-mobile.scss` 中针对 `.sw__mobile.sw-keyboard-open`，将底部快捷动作栏声明为 `:is(.sw__quick-actions, .sw-home__quick-actions) { display: none !important; }`；
   - 键盘弹起时底栏无感隐退，垂直浏览视口 100% 留给搜索结果列表与输入框，键盘收起时顺滑恢复。

2. **全面屏安全区内边距加固（T-7703）**：
   - 在 `.sw__mobile .sw__quick-actions` 中追加 `padding-bottom: calc(var(--sw-space-sm, 6px) + env(safe-area-inset-bottom, 0px));`；
   - 确保全面屏手势横条与操作按钮间维持充足的安全呼吸空隙，彻底消除手势冲突。

3. **关闭按钮 44px 触控保真（T-7704）**：
   - 在 `src/styles/_04-fab-fullscreen-soft.scss` 中为 `.sw__mobile-close-btn` 声明 `position: relative` 与 `&::after { content: ""; position: absolute; inset: -6px; }`；
   - 保持 34×32px 极简视觉外观的同时，将不可见触控热区扩展至 46×44px，满足 WCAG 移动端触控无障碍规范。

4. **契约测试与负向验证（T-7705）**：
   - 新增专项测试 `tests/mobile-touch-target-and-keyboard-avoidance-contract.test.cjs`；
   - 注入双重破坏性负向验证探针：当软键盘避让规则丢失或抹除全面屏安全区时，探针精准拦截报错。

## 验证与门禁结果

- 契约测试：`tests/mobile-touch-target-and-keyboard-avoidance-contract.test.cjs` 4/4 PASS（含双重负向探针）；
- 8 套核心样式门禁：100% PASS；
- 5 套 Chromium 真实冒烟测试：100% PASS；
- 质量审计：`quality-batch-audit` 50/50 全绿通过。
