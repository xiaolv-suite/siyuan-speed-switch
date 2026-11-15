# ADR 0536: 第一面板预览窗格高度自适应延伸与第二面板（工作台）默认全屏（T-7827）

## 状态
已决断并实施 (Accepted)

## 背景
根据用户在真实隔离环境（`http://127.0.0.1:43928/stage/build/desktop/`）中的走查与实测反馈：
1. **第一面板（切换器）预览截断问题**：
   - 原样式在 `_03-switcher-mobile.scss` 中对 `.sw__doc-preview` 设置了 `height: min(60vh, 560px, calc(100cqh - 48px))` 硬编码限高；在现代高分辨率显示器（如 2.8K/3K 显示屏）及大窗/全屏模式下，左侧卡片/文档结果可延伸至 1200px+，而右侧预览窗格死死卡在 560px，下方留出一整块数百像素的空白（即图 1 标绘的 ① 处空洞），严重浪费阅读面积。
2. **第二面板（工作台）初始尺寸过小问题**：
   - 原设置中 `homeSizeMode` 默认值在 `src/index.ts` 中为 `"custom"`（`homeWidth: 920, homeHeight: 390`），且在 `constants.ts` 中回退为 `"follow"`（跟随第一面板）；
   - 工作台承载着待办、统计、图表、日历、工具等多小组件密集网格，首次以 390px 极窄弹窗打开时组件挤压严重、字面拥挤，无法发挥工作台多维概览的价值（即图 2 用户反馈）。
3. **第三面板（片段实验室）混杂连续切片暂存栈问题**：
   - 用户发现第三面板中混入了“连续切片暂存栈”，且第二面板顶栏有跳转按钮直通第三面板，造成严重的认知冲突与跨表面割裂。

## 决策与实现
1. **第一面板预览高度延伸至底部（T-7827）**：
   - 彻底移除 `560px` 与 `60vh` 的硬上限；
   - 在 `_03-switcher-mobile.scss` 与 `_11-ui-polish.scss` 中将 `:is(.sw__tab-preview, .sw__doc-results, .sw__unified-section).sw--with-preview` 容器统合为 `min-height: calc(100cqh - var(--sw-space-md, 8px)); align-items: stretch;`；
20	   - 排查定位根因：`_03-switcher-mobile.scss:1753` 遗留的 `.sw__tab-preview.sw--with-preview .sw__doc-preview { grid-row: 1; }` 与 `_12-r54-surface-adapter.scss` 末尾层叠覆盖，将预览强制束缚在第一行/局部卡片高度（约 380px）而无法向底栏伸展；
   - 彻底修复：将 `_03-switcher-mobile.scss`、`_11-ui-polish.scss` 与 `_12-r54-surface-adapter.scss` 全部对齐为 `grid-row: 1 / -1; align-self: stretch; height: 100%; min-height: 100%;`，并将 `.sw__scroll` 改为 flex-col 容器、`.sw__tab-preview.sw--with-preview` 设为 `flex: 1; min-height: calc(100% - var(--sw-space-md, 8px));`，`.sw__doc-preview-body` 声明 `flex: 1; min-height: 0; overflow-y: auto;`。无论左侧卡片多少，右侧预览窗格均完整延伸贴合底栏（实测 1107px 满高延伸），彻底消除底部空洞。
21	2. **第二面板（工作台）默认全屏打开（T-7827）**：
22	   - 在 `src/index.ts`、`src/constants.ts`（`HOME_SIZE_DEFAULTS.mode`）、`src/settings-model.js` 及 `src/second-panel-ui.ts` 中将 `homeSizeMode` 统一改为 `”fullscreen”`；
23	   - 保证初次冷启动与未显式设定尺寸时，工作台直接以 100vw × 100vh 全屏展开，完整铺满小组件网格，且按 Esc 可随时退出。
24	3. **彻底移除【连续切片暂存栈】（T-7828）**：
25	   - 遵照用户指令彻底移除：工作台顶栏移除 `[✂ 连续切片暂存栈]` 跳转按钮，彻底消除从第二面板跳入第三面板的割裂感；
26	   - 片段实验室（第三面板）右侧伴侣栏移除 `连续切片暂存栈` Tab，仅保留 `思源 AI` 样式助手，让第三面板 100% 回归为纯粹专注的 CSS 样式库；
27	   - 坚决不做第四面板死重，全面守住克制收敛与 692KB 包体门限。
28	
29	## 预算与测试验证
30	- `dist/index.js` = `1,329,404 B`（门限 `1,335,296 B`，余量 `5,892 B`）；
31	- `package.zip` = `702,118 B` = `685.6 KiB`（门限 `708,608 B` = `692 KiB`，余量 `6,490 B >= 2,000 B`）；
32	- `tests/serve-isolated.test.cjs` 5/5 全绿，`t7810` 契约门禁全绿，现场浏览器 E2E 实测第一面板预览窗格 1107px 触底，第二面板 `isFull: true` 全屏展开。
