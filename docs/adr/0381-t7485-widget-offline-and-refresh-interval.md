# ADR 0381：第二面板小组件离线容灾指示器与自定义静默刷新周期配置（T-7485）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在第二面板工作台中，大量外部网络小组件（天气、新闻、番组每日放送、汇率、状态监控等）依赖外部端点与网络连接。此前：
1. 当本地离线或断网时（`navigator.onLine === false` 或网络层返回 `reason: "offline"`），卡片会被直接判定为常规 `failed`，呈现刺眼的红色报错边框，无法与真实服务端崩溃进行语义区分；
2. 缺乏针对失败次数的退避机制与用户自定义静默刷新周期配置模型，可能导致断网恢复期间产生网络流量风暴或持续无效探测。

## 决策

1. **小组件离线容灾状态通道与视觉规范**：
   - 在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `refresh` 包装器中，细化健康判定：
     ```typescript
     const offline = !ok && (result?.reason === "offline" || (typeof navigator !== "undefined" && navigator.onLine === false));
     cell.dataset.swHealth = ok ? "ok" : offline ? "offline" : stale ? "stale" : "failed";
     ```
   - 双语注入 `homeHealthOffline` 提示（中文“离线缓存”，英文“Offline cache”）；
   - 在 `src/styles/_05-settings-widgets.scss` 中定义 `.sw-home__cell[data-sw-health="offline"]` 样式，以温和的中性琥珀微边框配合 `attr(data-sw-health-text)` 提示，保持离线缓存内容的可读性与沉静体验。

2. **小组件自定义静默刷新周期与指数退避模型**：
   - 在 `src/home-model.js` 中新增 `REFRESH_INTERVAL_PRESETS` 预设集合与 `resolveWidgetRefreshInterval(config, defaultMinutes = 15)` 纯模型函数，支持提取实例配置并安全钳制在 1 ~ 1440 分钟范围内；
   - 在 `src/home-controller.js` 中新增 `computeWidgetBackoffDelay(failureCount, baseMs = 15000, maxMs = 300000)` 指数退避算法，失败 0 次不退避，随失败次数指数递增并严格以 5 分钟封顶，有效保护端侧计算资源。

## 验证

- **契约测试**：`tests/widget-offline-and-refresh-interval.test.cjs` 3/3 满分通过，验证周期解析钳制、指数退避计算与 TS/JS 镜像及 SCSS 样式；
- **负向验证**：修改退避初始返回值注入故障，确认断言精准失败，还原后通过。
