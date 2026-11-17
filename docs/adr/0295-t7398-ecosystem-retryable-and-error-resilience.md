# 0295. T-7398 生态小组件重试把手自愈与单向异常隔离契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7398

## 背景与上下文

在小驴全生态跨插件联邦协同中，雷切工作台承载了来自小驴打卡、小驴人脉、小驴管家、小驴拾遗、小驴考试、小驴闪卡、小驴常用、思阅与思播等 9 大外部小组件。
在网络抖动或兄弟插件尚未安装启动时，`wrapEcosystemModuleRead` 具备 800ms 熔断保护。然而先前存在隐患：
1. 超时或报错后虽声明了 `retryable: true`，但将状态标注为了 `ready`，导致工作台视图层误判为正常空态，未渲染 `.sw__home-module-retry` 重试把手；
2. 异常捕获中直接调用 `console.warn`，在大库批量刷新时容易造成控制台刷屏；
3. `src/home-view.js` 在空内容判定中未向下透传重试按钮。

## 架构决策

1. **安全读取器规范化**：
   - 在 `src/api/external-bridge.ts` 与 `src/api/external-bridge.js` 中：
     - 超时或报错回退统一规范为 `{ items: [], emptyHint: "📦 数据暂未返回，点击重试", status: "error", retryable: true }`；
     - 移除无保护的 `console.warn`，杜绝生产控制台日志噪音。
2. **工作台空态重试把手闭环**：
   - 在 `src/home-view.js` 中，无论 `status === "error"` 还是 `status === "ready"` 下的无数据空态，只要标记了 `view.retryable === true` 且提供 `options.onRetry`，均规范化渲染 `.sw__home-module-retry` 重试按钮；
   - 点击重试后即时触发单组件重新拉取，兼顾无障碍（focusKey: "retry"）。
3. **门禁与测试**：
   - 新增 `tests/ecosystem-retryable-and-error-resilience.test.cjs`；
   - 负向验证：若异常时丢失 retryable 或重试按钮未挂载，断言必须精准红。

## 后果与影响

- 生态小组件在兄弟插件离线或网络故障时具备完整的可解释空态与可点击重试把手；
- 保持全生态高容错与零拖垮原则。
