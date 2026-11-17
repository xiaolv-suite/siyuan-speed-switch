# ADR 0362：T-7465 工作台全键盘局部刷新拦截与单组件重试焦点平滑恢复加固

## 背景与上下文

在第二面板（组件工作台）中，用户习惯使用全局通用的刷新快捷键 `⌘R` 或 `Ctrl+R` 来刷新当前视图的数据。
此前由于工作台位于宿主窗口（Electron / 浏览器）内，用户在工作台内部按下 `⌘R` 或 `Ctrl+R` 时，会触发宿主全局硬刷新，导致整个思源笔记或页面白屏重新加载，严重打断正在进行的工作现场并丢失已排版状态。

## 架构决策与实现

1. **工作台全键盘 ⌘R / Ctrl+R 局部刷新拦截**：
   在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `onWorkbenchKeydown` 监听中：
   - 识别 `(event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r"`；
   - 严格拦截默认事件（`event.preventDefault(); event.stopPropagation();`），彻底阻止宿主硬刷新白屏；
   - 触发工作台头部的 `[data-home-action="refresh-all"]` 刷新全部组件逻辑，保持 2 路并发受控读取、失败退避与诚实回执呈现。
2. **重试焦点平滑保持**：
   刷新按钮与单组件重试时保持 `aria-busy` 状态语义，并在刷新结算后确保焦点安全留在触发器上。

## 验证与证据

1. `tests/workbench-keyboard-refresh.test.cjs`：3/3 满分全绿（含真实负向验证探针）；
2. 保持与工作台多端 Bento 架构与编辑态快捷键（`⌘B`）完全兼容。
