# ADR 0460：Snippet Studio 动态导入失败自愈与 loadUpdatedMap 异常安全捕获（T-7565）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

代码质量排查中发现：
1. 模块懒加载与异步查询中存在未捕获的 Promise Rejection 风险，尤其在离线或极端弱网环境下，`import("./snippet-studio-ui")` 失败时可能导致残存处于 `disableClose` 的加载弹窗；
2. 5 处 `this.loadUpdatedMap` 异步更新时间回填未链式声明 `.catch()`，当内核 SQL 端点发生超时或偶发错误时触发全局未处理异常。

## 决策

1. **动态导入异常自愈闭环**：
   在 `src/index.ts` 与 `src/index.js` 的 `import("./snippet-studio-ui")` 链条中强化 `.catch()`：
   - 移除 `loadingKeydown` 拦截；
   - 记录预警日志；
   - 若 `this.snippetStudioDialog === dialog` 或 `dialog.element.isConnected`，立即安全调用 `dialog.destroy()` 清除加载遮罩，并通知用户且回退至常规切换器，彻底杜绝界面软锁死。
2. **异步映射全链路安全捕获**：
   在首屏、排序切换、月度分组、移动端和侧栏的 5 处 `loadUpdatedMap` 调用后全部接入 `.catch((err) => logger.warn(...))`，实现静默降级与错误吸收。

## 验证

- **契约测试**：`tests/snippet-studio-import-and-map-safety.test.cjs` 3/3 满分通过，严格断言全部 5 处 catch 闭环与动态导入自愈逻辑；
- **类型检查**：`pnpm exec tsc --noEmit` 0 错误。
