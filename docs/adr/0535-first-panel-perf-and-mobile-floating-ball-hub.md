# ADR 0535: 第一面板性能与盲打体验提速、手机端悬浮球全域触达中枢升级及包体瘦身（T-7821～T-7825）

## 状态
已决断并实施 (Accepted)

## 背景与产品方向调整
根据核心用户场景与产品负责人明确指令：
1. **第一面板（切换器）是绝大多数用户的第一高频主业**，必须进一步压榨首开帧耗时、输入过滤开销与开窗键盘心智连贯度；
2. **悬浮球（尤其是手机端）从静态快捷按钮升格为全域触达中枢（Quick Hub）**（将悬浮球移出 ADR 0534 的“只修不加”冻结清单，与第一面板并列为双核心活跃演进面，其余非核心表面维持冻结，且严守 `1304 KiB` raw / `692 KiB` zip / `87` 模块硬上限不上调）。

### 实测定位的性能与交互痛点
1. **第一面板首帧强制回流与高频重算**：
   - `applyThumbContent` 原对首屏每张卡片各挂一次独立 `scheduleAnimationFrame`，同帧内逐卡交替读 `thumb.clientWidth || getBoundingClientRect().width` 再写 `style.transform`，触发 N 次同步强制回流（Layout Thrashing）；`renderList` 先写 `innerHTML = ""` 与 CSS 变量再读 `scrollElement.clientWidth` 额外触发同步回流；
   - `assembleSwitcherParts` 与 `observeSidebarIcons` 的 `MutationObserver` 在每次缩略图回填或搜索列表局部变动时都对整个弹窗全部 `<svg>` 重跑 `getBoundingClientRect()`；
   - `mountDocPreviewPane` 在指针掠过同一张卡片内部子节点触发 `mouseover` 时重复执行全弹窗 `.sw__doc-preview` 扫描与 `.sw--with-preview` 类名移除再添加；
   - `applySearch` 每次击键同步调用 `getFavorites()` / `getClosedHistory()` / `getDocumentSets()` / `getOpenHistory()` 从头执行正则校验与深拷贝归一化，且 `filterCards` 每次击键重复对所有卡片 `.toLowerCase()`。
2. **第一面板开窗盲打断层**：
   - 热键/顶栏/悬浮球默认打开第一面板时焦点落在首张页签卡（保障 `1-9` 与 `Enter/Space` 零延迟秒切），但用户若直接敲字母或 `>` / `#` / `@` / `?` 想搜索或输命令，按键全部被丢弃，必须先拿鼠标点搜索框或连按方向键。
3. **手机端悬浮球触达面过窄且误弹软键盘**：
   - 默认展开悬浮球「更多」面板仅能看到已配置的 4 个动作，无法直接触达快速记录、大纲、书签、标签、收集箱、反链、同步、模板及已开页签、收藏文档、最近/刚关闭文档、文档集；
   - `focusMoreEntry()` 在 `surface === "mobile"` 下无条件执行 `searchInput.focus()`，导致手机上一上滑呼出悬浮球抽屉就立刻弹起系统输入法遮挡半屏；且抽屉外无防穿透遮罩，点击空白处关闭抽屉会直接点进底层编辑器再次弹起输入法。

## 决策与实现
1. **第一面板首帧与击键热路径性能优化（T-7821）**：
   - **缩略图单帧两阶段读写批处理**：在 `src/index.ts` 引入 `pendingThumbScales` 队列，将同帧所有卡片的 `clientWidth/getBoundingClientRect` 集中于第一阶段一次性读取、第二阶段集中写入 `transform`（`rescaleThumbs` 同步改为两阶段读写）；`renderList` 将 `clientWidth` 读取前移至 DOM 清空之前；
   - **增量图标尺寸钳制**：`MutationObserver` 改为仅收集 `addedNodes` 新增元素子树（`collectDirtyIconRoots` / `flushDirtyIconRoots`），不再在每次局部变动时全树重测旧图标；
   - **预览悬停短路与聚焦卡片直查**：`src/doc-search-ui.ts` 在同一容器已挂载预览窗格时跳过全树清扫与 `.sw--with-preview` 重复切换，同一卡片内部子节点 `mouseover` 直接 O(1) 短路；`focusCard` 仅查询 `.sw__card.sw__focused` 移除旧高亮；
   - **引用键记忆化读缓存与卡片预小写索引**：新增 `readDataMemo` 按 `this.data[key]` 引用相等记忆化 `getFavorites` / `getDocumentSets` / `getClosedHistory` / `getOpenHistory` / `getPinned` 并返回防御性 `.slice()` 副本（任何写入或测试直接替换引用均自动失效）；`filterCards` 用 `WeakMap` 缓存卡片小写标题与路径。
2. **第一面板开窗盲打即搜与手机端首帧提速（T-7822）**：
   - **为什么选“保留首卡默认焦点 + 可打印字符自动转入搜索框”方案**：直接把默认焦点改到搜索框会破坏 `1-9` 数字秒切、`Space` 激活与方向键选卡的零延迟老习惯；采用盲打转接后，`1-9`、`Space/Enter`、方向键维持原语义不变，而敲击任意非数字可打印字符（字母、`>`、`#`、`@`、`^`、`!`、`-`、`?` 等）、`Backspace`（搜索框非空时）、`/` 或 `Ctrl/Cmd+F` 时自动聚焦 `.sw__search` 并置光标于末尾追加字符触发过滤（规避了 `focus` 自动全选覆盖第二字的问题）；
   - **手机端首屏揭示提速**：`src/mobile-switcher-ui.ts` 的 `revealWhenReady` 由 `stableFrames >= 2`（实等 3 帧）收紧为 `stableFrames >= 1`（连续 2 帧几何稳定即揭示），减少一帧空等。
3. **悬浮球全域触达中枢升级（尤其面向手机端）（T-7823）**：
   - **手机端零误弹键盘 + 防穿透遮罩 + 顶栏下滑收起**：`src/floating-ball-panel.js` 在 `surface === "mobile"` 打开抽屉时聚焦 `moreHost` 容器而非 `searchInput`，彻底消除上滑呼出即弹软键盘的问题；新增移动端 `.sw__floating-ball-backdrop` 遮罩拦截外部点击穿透，支持在顶部拖拽条/标题区单手下滑（`>=42px`）顺滑关闭，并为移动端悬浮球本体增加 `6px` 隐形触控热区扩展；
   - **五档拇指分类胶囊 + 全量能力与实时内容一站触达 + 一键星标首层**：在不传 `hubContent`/`catalogActions` 时 100% 保持原组件行为兼容的前提下，宿主向悬浮球面板注入实时 `catalogActions`（全量当前端可用内置动作、思源全局面板与生态命令）与 `hubContent`（当前已开页签、收藏文档、最近打开与刚关闭恢复、工作区文档集），提供 `全部 | 动作 | 页签 | 收藏 | 最近` 五档单手胶囊切换、非空搜索词自动跨全部分类联合检索，以及动作行右侧 `☆/★` 一键固定/移出悬浮球首层 5 槽拖环。
4. **包体死重清理严守硬上限（T-7824）**：
   - 清理历史遗留无引用死方法（`getPinyinTitleMatches`、`computeGroupFlowLayout`、`watchGroupFlowResize`、`buildFavGroupRow`、`replaceFavGroupRowWithRenameControls`、`appendSettingsFavItems`、`createFAB`、`limitCloneChildren` 等）、死 CSS 块（`.sw-second-panel*`、`.sw-ai-confirm*`、`.sw-platform-preview*`、`.sw-setting__group-row`）、`snippet-studio-ui.js` 430 行静态重复翻译映射表及冗余长段落兜底字面量；
   - 实测在新增全部上述能力后，`dist/index.js` 降至 `1,329,996 B`（余量 `5,300 B`）、`package.zip` 降至 `702,062 B`（`685.6 KiB`，余量 `6,546 B >= 2,000 B`），生产依赖图保持 `87` 模块不增。
