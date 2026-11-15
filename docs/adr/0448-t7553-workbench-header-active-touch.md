# ADR 0448：第二面板工作台小组件卡片标题栏长按/按压微缩放与触感反馈加固（T-7553）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板（工作台）中，小组件卡片标题栏承载图标、标题、时效徽标、设置与折叠按钮，并支持鼠标双击折叠。此前：
1. 鼠标点击或移动端手指按压标题栏空白区域时，缺乏即时、真实的物理按压反馈；
2. 移动端触摸时容易触发浏览器默认的半透明高亮遮罩（tap highlight），影响原生拟物触感。

## 决策

1. **标题栏物理按压弹性微缩放**：
   在 `src/styles/_05-settings-widgets.scss` 中为 `.sw__home-module-header` 声明：
   - `transition: transform $sw-dur-fast $sw-ease, opacity $sw-dur-fast $sw-ease;`
   - `&:active { transform: scale(0.99); }`，提供微妙而自然的 1% 按压弹性形变。
2. **移动端触控优化**：
   声明 `-webkit-tap-highlight-color: transparent;`，消除触控时的原生灰色方块闪烁。

## 验证

- **契约测试**：`tests/workbench-header-active-touch.test.cjs` 2/2 满分通过，验证 transition、active scale 与负向注入拦截；
- **回流测试**：`tests/workbench-header-dblclick-toggle.test.cjs` 保持全绿。
