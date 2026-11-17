# ADR 0377：第二面板小组件空态可解释性与一键配置自愈把手加固（T-7481）

## 状态

已采纳 (Accepted) - 2026-10-28

## 背景

在第二面板（工作台）中，可配置小组件（如 `fixed-document` 常用文档、`checkin-custom` 自定义打卡项或需要外部 URL/DocID 绑定的组件）在初始添加后或目标文档被删除/卸载时，会处于空态（`empty`）或受阻态（`blocked`）。

此前，空态或受阻态卡片仅在内部渲染一段提示文字（如“请先搜索并选择一个文档”或“暂不可用”），虽然头部左上角提供微型齿轮图标（`14px`），但在内容区域缺乏直观、显著的配置引导按钮。用户在面对空白卡片时难以察觉可以直接点击配置自愈，增加了认知负担与配置阻力。

## 决策

1. **空态与受阻态内嵌一键配置自愈把手**：
   在 `src/home-view.js` 中，当组件满足 `view.configurable === true` 且宿主提供了有效 `options.onConfig` 回调时：
   - 在已就绪但无条目的空态内容区（`view.emptyHint` 下方）及 `empty`/`blocked` 异常受阻状态区，统一动态装配 `.sw__home-module-config-hint.b3-button.b3-button--outline` 按钮；
   - 标注无障碍属性 `dataset.focusKey = "config-hint"`，提供双语语义文案（中文“配置组件”，英文“Configure widget”）；
   - 点击时安全触发 `options.onConfig(view)`，无缝拉起组件配置抽屉/对话框。

2. **焦点自愈与无障碍回焦增强**：
   在 `src/home-controller.js` 的 `pendingFocusKey` 处理中，将 `config-hint` 与 `retry` 并列纳入焦点自愈路由：当用户通过回车点击空态配置把手并完成配置后，若小组件成功就绪，焦点将平滑恢复至组件内部新生成的有效操作条目（如条目按钮、媒体卡或日历操作区），避免键盘焦点丢失流落至 `document.body`。

3. **双表面镜像与全端触控保障**：
   - 同步在 `src/second-panel-ui.ts` 与 `src/second-panel-ui.js` 的 `createHomeModuleController` 装配管线中注入 `onConfig` 与 `configAction` 国际化标签；
   - 在 `src/styles/_05-settings-widgets.scss` 与 `src/styles/_03-switcher-mobile.scss` 中补充 `.sw__home-module-config-hint` 样式规范与移动端 44px 最小触控点击热区，确保全端体验一致。

## 验证

- **契约测试**：`tests/widget-empty-config-hint.test.cjs` 包含 3 项契约断言，覆盖空态与受阻态自愈按钮渲染与回调调用、非可配置组件防误显负向保护、TS/JS 镜像同步性；
- **负向验证**：人工注入禁用标志确认测试断言真实拦截并失败，还原后 3/3 满分通过。
