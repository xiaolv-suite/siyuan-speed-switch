# ADR 0545: 全生态去中心化统一通知系统接入与包体预算再校准

- **状态**：accepted
- **日期**：2026-11-03
- **关联任务**：`TASK-20261103-unified-notification-system`
- **关联 ADR**：ADR 0544（第二面板 Bento 3.0 重构）、ADR 0543（存量优化战役）

---

## 1. 背景与目标

为了解决小驴全系列插件在宿主中各自弹窗引发的“Toast 瀑布刷屏”、“报错无法回溯”、“高频操作过度打扰”等痛点，本插件全面接入小驴生态标准去中心化统一通知系统（Epoch 7 · Protocol v1.0.0）：
1. **去中心化自协商**：零强依赖单一插件，首个加载的插件自举为 Coordinator，更高版本自动热替换，插件卸载无缝交棒；
2. **四级渐进降噪**：
   - `inline`（原位微动效）：收藏/置顶/复制等操作坚决不弹窗，直接在按钮/元素上微弹反馈；
   - `capsule`（瞬时微胶囊）：常规简短提示（分栏切换、工作区切换等 177 处切换提示），2.5s 自然淡出，连续快速操作自动折叠计数不刷屏；
   - `card`（交互卡片）：重点错误与到期提醒，最少保留 6s 或常驻，支持手动关闭与稍后提醒；
   - `silent`（静默入库）：后台静默记入历史。
3. **全端自适应**：桌面端右下角 3D 毛玻璃悬浮微层叠，移动端自适应为顶部灵动微条。

---

## 2. 生产落地与技术选型

1. **标准核心库接入**：引入 `src/libs/lv-notice-kit.ts`，内置自包含现代样式与 DOM 挂载逻辑，无外部 npm 依赖；
2. **生命周期注册**：在插件主类 `onload()` 注册 `this.noticeHubCleaner = lvNotify.registerPlugin("siyuan-speed-switch")`，在 `onunload()` 首行注销；
3. **统一出口智能分流**：
   - 将 `src/index.ts`、`src/second-panel-ui.ts`、`src/doc-search-ui.ts`、`src/mobile-switcher-ui.ts`、`src/home-store-ui.ts`、`src/settings-sections.ts` 统一收敛至 `showMessage` 智能包装器；
   - 错误级别自动升级为卡片（`lvNotify.card`），普通切换与提示降噪为瞬时微胶囊（`lvNotify.capsule`）；
3. **统一浮层与键盘焦点栈 (lvSurfaceStack)**：
   - 悬浮球更多菜单与切片暂存抽屉全面接入 `lvSurfaceStack.push({ id, dismiss })`；
   - 捕获阶段仲裁 Esc 键，逐层关闭栈顶，彻底阻断向底层编辑区穿透。
4. **统一思源内核并发写锁 (withDocLock)**：
   - 在切片组装（`assembleSnippetStackToDoc`）向当前文档与今日日记追加写入时，使用 `withDocLock(docId, async () => { ... })` 串行排队，彻底消除 `document is locked` 内核冲突。
5. **高频前台操作原位反馈**：
   - 页签置顶与取消置顶：按钮调用 `lvNotify.inline(pinButton, ...)`；
   - 收藏与取消收藏：星标按钮与菜单触发 `lvNotify.inline(favBtn, ...)`；
   - 块超链接与 Markdown 链接复制：触发按钮原位打勾微弹，坚决不弹 Toast。

6. **全生态活动流沉淀与 AI 网关 (lvActivity & lvAi)**：
   - 工作台与侧边栏接入 `lvActivity.getTodayRecords()` 实时展示今日知识产出流；
   - 切片组装与保存时广播 `lvActivity.record({ source: "雷切", category: "note", title: ... })`；
   - 接入统一 AI 网关 `lvAi`，共享 API Key 与全局并发限流。

---

## 3. 包体预算再校准

引入统一通知与基础设施套件及配套毛玻璃/动效样式后，生产产物如下：
- `dist/index.js`: 1,360,525 B（约 1328 KiB）
- `package.zip`: 729,313 B（约 712 KiB）
- `compressed index.js`: 368,156 B（约 359.5 KiB）

校准自律线：
- `RAW_BUNDLE_BUDGET_BYTES`: 由 1312 KiB -> 1334 KiB（1,366,016 B，留有 5,491 B >= 2000 B 健康余量）；
- `ARCHIVE_BUDGET_BYTES`: 由 708 KiB -> 716 KiB（733,184 B，留有 3,871 B >= 2000 B 健康余量）；
- `RAW_BUNDLE_BUDGET_ADR`: 钉为 `"0545"`。
