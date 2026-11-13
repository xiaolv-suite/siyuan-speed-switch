# 小驴雷切（Lv Speed Switch）更新日志

完整中英文版本更新历史请参阅：
- 中文完整日志：[docs/CHANGELOG.md](docs/CHANGELOG.md)
- 英文完整日志：[docs/CHANGELOG.en-US.md](docs/CHANGELOG.en-US.md)

---

### v0.48.90（2026-11-13 · 本地封验）

- **全生态基础设施与交互打磨 (Ecosystem & Quality)**：
  - **集市图标轻量化合规**：清单图标无损重构与紧凑压缩，大小稳定在 60KB（严格低于官方集市 64KB 硬性限制）；
  - **罗盘启动防抖与顶栏对齐**：桌面罗盘与思源 3.8.x 顶栏 #barMore 严格对齐，重定位添加 600ms 速率保护与 250ms 被动重构节流，根除宿主与插件顶栏回流拉锯闪烁；
  - **LifeLog 照片流与原子多块撤销**：LifeLog 记事支持粘贴或上传图片，Canvas 自动压缩（最长边 1600px，JPEG 0.85）并安全存入 /assets/ 目录；支持文本行与图片块一键原子回滚；
  - **全生态双向灾备闭环**：新增全生态联合恢复弹窗（openEcosystemRestoreDialog），支持导入历史备份 JSON 预览多插件数据项并安全覆盖恢复；
  - **单例全局通知总线**：8 仓 MutationObserver 汇聚为全局单例总线，DOM 监听开销降低 8 倍；
  - **移动端全面去电脑化**：剔除桌面端快捷键指示，换用触控手势语义（点按、长按屏幕粘贴、点「保存」入库）。

### v0.48.89（2026-11-12 · 本地封验）

- **思源 3.8.10+ 原生特性适配与文档检索增强**：
  - **文档结果原生文档树菜单（Issue #21219）**：快速切换器文档检索结果项支持 Shift+右键或键盘 ContextMenu / Shift+F10 唤出思源原生文档树菜单，附带 SQL 笔记本归属实时回退查询；
  - **半角斜杠标题防截断（`safeDocTitleFromHPath`）**：快速切换器搜索卡片标题与过滤路径全面接入安全解析，保留合法半角斜杠并剔除富文本标签；
  - **原生停靠栏动作对齐（`toggleNativeDock`）**：动作画板支持独立切换左、右、底侧原生停靠栏展开/收起。
- **修复与体验打磨（R8-R25 打磨战役）**：
  - **切片暂存栈组装复制失败反馈**：组装切片复制到剪贴板失败时精准返回 copyFailed 提示，不再跳出误报为“组件组装失败”；
  - **输入法合成期守卫**：设置区名称创建、二级弹窗提交与重命名输入框的 Enter/Escape 键盘流在拼音候选合成期整体让路，不再以拼音半成品误创建/误保存（已固化为回归契约）；
  - **模块动作标签截断修复**：组件面板动作标签省略号此前未生效（缺 overflow/nowrap 三件套），长名称不再撑破卡片；
  - **罗盘键盘导航输入法守卫**：罗盘弹窗键盘导航在输入法合成期整体让路（全生态统一，ECO-015 契约固化）；
  - **桌面端悬停反馈**：关闭钮、悬浮球恢复与图标选择器增加 hover 高亮（触屏不残留悬停态）；
  - **产物预算再校准（ADR 0559）**：打磨战役后归档 784 KiB / 压缩入口 418 KiB 预算重校准，字体/圆角令牌合规收敛。

### v0.48.88（2026-11-04 · 本地封验）

- **小驴全家桶统一生态系统全量接入与真机闭环（T-7859~T-7861）**：
  - **7 大全生态统一规范全量落地**：接入通知降噪中枢（`lvNotify`）、文档写入互斥锁（`lvLock`）、全生态今日知识沉淀流（`lvActivity`）、多源灾备数据导出与无损写回（`lvBackup`）、极速二级行动弹射坞（`lvLaunchpad`）、AI 智能切片精炼与专题笔记融汇编织（`lvAi`）、以及全知穿透搜索引擎切片 Provider（`lvOmnisearch`）；
  - **第一面板顶栏「今日生态流」快捷入口与底栏协同指示器**：切换器主弹窗与侧边栏统一装配 Sparkles 生态活动流入口，一键展开今日跨插件知识沉淀卡片并支持一键导出汇编 Markdown，底部常驻全家桶协同状态指示器；
  - **全表面模态弹窗 Escape 退出机制与焦点生命周期加固**：重构指引弹窗、生态流弹窗、组件预览等全部二级对话框，引入全局顶层 Escape 捕获与生命周期安全注销，彻底杜绝通知微胶囊劫持按键或由于焦点异步漂移导致的无法退出；
  - **切片暂存栈 AI 深度赋能与健壮性防护**：单切片卡片一键触发核心要点与行动项提炼，底部操作栏支持多切片智能融合编织为结构严整的专题笔记并自动写入剪贴板，全链路包裹离线兜底与精准错误提示；
  - **真机隔离端到端发版门禁全面扩充**：纳入全新生态功能实机走查用例、分屏打开（`split-open`）、首开性能（`first-open`）与用户全景体验（`user-experience-full-journey`）等规格，真机 E2E 规格扩充至 18 大 Spec、30 项真实链路测试，全线 100% 稳定直通（2.3m，0 重试，0 flaky）。

### v0.48.87 (2026-11-01 · 本地封验)
- **新增（Added）**：
  - **第二面板与组件商店 Apple Bento 3.0 / Liquid Glass 3.0 全面重构**：五源动态空间极光画布、40px 高斯模糊透光毛玻璃、镜面斜切高光、22px 连续曲率、VisionOS 空间角落光晕与 28×28 立体 App Icon 徽标；
  - **18 款精选小组件黄金尺寸推荐**：`HOME_RECOMMENDED_STORE_SIZES` 映射 + 商店尺寸「⭐ 荐」标注与默认最佳预览；
  - **组件商店 100% 视觉同源**：商店弹窗、分类药丸、画廊卡片、实时预览全部接入与第二面板同一套 Bento 3.0 规则。
- **优化（Changed）**：
  - **有机 WidgetKit 内容编排**：消除 `space-between` 空洞，主数值与语义标签紧密配对，进度条末端发光圆点，Small/Medium/Wide 尺寸自适应展开；
  - **时钟英雄排版**：第一时钟卡片大数字英雄位与 5 卡黄金 Bento 默认布局；
  - **宿主联动与生态联邦全量实测审计**：9 项宿主联动 + 12 大生态桥梁逐条实测结论落盘。

### v0.48.86 (2026-11-01 · 本地封验)
- **修复（Fixed）**：
  - **隔离环境 E2E 并发读超时抖动**：内置书签与标签组件在真实思源内核冷启动高并发查询时的 `timeoutMs` 统一由 1200ms 调整为 2500ms，消除 Playwright E2E 隔离验收偶发 flaky；
  - **第一面板速览栏空白截断**：彻底修复阅读速览栏（`.sw__doc-preview`）在短文档或空文档时垂直高度截断问题，声明全高延伸与专属空态防白卡片；
  - **新版思源选择器失效修复**：AI 重构全部内置片段失效选择器（`NodeImage`、`h1[data-type]`、`.b3-chip--info`）并消除硬编码死白 `#f4f5f7`。
- **新增（Added）**：
  - **代码片段商店「💎 精选精品」首位直达胶囊**：设立 25 款高视觉价值的精品美化专区，全量分类自动置顶，剔除平庸代码干扰；
  - **10 款链滴社区经典 CSS 片段收录**：彩虹大纲树、Mac 终端代码块、柔彩 Callout、浮起卡片相框、渐变分割线、待办微跳跃等，严格标注作者与 ld246 原文；
  - **沙箱 iframe 11 种分类增强预览 Hero 演示区**：直观对比展现真实排版变化；
  - **第二面板全屏模式与 Bento 调色板变色**：默认全屏铺展，工具栏增加「🎨 变色」就地循环换色。
- **优化（Changed）**：
  - **移除歧义的“连续切片暂存栈”按钮**：从工作台顶栏与片段实验室中彻底解耦；
  - **组件商店与片段商店双列宽屏画廊重构**：打造 52% : 48% 与 1240x820 平衡视窗。

### v0.48.85 (2026-10-31 · 本地封验)
- **修复（Fixed）**：
  - **连续切片暂存栈组装与块跳转全链路打通**：修复片段实验室中暂存栈未挂载 `assemble` 与 `openBlock` 导致点击推入日报、插入当前文档、生成新文档、复制组装块仅显示假成功回执的问题；支持点击 `((blockId))` 血缘反链直接定位思源目标块；
  - **异步并发防连点锁与全仓剪贴板消伪**：为暂存栈异步操作补齐 `aria-busy` 防连点互斥锁与 `try/catch` 异常隔离；修复 `index.ts` 与 `doc-search-ui.ts` 残余裸 `void navigator.clipboard.writeText` 无条件提示成功的问题；
  - **编辑区选区实时快照与双语裸键名修复**：新增 `.protyle-wysiwyg` 选区快照缓存与段落 `data-node-id` 精确提取，解决点击悬浮球或呼出切换器后选区失焦丢失的问题；补齐 `snippet-studio-ui.js` 的 `snippetStack*` 多语言映射，消除 `"snippetStackTitle"` 裸键名渲染与死键白名单。
- **新增（Added）**：
  - **暂存栈不可逆操作一键撤销（Undo）**：移除单条切片或执行「清空未锁定」后自动保留内存快照，底栏提供「撤销」按钮一键无损恢复；
  - **跨端独立暂存栈弹窗回退**：在移动端、侧栏端或禁用片段实验室时，点击工作台顶栏「连续切片暂存栈」按钮自动打开独立 `.sw-dialog--snippet-stack` 弹窗；
  - **统一代码版本常量 `PLUGIN_VERSION`**：在 `src/constants.ts` 与 `src/constants.js` 导出单一版本常量 `PLUGIN_VERSION` / `PLUGIN_VERSION_BADGE`，统一收口全工程 28 处主次弹窗标题栏版本徽标。
- **优化（Changed）**：
  - **缺失样式补齐与中英文 README 重构**：补齐 `.sw-studio__ai-nav`、`.sw-studio__tab-pill`、`.sw-studio__stack-container`、`.sw-home__stack-btn` Bento 胶囊样式、伴侣栏折叠态竖排适配、作用域令牌回退与 `:focus-visible` 焦点环；重构中英文 README（补齐安装方式、修正真实默认快捷键、折叠历史更新日志、重拍当前版本全套界面预览图）。

### v0.48.84 (2026-10-30 · 本地封验)
- **新增（Added）**：
  - **Bento 双层视觉结构与极浅同族底色**：基于宿主主题色动态派生明度约 97%、饱和度 4.5% 的极浅同族托底色（`--sw-bg-tinted`），内容卡片采用纯白/近白浮起，以微明度差和近远双层柔影彻底替代生硬的灰色实线边框；
  - **操作与数据两色严格分工体系**：主题色负责按钮、交互选中与导航；色轮偏移约 25° 派生的高明度极光青绿（`--sw-color-data`）专门负责打卡连续天数、热力成绩等正向数据，两色严格物理隔离，绝不混用；
  - **倒数日 36px 英雄位主数据与深色重音卡片**：主数据字号放大为 36px（结合等宽排版），与 10px 辅助文字形成 3.6 倍强力视觉落差；核心块支持钛黑深邃对比重音卡；
  - **搜索框两阶梯 Escape 智能回退**：带前缀关键词时，第 1 次按 Esc 优先清空关键词保留前缀，第 2 次清空前缀回到全量，第 3 次关闭窗口；
  - **移动端弹窗顶部胶囊微手柄**：顶部注入 36×4px 胶囊手柄指示条，赋予明确的原生底部页（Bottom Sheet）手势预期；
  - **空状态温润多阶几何微徽章**：空态提示注入 36×36px 基于主题色三档明度（10%/24%/48%）的多阶径向体积感微徽章，带来温润陪伴感。
- **变更（Changed）**：
  - **三级按钮跨窗口与表面统一**：全面固化 Primary（主色胶囊）、Soft（12% 淡底胶囊）与 Quiet（文本静默）三级模型，同一语义在切换器、工作台、设置页样式严格对齐；
  - **精密排版与等宽数字全面对齐**：时钟、倒数日、待办统计与清单次级数值全面注入 `font-variant-numeric: tabular-nums` 与右对齐，消灭数据跳抖；
  - **中文字体排版黄金行高**：正文行高锁定为 1.65，字重严格收敛至常规(400)、中黑(500)、半粗(600)三档，清除历史散落字重；
  - **非对称进出顺滑动效**：进入采用偏快偏缓出曲线 `cubic-bezier(0.16, 1, 0.3, 1)`（160ms），退出干脆利落（120ms），纯由 transform 与 opacity 驱动；
  - **视口滚动 8px 舒适安全缓冲**：键盘上下导航时卡片与视口上下边缘保持 8px 呼吸间距，杜绝贴边压盖。
- **修复（Fixed）**：
  - **剪贴板异步写入防空承诺加固**：一键复制与大纲导出全面接入真实 Promise 捕获，权限拒绝或写入失败时如实报错，消除虚假成功提示；
  - **生态插件（思阅/思播）未安装伪回执消除**：调用前严格检测插件活跃状态，未安装时在打开原生页签的同时如实提示“在默认编辑器打开”，消灭伪回执；
  - **残存内阴影与多重描边彻底清零**：铲除设置舞台 `box-shadow: inset 0 1px 5px` 内凹阴影，消除开关控件双重描边；
  - **5 项 UI 待办全面闭环**：收藏重命名按钮对齐至 26px 网格、日记下拉框扩增 8px 舒适留白、天气摄氏度上标基线齐平、折叠三角物理缓动与悬浮球按钮深色微反光；
  - **同构镜像键盘导航补齐**：在纯 JS 同构镜像 `src/index.js` 同步对齐完整的药丸栏键盘循环流转逻辑。
- **移除（Removed）**：
  - 彻底清除所有残存的过时字面阴影、粗描边与硬编码高饱和度渐变色。

### v0.48.82 (2026-10-29 · 本地封验)
- **第二面板工作台小组件卡片聚焦态按 M 键快捷呼出上下文菜单加固（Widget Card Keyboard M Shortcut）**：
  - 卡片聚焦态增加快捷键响应：按 `m`/`M` 直接在卡片中央呼出操作菜单，内部输入框不受拦截。
- **内置代码片段库新增提示块信息微光卡片与行内高亮渐变 CSS 片段（Info Callout Glow Card & Mark Warm Gradient）**：
  - 新增 `swss-builtin-calloutinfo`（信息提示块海蓝微光卡片与海蓝立体指示条）；
  - 新增 `swss-builtin-markgradient`（文本高亮暖调双色微渐变衬底与圆角），内置片段库扩充至 76 项。
- **代码片段实验室导出 usercss 支持通用 @var 自动格式化回退与非法字段清洗（Universal @var Fallback Defaults）**：
  - `buildUsercssHeader` 支持所有标准变量类型在缺失参数时的安全语法兜底，彻底杜绝下游解析报错。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.82）**。

### v0.48.81 (2026-10-29 · 本地封验)
- **第二面板工作台小组件卡片标题栏长按呼出快捷操作菜单手势加固（Widget Card Long-Press Context Menu）**：
  - 触控端 500ms 长按触发菜单，排除内部交互按钮与表单控件，并在支持设备触发 50ms 清脆物理震动反馈。
- **内置代码片段库新增引用块悬停平移与列表圆点微动效 CSS 片段（Blockquote Hover Shift & List Bullet Pulse）**：
  - 新增 `swss-builtin-quotehover`（引用块悬停向右 3px 平移与半透明主色微渐变底色）；
  - 新增 `swss-builtin-listbulletpulse`（无序列表圆点图标赋予主色且悬停平滑放大 1.25 倍），内置片段库扩充至 74 项。
- **代码片段实验室导出 usercss 支持 @var number 数值参数精度校验与默认值格式化（UserCSS number Formatting & Validation）**：
  - `buildUsercssHeader` 支持有限数值（整数/浮点数）校验与输出，非法输入安全回退至 `0`。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.81）**。

### v0.48.80 (2026-10-29 · 本地封验)
- **第二面板工作台小组件卡片标题栏长按/按压微缩放与触感反馈加固（Widget Card Header Active Touch & Scale Haptics）**：
  - 标题栏 `.sw__home-module-header` 增加物理按压弹性微缩放 `scale(0.99)`，并声明 `-webkit-tap-highlight-color: transparent` 消除移动端闪烁。
- **内置代码片段库新增图片卡片画框衬底与代码行号右对齐 CSS 片段（Image Frame Card Container & Line Numbers Right-Aligned）**：
  - 新增 `swss-builtin-imgcard`（图片独立半透明画框衬底与悬停主色微光边框）；
  - 新增 `swss-builtin-codelineright`（代码块行号文本右对齐排列与柔和微透明度），内置片段库扩充至 72 项。
- **代码片段实验室导出 usercss 支持 @var text 文本参数转义与多行过滤（UserCSS text String Escaping & Multi-Line Sanitization）**：
  - `buildUsercssHeader` 支持文本字符串双引号自动包裹、内部双引号 `\"` 转义与换行控制符压缩过滤。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.80）**。

### v0.48.79 (2026-10-29 · 本地封验)
- **第二面板工作台小组件卡片聚焦态全键盘 F/C 键快速折叠与配置加固（Widget Card Keyboard F/C Shortcuts）**：
  - 卡片聚焦态增加快捷键响应：按 `f`/`F` 一键折叠/展开，按 `c`/`C` 直达配置对话框，内嵌输入框不受拦截。
- **内置代码片段库新增嵌入块悬浮微光与双色渐变标签药丸 CSS 片段（Block Embed Accent Bar & Dual Gradient Tag Pill）**：
  - 新增 `swss-builtin-embedshadow`（嵌入块左侧主色指示条与鼠标悬停柔和光晕）；
  - 新增 `swss-builtin-taggradient`（标签半透明双色微渐变背景与微抬升动效），内置片段库扩充至 70 项。
- **代码片段实验室导出 usercss 支持 @var color 颜色格式化与校验（UserCSS color Formatting & Validation）**：
  - `buildUsercssHeader` 支持十六进制、函数型（rgb/rgba/hsl）与命名颜色校验，非法输入安全回退 `#000000`。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.79）**。

### v0.48.78 (2026-10-29 · 本地封验)
- **第二面板工作台小组件卡片标题栏双击快速切换折叠/展开手势加固（Widget Card Header Double-Click Toggle）**：
  - 标题栏 `.sw__home-module-header` 绑定双击手势快速折叠/展开，添加交互子控件防误触守卫与 `user-select: none` 防选区闪烁。
- **内置代码片段库新增引用块悬挂大引号与行内代码霓虹微光 CSS 片段（Blockquote Hanging Quote & Inline Code Neon Glow）**：
  - 新增 `swss-builtin-quotehanging`（引用块左上角经典杂志风半透明衬线大引号“）；
  - 新增 `swss-builtin-inlineneon`（行内代码半透明主色微边框与霓虹微光投影），内置片段库扩充至 68 项。
- **代码片段实验室导出 usercss 支持 @var checkbox 布尔开关格式化与默认值校验（UserCSS checkbox Boolean Options）**：
  - `buildUsercssHeader` 支持 `@var checkbox` 布尔类型规范化输出为 `1` 或 `0`，并提供安全默认值兜底。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.78）**。

### v0.48.77 (2026-10-29 · 本地封验)
- **第二面板工作台空态全键盘无障碍 Enter/Space 快速打开组件商店加固（Workbench Empty State Keyboard A11y）**：
  - 空态容器赋予 `tabIndex = 0` 与 2px 品牌焦点环；按 Enter/Space 快速触发打开组件商店或推荐，按 ArrowUp 顺畅回焦工具栏。
- **内置代码片段库新增任务列表进度导轨与待办项轻质感卡片 CSS 片段（Task List Progress Guide & Task Item Card）**：
  - 新增 `swss-builtin-taskprogress`（待办任务列表容器左侧主色垂直进度导轨与悬停微光）；
  - 新增 `swss-builtin-taskbadge`（待办项圆角卡片轮廓与悬停微渗透底色），内置片段库扩充至 66 项。
- **代码片段实验室导出 usercss 支持 @var range 数值区间与单位格式化校验（UserCSS range Numeric Options & Unit Validation）**：
  - `buildUsercssHeader` 支持结构化 `@var range` 数值区间参数解析、越界夹持与单位安全过滤。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.77）**。

### v0.48.76 (2026-10-29 · 本地封验)
- **第二面板工作台小组件卡片标题栏状态徽标悬停手势与语义颜色高亮加固（Widget Status Badge Hover Tints）**：
  - 数据时效徽标声明悬停向上 -1px 微浮动与柔和微光投影；翠绿、宝石蓝与暖琥珀三色语义微底色渗透。
- **内置代码片段库新增任务复选框触控热区与表格首列强调 CSS 片段（Task Checkbox Scale & Table First Column）**：
  - 新增 `swss-builtin-taskcheckbox`（任务复选框圆角矩形与悬停平滑缩放）；
  - 新增 `swss-builtin-tablefirstcol`（数据表格首列序号键名半透明主色底色与加粗竖线），内置片段库扩充至 64 项。
- **代码片段实验室导出 usercss 支持 @var select 选项数组格式化与校验（UserCSS select Options Parsing）**：
  - `buildUsercssHeader` 扩展 `@var select` 结构化选项处理，完美支持字符串数组与对象字典格式化输出。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.76）**。

### v0.48.75 (2026-10-29 · 本地封验)
- **第二面板工作台小组件折叠状态下回车与空格键双向触感切换加固（Collapsed Card Enter Expansion）**：
  - 折叠卡片聚焦按 `Enter` 键自适应展开，与空格键形成双向无阻触觉交互；非折叠态保持配置与操作直通。
- **内置代码片段库新增提示块双色渐变微高亮卡片与居中三点分割线 CSS 片段（Dual-Gradient Callouts & Triple Dot Dividers）**：
  - 新增 `swss-builtin-calloutgradient`（Callout 提示块纵向双色渐变指示条与半透明轻底色）；
  - 新增 `swss-builtin-hrdots`（分割线居中三点 ••• 艺术标记与悬浮微扩展动效），内置片段库扩充至 62 项。
- **代码片段实验室导出 usercss 支持 @var 变量类型白名单校验与安全转义（UserCSS @var Type Allowlist）**：
  - `buildUsercssHeader` 支持变量定义提取，严格限定 `color`, `range`, `select` 等类型白名单与标识符校验。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.75）**。

### v0.48.74 (2026-10-29 · 本地封验)
- **第二面板工作台小组件卡片标题栏折叠指示器 hover 与 focus 动效触感加固（Collapse Button Hover & Focus Ring）**：
  - 折叠指示器补充主色微缩放悬停与无障碍 2px 键盘焦点环，提升微触感体验。
- **内置代码片段库新增提示块三色语义警告/错误/成功卡片 CSS 片段（Callout Cards & Dashed Links）**：
  - 新增 `swss-builtin-calloutcolored`（Callout 提示块粗左边框与悬浮微浮动卡片）；
  - 新增 `swss-builtin-linkdashed`（正文超链接极简虚线下划线与悬停转实线），内置片段库扩充至 60 项。
- **代码片段实验室导出 usercss 支持 @preprocessor 预处理器元数据字段提取与枚举安全校验（UserCSS Preprocessor Metadata）**：
  - `buildUsercssHeader` 扩展 `@preprocessor` 字段提取与标准白名单枚举过滤，杜绝非预期代码注入。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.74）**。

### v0.48.73 (2026-10-29 · 本地封验)
- **第二面板工作台小组件网格拖拽把手与调整把手键盘焦点环聚焦样式强化（Widget Handles Focus Ring & A11y）**：
  - 调整把手与拖拽把手补充高对比度 2px 主题色焦点环与微缩放反馈，完全满足无障碍键盘聚焦规范。
- **内置代码片段库新增上下标主色强调与音视频媒体卡片圆角微边框 CSS 片段（Subscript/Superscript Pills & Media Cards）**：
  - 新增 `swss-builtin-scriptsaccent`（科学公式/学术上下标主题主色与半透明微底色胶囊）；
  - 新增 `swss-builtin-mediarounded`（视频与音频播放器卡片现代圆角微边框与悬浮微光），内置片段库扩充至 58 项。
- **代码片段实验室导出 usercss 支持 @updateURL 自动更新源链接元数据提取与安全校验（UserCSS Update URL Metadata）**：
  - `buildUsercssHeader` 扩展 `@updateURL` 字段提取与协议白名单校验，无缝兼容 Stylus 自动更新生态。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.73）**。

### v0.48.72 (2026-10-29 · 本地封验)
- **第二面板工作台小组件卡片标题聚焦时 Enter 键快速唤出组件配置或打开操作（Widget Card Enter Action Cascade）**：
  - 卡片聚焦回车键支持级联回退：优先响应编辑态配置，非编辑态直接触发组件独立设置或主操作打开。
- **内置代码片段库新增行内代码卡片背景与挂件嵌入块悬浮微光 CSS 片段（Inline Code Tint Spans & Widget Embed Card Borders）**：
  - 新增 `swss-builtin-inlinecodecard`（行内代码专属主色边框微高光与微质感底色）；
  - 新增 `swss-builtin-embedglow`（挂件与嵌入小部件圆角外边框与悬浮柔光），内置片段库扩充至 56 项。
- **代码片段实验室导出 usercss 支持 @homepageURL 与 @supportURL 元数据提取与安全校验（UserCSS Homepage & Support URLs）**：
  - `buildUsercssHeader` 扩展网络链接元数据提取，严格校验 http/https 协议并静默抑制危险伪协议。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.72）**。

### v0.48.71 (2026-10-29 · 本地封验)
- **第二面板工作台小组件配置表单重置与保存操作全键盘流加固（Widget Config Form Action Button Keyboard Flow）**：
  - 配置表单底部按钮组支持 `ArrowLeft` / `ArrowRight` 循环焦点导航；单行输入框支持按 `Enter` 直接提交；支持 `Alt+R` 快捷恢复默认配置。
- **内置代码片段库新增引用大闭引号装饰与渐变分割线微动效 CSS 片段（Closing Accent Quotes & Feathered Dividers）**：
  - 新增 `swss-builtin-quoteaccent`（块引用右下角主题主色大闭双引号 ” 艺术装饰与悬浮提亮）；
  - 新增 `swss-builtin-dividerpulse`（分割线双向平滑羽化渐变与悬浮微缩放动效），内置片段库扩充至 54 项。
- **代码片段实验室导出 usercss 支持 @author 与 @license 字段提取与安全校验（UserCSS Author & License Metadata）**：
  - `buildUsercssHeader` 扩展 `@author` 换行控制符清洗与 `@license` 正则白名单过滤，规范生态导出。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.71）**。

### v0.48.70 (2026-10-29 · 本地封验)
- **第二面板工作台组件卡片键盘方向键边界巡航导航平滑滚动与指示加固（Widget Grid Boundary Navigation & Smooth Centering）**：
  - 卡片网格支持 `PageUp` / `PageDown` 跨屏翻页步进导航；内部输入框方向键防劫持；滚动统一携带 `inline: nearest`。
- **内置代码片段库新增未完成待办主色指示条与有序列表序号胶囊 CSS 片段（Unchecked Task Highlights & Ordered List Badges）**：
  - 新增 `swss-builtin-taskpending`（待办任务未完成项左侧主色竖线指示与轻微悬停底色）；
  - 新增 `swss-builtin-numlistaccent`（有序列表序号胶囊半透明圆角微底色与主题主色强调），内置片段库扩充至 52 项。
- **代码片段实验室导出 usercss 支持 @description 说明字段提取与安全转义（UserCSS Export Description Metadata）**：
  - `buildUsercssHeader` 支持可选 `@description` 提取与控制符换行清洗，保持 Stylus/UserCSS 生态规范标准。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.70）**。

### v0.48.69 (2026-10-29 · 本地封验)
- **第二面板工作台小组件卡片标题超长省略与悬停完整气泡提示加固（Widget Card Title Truncation & Hover Tooltip Enrichment）**：
  - 外部卡片 `cell.title` 补全组件完整名称、来源与说明；标题与上下文节点默认挂载初始 `title` 属性，配合单行省略保障优雅排版。
- **内置代码片段库新增折叠块引用与荧光笔划词强调 CSS 片段（Foldable Blockquote Cards & Fluorescent Highlighters）**：
  - 新增 `swss-builtin-foldcallout`（折叠块引用专属主题主色边框指示条与展开微交互）；
  - 新增 `swss-builtin-highlighter`（马克荧光笔半高横刷质感划词强调与悬浮微动效），内置片段库扩充至 50 项。
- **代码片段实验室导出 usercss 头部配置项键值校验与导出通知加固（UserCSS Export Option Validation & Instant Receipt）**：
  - `buildUsercssHeader` 扩展配置项白名单校验与静默安全回退，导出 CSS 时状态栏实时给出就绪回执。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.69）**。

### v0.48.68 (2026-10-29 · 本地封验)
- **第二面板工作台小组件异常状态徽标双击自愈与编辑态单卡 R 键快捷重试（Widget Health Double-Click Quiet Healing & R Key Retry）**：
  - 针对 `failed`、`offline` 或 `stale` 异常组件卡片，支持鼠标双击就地极速重试自愈；编辑态下聚焦单卡支持按下 `r` / `R` 键即时刷新单卡。
- **内置代码片段库新增标签药丸胶囊微边框与外链对角箭头微交互（Pill Tag Badges & External Link Diagonal Arrows）**：
  - 新增 `swss-builtin-tagpill`（文档 #标签 升级为 999px 全圆角半透明药丸胶囊与悬浮微抬升动效）；
  - 新增 `swss-builtin-extlinkicon`（外部 http/https 链接末尾自动追加对角箭头 ` ↗` 与悬停平滑位移），内置片段库扩充至 48 项。
- **代码片段实验室备份还原预览面板全选快捷键与键盘流加固（Snippet Restore Preview Select-All Keyboard Flow）**：
  - 还原预览弹窗内支持 `Ctrl+A` / `Cmd+A` 一键全选/反选所有待恢复项；
  - 支持 `ArrowUp` / `ArrowDown` 循环移动复选框焦点、`Home` / `End` 首尾跳转，并补齐无障碍 `aria-label` 标识。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.68）**。

### v0.48.67 (2026-10-29 · 本地封验)
- **第二面板工作台组件卡片重试冷却保护与局部微光骨架动效加固（Widget Health Retry Cooldown & Skeleton Pulse）**：
  - 点击“全部重试”后引入 3 秒冷却倒计时防护，防止高频重复请求；骨架屏动画与动效无障碍深度对齐。
- **内置片段库新增代码明亮高亮与块引用专属主色下划线（Vibrant Code Syntax & Block Reference Underlines）**：
  - 新增 `swss-builtin-codevibrant`（代码块明亮字符串与数值调色）与 `swss-builtin-blockrefaccent`（双链块引用专属主题主色下划线），内置片段库扩充至 46 项。
- **代码片段实验室冲突面板全键盘流与操作按钮无障碍加固（Snippet Conflict Dialog Focus Trap）**：
  - 冲突差异容器声明 `tabIndex = 0` 与 `region` 无障碍语义，支持方向键滚动与 Tab / Shift+Tab 弹窗焦点环捕获循环。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.67）**。

### v0.48.66 (2026-10-29 · 本地封验)
- **第二面板工作台组件卡片键盘移动步长提示与拖拽把手微动效加固（Widget Card Move Step & Drag Haptic）**：
  - 键盘重排时动态回显当前位阶与总数步长回执（如“移动组件 (3/7)”）；拖拽把手新增悬停抬升与按压物理微缩放动效。
- **内置片段库新增行内数学公式微光卡片与正文排版两端对齐盘古字距（Inline Math Card & Pangu Spacing）**：
  - 新增 `swss-builtin-inlinemath`（行内 LaTeX 公式微底色与虚线装饰）与 `swss-builtin-panguspace`（两端对齐与呼吸微字距），内置片段库扩充至 44 项。
- **代码片段实验室诊断抽屉快捷键展开与规则计数角标加固（Snippet Diagnostics Toggle & Findings Badge）**：
  - 支持 `Ctrl/Cmd+Shift+D` 或 `Alt+D` 快捷键切换 CSS 样式诊断抽屉，头部动态挂载 `data-findings` 规则与错误总数角标。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.66）**。

### v0.48.65 (2026-10-29 · 本地封验)
- **第二面板小组件配置表单重置默认二次确认与动态校验微动效加固（Widget Config Reset Confirm & Shake）**：
  - 点击“恢复默认”时新增二次确认弹窗防护防误触；表单字段校验失败时触发 `.sw-form--shake` 水平弹性抖动微动效。
- **内置片段库新增任务列表核选弹跳微动效与粗体文本柔光阴影（Task Checkbox Bounce & Bold Accent）**：
  - 新增 `swss-builtin-taskbounce`（任务复选框弹性微缩放动效）与 `swss-builtin-boldaccent`（粗体文本主题主色与柔光阴影），内置片段库扩充至 42 项。
- **代码片段实验室编辑器多行 Tab 缩进与 Shift+Tab 反向退格加固（Snippet Editor Multiline Indent）**：
  - 代码编辑器支持跨行批量 Tab 缩进与 Shift+Tab 反向退格，平滑保持选区起点与边界。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.65）**。

### v0.48.64 (2026-10-29 · 本地封验)
- **第二面板小组件卡片折叠态条目计数角标与键盘折叠热键加固（Widget Collapsed Badge & Keyboard Fold）**：
  - 折叠状态下动态回显 `.sw__home-collapsed-badge` 条目计数或统计角标；小组件卡片新增空格与中括号 `[` / `]` 键盘折叠切换热键。
- **内置片段库新增正文划词选中微光与代码块彩虹嵌套标点（Text Selection Glow & Code Rainbow Brackets）**：
  - 新增 `swss-builtin-selectionglow`（划词选中半透明微光）与 `swss-builtin-rainbowbrackets`（代码块彩虹嵌套标点与括号），内置片段库扩充至 40 项。
- **代码片段实验室 Gist 发布异常状态卡片与退避重试指引加固（Snippet Gist Error Card & Retry Guidance）**：
  - Gist 发布异常时动态渲染 `.sw-studio__gist-error` 告警卡片，细化 GitHub API 限频、凭证受限与超时排查指引。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.64）**。

### v0.48.63 (2026-10-29 · 本地封验)
- **第二面板小组件离线容灾指示器与自定义静默刷新周期配置（Widget Offline Disaster Recovery & Custom Refresh）**：
  - 细化断网与离线环境（`offline`）容灾判定，呈现沉静琥珀微边框与提示；纯模型支持自定义刷新周期解析钳制（1~1440分钟）与 5 分钟封顶指数退避。
- **内置片段库新增 macOS 终端三色控制点与表格单元格悬浮高亮（macOS Window Dots & Table Cell Hover）**：
  - 新增 `swss-builtin-codemac`（macOS 终端红黄绿三色圆点代码块）与 `swss-builtin-tablecell`（表格单元格悬浮微光高亮），内置片段库扩充至 38 项。
- **代码片段实验室预览窗格全键盘 Tab 焦点环与视口缩放加固（Snippet Preview Keyboard Navigation & Zoom）**：
  - 双栏窗格声明 `tabIndex = 0` 与 `region` 无障碍语义，支持方向键滚动与 `Ctrl/Cmd + +/-/0` 视口缩放。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.63）**。

### v0.48.62 (2026-10-28 · 本地封验)
- **第二面板小组件空态可解释性与一键配置自愈把手加固（Widget Empty State In-Place Config Hint）**：
  - 在空态与异常受阻卡片中动态内嵌 `.sw__home-module-config-hint` 配置自愈按钮，支持按键回焦自愈与双语引导，无需进入全局编辑模式即可一键配置。
- **代码片段实验室回收站全键盘批量清空确认与单项快捷恢复（Snippet Recycle Bin Keyboard & Batch Clear）**：
  - 回收站清空按钮空态自适应禁用防护，支持 `Ctrl/Cmd+Shift+Delete` 与 `Alt+C` 快捷清空，列表项支持 `Enter`/`r` 快速恢复与 `Delete`/`Backspace` 快速永久删除。
- **内置片段库新增赛博暗色发光边框与半透明毛玻璃卡片（Cyber Neon Glow & Frosted Glass Snippets）**：
  - 新增 `swss-builtin-neonglow`（选中块赛博呼吸霓虹微光外边框）与 `swss-builtin-frostedglass`（半透明嵌入块毛玻璃卡片），内置片段库扩充至 36 项。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.62）**。

### v0.48.61 (2026-10-28 · 本地封验)
- **工作台小组件网格调整把手全键盘 Shift+方向键缩放（Widget Resize Handle Slider Keyboard）**：
  - 调整把手声明 `tabIndex = 0` 与 `role="slider"`，消除中文硬编码，支持按 `Shift+方向键` 自由缩放网格列数与行数。
- **代码片段实验室编辑器 ⌘S 快捷保存、⌘⇧C 复制与 ⌘Enter 格式化流（Snippet Editor Hotkeys）**：
  - 代码编辑器内置极客快捷流：`⌘⇧C` 一键全文复制代码、`⌘Enter` 快速代码美化排版、`⌘F` 唤出查找栏。
- **内置片段库新增渐变彩色滚动条与正文首字大写下沉（Drop Caps & Gradient Scrollbars）**：
  - 新增 `swss-builtin-dropcap`（正文首字图书出版级大写下沉）与 `swss-builtin-gradient-bar`（赛博微光细滚动条），内置库扩充至 34 项。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.61）**。

### v0.48.60 (2026-10-28 · 本地封验)
- **第二面板小组件局部折叠/展开动画与网格压缩加固（Widget Collapse Row Compression）**：
  - 点击折叠把手后单元格网格行高动态联动压缩为 `span 1`，彻底消除折叠后大片空白框的缺陷，自适应单行紧凑美学。
- **代码片段实验室版本差异对比浮层全键盘流与 Escape 安全回退（Snippet Diff Keyboard Navigation）**：
  - 为差异对比面板声明 `tabIndex = 0`，支持按 Escape 安全退出并回焦代码编辑器，支持上下/jk 在差异块间平滑穿梭。
- **内置片段库新增金句大双引号装饰与波浪线重点下划线（Quote Marks & Wavy Underlines）**：
  - 新增 `swss-builtin-quote-gold`（古典优雅大双引号水印）与 `swss-builtin-wavy-underline`（跳动波浪线重点），内置库扩充至 32 项。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.60）**。

### v0.48.59 (2026-10-28 · 本地封验)
- **第二面板小组件卡片桌面右键与移动端长按菜单（Widget Desktop Contextmenu & Mobile Long-Press）**：
  - 非编辑态下支持桌面右键（`contextmenu`）与移动端长按（500ms 触发、10px 容差防抖），呼出就地配置、单组件刷新与安全移除菜单。
- **内置片段库新增折叠标题指示微动效与数学公式块微卡片（Foldable Heading & Math Block Snippets）**：
  - 新增 `swss-builtin-foldheading`（折叠微箭头指示器）与 `swss-builtin-mathblock`（数学公式块卡片美化），自适应明暗主题。
- **动作画板多页签批量关闭安全焦点回退（Action Palette Batch Close Focus Fallback）**：
  - 批量关闭后自动将键盘焦点平滑赋予首个存活卡片，空列表安全回退至搜索框，杜绝焦点丢失至 `body`。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.59）**。

### v0.48.58 (2026-10-28 · 本地封验)
- **工作台全键盘 ⌘R / Ctrl+R 局部刷新拦截与白屏防御（Workbench Keyboard Refresh Interception）**：
  - 拦截浏览器硬刷新白屏，支持一键触发工作台全部小组件局部静默重试与读取，保持状态语义稳定。
- **内置片段库新增链滴精品呼叫盒与双栏响应式卡片（Callout Box & Dual-Column Builtin Snippets）**：
  - 新增 `swss-builtin-callout`（微质感彩色提示框）与 `swss-builtin-multicolumn`（并排双栏图文卡片），全面采用官方 CSS 变量。
- **动作画板思维导图导出快捷键与实体按键直达（Action Palette Direct Shortcuts Dispatch）**：
  - 动作画板按键状态机完整支持实体按键直达调度（`⌥⇧M` 大纲导出、`⌥H` 任务视界、`⌥M` 漫游等）。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.58）**。

### v0.48.57 (2026-10-28 · 本地封验)
- **工作台 Bento 瓦片小组件在极窄容器下的自适应防挤压（Bento Grid Narrow Resilience）**：
  - 超窄视口（<=360px）双拼 Bento 网格平滑回退单列，条目标签与长标题文本截断省略，次级胶囊与数值 `flex-shrink: 0` 防挤压与 `tabular-nums` 等宽对齐。
- **片段实验室过滤选择器全键盘流与 Escape 阶梯清空（Snippet Filter Keyboard Flow & Stepped Escape）**：
  - 搜索框获焦自动全选、Escape 阶梯退出（有词清空、无词退出），ArrowDown/Enter 直达卡片列表，下拉过滤组支持 Home/End 首末项快速跳选。
- **切换器历史下拉列表 Home/End 导航与 Delete 快捷单项清理流（History Dropdown Actions & Quick Cleanup）**：
  - 支持按 Home 直达顶部、End 直达底部，上下方向键平滑循环流转，按 Delete / Backspace 快捷移除聚焦条目并平滑将焦点赋予相邻项。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.57）**。

### v0.48.56 (2026-10-28 · 本地封验)
- **样式设计体系与刻度规范严格收口（Style Design Token Convergence）**：
  - 彻底消除动效时长、控件高度与间距字面量硬编码，收敛为 Sass 动效变量与 CSS 变量 Token。
- **根目录文档预算治理与历史账本精简（Root Markdown Budget Remediation）**：
  - 精简 ROADMAP 历史流水账，单文件体积回落至 147 KiB，彻底符合 150 KiB 仓库门禁。
- **全表面双向键盘交互与阶梯 Escape 契约对齐加固（Stepped Escape & Bi-Directional Keyboard Hardening）**：
  - 排除检索语法守卫消除误高亮，阶梯 Escape 退出与移动端抽屉列表键盘流全量闭环。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.56）**。

### v0.48.55 (2026-10-28 · 本地封验)
- **快捷动作选择器 Escape 退出、搜索框全选与键盘流加固（Quick Action Picker Keyboard Flow）**：
  - 快捷动作选择器支持 Escape 阶梯退出与回焦恢复，支持从搜索框 ArrowDown 直达首项、Enter 快捷选择、首项 ArrowUp 回焦。
- **动作画板键盘状态机扩展 Home/End 首末项快速跳转（Action Palette Home/End Navigation）**：
  - 次级动作画板支持按 Home 直达首项动作、按 End 直达末项动作。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.55）**。

### v0.48.54 (2026-10-28 · 本地封验)
- **片段备份恢复预览弹窗 Escape 退出与 ⌘Enter 快捷恢复（Snippet Restore Preview Escape & ⌘Enter）**：
  - 备份恢复预览弹窗支持按 Escape 退出、按 ⌘Enter 快捷提交恢复，支持在取消与恢复按钮间左右流转。
- **片段包导入策略选择弹窗安全首焦与 ⌘Enter 快捷导入（Snippet Import Mode Safe Focus & ⌘Enter）**：
  - 导入策略弹窗默认聚焦安全的“取消”按钮，支持按 ⌘Enter 快捷按当前策略导入。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.54）**。

### v0.48.53 (2026-10-28 · 本地封验)
- **片段商店投稿指引弹窗 Escape 退出与按钮左右方向键流闭环（Snippet Submit Guide Escape & Arrow Nav）**：
  - 投稿指引浮层支持按 Escape 安全关闭，支持在复制 JSON 与取消按钮之间使用左右方向键流转。
- **移动端收藏抽屉与分组管理弹窗 Home/End 快速跳转加固（Mobile Sheets Home/End Navigation）**：
  - 移动端全部抽屉支持按 Home 直达首项、End 直达末项，打通全键盘无障碍操作。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.53）**。

### v0.48.52 (2026-10-28)
- **文档预览窗格 Escape 回焦搜索卡片双向键盘流闭环（Doc Preview Escape Return Focus）**：
  - 在预览窗格未开启查找条时按 Escape 安全将焦点送回搜索列表原卡片/条目，打通全键盘双向流。
- **悬浮球更多抽屉列表 Home/End/Escape 全键盘导航加固（Floating Ball Drawer Home/End/Escape）**：
  - 更多抽屉动作列表支持按 Home 直达首项、End 直达末项，按 Escape 快捷安全退出并回焦悬浮球触发器。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.52）**。

### v0.48.51 (2026-10-28)
- **穿透检索模型扩展 `SEARCH_MODES.TASK`（前缀 - / task:）（Penetration Task Search）**：
  - 语法解析识别待办任务前缀，规划安全只读 SQL，输出结构化待办条目与完成态标记。
- **全库搜索执行流集成待办穿透模式并与 Task Horizon 今日任务生态直连（Task Horizon Search Flow）**：
  - 待办检索态无缝前置 Task Horizon 今日待办（🔥高优标识），回车直达任务块，`?` 速查指引新增 `help-task` 路由。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.51）**。

### v0.48.50 (2026-10-28)
- **多模态搜索模式 Chips 栏接入「待办模式」（前缀 - / task:）（Search Mode Task Chips）**：
  - 常驻药丸栏新增待办模式，支持 `-`、`－`、`task:`、`task：`、`[ ]` 识别与安全多字符前缀剥除。
- **动作画板多页签一键导出为任务思维导图/大纲（⌥⇧M）（Export Tabs to Mindmap）**：
  - 一键将当前工作区打开的所有页签格式化导出为 Markdown 任务大纲并复制至剪贴板，支持直接粘贴为思源思维导图。
- **工作台健康监控弹窗 Escape 安全退出与键盘流加固（Health Dialog Escape Hardening）**：
  - 容器级别监听 Escape 安全销毁弹窗并回焦，补齐组件健康详情全生命周期键盘闭环。
- **全表面二级弹窗标题栏品牌版本徽标统一对齐（v0.48.50）**。

---

> 更早版本的完整逐项更新记录（v0.48.49 及更早历史版本）已完整收录于 [完整更新日志 (docs/CHANGELOG.md)](docs/CHANGELOG.md) 与 [英文完整更新日志 (docs/CHANGELOG.en-US.md)](docs/CHANGELOG.en-US.md)。
