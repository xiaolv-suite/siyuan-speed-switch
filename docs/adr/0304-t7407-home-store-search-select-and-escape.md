# 0304. T-7407 工作台小组件商店搜索框自动全选与 Escape 阶梯退出契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7407

## 背景与上下文

在第二面板小组件商店（`openHomeWidgetStore`）中，当用户二次聚焦到搜索框准备检索时，若存在上次输入的关键词，此前不会自动选中文本，用户不得不连续按 Backspace 清除；
此外，当搜索框为空时按 `Escape` 键，此前仅交由宿主冒泡，偶发无法及时关闭商店弹窗的迟滞感。

## 架构决策

1. **搜索框获焦自动全选**：
   - 在 `src/home-store-ui.ts` 与 `src/home-store-ui.js` 中，为搜索框绑定 `focus` 监听：
     - 若 `searchInput.value` 存在内容，直接触发 `searchInput.select()`，支持键入新词直接覆盖。
2. **Escape 键阶梯式调度**：
   - 当捕获 `Escape` 按键时：
     - 若输入框非空，点击清除按钮并清空关键词；
     - 若输入框已为空，显式调用 `storeDialog.destroy()`，确保全键盘退出 100% 顺畅。
3. **门禁与测试**：
   - 新增 `tests/home-store-search-select-and-escape.test.cjs`；
   - 负向验证：若未处理空值 Escape 退出或获焦未调用 select，断言必须精准红。

## 后果与影响

- 小组件商店检索与退出路径更加灵敏流畅；
- 遵循阶梯式 Escape 标准交互心智。
