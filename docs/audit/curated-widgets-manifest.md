# 小驴雷切第二面板组件库精简瘦身与精品保留台账 (Curated Widgets Manifest)

- **评估日期**：2026-11-01
- **执行原则**：
  1. **质量优先、剔除死重**：坚决砍掉同质化重复、边缘鸡肋、脆弱易失效的外部爬虫组件；
  2. **保留殿堂级精品**：仅保留高稳定、高颜值、契合笔记与生活高频场景的精品组件；
  3. **数据零破坏与向下兼容**：老用户若已有历史实例，通过模型层安全回退，绝不导致数据丢失或报错。

---

## 一、 淘汰与下架组件清单（共裁撤 42 款冗余/鸡肋组件）

| 淘汰原因分类 | 裁撤组件模块 ID 列表 | 裁撤原因与分析 |
| :--- | :--- | :--- |
| **高度同质化与重复定义** | `checkin-summary`<br>`checkin-today`<br>`checkin-occasions`<br>`checkin-monthly`<br>`checkin-daily-streaks`<br>`writing-streak`<br>`recent-edits`<br>`recent-updates`<br>`journal-monthly`<br>`recent-daily-notes`<br>`fixed-document`<br>`inbox-shorthands` | 曾存在 9 个打卡组件和 3 个“最近文档”组件，严重碎片化且内容高度雷同。精简收敛后统一由 `checkin-streak`、`checkin-weekly`、`recent-documents`、`today-journal` 承载。 |
| **脆弱外部网络与易失效爬虫** | `external-air-quality`<br>`external-anime-bangumi`<br>`external-hot-news-dailyhot`<br>`external-news-newsnow`<br>`external-fx-frankfurter`<br>`external-status-uptimekuma`<br>`external-rss-miniflux`<br>`external-rss-subscription`<br>`external-news-hackernews` | 外部第三方 API 极不稳定，网络间歇性超时、403、跨域限制频发，违背 Local-first 离线优先原则，且资讯类组件严重破坏沉浸专注。天气信息统一收敛至稳定开源的 Open-Meteo 天气组件。 |
| **小众无真实数据源或偏门组件** | `external-device-battery`<br>`external-activitywatch-time`<br>`today-reservations`<br>`random-review`<br>`data-health`<br>`document-relations-summary`<br>`current-document-outline`<br>`database-board` 等 | 绝大多数用户未安装或无数据支持（如 ActivityWatch、UptimeKuma），设备电量在 PC 台式机永远鸡肋；大纲和关系图谱在卡片内施展不开。 |

---

## 二、 甄选保留的 18 款核心殿堂级精品组件（Curated 18 Gems）

经过严格筛选，第二面板精选收敛为 **3 大系列共 18 款精品组件**，每一款均具备极其明确的使用场景、极高颜值与 100% 稳定性：

### 系列一：【工作空间与灵感捕获】（5 款核心生产力）
1. 🌟 **`recent-documents`（近期常开文档）**
   - **定位**：工作现场枢纽，展示最近打开/编辑的文档；
   - **现代排版**：大卡片、精致文档图标、右侧相对时间胶囊、面包屑路径药丸平滑截断；
   - **标准尺寸**：`Medium (6×3)` 或 `Wide (12×3)`。
2. 🌟 **`today-journal`（今日日记直达）**
   - **定位**：思源核心双链日记入口；
   - **现代排版**：日历图标 + 今日大写日期 + 一键打开与末尾快速追加段落；
   - **标准尺寸**：`Small (4×3)` 或 `Medium (6×3)`。
3. 🌟 **`today-tasks`（今日任务视界）**
   - **定位**：当日待办清单，直连全局任务；
   - **现代排版**：原生复选框打勾交互，完成率微进度条，任务全完成时情绪化彩蛋横幅；
   - **标准尺寸**：`Medium (6×3)` 或 `Large (6×6)`。
4. 🌟 **`favorites`（星标常用收藏）**
   - **定位**：最高频笔记常驻看板；
   - **现代排版**：星标黄色高光，分组徽标，支持拖拽调序与快速直达；
   - **标准尺寸**：`Small (4×3)` 或 `Medium (6×3)`。
5. 🌟 **`quick-capture`（闪念随手记卡片）**
   - **定位**：桌面级 Flomo 极速捕获瓦片；
   - **现代排版**：内嵌多行文本框、常用标签胶囊（`#闪念#`、`#待办#`、`#灵感#`）、`Ctrl+Enter` 快速写入日记；
   - **标准尺寸**：`Medium (6×3)`。

---

### 系列二：【状态看板与习惯成就】（6 款 Bento 视觉锚点）
6. 🌟 **`checkin-streak`（习惯打卡连击 · Hero 视界）**
   - **定位**：视觉第一锚点，呈现当前连续记录成就；
   - **现代排版**：**32px 粗体特大数字**（如 `🔥 12 天`）+ 柔和微底渐变，强力视觉重心；
   - **标准尺寸**：`Small (4×3)`。
7. 🌟 **`checkin-weekly`（7 天微胶囊轴）**
   - **定位**：一周打卡规律全景；
   - **现代排版**：周一至周日 7 颗圆角微胶囊，状态随主题动态高亮；
   - **标准尺寸**：`Medium (6×3)`。
8. 🌟 **`checkin-year-heatmap`（年度打卡热力图）**
   - **定位**：GitHub 风格整年贡献度沉淀；
   - **现代排版**：极简像素点阵，季度刻度标注，微光悬停提示；
   - **标准尺寸**：`Wide (12×3)` 或 `Large (6×6)`。
9. 🌟 **`flashcard-due`（闪卡待复习数）**
   - **定位**：艾宾浩斯记忆与复习队列；
   - **现代排版**：环形微进度 Arc，卡片大字待复习数，一键开启闪卡模式；
   - **标准尺寸**：`Small (4×3)`。
10. 🌟 **`year-progress`（年度时光进度）**
    - **定位**：时光流逝感知看板；
    - **现代排版**：极简弧度百分比圆环（如 `68.5%`），剩余天数微标签；
    - **标准尺寸**：`Small (4×3)`。
11. 🌟 **`countdown`（重要目标倒数日）**
    - **定位**：考试、发布、纪念日重要倒计时；
    - **现代排版**：特大天数主数字 + 紧凑目标标题与底色高光；
    - **标准尺寸**：`Small (4×3)`。

---

### 系列三：【桌面环境与结构索引】（7 款精致生活与知识库工具）
12. 🌟 **`external-local-time`（极简等宽时钟）**
    - **定位**：桌面 Widget 必备基础；
    - **现代排版**：32px 极简大时钟（`tabular-nums`），带秒跳呼吸微点，农历/公历双排；
    - **标准尺寸**：`Small (4×3)`。
13. 🌟 **`external-weather-open-meteo`（本地微气候天气）**
    - **定位**：基于 Open-Meteo 开源免鉴权的气候感知；
    - **现代排版**：气温大字（如 `21°C`）+ 柔和天气 SVG 矢量图示，低饱和天蓝色微底；
    - **标准尺寸**：`Small (4×3)`。
14. 🌟 **`on-this-day`（往年今日）**
    - **定位**：知识穿越与灵感共鸣；
    - **现代排版**：年份徽标 + 历史上的同一天笔记摘录；
    - **标准尺寸**：`Medium (6×3)`。
15. 🌟 **`note-stats`（知识库统计大屏）**
    - **定位**：宏观掌控个人数字花园规模；
    - **现代排版**：文档总数、内容块数、总字数三列紧凑指标栏；
    - **标准尺寸**：`Medium (6×3)` 或 `Wide (12×3)`。
16. 🌟 **`database-list`（多维数据库总览）**
    - **定位**：思源原生属性视图（AV）集合；
    - **现代排版**：属性图标 + 行记录数 + 一键直达表格；
    - **标准尺寸**：`Medium (6×3)`。
17. 🌟 **`tags`（高频标签云）**
    - **定位**：高频知识标签网格；
    - **现代排版**：圆角胶囊标签，支持点击在切换器中穿透检索；
    - **标准尺寸**：`Small (4×3)` 或 `Medium (6×3)`。
18. 🌟 **`bookmarks`（重要文档书签）**
    - **定位**：重要文档锚点集合；
    - **现代排版**：纯金书签图标 + 紧凑列表；
    - **标准尺寸**：`Small (4×3)` 或 `Medium (6×3)`。

---

## 三、 向下兼容与数据安全机制

1. **已存实例（Persisted Instances）保护**：
   - 用户以前如果添加了被裁撤的组件，在加载时由 `normalizeHomeState` 自动过滤或映射为对应的精品替代项，绝不抛出任何未捕获异常；
2. **默认播种布局（Default Layout Seed）**：
   - 首次打开工作台时，精选播种 **6 款经典组合**：
     - `external-local-time` (Small) + `checkin-streak` (Small) + `recent-documents` (Wide)
     - `today-tasks` (Medium) + `today-journal` (Small) + `year-progress` (Small)
   - 形成错落有致、开箱即惊艳的 Apple Bento 现代美学。
