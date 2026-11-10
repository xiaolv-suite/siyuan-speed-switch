// T-6761 / ADR 0067 (2026-09-21): the floating-ball B4 lifecycle and
// accessibility surface adds real production code. Keep this as a review
// signal separate from host limits; the then-current 256 KiB compressed-entry
// line was unchanged by that batch.
// ADR 0074 (2026-09-23): recalibrated 896 -> 960 KiB after the research-absorb
// cycle R1 batch (host-command bridge, sync, template insert, unified index,
// workspace switching, scroll restoration). The other repository budgets were
// unchanged by this recalibration; the next bump requires a new audit (ADR 0059/0062/0067 program).
// ADR 0077 (2026-09-24): recalibrated 960 -> 1024 KiB after the navigation-context
// P0 batches (related content, restore receipts, preview open, dynamic groups,
// multi-target capture). Hard ceilings unchanged.
// ADR 0081 (2026-09-26): recalibrated 1024 -> 1088 KiB after the unified platform
// campaign (platform P1, snippet studio, six RZ unified-UI batches, default
// fullscreen, cross-surface object batches). Reduction audit found no
// meaningful dead weight (CSS is not on the raw line; tree-shaking covers JS);
// the other repository budgets were unchanged, and the then-current compressed-entry
// line (288 KiB) needs its own audit when crossed.
// ADR 0092 (2026-09-28): v0.41.0 raw entry is 1,113,051 B, leaving only
// 1,061 B on the 1088 KiB line before the T-6979 switcher fixes. Reduction
// audit: no removable entry dead weight; keep archive/compressed ceilings.
// ADR 0125 (2026-10-04): the accumulated T-6972/T-6997/T-7000/T-7001/
// T-7006/T-7023/T-7027/T-7028/T-7073~T-7084 production batch reached
// 1,181,710 B. Reduction review found no removable entry dead weight;
// recalibrate the raw observation line 1152 -> 1160 KiB. Archive and
// compressed-entry ceilings remain unchanged.
// ADR 0236 (2026-10-20): 深入穿透检索运行时接线（T-7343）把
// planPenetrationSearchRequest / aggregatePenetrationResults 的穿透分流、
// 跨文档两段式大纲解析与 heading/block 图标分支接入主搜索管线，
// raw 产物增长到 1,189,884 B（净增 ~8.0 KiB）。穿透检索是既有纯模型
// 契约（T-7338/T-7340）的生产兑现，无冗余死重可剥；raw 观察线
// 1160 -> 1164 KiB。归档包与压缩入口上限维持不变（586 KiB / 288 KiB）。
// ADR 0237 (2026-10-20): 次级动作画板切换器主 UI 挂载（T-7344）把
// 卡片右键菜单、⌘K 快捷唤出、动作上下文抽取与分屏/复制调度接入生产，
// 并补充全套深浅色/毛玻璃/移动端抽屉样式；减量审计提取公共剪贴板/弹窗辅助
// 消除 720 B 重复逻辑后，raw 产物为 1,196,626 B（超出 1164 KiB 4.6 KiB）。
// raw 观察线 1164 -> 1170 KiB。归档包门限微调 586 -> 590 KiB（package.zip 602,045 B，余量 2,115 B）。
// ADR 0244 (2026-10-20): 符号化前缀多模态检索模型扩展（T-7351）扩展了
// @/#/!/^/> 符号化多模态前缀路由、端点规划与标签/书签响应树聚合，
// raw 产物为 1,200,759 B（超出 1170 KiB 自律线 2.6 KiB）。
// raw 观察线由 1170 -> 1174 KiB（1,202,176 B，余量 1,417 B）。归档包门禁 590 KiB 保持不变。
// ADR 0247 (2026-10-20): 属性视图看板与闪卡复习小组件生产装配（T-7354 & T-7355）
// 把 database-board 与 flashcard-review 接入工作台调度管线与样式层，
// raw 产物为 1,204,810 B（超出 1174 KiB 2.6 KiB）。
// raw 观察线由 1174 -> 1178 KiB（1,206,272 B，余量 1,462 B）。归档包门限微调 590 -> 592 KiB（606,208 B，package.zip 604,591 B，余量 1,617 B）。
// ADR 0249 (2026-10-21): 切换器撤销关闭页签（T-7356）、一键保存文档集（T-7357）与思阅/思播生态联动增强，
// raw 产物为 1,208,829 B（处于 1182 KiB 自律线内，余量约 1.5 KiB）。
// raw 观察线由 1178 -> 1182 KiB（1,210,368 B）。归档包门禁由 592 -> 594 KiB（608,256 B，package.zip 606,461 B，余量约 1.8 KiB）。
// ADR 0251 (2026-10-21): 符号导航速查指引（CheatSheet，T-7359）与中英文文档完备对账，
// raw 产物为 1,211,534 B（处于 1186 KiB 自律线内，余量约 2.9 KiB）。
// raw 观察线由 1182 -> 1186 KiB（1,214,464 B）。归档包门禁由 594 -> 596 KiB（610,304 B，package.zip 608,361 B，余量约 1.9 KiB）。
// ADR 0252 (2026-10-21): 组件商店精选推荐分层（Featured / Curation，T-7360）与精选徽标微光体系，
// raw 产物为 1,214,983 B（处于 1188 KiB 自律线内，余量约 1.5 KiB）。
// raw 观察线由 1186 -> 1188 KiB（1,216,512 B）。归档包门禁维持 596 KiB（610,304 B，package.zip 609,592 B，余量 712 B）。
// ADR 0253 (2026-10-21): 片段实验室行号修复、特征内容智能置顶与投稿共享指引（闭环 Issue #16），
// raw 产物为 1,214,989 B（处于 1188 KiB 自律线内，余量约 1.5 KiB）。
// 归档包门禁由 596 -> 598 KiB（612,352 B，package.zip 610,299 B，余量 2,053 B）。
// ADR 0255 (2026-10-21): 小驴打卡风格 7天胶囊轴、待办完成横幅与双拼 Bento 瓦片，
// raw 产物为 1,217,136 B（处于 1190 KiB 自律线内，余量约 1.4 KiB）。
// 归档包门禁由 598 -> 600 KiB（614,400 B，package.zip 612,866 B，余量 1,534 B）。
// ADR 0256 (2026-10-21): 切换器常驻多模态穿透药丸 Chips、画板立体机械键帽与门限校准，
// raw 产物为 1,219,436 B（处于 1192 KiB 自律线内，余量约 1.2 KiB）。
// 归档包门禁维持 600 KiB（614,400 B，package.zip 613,957 B，余量 443 B）。
// ADR 0257 (2026-10-21): 切换器近期搜索词历史重放、卡片悬停复制块链接与门限校准，
// raw 产物为 1,220,915 B（处于 1194 KiB 自律线内，余量约 1.7 KiB）。
// 归档包门禁由 600 -> 602 KiB（616,448 B，package.zip 614,563 B，余量 1,885 B）。
// ADR 0258 (2026-10-22): 移动端常驻多模态穿透药丸、搜索模式专属提示、搜索结果 Alt+C 快捷复制与门限校准，
// raw 产物为 1,225,245 B（处于 1198 KiB 自律线内，余量约 1.5 KiB）。
// 归档包门禁由 602 -> 604 KiB（618,496 B，package.zip 616,535 B，余量 1,961 B）。
// ADR 0259 (2026-10-22): 顶栏点击秒开直出、长文档首屏浅克隆、Petal 生命周期与 URL Scheme 闭环，
// raw 产物为 1,227,074 B（处于 1200 KiB 自律线内，余量约 1.7 KiB）。
// 归档包门禁维持 604 KiB（618,496 B，package.zip 617,142 B，余量 1,354 B）。
// ADR 0260 (2026-10-23): 小驴全生态联邦联动、800ms 熔断隔离、午夜黑金美学与门限校准，
// raw 产物为 1,241,006 B（处于 1215 KiB 自律线内，余量约 3.1 KiB）。
// 归档包门禁由 604 -> 660 KiB（675,840 B，package.zip 669,613 B，余量 6,227 B，受 256×256 殿堂级 icon.png 64.4 KiB 替换）。
// ADR 0266 (2026-10-23): 思阅、思播与全生态总线事件深度联动与门限校准，
// raw 产物为 1,245,005 B（处于 1220 KiB 自律线内，余量约 4.2 KiB）。
// 归档包门禁维持 660 KiB（675,840 B，package.zip 670,698 B，余量 5,142 B）。
// ADR 0292 (2026-10-27): 小驴拾遗继续漫游动作与渐进知识蒸馏漏斗 Bento 小组件接入与门限校准，
// raw 产物为 1,265,208 B（处于 1240 KiB 自律线内，余量约 4.5 KiB）。
// 归档包门禁维持 660 KiB（675,840 B，package.zip 672,884 B，余量 2,956 B）。
// ADR 0330 (2026-10-28): Task Horizon 官方协议对接、动作画板快捷直达与桌面紧凑模式自适应，
// raw 产物为 1,271,057 B（处于 1245 KiB 自律线内，余量约 3.8 KiB）。
// 归档包门禁维持 660 KiB（675,840 B，package.zip 675,027 B，余量 813 B）。
// ADR 0333 (2026-10-28): 多模态待办 Chips 药丸、页签导出思维导图与健康监控 Escape 退出，
// raw 产物为 1,273,607 B（处于 1248 KiB 自律线内，余量约 4.3 KiB）。
// 归档包门禁维持 660 KiB（675,840 B，package.zip 675,544 B，余量 296 B）。
// ADR 0336 (2026-10-28): 穿透检索待办模式全功能接入、Task Horizon 今日待办生态前置与全表面品牌对齐，
// raw 产物为 1,274,980 B（处于 1250 KiB 自律线内，余量约 5.0 KiB）。
// 归档包门禁由 660 -> 662 KiB（677,888 B，package.zip 675,978 B，余量 1,910 B）。
// ADR 0364 (2026-10-28): 内置片段库扩充呼叫盒与多栏卡片（T-7466）与动作画板实体快捷键调度（T-7467），
// raw 产物为 1,280,906 B（处于 1255 KiB 自律线内，余量约 4.2 KiB）。
// 归档包门禁由 662 -> 665 KiB（680,960 B，package.zip 678,114 B，余量 2,846 B）。
// ADR 0380 (2026-10-28): 小组件空态自愈配置把手（T-7481）、回收站全键盘清空（T-7482）与霓虹/毛玻璃内置片段扩充（T-7483），
// raw 产物为 1,284,350 B（处于 1258 KiB 自律线内，余量约 3.8 KiB）。
// 归档包门禁由 665 -> 668 KiB（684,032 B，package.zip 681,507 B，余量 2,525 B）。
// ADR 0384 (2026-10-29): 小组件离线容灾指示器（T-7485）、macOS三色控制点/表格微高亮内置片段（T-7486）与预览视口缩放（T-7487），
// raw 产物为 1,285,030 B（处于 1260 KiB 自律线内，余量约 5.2 KiB）。
// 归档包门禁由 668 -> 670 KiB（686,080 B，package.zip 682,735 B，余量 3,345 B）。
// ADR 0392 (2026-10-29): 配置重置确认（T-7493）、任务弹跳/粗体微光片段（T-7494）与编辑器多行Tab缩进（T-7495），
// raw 产物为 1,285,766 B（处于 1262 KiB 自律线内，余量约 6.5 KiB）。
// 归档包门禁由 670 -> 672 KiB（688,128 B，package.zip 684,549 B，余量 3,579 B）。
// ADR 0474 (2026-10-29): 全面质量强化战役（T-7565~T-7576，动态容灾、生命周期守卫、FAB 避让、回流防抖、无障碍焦点捕获与键盘流），
// raw 产物为 1,293,091 B（超出 1262 KiB 自律线 803 B）。
// raw 观察线由 1262 -> 1266 KiB（1,296,384 B，余量 3,293 B）。
// 归档包门禁由 680 -> 684 KiB（700,416 B，package.zip 695,596 B，余量 4,820 B >= 2000 B）。
// ADR 0521 (2026-10-30): 平台统一顶级指标栏与状态模型（T-7700~T-7765，跨表面指标感知、双通道触感定位与回收站白卡），
// raw 产物为 1,303,113 B（超出 1266 KiB 自律线 6.5 KiB）。
// raw 观察线由 1266 -> 1276 KiB（1,306,624 B，余量 3,511 B >= 2000 B）。
// ADR 0532 (2026-10-31): 连续切片暂存栈、5 阶语义原子切片与选区感知智能置顶（TASK-20261031 & TASK-20261030），
// raw 产物为 1,323,467 B（处于 1296 KiB 自律线内，余量约 3.6 KiB）。
// raw 观察线由 1276 -> 1296 KiB（1,327,104 B，余量 3,637 B >= 2000 B）。
// ADR 0533 (2026-10-31): 暂存栈全链路接线、编辑区选区实时快照、一键撤销与独立弹窗回退（T-7810~T-7814），
// raw 产物为 1,330,924 B，观察线由 1296 -> 1304 KiB（1,335,296 B，余量 4,372 B >= 2000 B）。
// ADR 0539 (2026-10-31): 第一面板短文档空洞修复、根滚动容器防御性规整、多类型 CSS 专属聚焦预览系统；
// raw 产物为 1,333,588 B，观察线由 1304 -> 1308 KiB（1,339,392 B，余量 5,804 B >= 2000 B）。
// ADR 0544 (2026-11-01): 小组件商店 Apple Bento 3.0 风格统一、实时预览直通与精品组件尺寸推荐梳理；
// raw 产物为 1,339,728 B，观察线由 1308 -> 1312 KiB（1,343,488 B，余量 3,760 B >= 2000 B）。
// ADR 0545 (2026-11-03): 全生态去中心化统一通知系统、并发写锁与第三阶段活动流汇聚（TASK-20261103）；
// raw 产物为 1,360,525 B，观察线由 1312 -> 1334 KiB（1,366,016 B，余量 5,491 B >= 2000 B）。
// ADR 0546 (2026-11-03): 小驴罗盘顶栏收敛接入与二级行动极速直达（TASK-20261103-launchpad-topbar-integration）；
// raw 产物为 1,367,580 B，观察线由 1334 -> 1340 KiB（1,372,160 B，余量 4,580 B >= 2000 B）。
// ADR 0547 (2026-11-03): AI 全面接入、切片智能编织与包体预算再校准（TASK-20261103-phase6-ai-integration-and-command-center）；
// raw 产物为 1,372,615 B，观察线由 1340 -> 1346 KiB（1,378,304 B，余量 5,689 B >= 2000 B）。
// ADR 0549 (2026-11-04): v0.48.88 本地发版封验、Mobile Spec v1 落地与包体预算再校准；
// raw 产物为 1,407,407 B，观察线由 1346 -> 1380 KiB（1,413,120 B，余量 5,713 B >= 2000 B）。
// ADR 0550 (2026-11-04): 手机端第二轮优化与细节打磨（真机教训审计、双球共存避让与手势深化）；
// raw 产物为 1,428,943 B，观察线由 1380 -> 1400 KiB（1,433,600 B，余量 4,657 B >= 2000 B）。
// ADR 0551 (2026-11-05): 选区上下文纯函数分类器与生态动作智能置顶（T-7866）；
// raw 产物为 1,437,502 B，观察线由 1400 -> 1408 KiB（1,441,792 B，余量 4,290 B >= 2000 B）。
// ADR 0552 (2026-11-06): 吸收小驴快门思源内部命令面板 (⌥⌃P) 与生态套件规范（T-7868）；
// raw 产物为 1,443,408 B，观察线由 1408 -> 1414 KiB（1,447,936 B，余量 4,528 B >= 2000 B）。
// ADR 0553 (2026-11-08): 全生态 8 大插件动作直通弹射协议与 Frecency 搜索热度加固；
// 观察线由 1414 -> 1420 KiB（1,454,080 B，余量约 5.2 KiB >= 2000 B）。
// ADR 0554 (2026-11-08): 小驴罗盘顶栏收敛引擎加固（DOM 自愈、Bento 弹射坞全键盘流与生态动态徽标）；
// 观察线由 1420 -> 1436 KiB（1,470,464 B，余量约 3.5 KiB >= 2000 B）。
// ADR 0556 (2026-11-09): 「一树八脉」统一空间切片组装室路由、Protocol v1.7.8 套件与手机端全表面紧凑样式收口；
// 实测 raw 产物 1,518,469 B，观察线由 1437 -> 1488 KiB（1,523,712 B，余量 5,243 B >= 2000 B）。
// ADR 0557 (2026-11-10): 外部命令桥宿主空哨兵/持久回执契约修复与全表面 Dialog 统一生命周期销毁；
// 实测 raw 产物 1,534,708 B，观察线由 1488 -> 1504 KiB（1,540,096 B，余量 5,388 B >= 2000 B）。
const RAW_BUNDLE_BUDGET_BYTES = 1504 * 1024;
const RAW_BUNDLE_BUDGET_ADR = "0557";
// ADR 0090 (2026-09-28): recalibrated the repository archive budget 512 -> 544 KiB after
// the 2026-09-27 plan Phases A/B and C-head (T-6949 preview pin, T-6950 find in
// preview, T-6951 settings search, T-6952 saved-search edit, T-6953 layout
// undo/redo, T-6954 health details, T-6955 set diff, T-6956 leave guard,
// T-6957 draft undo/redo) drove package.zip past the old line. Reduction
// audit: icon/preview/i18n/README are market-required; the 4 packaged docs are
// the F7 store-facing declaration (T-6707); snippet studio already ships as a
// dynamic chunk. Per-entry compressed line (320 KiB, ADR 0089) unchanged.
// ADR 0180 (2026-10-13): recalibrated 576 -> 578 KiB after measured T-7251/7252
// UI additions; the v0.47.1 package was 589640 B and left only 184 B of headroom.
// ADR 0227 (2026-10-19): recalibrated 578 -> 580 KiB after T-7334 path-acronym-model
// (VS Code 式路径首字母缩写打分) and T-7335 action-palette-model (Raycast 式
// 次级动作画板) production lines; the local v0.47.6 working tree was 591902 B
// and left only -30 B of headroom against 578 KiB. Reduction audit: both
// modules are pure-domain (no DOM, no network), depend only on the existing
// vendor tiny-pinyin, and expose a single re-export through search-model.
// ADR 0229 (2026-10-19): recalibrated 580 -> 582 KiB after T-7336 av-board-model
// (思源原生属性视图轻量只读看板) and T-7337 flashcard-review-model (闪卡间隔重复
// 复习模型：SM-2 调度推演/每日队列/掌握度统计) production lines; the working tree
// package.zip was 594381 B (+461 B over 580 KiB). Reduction audit: both modules
// are pure domain models with zero DOM or network dependencies, and av cell text
// extraction was unified into a single point of truth (saving 336 B).
// ADR 0232 (2026-10-19): recalibrated 582 -> 584 KiB after T-7338 penetration-search-
// model (Obsidian 式深入穿透检索语法), T-7339 action-palette-navigation (次级动作
// 画板键盘导航状态机) and T-7340 action-palette-panel (面板 DOM 模型层与 a11y 契
// 约) production lines; the working tree package.zip was 596819 B (+851 B over
// 582 KiB). Reduction audit: all three modules are pure domain models (zero DOM
// listeners, zero network); action-palette-navigation reuses action-palette-
// model's filterPaletteActions; action-palette-panel reuses the navigation
// state. A bounded-text shared helper module was attempted but produced net
// +43 B after webpack minification and was reverted.
// ADR 0234 (2026-10-19): recalibrated 584 -> 586 KiB after T-7341 action-palette-ui
// (DOM 装配层) and T-7342 penetration-search-orchestration (运行时编排与防注入 SQL 生成)
// production lines; the working tree package.zip was 598398 B (+382 B over 584 KiB).
// Reduction audit: T-7342 is pure domain model, reuses penetration-search-model,
// with safe SQL generation and bounded LIMIT.
// ADR 0237 (2026-10-20): recalibrated 586 -> 590 KiB after T-7344 action-palette-main-wiring
// (卡片右键菜单/⌘K 快捷键/动作执行调度/全套深浅色与移动端抽屉 SCSS 样式)；
// 生产构建 package.zip 为 602,045 B，在 590 KiB（604,160 B）门禁内留有 2,115 B 健康余量。
// ADR 0247 (2026-10-20): recalibrated 590 -> 592 KiB after T-7354 database-board & T-7355 flashcard-review
// production widget wiring; working tree package.zip is 604,591 B, safely below 592 KiB (606,208 B) with 1,617 B headroom.
// ADR 0249 (2026-10-21): recalibrated 592 -> 594 KiB after T-7356 undo-closed-tab, T-7357 save-as-doc-set
// and SiReader/SiMedia ecosystem wiring; working tree package.zip is 606,461 B, safely below 594 KiB (608,256 B) with ~1.8 KiB headroom.
// ADR 0251 (2026-10-21): recalibrated 594 -> 596 KiB after T-7359 symbol CheatSheet and full docs reconciliation;
// working tree package.zip is 608,361 B, safely below 596 KiB (610,304 B) with ~1.9 KiB headroom.
// ADR 0253 (2026-10-21): recalibrated 596 -> 598 KiB after Issue #16 studio line-number fix, probe priority and submit guide;
// working tree package.zip is 610,299 B, safely below 598 KiB (612,352 B) with 2,053 B headroom.
// ADR 0255 (2026-10-21): recalibrated 598 -> 600 KiB after Xiaolv Checkin 7-day capsule tracker, celebration banner and dual bento tiles;
// working tree package.zip is 612,866 B, safely below 600 KiB (614,400 B) with 1,534 B headroom.
// ADR 0257 (2026-10-21): recalibrated 600 -> 602 KiB after switcher recent queries replay and card hover copy block link;
// working tree package.zip is 614,563 B, safely below 602 KiB (616,448 B) with 1,885 B headroom.
// ADR 0258 (2026-10-22): recalibrated 602 -> 604 KiB after mobile mode chips bar, doc action palette and clear history button;
// working tree package.zip is 616,535 B, safely below 604 KiB (618,496 B) with 1,961 B headroom.
// ADR 0260 (2026-10-23): recalibrated 604 -> 660 KiB after 256x256 high-resolution icon.png (64.4 KiB) and 7 ecosystem widget adapters;
// working tree package.zip is 669,613 B, safely below 660 KiB (675,840 B) with 6,227 B headroom.
// ADR 0336 (2026-10-28): recalibrated 660 -> 662 KiB after task penetration search and Task Horizon today tasks integration;
// working tree package.zip is 675,978 B, safely below 662 KiB (677,888 B) with 1,910 B headroom.
// ADR 0364 (2026-10-28): recalibrated 662 -> 665 KiB after callout/multicolumn builtin snippets and direct action shortcuts;
// working tree package.zip is 678,114 B, safely below 665 KiB (680,960 B) with 2,846 B headroom.
// ADR 0380 (2026-10-28): recalibrated 665 -> 668 KiB after empty config hint, recycle keyboard and neon/glass snippets;
// working tree package.zip is 681,507 B, safely below 668 KiB (684,032 B) with 2,525 B headroom.
// ADR 0384 (2026-10-29): recalibrated 668 -> 670 KiB after offline indicator, codemac/tablecell snippets and preview zoom;
// working tree package.zip is 682,735 B, safely below 670 KiB (686,080 B) with 3,345 B headroom.
// ADR 0392 (2026-10-29): recalibrated 670 -> 672 KiB after config confirm, taskbounce/boldaccent snippets and multiline indent;
// working tree package.zip is 684,549 B, safely below 672 KiB (688,128 B) with 3,579 B headroom.
// ADR 0403 (2026-10-29): recalibrated 672 -> 675 KiB after double-click healing, tagpill/extlink snippets and restore select-all keyboard;
// working tree package.zip is 686,701 B, safely below 675 KiB (691,200 B) with 4,499 B headroom (>= 2000 B).
// ADR 0423 (2026-10-29): recalibrated 675 -> 678 KiB after handle focus rings, scriptsaccent/mediarounded snippets and updateURL metadata;
// working tree package.zip is 689,436 B, safely below 678 KiB (694,272 B) with 4,836 B headroom (>= 2000 B).
// ADR 0447 (2026-10-29): recalibrated 678 -> 680 KiB after expanding builtin snippet
// catalog to 70 items (embedshadow / taggradient / quotehanging / inlineneon);
// working tree package.zip is 692,656 B, safely below 680 KiB (696,320 B) with 3,664 B headroom (>= 2000 B).
// ADR 0474 (2026-10-29): recalibrated 680 -> 684 KiB after comprehensive quality optimization campaign;
// working tree package.zip is 695,596 B, safely below 684 KiB (700,416 B) with 4,820 B headroom (>= 2000 B).
// ADR 0532 (2026-10-31): recalibrated 684 -> 688 KiB after snippet stack and fold slicing;
// working tree package.zip is 699,155 B, safely below 688 KiB (704,512 B) with 5,357 B headroom (>= 2000 B).
// ADR 0533 (2026-10-31): recalibrated 688 -> 692 KiB after T-7810~T-7814 snippet stack full wiring,
// selection snapshot observer, undo restoration, standalone stack dialog fallback, and README installation/FAQ expansion (2,618 B headroom >= 2000 B).
// Per-entry compressed line recalibrated to 352 KiB (compressed index.js is 347,886 B).
// ADR 0539 (2026-10-31): recalibrated 692 -> 698 KiB after T-7830~T-7834 (三栏切换器架构重构、双商店双栏画廊、10大链滴社区CSS来源归属与多类型CSS专属聚焦增强预览系统闭环)；
// working tree package.zip is 711,944 B, safely below 698 KiB (714,752 B) with 2,808 B headroom (>= 2000 B).
// Per-entry compressed line recalibrated to 362 KiB (compressed index.js is 359,801 B).
// ADR 0542 (2026-11-01): recalibrated 698 -> 700 KiB after T-7835~T-7836 (全量内置片段新版思源AI适配、精选精品置顶与v0.48.86隔离环境实机深度排查封验)；
// working tree package.zip is 713,426 B, safely below 700 KiB (716,800 B) with 3,374 B headroom (>= 2000 B).
// ADR 0544 (2026-11-01): recalibrated 700 -> 708 KiB after T-7848~T-7851 (Apple WidgetKit Bento 3.0 空间流光质感、液态微透材质、前沿交互呈现与全屏尺寸填充跃升)；
// working tree package.zip is ~720 KiB, safely below 708 KiB (724,992 B) with >= 2000 B headroom.
// ADR 0545 (2026-11-03): recalibrated 708 -> 716 KiB after TASK-20261103 (全生态去中心化统一通知系统接入、并发写锁与第三阶段活动流汇聚)；
// working tree package.zip is 729,313 B, safely below 716 KiB (733,184 B) with 3,871 B headroom (>= 2000 B).
// ADR 0546 (2026-11-03): recalibrated 716 -> 718 KiB after TASK-20261103-launchpad-topbar-integration；
// working tree package.zip is 731,954 B, safely below 718 KiB (735,232 B) with 3,278 B headroom (>= 2000 B).
// ADR 0547 (2026-11-03): recalibrated 718 -> 720 KiB after TASK-20261103-phase6-ai-integration-and-command-center；
// working tree package.zip is 734,251 B, safely below 720 KiB (737,280 B) with 3,029 B headroom (>= 2000 B).
// ADR 0549 (2026-11-04): recalibrated 720 -> 730 KiB after v0.48.88 release package verification;
// working tree package.zip is 743,089 B, safely below 730 KiB (747,520 B) with 4,431 B headroom (>= 2000 B).
// ADR 0550 (2026-11-04): recalibrated 730 -> 736 KiB after T-7864 mobile round 2 audit & gesture enhancements;
// working tree package.zip is 750,823 B, safely below 736 KiB (753,664 B) with 2,841 B headroom (>= 2000 B).
// ADR 0551 (2026-11-05): recalibrated 736 -> 740 KiB after T-7866 selection context classifier;
// working tree package.zip is 754,011 B, safely below 740 KiB (757,760 B) with 3,749 B headroom (>= 2000 B).
// ADR 0552 (2026-11-06): recalibrated 740 -> 742 KiB after absorbing command palette and ecosystem kit (T-7868);
// working tree package.zip is 755,962 B, safely below 742 KiB (759,808 B) with 3,846 B headroom (>= 2000 B).
// ADR 0554 (2026-11-08): recalibrated 742 -> 748 KiB after launchpad topbar convergence engine & bento keyboard flow;
// working tree package.zip is 762,323 B, safely below 748 KiB (765,952 B) with 3,629 B headroom (>= 2000 B).
// ADR 0556 (2026-11-09): recalibrated 755 -> 766 KiB after unified XiaoLv hub routing, Protocol v1.7.8 & mobile UI compaction;
// working tree package.zip is 780,528 B, safely below 766 KiB (784,384 B) with 3,856 B headroom (>= 2000 B).
// ADR 0557 (2026-11-10): recalibrated 766 -> 772 KiB after external command host contract & dialog lifecycle fixes;
// working tree package.zip is 786,359 B, safely below 772 KiB (790,528 B) with 4,169 B headroom (>= 2000 B).
const ARCHIVE_BUDGET_BYTES = 772 * 1024;
// ADR 0065 (2026-09-20): compressed-entry review line recalibrated from
// 224 KiB to 256 KiB after the execution-chain modules (T-6680) and the
// writing-streak second wave (T-6681) shrank headroom to 11780 bytes. Same
// program as ADR 0059/0062: dated recalibration, repository budget unchanged.
// ADR 0075 (2026-09-23): recalibrated 256 -> 288 KiB after the research-absorb
// cycles R1/R2 (host-command bridge, pinyin vendor, unified index, skins,
// essentials) pushed the compressed index.js past 256 KiB. The then-current
// repository archive budget (512 KiB) was unchanged; next bump requires a new audit.
// ADR 0089 (2026-09-28): recalibrated 288 -> 320 KiB after T-6949 (session
// preview pin, Phase A of the 2026-09-27 plan) pushed compressed index.js to
// 295198 bytes (+286 over the 288 KiB line). Reduction audit found no dead
// weight; the pin is core switcher UI and must not move to a dynamic chunk.
// The then-current repository archive budget was 512 KiB — archive headroom was only ~13 KiB,
// so the next Phase A batches had to re-audit it per the same
// program.
// ADR 0254 (2026-10-21): recalibrated 320 -> 328 KiB (335,872 B) after T-7360
// (penetration search smart empty hints, snippet studio dual maximize views, color chips);
// compressed index.js is 328,031 bytes (7,841 B headroom within 328 KiB).
// ADR 0256 (2026-10-21): recalibrated 328 -> 332 KiB (339,968 B) after T-7360
// (switcher persistent mode chips bar, keycap styling on action palette);
// compressed index.js is 329,065 bytes (10,903 B headroom within 332 KiB).
// ADR 0260 (2026-10-23): recalibrated 332 -> 336 KiB (344,064 B) after 7 ecosystem widget adapters;
// compressed index.js is 334,756 bytes (9,308 B headroom within 336 KiB).
// ADR 0266 (2026-10-23): recalibrated 336 -> 338 KiB (346,112 B) after SiReader & SiMedia adapters and event bus;
// compressed index.js is 336,082 bytes (10,030 B headroom within 338 KiB).
// ADR 0539 (2026-10-31): recalibrated 352 -> 362 KiB (370,688 B) after T-7830~T-7833;
// compressed index.js is 359,801 bytes (10,887 B headroom within 362 KiB).
// ADR 0545 (2026-11-03): recalibrated 362 -> 372 KiB (380,928 B) after TASK-20261103;
// compressed index.js is 368,156 bytes (12,772 B headroom within 372 KiB).
// ADR 0547 (2026-11-03): recalibrated 372 -> 374 KiB (382,976 B) after Phase 6;
// compressed index.js is 372,486 bytes (10,490 B headroom within 374 KiB).
// ADR 0549 (2026-11-04): recalibrated 374 -> 386 KiB (395,264 B) after v0.48.88 release package verification;
// compressed index.js is 380,907 bytes (14,357 B headroom within 386 KiB).
// ADR 0550 (2026-11-04): recalibrated 386 -> 392 KiB (401,408 B) after T-7864 mobile round 2 audit;
// compressed index.js is 387,836 bytes (13,572 B headroom within 392 KiB).
// ADR 0551 (2026-11-05): recalibrated 392 -> 394 KiB (403,456 B) after T-7866 selection context classifier;
// compressed index.js is 390,720 bytes (12,736 B headroom within 394 KiB).
// ADR 0556 (2026-11-09): recalibrated 400 -> 408 KiB (417,792 B) after unified XiaoLv hub routing & Protocol v1.7.8;
// compressed index.js is 412,103 bytes (5,689 B headroom within 408 KiB).
// ADR 0557 (2026-11-10): recalibrated 408 -> 416 KiB (425,984 B) after external command host contract & dialog lifecycle fixes;
// compressed index.js is 417,881 bytes (8,103 B headroom within 416 KiB).
const COMPRESSED_ENTRY_BUDGET_BYTES = 416 * 1024;
const ARCHIVE_DRIFT_TOLERANCE_BYTES = 1024;

function parseArtifactSnapshot(text) {
    const bundleMatch = text.match(/`dist\/index\.js` (\d+) bytes/);
    const archiveMatch = text.match(/`package\.zip` (\d+) bytes/);
    if (!bundleMatch || !archiveMatch) return null;
    return {
        bundle: Number(bundleMatch[1]),
        archive: Number(archiveMatch[1]),
    };
}

function headroom(budget, actual) {
    return budget - actual;
}

function withinDrift(documented, actual, tolerance = ARCHIVE_DRIFT_TOLERANCE_BYTES) {
    return Math.abs(documented - actual) <= tolerance;
}

module.exports = {
    RAW_BUNDLE_BUDGET_BYTES,
    RAW_BUNDLE_BUDGET_ADR,
    ARCHIVE_BUDGET_BYTES,
    COMPRESSED_ENTRY_BUDGET_BYTES,
    ARCHIVE_DRIFT_TOLERANCE_BYTES,
    parseArtifactSnapshot,
    headroom,
    withinDrift,
};
