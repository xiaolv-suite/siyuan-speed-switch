# ADR 0289：T-7390 工作台关系大纲精准定位滚动、思源深度链接拦截与类型徽标微质感 (v0.48.32)

日期：2026-10-27  
状态：accepted  
任务：T-7390  

## 背景

在推进多模态智能上下文工作台（Context-Aware Cockpit）过程中，用户在工作台中点击“当前文档大纲”和“文档关系摘要”时，发现以下体验痛点：
1. **块跳转缺少精准滚动定位**：
   - 原先在桌面端调用 `openTab({app: this.app, doc: {id: value}})`，由于缺少 `action: ["cb-get-scroll"]`，思源内核仅打开包含该块的文档，但不会自动滚动定位到具体标题块或关系引用块；
2. **深度链接（`siyuan://blocks/...`）被外部浏览器拦截**：
   - 原先 `handleHomeItemAction` 对于 `item.href` 统一调用 `window.open(item.href, "_blank", "noopener")`；当外部小组件或关系项提供 `siyuan://blocks/...` 协议的深链接时，会意外弹出系统外部浏览器或提示外部应用唤起，严重破坏沉浸感；
3. **关系类型与层级徽标质感较素**：
   - “子块”、“引用”、“H1-H6”等元数据展示为平铺小字，缺乏辨识度与触控悬浮反馈。

## 决策

1. **为块级文档打开全量注入 `action: ["cb-get-scroll"]`**：
   - 在 `handleHomeItemAction` 中，无论是 `BLOCK_ID_RE` 正则命中的块 ID，还是从 `siyuan://blocks/<id>` 提取的块 ID，在桌面端统一传入 `{action: ["cb-get-scroll"]}`，保证思源编辑器在打开页签的同时自动滚动并高亮目标块；
2. **思源深度链接就地拦截**：
   - 在 `handleHomeItemAction` 中对 `item.href` 进行协议探测，凡符合 `siyuan://blocks/<id>` 格式的链接全部在思源内部打开（桌面 `openTab`、移动端 `mobileOpenDoc`），彻底杜绝跳出到外部浏览器；
3. **关系与大纲微质感胶囊化**：
   - 在 `src/styles/_05-settings-widgets.scss` 中为 `current-document-outline` 和 `document-relations-summary` 的 `.sw__home-module-item-secondary` 赋予圆角药丸胶囊微质感，并加入 `translateX(2px)` 悬浮微位移与主题色高亮；
4. **版本号晋级（v0.48.32）**：
   - 全表面所有弹窗标题栏、中英文文档、更新日志与散列快照统一升级至 `v0.48.32`。

## 证据与验证

1. **专项契约测试**：`tests/relation-navigation-scroll-and-badges.test.cjs` 4/4 通过（含精准块滚动定位、思源链接拦截、徽标微质感与真实负向探针验证）；
2. **版本契约测试**：`tests/release-version-bump-contract.test.cjs` 5/5 通过；
3. **TypeScript 编译与门禁审计**：`pnpm exec tsc --noEmit`、`quality:audit` (50/50)、`release:audit` (49/49)、`integration:audit` (50/50) 全量 PASS。
