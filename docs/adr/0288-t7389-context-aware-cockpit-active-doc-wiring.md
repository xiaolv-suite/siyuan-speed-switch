# ADR 0288：T-7389 上下文自适应工作台（Context-Aware Cockpit）活跃文档上下文透传与 v0.48.31 闭环

日期：2026-10-27  
状态：accepted  
任务：T-7389  

## 背景

在“统一切换与工作上下文平台”的演进路线中，第二面板（工作台 Workbench）传统上展示的是全局通用小组件（如时钟、打卡习惯、天气、近期文档等）。
然而，当用户在不同笔记之间深入阅读或写作时，工作台缺乏对用户“当前身处何处”的感知能力：
1. 用户在查看文档 A 时，希望工作台能智能识别文档 A 的上下文（如反向链接、所属路径、关联任务），但此前组件读取管道 `readHomeModule` 中未透传当前活跃文档的信息；
2. 缓存系统按 `moduleId:device:config` 索引，若多个文档共用同一个上下文感知组件，切换文档时会被旧文档的缓存遮盖，导致数据不刷新。

## 决策

1. **工作台组件读取调度链注入 `activeDocContext`**：
   - 在 `second-panel-ui` 构造 `read` 回调时，动态提取当前激活页签的文档元数据 `{rootId, title}`，作为 `activeDocContext` 注入 `options`；
2. **`home-adapters.js` 扩展支持上下文感知与独立缓存隔离**：
   - `buildHomeAdapterCacheKey` 自动感知 `options.activeDocContext?.rootId` 并将其作为缓存分片维度，确保切换文档时自动失效旧上下文缓存；
   - 在执行 `adapter.read` 时，将 `activeDocContext` 完整透明透传给底层各小组件适配器；
3. **版本号晋级（v0.48.31）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.31`。

## 证据与验证

1. **专项契约测试**：`tests/context-aware-cockpit-active-doc-wiring.test.cjs` 3/3 通过（含上下文提取、缓存混入、适配器透传与双负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
