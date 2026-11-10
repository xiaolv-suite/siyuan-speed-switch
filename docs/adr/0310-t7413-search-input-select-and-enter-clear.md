# 0310. T-7413 平台搜索框获焦自动全选与无匹配项 Enter 自愈清空契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7413

## 背景与上下文

在切换器、侧边栏和手机端搜索框中（通过 `bindSearchInputComposition` 统一装配），用户在再次聚焦搜索框时，此前不会自动选中文本，必须连续退格清空后才能键入新词；
此外，当输入检索词过滤后无任何结果项（无命令项、无卡片、无统一项、无文档结果）时，按 `Enter` 键静默无响应，容易造成卡在空结果视图的困扰。

## 架构决策

1. **输入框获焦自动全选**：
   - 在 `bindSearchInputComposition` 中为 `input` 挂载 `focus` 监听：
     - 当 `input.value` 存在内容时，执行 `input.select()`。
2. **无匹配项 Enter 自愈清空刷新**：
   - 在 `bindSearchInputComposition` 的 `keydown` 处理中：
     - 当按下 `Enter` 键且滚动列表内不存在可激活的目标项时：
     - 若 `input.value` 非空，拦截默认行为，清空 `input.value = ""`，重置清除按钮状态并即时派发 `onTrigger()`，恢复全量结果列表。
3. **门禁与测试**：
   - 新增 `tests/search-input-select-and-enter-clear.test.cjs`；
   - 负向验证：若 Enter 无匹配项时缺少 input.value 清空，断言必须精准红。

## 后果与影响

- 全平台搜索框（主弹窗、侧边栏、移动端）交互手感统一升级；
- 形成跨表面一脉相承的高效自愈闭环。
