# 0334. T-7437 动作画板多页签一键导出为任务思维导图/大纲契约

- **状态**：accepted
- **日期**：2026-10-28
- **任务**：T-7437

## 背景与上下文

根据 Issue #17 中小驴全生态统领中枢关于多页签转思维导图（#20579）的深度匹配建议：
用户在工作区中经常打开数十个笔记页签，缺乏一键将当前上下文汇总为脑图大纲的直达操作。
通过动作画板提供 `export-tabs-mindmap` 快捷动作，可一键提取当前所有页签标题与 `siyuan://blocks/${rootId}` 深度链接，构筑树状 Markdown 大纲。

## 架构决策

1. **画板预设动作注册**：
   - 在 `src/action-palette-model.js` 中增加：
     - `{id: "export-tabs-mindmap", section: s.MANAGE, label: lk("exportTabs"), icon: "iconLayout", shortcut: "⌥⇧M", supportedKinds: ["tab", "doc"], platforms: ALL_PLATFORMS}`。
2. **大纲结构生成与剪贴板写入**：
   - 提取所有打开页签去重：`getAllTabs()` / `getMobileTabs()`；
   - 格式化输出 `# 工作区任务大纲` 与 `- [title](siyuan://blocks/rootId)`；
   - 写入剪贴板并提示导出的页签数量，支持用户在思源中直接粘贴为思维导图或大纲列表。
3. **门禁与测试**：
   - 新增 `tests/action-palette-export-tabs-mindmap.test.cjs`；
   - 负向验证：若画板缺少 `export-tabs-mindmap` 动作定义，断言必须精准红。

## 后果与影响

- 快速沉淀当前多页签会话上下文；
- 与思源思维导图与大纲机制深度协同。
