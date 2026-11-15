# ADR 0475：按钮交互反馈微触感、字体元素对齐收口与 README 规范化升级（T-7581~T-7584）

## 状态

已采纳 (Accepted) - 2026-10-29

## 背景

在插件核心功能逐步完备的背景下，为进一步提升产品专业度、交互品质与新用户的认知效率，开展了全方位的界面、交互与文档深度排查：
1. **文档定位与更新日志呈现**：原 README 更新日志散落在首屏与文末两处，历史版本篇幅冗长，且缺少对小驴雷切作为“本地优先统一切换与工作上下文平台”的清晰提炼；用户明确要求：更新日志中仅展示最新内容，历史版本统一折叠收起。
2. **按钮反馈表现缺陷（UI / Feedback）**：排查发现主界面与组件商店部分关键按钮（`.sw__icon-btn`、`.sw__sort-trigger`、`.sw__fav-trigger`、`.sw-home-store__configure`、`.sw-home-store__remove`、`.sw__search-clear`、`.sw-quick-capture__save` 等）缺少显式的 `cursor: pointer` 或缺少 `:active` 按压微动效，导致用户在点击时缺乏按压确认感。
3. **字体与元素微对齐（Alignment & Baseline）**：弹窗通用标题栏（`.lv-dialog-title-wrap`）中的文字与版本胶囊在不同思源宿主主题下存在 1~2px 的垂直偏斜；机械键帽（`.sw-platform-kbd`）未锁定等宽数字造成宽度微抖动。
4. **模态弹窗焦点循环自愈与 Esc 优先级**：二级弹窗关闭后，焦点往往失焦回落到全局 document/body，影响全键盘操作连贯性；且多层模态按下 Esc 时可能意外穿透到底层切换器。

## 决策

1. **中英文 README 结构与定位重构（T-7584）**：
   - 梳理并确立小驴雷切为“本地优先的思源笔记统一切换与工作上下文平台”，明确四大入口（切换器、工作台、片段实验室、悬浮球）一条贯通路径；
   - 规范更新日志板块：首屏完整直展最新版本（v0.48.83）四大模块更新要点；所有历史发布记录统一封装在 `<details><summary>📜 历史版本更新日志摘要（点击展开 / 收起）</summary>` 中默认折叠；
   - 同步校准英文版 `README.en-US.md`，保障双语质量与全量契约匹配。
2. **全表面核心按钮反馈增强（T-7581）**：
   - 为 `.sw__icon-btn` 补齐 `cursor: pointer` 与 `:active:not(:disabled) { transform: scale(0.92); }`；
   - 为 `.sw__sort-trigger`、`.sw__sort-btn`、`.sw__fav-trigger` 补齐 `cursor: pointer` 与 `:active:not(:disabled) { transform: translateY(1px) scale(0.985); }`；
   - 为组件商店配置/移除胶囊增加 `:active`（scale 0.96）与 `:hover`、`:focus-visible`；
   - 为移动端搜索框清除按钮 `.sw__search-clear` 及过滤按钮 `.sw__search-filter-btn` 注入 `:active` 缩放微触感；
   - 为快速记录保存按钮 `.sw-quick-capture__save` 增加 `:active:not(:disabled)` 触控动效。
3. **弹窗标题栏与机械键帽微对齐收口（T-7582）**：
   - `.lv-dialog-title-wrap` 及其文本锁死 `vertical-align: middle; line-height: 1.2;`，版本胶囊锁定 `height: 18px; line-height: 18px; font-variant-numeric: tabular-nums;`，实现像素级完美居中；
   - `.sw-platform-kbd` 补充 `font-variant-numeric: tabular-nums; user-select: none; vertical-align: middle;`，杜绝数字抖动与误划词。
4. **焦点自愈恢复与 Escape 优先级拦截（T-7583）**：
   - 在 `src/platform-dom.js` 的 `trapDialogFocus` 中：记录打开弹窗前前台的聚焦元素 `previousActive`，并在弹窗清理时自动安全恢复其焦点；
   - 增强 Escape 键监听：优先拦截并触发当前弹窗自身的关闭按钮，阻止事件冒泡到宿主底层。

## 验证

- 新增专项契约测试 `tests/button-feedback-and-alignment-contract.test.cjs`，4/4 满分通过（包含正向逻辑与负向注入探针）；
- 全量契约测试与 14 道发布门禁 `pnpm run verify:release` 100% PASS（9,612 项测试全部绿灯）。
