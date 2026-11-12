# 0294. T-7397 知识蒸馏漏斗条目级交互指令分发与契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7397

## 背景与上下文

在 T-7395 中落地了 `knowledge-funnel`（渐进知识蒸馏漏斗）Bento 小组件，呈现待读分片、待提炼摘录与今日到期闪卡指标。
但原本条目仅作为只读文本呈现。根据快门中枢“极速漫游、无摩擦流转”的深化指令，用户在工作台上看到流转指标时，应能直接点击对应行秒级切入相应操作：
1. 点击“📚 待读分片”，直接触发 `glean-keep-roaming` 动作，秒级切入加权阅读长文切片；
2. 点击“✂️ 待提炼摘录”，直接唤起常用摘录/剪藏；
3. 点击“🎴 今日到期卡”，直接唤起闪卡复习流程。

## 架构决策

1. **条目指令挂载**：
   - 在 `src/home-external-adapters.ts`（及对应 JS 文件）的 `knowledge-funnel` 组件生成结果中：
     - 为待读分片配置 `command: "glean-keep-roaming"`；
     - 为待提炼摘录配置 `command: "xiaolv-common::recent"`；
     - 为今日到期闪卡配置 `command: "action:riffCard"`。
2. **`handleHomeItemAction` 核心拦截分发**：
   - 在 `src/index.ts` 与 `src/index.js` 的 `handleHomeItemAction` 入口处：
     - 优先拦截 `item.command === "glean-keep-roaming"`，关闭面板并执行 `executeKeepRoaming()`；
     - 拦截 `item.command === "action:riffCard"`，关闭面板并执行全局闪卡复习快捷动作。
3. **门禁与测试**：
   - 新增 `tests/funnel-interactive-commands-contract.test.cjs`；
   - 负向验证：若条目缺少 command 字段或未在 `handleHomeItemAction` 中拦截分发，断言必须精准红。

## 后果与影响

- 工作台知识蒸馏漏斗从小组件纯数字看板晋级为**一键直达知识消化流水线的交互控制台**；
- 保持双端一致，桌面与移动端均能点击条目直接流转。
