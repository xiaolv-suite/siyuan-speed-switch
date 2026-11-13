# ADR 0282：T-7383 预览框单例幂等防御、顶栏按钮功能气泡提示与全表面 v0.48.25 闭环

日期：2026-10-25  
状态：accepted  
任务：T-7383  

## 背景

用户在深入使用第一面板（切换器）时反馈了两项关键问题：
1. **“有时候第一开始打开，显示有点问题，会有两个预览框”**：
   - 在某些打开或异步渲染时序下，页签布局（`.sw__tab-preview`）与全库文档结果区（`.sw__doc-results`）可能交叉触发 `mountDocPreviewPane`；
   - 原挂载逻辑仅将 `pane` 移至新容器，未对 `scrollElement` 容器内可能存在的陈旧或孤儿 `.sw__doc-preview` 节点进行全局检查与强制清除，导致偶发出现两个预览框并存的视觉错乱；
2. **“另外除了页签，其他按钮不知道怎么用的”**：
   - 切换器顶栏按钮（筛选、排序、全屏、日记、刷新、设置、代码实验室、收藏、历史等）此前未挂载思源原生标准气泡提示类（`b3-tooltips b3-tooltips__s`），仅依赖原生延迟极大的 HTML `title` 属性；
   - 用户鼠标悬浮时缺少即时清晰的浮层反馈，无法得知各按钮的具体用途与操作含义。

## 决策

1. **`mountDocPreviewPane` 单例幂等强防线（Singleton Invariant）**：
   - 在向目标 `box` 挂入预览窗格前，遍历扫描 `scrollElement.querySelectorAll(".sw__doc-preview")`；
   - 凡是不等于当前唯一单例 `pane` 的多余节点，一律强制 `existing.remove()` 彻底清理；
   - 同时清理所有非当前容器的 `.sw--with-preview` 样式类，确保整个切换器内恒有且仅有唯一一个预览框；
2. **切换器顶栏按钮全量装配思源原生标准提示气泡（`b3-tooltips`）**：
   - 为搜索筛选、排序与分组、全屏切换、今日日记、刷新数据、插件设置、代码实验室、收藏列表、最近历史等所有功能按钮全量装配 `b3-tooltips b3-tooltips__s`；
   - 写入详尽、亲切的中文功能说明（如“筛选笔记本/路径/类型”、“打开或新建今日日记”、“最近打开与撤销关闭”等），鼠标轻触即刻弹出高质感提示气泡；
3. **版本号晋级（v0.48.25）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.25`。

## 证据与验证

1. **专项契约测试**：`tests/preview-pane-singleton-and-toolbar-tooltips.test.cjs` 4/4 通过（含单例窗格清理、全按钮 tooltips 装配与双负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
