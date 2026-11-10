# 0325. T-7428 设置中心搜索框聚焦自动全选、Enter 自愈清空与 Escape 阶梯退出契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7428

## 背景与上下文

在设置中心主弹窗中，顶部常驻设置项搜索框（`sw-settings__search-input`）。
此前搜索框聚焦时不会自动选中旧文本，需反复按退格键清空；当输入的搜索词在当前设置索引中无任何匹配项时，按 `Enter` 键静默无响应，容易造成卡在空结果视图的困扰；而在搜索框内按 `Escape` 键仅清空文本，无法在输入框为空时直接退出设置弹窗。

## 架构决策

1. **输入框获焦自动全选**：
   - 为设置搜索框 `searchInput` 绑定 `focus` 事件：
     - 若 `searchInput.value` 存在内容，直接调用 `searchInput.select()`。
2. **空匹配结果 Enter 自愈清空恢复**：
   - 在 `keydown` 处理中，当按下 `Enter` 且当前可视匹配结果为空（`!entry`）时：
     - 若 `searchInput.value` 非空，清空输入框并即时调用 `renderSettingsSearchResults()` 恢复默认设置视图。
3. **阶梯式 Escape 清空与关闭弹窗**：
   - 捕获 `Escape` 键：
     - 若输入框有内容，优先清空检索词并收起结果下拉；
     - 若输入框已为空，显式调用 `dialog.destroy()` 安全退出设置中心。
4. **门禁与测试**：
   - 新增 `tests/settings-search-keyboard-flow.test.cjs`；
   - 负向验证：若输入框有词时按 Escape 仍直接关闭弹窗，断言必须精准红。

## 后果与影响

- 设置中心全键盘检索流转更加丝滑；
- 遵循通用阶梯式 Escape 标准心智模型。
