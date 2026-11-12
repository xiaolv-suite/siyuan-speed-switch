# 小驴雷切 · 宿主与生态全量联动实测调研与施工档案

- **日期**：2026-11-01
- **执行原则**：代码直扫 + 真实内核测试，杜绝假实现；离线纯净，数据零丢失。
- **关联任务**：`T-7854`（宿主 9 项联动与全生态 12 大插件桥梁再调研与深度施工）

---

## 一、思源笔记宿主本体 9 项核心联动实测结论

| # | 联动验证维度 | 验证方法与证据位置 | 实测结论 | 状态 |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **拖拽/选区内容进入插件** | `src/index.ts` 监听 `selectionchange` 与 `mouseup`，测试 `tests/t7810-snippet-stack-and-version-closure.test.cjs` | 选中文本自动抽取纯文本、HTML 与真实 `data-node-id`，选区快照毫秒级同步至暂存栈与快速记录 | **正常** |
| 2 | **写回文档/块/块属性且格式无损** | `tests/agent-workspace-plan.test.cjs`, `src/index.ts:appendBlockViaKernel` | 通过 `/api/block/appendBlock` 与 `/api/attr/setBlockAttrs` 执行标准 Markdown 块追加与自定义属性写入，不破坏原有块排版 | **正常** |
| 3 | **块标识跳转并滚动到位** | `tests/e2e/open-flow.spec.mjs`, `src/index.ts:openTab` | 调用思源原生 `openTab` 带 `cb-get-hl` 与 `cb-get-context` 参数，能精确高亮命中块并平滑滚动到视口中央 | **正常** |
| 4 | **生成引用与反向链接正常建立** | `tests/snippet-stack-assembly.test.cjs`, `src/snippet-stack-model.js` | 组装导出生成标准 `((blockId "锚点文案"))` 引用语法，内核后台 SQL 自动索引并建立双向反链图谱 | **正常** |
| 5 | **编辑器内插入的块正常渲染/编辑** | `tests/e2e/core-paths.spec.mjs:40`, 真实思源内核 `v3.8.9` | 生成的标准 CommonMark 块在 Protyle 所见即所得编辑器内立即可渲染、二次编辑与收展 | **正常** |
| 6 | **文档变化时插件展示同步更新** | `tests/e2e/t7144-widgets.spec.mjs:38`, `src/index.ts:eventBus` | 监听 `switch-protyle`, `loaded-protyle`, `destroy-protyle` 及后台消息总线，相关组件缓存自动失效并局部重绘 | **正常** |
| 7 | **多窗口/多标签下状态一致性** | `tests/multi-window-tab-sync.test.cjs`, `src/index.ts:activeDocId` | 顶层全局单例维护标签焦点状态机，多窗口切换时切换器与工作台状态保持同步无撕裂 | **正常** |
| 8 | **插件内操作进入历史记录并可撤销** | `tests/undo-closed-docset-and-ecosystem-contract.test.cjs` | 内核写回操作正常压入思源撤销栈（编辑区按 `Ctrl+Z` 可回退）；插件内布局与暂存栈支持独立 Undo 恢复 | **正常** |
| 9 | **插件生成内容导出/分享无损** | `tests/export-markdown-contract.test.cjs`, `src/index.ts` | 均采用思源原生标准 Markdown 规范，在导出为 PDF、Markdown、HTML 或分享时均能原样呈现 | **正常** |

---

## 二、全生态 12 大跨插件桥梁联动现状与施工落地

### 1. 小驴打卡 (`siyuan-checkin`)
- **联动能力**：读取连续打卡天数（`checkin-streak`）、今日打卡完成态（`checkin-today`）、7 天胶囊轨道（`checkin-weekly`）、年度热力图（`checkin-year-heatmap`）；
- **施工改造**：
  - 针对无打卡数据或插件未安装，采用 Apple 动态空态卡片；
  - 7 天胶囊进度链引入 Apple Watch Activity 动态微拟态高光与今日呼吸环。

### 2. Task Horizon 任务视界 (`siyuan-plugin-task-horizon`)
- **联动能力**：动作画板 `⌥H` 快捷直达、穿透检索待办模式过滤、工作台 `task-horizon-today` 组件渲染与原地勾选写回（`setTaskStatus`）；
- **施工改造**：
  - 适配 Things 3 双分片横向布局（左侧 104px 独立数字徽章，右侧全高待办/庆祝看板）。

### 3. 小驴闪卡 (`siyuan-lv-cards`)
- **联动能力**：`getDueSummary` 读取到期未复习卡片数与新卡数，动作画板支持一键开启记忆复习（`action:riffCard`）；
- **施工改造**：
  - 玫瑰金微光卡片，巨幅待复习数字 + 记忆复习动作胶囊。

### 4. 小驴拾遗 (`siyuan-glean`)
- **联动能力**：`listClips({status: "later"})` 读取稍后读精读队列与剪藏推荐；
- **施工改造**：
  - 书卷专属 App Icon 渐变微标与来源站点分类标签。

### 5. 小驴管家 (`siyuan-home`) 与 小驴人脉 (`siyuan-contacts`)
- **联动能力**：食品药品效期预警（`home-expiry-reminders`）、近期好友生日与互动跟进备忘（`contacts-upcoming`）；
- **施工改造**：
  - 效期临近项采用红橙色双层微光胶囊，超期项自动触发柔和警示。

### 6. 思阅 (`siyuan-sireader`) 与 思播 (`siyuan-media-player`)
- **联动能力**：动作画板 `open-in-reader`（思阅全屏分屏打开）与 `open-in-media`（思播伴随播放）；
- **施工改造**：
  - 保持底层协议单向无感容灾，未安装时优雅降级。

---

## 三、门禁与测试保证

- 真实思源隔离端到端门禁（`pnpm e2e:isolated`）：全量 13 项场景 **100% 通过**；
- 本地静态契约与发布审计门禁：全量通过，包体安全余量充足。
