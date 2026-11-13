# 0291. T-7394 悬浮球与 ⌘K 动作画板接入小驴拾遗「继续漫游 (Keep Roaming)」极速动作与契约

- **状态**：accepted
- **日期**：2026-10-27
- **任务**：T-7394（关联 Issue #17 中枢深化第二期建议）

## 背景与上下文

小驴快门中枢在 Issue #17 中下发了渐进学习深化建议：
渐进阅读的核心在于“无摩擦切入”——当用户在当前笔记写累或读烦时，无需在复杂的文件树或第三方文库列表中翻找。雷切作为思源全局桌面与悬浮球的极速中继站，应当提供一键“继续漫游（Keep Roaming）”动作：
1. 在桌面悬浮球（1~9 槽与更多抽屉）和 Raycast 式次级动作画板（⌘K）中挂载“继续漫游”快捷动作；
2. 点击后，雷切通过公开联邦总线安全调用小驴拾遗（`siyuan-glean`）的切片推荐接口，在思源主屏秒级调阅下一篇加权推荐的长文切片，将切入阅读的摩擦力降为零；
3. 全链路遵循 800ms 熔断保护与零强依赖原则，当拾遗未安装或无未读长文时，优雅提示并回退，绝不拖垮雷切或抛出未捕获异常。

## 架构决策

1. **统一动作注册**：
   - 在 `src/quick-actions.js` 的 `BUILTIN_QUICK_ACTIONS` 中登记 `{id: "glean-keep-roaming", label: "继续漫游", langKey: "actionKeepRoaming", icon: "iconBook", kind: "builtin", value: "glean-keep-roaming", targets: ["desktop", "sidebar", "mobile"], order: 45, enabled: true, mobileSafe: true}`；
   - 在 `src/action-palette-model.js` 的 `getBuiltinActionDefinitions` 中登记 `{id: "glean-keep-roaming", section: s.OPEN, label: lk("keepRoaming"), icon: "iconBook", shortcut: "⌥M", supportedKinds: ALL_KINDS, platforms: ALL_PLATFORMS}`。
2. **多语言词条对齐**：
   - `src/i18n/zh-CN.json` 与 `src/i18n/en.json` 同步增补 `actionKeepRoaming` 与 `actionPaletteKeepRoaming`。
3. **安全执行管线**：
   - 提取 `executeKeepRoaming` 专属分发器；
   - 安全检索 `getBridgeSafely("glean")`；
   - 优先调用 `bridge.getNextRoamingClip()`；若接口未就绪，降级查询 `bridge.listClips({status: "reading", limit: 1})` 或 `bridge.listClips({status: "later", limit: 1})`；
   - 取得切片文档 ID 后，调用思源官方 API 打开文档，并显示通知；
   - 若未安装小驴拾遗，弹出本地化安装建议提示；
   - 全链路设置 800ms 超时熔断与 try-catch 拦截。
4. **门禁审计与负向验证**：
   - 增加独立契约测试 `tests/keep-roaming-action-contract.test.cjs`；
   - 负向验证：若拾遗桥抛出异常或超时，确认雷切拦截异常且不崩溃。

## 后果与影响

- 极大降低渐进阅读的切换阻力，强化雷切在小驴生态中的中枢流转调度能力；
- 遵循零强依赖与 800ms 熔断契约，对未安装拾遗的用户无任何侵入性。
