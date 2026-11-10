# 0319. T-7422 移动端抽屉弹窗全键盘方向键流与焦点陷阱加固契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7422

## 背景与上下文

在移动端切换器中，用户可以通过抽屉弹窗执行两类操作：
1. **移动端收藏清单（`showMobileFavSheet`）**；
2. **分组操作弹窗（`openMobileGroupActions`）**。
此前收藏抽屉中仅监听了 `Escape` 键，未配置 Tab 焦点陷阱与上下方向键按钮流；分组操作抽屉中虽然包含 Tab 陷阱，但缺少 `ArrowDown` / `ArrowUp` 键盘直接导航，在平板或连接物理键盘的移动设备上操作存在断层。

## 架构决策

1. **移动端收藏抽屉 Tab 焦点陷阱与方向键导航**：
   - 在 `src/index.ts` 与 `src/index.js` 的 `showMobileFavSheet` 中：
     - 为弹窗补充 `Tab` / `Shift+Tab` 闭环焦点陷阱；
     - 增加 `ArrowDown` / `ArrowUp` 循环流转操作按钮。
2. **移动端分组操作抽屉方向键流**：
   - 在 `src/mobile-switcher-ui.ts` 与 `src/mobile-switcher-ui.js` 的 `openMobileGroupActions` 中：
     - 为 `overlay` 增加 `ArrowDown` / `ArrowUp` 循环焦点流转。
3. **门禁与测试**：
   - 新增 `tests/mobile-sheet-keyboard-navigation.test.cjs`；
   - 负向验证：若收藏抽屉未拦截 Tab 导致焦点泄露至背后页面，断言必须精准红。

## 后果与影响

- 移动端全部抽屉组件达到统一的高标准无障碍键盘流；
- 全键盘操作无断层。
