# 0346. T-7449 移动端收藏抽屉与分组管理弹窗 Home/End 快速跳转契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7449

## 背景与上下文

在移动端切换器的收藏底部抽屉（`showMobileFavSheet`）与分组管理底部弹窗（`openMobileGroupActions`）中，此前虽然支持通过 `ArrowDown` / `ArrowUp` 循环焦点以及 `Tab` / `Shift+Tab` 焦点陷阱闭环，但在操作条目较多时缺少快速触达首项与尾项的 `Home` 与 `End` 全键盘支持。

## 架构决策

1. **Home / End 快速跳转**：
   - 在 `showMobileFavSheet` 与 `openMobileGroupActions` 的 `overlay` 键盘监听中增加对 `Home` 与 `End` 的拦截：
     - `Home`：直接将焦点赋予可见按钮列表首项（`buttons[0]`）；
     - `End`：直接将焦点赋予可见按钮列表末项（`buttons[buttons.length - 1]`）；
     - 阻止冒泡与默认页面滚动，实现全表面底部弹窗的标准无障碍体验。
2. **门禁与测试**：
   - 新增 `tests/mobile-sheet-home-end-keyboard.test.cjs`；
   - 负向验证：若移动端抽屉未绑定 Home/End 跳转，断言必须精准红。

## 后果与影响

- 统一桌面端与移动端弹窗列表的全键盘交互标准（方向键 + Home/End + Tab 陷阱 + Escape 退出）。
