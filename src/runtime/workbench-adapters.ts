import {getActiveTab} from "siyuan";
import {buildPinnedDocsSnapshot, normalizePinnedDocsConfig, buildInboxSnapshot, normalizeInboxConfig, buildTodayJournalSnapshot, normalizeTodayJournalConfig, buildTodayReservationsSnapshot, normalizeTodayReservationsConfig, buildRecentUpdatesSnapshot, buildDataHealthSnapshot, buildHostRecentDocsSnapshot, buildDatabaseListSnapshot, normalizeDatabaseListConfig, buildSavedSearchesSnapshot, buildAvTableSnapshot, normalizeAvTableConfig, buildAvBoardSnapshot, normalizeAvBoardConfig, buildRandomReviewSnapshot, normalizeRandomReviewConfig, buildRecentEditsSnapshot, normalizeRecentEditsConfig, buildOutlineWidgetSnapshot, buildDocumentRelationsSnapshot, buildTagListSnapshot, buildBookmarkListSnapshot, buildOnThisDaySnapshot, normalizeOnThisDayConfig, buildRecentDailyNotesSnapshot, normalizeRecentDailyNotesConfig, buildJournalMonthlySnapshot, normalizeJournalMonthlyConfig, buildTodayTasksSnapshot, normalizeTodayTasksConfig, buildFlashcardDueSnapshot, normalizeFlashcardDueConfig, buildFlashcardReviewSnapshot, normalizeFlashcardReviewConfig, normalizeJournalCalendarConfig, normalizeNoteStatsConfig, buildNoteStatsSnapshot, normalizeTodayWritingConfig, buildTodayWritingSnapshot, normalizeRecentWritingActivityConfig, buildRecentWritingActivitySnapshot, normalizeWritingStreakConfig, buildWritingStreakSnapshot} from "../kernel-widget-model";
import {favoriteDocumentIdsForProbe, buildFavoritesWidgetSnapshot, buildDocumentSetsWidgetSnapshot, normalizeFixedDocumentConfig, buildFixedDocumentSnapshot} from "../document-widget-model";
import {buildQuickCaptureAction, buildPluginCommandsSnapshot} from "../home-model";
import {registerExternalHomeAdapters} from "../home-external-adapters";
import {buildYearProgressSnapshot, buildCountdownSnapshot} from "../local-time-model";
import {mergeHolidayPayloads, holidayPresentation} from "../life-widget-model";
import {loadHolidayYear} from "../life-widget-network";
import {flattenOutline, normalizeAgentNotebookId, buildNotebookBoxScope} from "../agent-capabilities";
import {BLOCK_ID_RE} from "../constants";
import {type ISpeedSwitchHost} from "./plugin-types";

export interface WorkbenchAdaptersRuntime extends Omit<ISpeedSwitchHost, "registerBuiltinHomeAdapters" | "taskWindowStart"> {}
export class WorkbenchAdaptersRuntime {
    // 内置只读适配器：面板数据全部来自插件既有领域数据（最近/收藏/日记/文档集/指定文档）。
    // 注册定义覆盖 home-model DEFAULT_MODULES 的同名项（标题随 i18n）。
    private registerBuiltinHomeAdapters() {
        const register = (
            moduleId: string,
            title: string,
            icon: string,
            description: string,
            refreshOn: string[],
            read: (config: Record<string, unknown>, device?: string, context?: {size?: string; signal?: AbortSignal | null}) => any | Promise<any>,
            policies: {timeoutMs?: number; cacheTtlMs?: number} = {},
            source?: {pluginId?: string; name?: string; icon?: string; version?: string; homepage?: string; collection?: string; order?: number},
        ) => {
            const result = this.workbench.registerAdapter({
                moduleId, title, icon, description, category: "siyuan", builtin: true,
                supportedDevices: ["desktop", "sidebar", "mobile"],
                refreshOn,
                read,
                ...policies,
                ...(source ? {source} : {}),
            });
            if (result.registered) this.homeBuiltinAdapterIds.add(moduleId);
        };
        register("recent-documents", this.i18n.homeRecentDocuments, "iconHistory", this.i18n.homeDescRecent, ["switch-protyle", "loaded-protyle", "destroy-protyle"], async (config) => {
            const json = await this.fetchKernelJson("/api/storage/getRecentDocs", {});
            const labels = {
                title: this.i18n.homeRecentDocuments, empty: this.i18n.homeHostRecentEmpty, stat: this.i18n.homeUnitDocs,
                today: this.i18n.homeRecentToday, yesterday: this.i18n.homeRecentYesterday,
                unavailable: this.i18n.homeRecentUnavailable,
            };
            const recent = buildHostRecentDocsSnapshot(json, config, labels);
            if (!recent) throw new Error("invalid_recent_documents");
            const ids = recent.items.map((item: {value?: string}) => String(item.value || "")).filter((id: string) => BLOCK_ID_RE.test(id));
            if (ids.length === 0) return recent;
            const quoted = ids.map((id: string) => `'${id}'`).join(",");
            const metadata = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT id FROM blocks WHERE type='d' AND id IN (${quoted}) LIMIT 12`,
            });
            if (!Array.isArray(metadata?.data)) throw new Error("invalid_recent_documents_metadata");
            const availableIds = new Set(metadata.data.map((row: {id?: string}) => String(row?.id || "")));
            return buildHostRecentDocsSnapshot(json, config, labels, Date.now(), "fresh", availableIds);
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        register("favorites", this.i18n.homeFavorites, "iconStar", this.i18n.homeDescFav, ["switch-protyle", "loaded-protyle", "destroy-protyle"], async (config) => {
            const favorites = this.getFavorites();
            const documentIds = favoriteDocumentIdsForProbe(favorites, config);
            let documents: unknown[] = [];
            if (documentIds.length > 0) {
                const quoted = documentIds.map((id) => `'${id}'`).join(",");
                const json = await this.fetchKernelJson("/api/query/sql", {
                    stmt: `SELECT id, content, hpath FROM blocks WHERE type='d' AND id IN (${quoted}) LIMIT 12`,
                });
                if (!Array.isArray(json?.data)) throw new Error("invalid_favorite_documents");
                documents = json.data;
            }
            const tabs = this.currentTabs();
            const openedKeys = new Set(tabs.map((tab) => this.pinKeyOf(tab)));
            return buildFavoritesWidgetSnapshot(favorites, documents, openedKeys, config, {
                title: this.i18n.homeFavorites,
                stat: this.i18n.homeStatFavorites,
                empty: this.i18n.homeFavoritesEmpty,
                emptyGroup: this.i18n.homeFavoritesGroupEmpty,
                emptyAvailable: this.i18n.homeFavoritesAvailableEmpty,
                ungrouped: this.i18n.homeFavoritesUngrouped,
                unavailable: this.i18n.homeFavoritesUnavailable,
                sessionOnly: this.i18n.homeFavoritesSessionOnly,
            });
        }, {timeoutMs: 1200, cacheTtlMs: 0});
        register("today-journal", this.i18n.homeTodayJournal, "iconCalendar", this.i18n.homeDescJournal, ["switch-protyle", "loaded-protyle"], async (config) => {
            const normalized = normalizeTodayJournalConfig(config);
            const notebook = normalizeAgentNotebookId(config.notebook);
            const journalAction = notebook ? `action:journal:${notebook}` : "action:journal";
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            const compactToday = today.replace(/-/g, "");
            const notebookScope = buildNotebookBoxScope(notebook, "d");
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT d.id, d.content, d.hpath, d.updated, a.name AS daily_attr, COALESCE((SELECT SUM(CASE WHEN c.type<>'d' THEN c.length ELSE 0 END) FROM blocks c WHERE c.root_id=d.id), 0) AS characters FROM blocks d LEFT JOIN attributes a ON a.block_id=d.id AND a.name='custom-dailynote-${compactToday}' WHERE d.type='d'${notebookScope} AND (d.content LIKE '${today}%' OR a.name IS NOT NULL) ORDER BY d.updated DESC LIMIT 4`,
            });
            const snapshot = buildTodayJournalSnapshot(json?.data, {...normalized, notebook}, {
                title: this.i18n.homeTodayJournal,
                open: this.i18n.homeTodayJournalOpen,
                create: this.i18n.homeTodayJournalCreate,
                characters: this.i18n.homeTodayJournalCharacters,
                action: journalAction,
            }, now.getTime());
            if (!snapshot) throw new Error("invalid_today_journal");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 0});
        register("document-sets", this.i18n.homeDocumentSets, "iconLayout", this.i18n.homeDescDocSets, ["loaded-protyle", "destroy-protyle"], (config) =>
            buildDocumentSetsWidgetSnapshot(this.getDocumentSets(), config, {
                title: this.i18n.homeDocumentSets,
                stat: this.i18n.homeStatDocSets,
                documents: this.i18n.homeUnitDocs,
                empty: this.i18n.homeDocumentSetsEmpty,
            }), {cacheTtlMs: 0});
        register("fixed-document", this.i18n.homeFixedDocument, "iconFile", this.i18n.homeDescFixed, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeFixedDocumentConfig(config);
            if (!normalized.docId) return buildFixedDocumentSnapshot([], normalized, {
                configure: this.i18n.homeFixedDocumentConfigHint,
                unavailable: this.i18n.homeFixedDocumentUnavailable,
                reconfigure: this.i18n.homeFixedDocumentReconfigureHint,
            });
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT id, content, hpath FROM blocks WHERE type='d' AND id='${normalized.docId.replace(/'/g, "''")}' LIMIT 1`,
            });
            if (!Array.isArray(json?.data)) throw new Error("invalid_fixed_document");
            return buildFixedDocumentSnapshot(json.data, normalized, {
                configure: this.i18n.homeFixedDocumentConfigHint,
                unavailable: this.i18n.homeFixedDocumentUnavailable,
                reconfigure: this.i18n.homeFixedDocumentReconfigureHint,
            });
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        // 今日待办：默认读取“今日日记”文档中的任务块；开启全库扫描后才扩大到
        // 最近窗口内的全库任务。旧实现默认扫描当前打开文档，既不代表“今天”，
        // 也会让日记里的任务在未打开时完全消失。
        register("today-tasks", this.i18n.homeTodayTasks, "iconCheck", this.i18n.homeDescTasks, ["switch-protyle", "loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeTodayTasksConfig(config);
            const scanAll = normalized.allDocuments;
            const notebookFilter = normalizeAgentNotebookId(normalized.notebook);
            const since = this.taskWindowStart(normalized.days);
            // 显示已完成时同时匹配未勾选与已勾选（含大写 X）；否则只看未完成任务
            // 思源任务的规范数据库形态是列表项 type='i' / subtype='t'；
            // markdown 前缀可能是 "* [ ]"、"- [ ]" 等，SQL 只做宽门槛，
            // 最终由纯投影模型再次确认 checkbox。
            const stateCondition = normalized.showCompleted
                ? `(markdown LIKE '%[ ]%' OR markdown LIKE '%[x]%' OR markdown LIKE '%[X]%')`
                : `markdown LIKE '%[ ]%'`;
            const today = new Date();
            const pad = (value: number) => String(value).padStart(2, "0");
            const todayTitle = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
            const todayAttr = `custom-dailynote-${todayTitle.replace(/-/g, "")}`;
            const escapedNotebook = notebookFilter.split("'").join("''");
            const notebookScope = notebookFilter ? ` AND d.box='${escapedNotebook}'` : "";
            // 默认范围优先使用思源今日日记属性，日期标题仅作为旧数据的兼容回退。
            // 全库模式保留旧的时间窗语义，避免一次性扫描超大工作空间。
            const scope = scanAll
                ? `${notebookFilter ? ` AND b.box='${escapedNotebook}'` : ""} AND b.updated >= '${since}'`
                : ` AND (d.id IN (SELECT block_id FROM attributes WHERE name='${todayAttr}') OR d.content LIKE '${todayTitle}%')${notebookScope}`;
            const fromClause = "blocks b JOIN blocks d ON d.id=b.root_id AND d.type='d'";
            const escapedQuery = normalized.query.split("'").join("''");
            const queryScope = escapedQuery
                ? ` AND instr(lower(COALESCE(b.content,'') || char(10) || COALESCE(d.content,'') || char(10) || COALESCE(d.hpath,'')), lower('${escapedQuery}')) > 0`
                : "";
            const orderBy = normalized.sortBy === "文档名称"
                ? "d.content COLLATE NOCASE ASC, b.created ASC"
                : "b.updated DESC";
            const [json, countJson] = await Promise.all([
                this.fetchKernelJson("/api/query/sql", {
                    stmt: `SELECT b.id, b.content, b.markdown, b.updated, d.content AS document_title, d.hpath FROM ${fromClause} WHERE b.type='i' AND b.subtype='t' AND ${stateCondition.replace(/\bmarkdown\b/g, "b.markdown")}${scope}${queryScope} ORDER BY ${orderBy} LIMIT 48`,
                }),
                this.fetchKernelJson("/api/query/sql", {
                    stmt: `SELECT COUNT(*) AS total FROM ${fromClause} WHERE b.type='i' AND b.subtype='t' AND ${stateCondition.replace(/\bmarkdown\b/g, "b.markdown")}${scope}${queryScope}`,
                }),
            ]);
            const total = Math.max(0, Number((countJson?.data || [])[0]?.total) || 0);
            const snapshot = buildTodayTasksSnapshot({data: json?.data, total}, normalized, {
                title: this.i18n.homeTodayTasks,
                stat: this.i18n.homeStatTasks,
                empty: !scanAll ? `今天（${todayTitle}）还没有可显示的待办` : this.i18n.homeTasksEmpty,
                emptyFiltered: this.i18n.homeTasksFilteredEmpty,
            });
            if (!snapshot) throw new Error("invalid_today_tasks");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        // 标签：getTag，点击打开思源标签面板（data 在 3.8.x 内核直接是数组，兼容旧的 data.tags 包装）
        register("tags", this.i18n.homeTags, "iconTags", this.i18n.homeDescTags, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const json = await this.fetchKernelJson("/api/tag/getTag", {});
            const tags = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.tags) ? json.data.tags : (json?.code === 0 && json?.data === null ? [] : null);
            const snapshot = buildTagListSnapshot(tags, config, {
                title: this.i18n.homeTags, stat: this.i18n.homeStatTags, blocks: this.i18n.homeUnitBlocks,
                empty: this.i18n.homeTagsEmpty, emptyFiltered: this.i18n.homeTagsFilteredEmpty,
            });
            if (!snapshot) throw new Error("invalid_tags");
            return snapshot;
        }, {timeoutMs: 2500, cacheTtlMs: 2000});
        // 书签：getBookmark，点击打开思源书签面板（data 直接是数组；无 count 时回退 blocks 数）
        register("bookmarks", this.i18n.homeBookmarks, "iconBookmark", this.i18n.homeDescBookmarks, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const json = await this.fetchKernelJson("/api/bookmark/getBookmark", {});
            const bookmarks = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.bookmarks) ? json.data.bookmarks : (json?.code === 0 && json?.data === null ? [] : null);
            const snapshot = buildBookmarkListSnapshot(bookmarks, config, {
                title: this.i18n.homeBookmarks, stat: this.i18n.homeStatBookmarks, blocks: this.i18n.homeUnitBlocks,
                empty: this.i18n.homeBookmarksEmpty, emptyFiltered: this.i18n.homeBookmarksFilteredEmpty,
                emptyEntry: this.i18n.homeBookmarkEmptyEntry,
            });
            if (!snapshot) throw new Error("invalid_bookmarks");
            return snapshot;
        }, {timeoutMs: 2500, cacheTtlMs: 2000});
        // 月度日记：兼容官方日记属性与日期标题，可浏览前后 24 个月；当月保留“打开今日日记”入口。
        register("journal-monthly", this.i18n.homeJournalMonthly, "iconCalendar", this.i18n.homeDescJournalMonthly, ["switch-protyle", "loaded-protyle"], async (config) => {
            const normalized = normalizeJournalMonthlyConfig(config);
            const now = new Date();
            const target = new Date(now.getFullYear(), now.getMonth() + normalized.monthOffset, 1);
            const prefix = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
            const next = new Date(target.getFullYear(), target.getMonth() + 1, 1);
            const nextPrefix = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
            const attrPrefix = `custom-dailynote-${prefix.replace("-", "")}`;
            const maxDay = String(new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()).padStart(2, "0");
            const notebook = normalizeAgentNotebookId(normalized.notebook);
            const notebookScope = buildNotebookBoxScope(notebook, "b");
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT b.id, b.root_id, b.content, b.hpath, b.updated, a.name AS daily_attr, COALESCE((SELECT SUM(CASE WHEN c.type<>'d' THEN c.length ELSE 0 END) FROM blocks c WHERE c.root_id=b.id), 0) AS characters, COUNT(*) OVER() AS total_count FROM blocks b LEFT JOIN attributes a ON a.block_id=b.id AND a.name BETWEEN '${attrPrefix}01' AND '${attrPrefix}${maxDay}' WHERE b.type='d'${notebookScope} AND (a.name IS NOT NULL OR (b.content >= '${prefix}-01' AND b.content < '${nextPrefix}-01')) ORDER BY b.updated DESC LIMIT 48`,
            });
            const snapshot = buildJournalMonthlySnapshot(json?.data, {...normalized, notebook}, {
                monthTitle: this.i18n.homeCalendarMonthFormat,
                todayAction: this.i18n.homeTodayJournalOpen,
                stat: this.i18n.homeStatMonthlyJournals,
                characters: this.i18n.homeTodayJournalCharacters,
                streak: this.i18n.homeMonthlyJournalStreak,
                empty: this.i18n.homeJournalMonthlyEmpty,
            }, now.getTime());
            if (!snapshot) throw new Error("invalid_journal_monthly");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1500});
        // 笔记统计：单次聚合全库规模与两个相邻时间窗，避免四次查询产生口径漂移。
        register("note-stats", this.i18n.homeNoteStats, "iconGraph", this.i18n.homeDescNoteStats, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeNoteStatsConfig(config);
            const notebookScope = buildNotebookBoxScope(normalized.notebook);
            const current = new Date();
            current.setHours(0, 0, 0, 0);
            current.setDate(current.getDate() - (normalized.days - 1));
            const previous = new Date(current.getFullYear(), current.getMonth(), current.getDate() - normalized.days);
            const kernelStamp = (date: Date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}000000`;
            const currentStart = kernelStamp(current);
            const previousStart = kernelStamp(previous);
            const json = await this.fetchKernelJson("/api/query/sql", {stmt: `SELECT COUNT(CASE WHEN type='d' THEN 1 END) AS docs, COALESCE(SUM(CASE WHEN type<>'d' THEN length ELSE 0 END), 0) AS chars, COUNT(CASE WHEN type='d' AND created >= '${currentStart}' THEN 1 END) AS created, COUNT(CASE WHEN type='d' AND updated >= '${currentStart}' AND created < '${currentStart}' THEN 1 END) AS updated, COUNT(CASE WHEN type='d' AND created >= '${previousStart}' AND created < '${currentStart}' THEN 1 END) AS previous_created, COUNT(CASE WHEN type='d' AND updated >= '${previousStart}' AND updated < '${currentStart}' AND created < '${previousStart}' THEN 1 END) AS previous_updated FROM blocks WHERE 1=1${notebookScope}`});
            const row = (json?.data || [])[0];
            // T-6682 写作强度（opt-in）：仅在启用时追加一条按日有界查询（≤2×窗口行），
            // 模型层以同一指数平滑口径（半衰期 14 天）计算强度；关闭时零额外请求
            let daily: Array<{day: string; created: number; updated: number}> | undefined;
            if (normalized.showStrength) {
                const dailyJson = await this.fetchKernelJson("/api/query/sql", {stmt: `SELECT substr(created, 1, 8) AS day, COUNT(CASE WHEN type='d' THEN 1 END) AS created, COUNT(CASE WHEN type<>'d' THEN 1 END) AS updated FROM blocks WHERE created >= '${previousStart}'${notebookScope} GROUP BY substr(created, 1, 8) ORDER BY day LIMIT ${normalized.days * 2}`});
                daily = (dailyJson?.data || []) as Array<{day: string; created: number; updated: number}>;
            }
            const snapshot = buildNoteStatsSnapshot(row ? {
                docs: row.docs, chars: row.chars, created: row.created, updated: row.updated,
                previousCreated: row.previous_created, previousUpdated: row.previous_updated,
                daily,
            } : null, normalized, {
                title: this.i18n.homeNoteStats, documents: this.i18n.homeUnitDocs,
                characters: this.i18n.homeCharEstimate, created: this.i18n.homeWritingNewDocs,
                updated: this.i18n.homeWritingEditedDocs, trendUp: this.i18n.homeWritingTrendUp,
                trendDown: this.i18n.homeWritingTrendDown, trendFlat: this.i18n.homeWritingTrendFlat,
                trendNew: this.i18n.homeWritingTrendNew,
                strength: this.i18n.homeWritingStrength, strengthHalfLife: this.i18n.homeWritingStrengthHalfLife,
            });
            if (!snapshot) throw new Error("invalid_note_stats");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        // 年度进度：纯前端计算（已过天数 / 剩余天数 / 百分比），带进度条；日历日语义在模型内固定
        register("year-progress", this.i18n.homeYearProgress, "iconRefresh", this.i18n.homeDescYearProgress, [], (config, _device, context) => {
            const snapshot = buildYearProgressSnapshot(new Date(), config, {
                elapsed: this.i18n.homeYearElapsed, remaining: this.i18n.homeYearRemaining,
            });
            // xs 紧凑密度：只保留主进度，不铺两条明细
            if (context && context.size === "xs") return {...snapshot, items: []};
            return snapshot;
        });
        // 外部服务组件（13 个 external-* 适配器）的注册定义外迁至 home-external-adapters
        // （R2 重构 D-375）：register 闭包原样传入，宿主经 this 绑定提供 i18n 与内核代理
        // fetch；新增外部组件改在 home-external-adapters.ts 登记，index.ts 不再随之增长。
        registerExternalHomeAdapters.call(this, register);
        // 近期编辑：全库最近修改的文档列表，点击直达
        register("recent-edits", this.i18n.homeRecentEdits, "iconEdit", this.i18n.homeDescRecentEdits, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeRecentEditsConfig(config);
            const notebookScope = buildNotebookBoxScope(normalized.notebook);
            const since = this.taskWindowStart(normalized.days);
            const keywordScope = normalized.query ? ` AND (content LIKE '%${normalized.query}%' OR hpath LIKE '%${normalized.query}%')` : "";
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT id, content, hpath, updated, COUNT(*) OVER() AS total_count FROM blocks WHERE type='d'${notebookScope} AND updated >= '${since}'${keywordScope} ORDER BY updated DESC LIMIT ${normalized.limit}`,
            });
            const snapshot = buildRecentEditsSnapshot(json?.data, normalized, {
                title: this.i18n.homeRecentEdits, empty: this.i18n.homeRecentEditsEmpty,
                emptyFiltered: this.i18n.homeRecentEditsFilteredEmpty, stat: this.i18n.homeUnitDocs,
            });
            if (!snapshot) throw new Error("invalid_recent_edits");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        // 闪卡待复习：笔记本级到期闪卡（只读）；限定单本显示卡片列表，全部笔记本显示到期数分布
        register("flashcard-due", this.i18n.homeFlashcardDue, "iconClock", this.i18n.homeDescFlashcardDue, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeFlashcardDueConfig(config);
            const notebookFilter = normalizeAgentNotebookId(normalized.notebook);
            if (notebookFilter) {
                const [json, notebookList] = await Promise.all([
                    this.fetchKernelJson("/api/riff/getNotebookRiffDueCards", {notebook: notebookFilter}),
                    this.loadNotebooks(),
                ]);
                const due = Number(json?.data?.unreviewedCount) || 0;
                const blockIds = ((json?.data?.cards || []) as Array<{blockID?: string}>)
                    .map((card) => String(card?.blockID || ""))
                    .filter((id) => BLOCK_ID_RE.test(id))
                    .slice(0, normalized.limit);
                const cardRows = blockIds.length > 0 ? (((await this.fetchKernelJson("/api/query/sql", {
                    stmt: `SELECT b.id, b.content, b.root_id, d.hpath FROM blocks b LEFT JOIN blocks d ON d.id=b.root_id AND d.type='d' WHERE b.id IN ('${blockIds.join("','")}') LIMIT ${normalized.limit}`,
                }))?.data || []) as Array<{id: string; content: string; root_id: string; hpath?: string}>) : [];
                const order = new Map(blockIds.map((id, index) => [id, index]));
                cardRows.sort((left, right) => (order.get(left.id) ?? blockIds.length) - (order.get(right.id) ?? blockIds.length));
                const snapshot = buildFlashcardDueSnapshot({
                    mode: "cards", data: cardRows, total: due,
                    notebookName: notebookList.find((entry) => entry.id === notebookFilter)?.name || "",
                }, normalized, {
                    title: this.i18n.homeFlashcardDue, stat: this.i18n.homeStatFlashcards,
                    reviewAction: this.i18n.homeFlashcardReviewAction,
                    emptyCards: this.i18n.homeFlashcardEmpty,
                });
                if (!snapshot) throw new Error("invalid_flashcard_due");
                return snapshot;
            }
            const notebooks = (await this.loadNotebooks()).slice(0, 12);
            const counts: Array<{id: string; label: string; count: number}> = [];
            // 大型工作区最多读取 12 本且每批并发 4 个，避免瞬时打满 riff 端点。
            for (let index = 0; index < notebooks.length; index += 4) {
                const chunk = await Promise.all(notebooks.slice(index, index + 4).map(async (nb) => {
                    const json = await this.fetchKernelJson("/api/riff/getNotebookRiffDueCards", {notebook: nb.id});
                    return {id: nb.id, label: nb.name, count: Number(json?.data?.unreviewedCount) || 0};
                }));
                counts.push(...chunk);
            }
            const total = counts.reduce((sum, entry) => sum + entry.count, 0);
            const snapshot = buildFlashcardDueSnapshot({mode: "notebooks", data: counts, total}, normalized, {
                title: this.i18n.homeFlashcardDue, stat: this.i18n.homeStatFlashcards,
                reviewAction: this.i18n.homeFlashcardReviewAction,
                emptyNotebooks: this.i18n.homeFlashcardEmpty,
            });
            if (!snapshot) throw new Error("invalid_flashcard_due");
            return snapshot;
        }, {timeoutMs: 2500, cacheTtlMs: 2000});
        // 随机回顾：抽取 N 天未更新的旧文档（SQLite random()，只读）；仅手动刷新重抽，不订阅事件
        register("random-review", this.i18n.homeRandomReview, "iconDice", this.i18n.homeDescRandomReview, [], async (config) => {
            const normalized = normalizeRandomReviewConfig(config);
            const cutoff = this.taskWindowStart(normalized.days);
            // 精确父文档范围优先于笔记本范围，避免两项配置冲突时产生难以解释的空结果。
            const notebookScope = normalized.parentDocument ? "" : buildNotebookBoxScope(normalized.notebook);
            const parentId = normalized.parentDocument;
            const parentScope = parentId ? ` AND path LIKE '%/${parentId}.sy/%'` : "";
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT id, content, hpath, COUNT(*) OVER() AS total_count FROM blocks WHERE type='d'${notebookScope}${parentScope} AND updated < '${cutoff}' ORDER BY random() LIMIT ${normalized.limit}`,
            });
            return buildRandomReviewSnapshot(json, normalized, {
                title: this.i18n.homeRandomReview,
                stat: this.i18n.homeRandomReviewCandidates,
                empty: this.i18n.homeRandomReviewEmpty,
                emptyScoped: this.i18n.homeRandomReviewScopedEmpty,
            }) || {items: [], emptyHint: this.i18n.homeRandomReviewEmpty};
        }, {timeoutMs: 1500, cacheTtlMs: 15000});
        // 剪藏待读由剪藏插件通过同一 moduleId 提供；宿主只保留 blocked 占位，避免把普通标签误判为剪藏数据。
        register("clipped-unread", this.i18n.homeClippedUnread, "iconBookmark", this.i18n.homeDescClippedUnread, ["loaded-protyle", "destroy-protyle"], async () => ({
            status: "blocked", items: [], emptyHint: this.i18n.homeClippedProviderMissing,
        }), {timeoutMs: 400, cacheTtlMs: 0});
        // 往年今日：同月同日的往年日记/文档（照片"回忆"风格）
        register("on-this-day", this.i18n.homeOnThisDay, "iconClock", this.i18n.homeDescOnThisDay, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const now = new Date();
            const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            const thisYear = String(now.getFullYear());
            const normalized = normalizeOnThisDayConfig(config);
            const notebookScope = buildNotebookBoxScope(normalized.notebook);
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT id, content, hpath FROM blocks WHERE type='d'${notebookScope} AND content GLOB '20[0-9][0-9]-${mmdd}*' AND content NOT GLOB '${thisYear}-${mmdd}*' ORDER BY content DESC LIMIT 64`,
            });
            const snapshot = buildOnThisDaySnapshot(json?.data, normalized, {
                title: this.i18n.homeOnThisDay, stat: this.i18n.homeStatOnThisDay, empty: this.i18n.homeOnThisDayEmpty,
            });
            if (!snapshot) throw new Error("invalid_on_this_day");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1500});
        // 今日写作：一次聚合读取新增字符/块和文档变化，并按可配置目标投影进度。
        register("today-writing", this.i18n.homeTodayWriting, "iconEdit", this.i18n.homeDescTodayWriting, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeTodayWritingConfig(config);
            const now = new Date();
            const start = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}000000`;
            const notebookScope = buildNotebookBoxScope(normalized.notebook);
            const json = await this.fetchKernelJson("/api/query/sql", {stmt: `SELECT COALESCE(SUM(CASE WHEN type<>'d' AND created >= '${start}' THEN length ELSE 0 END), 0) AS chars, COUNT(CASE WHEN type<>'d' AND created >= '${start}' THEN 1 END) AS blocks, COUNT(CASE WHEN type='d' AND created >= '${start}' THEN 1 END) AS created_docs, COUNT(CASE WHEN type='d' AND updated >= '${start}' AND created < '${start}' THEN 1 END) AS updated_docs FROM blocks WHERE 1=1${notebookScope}`});
            const row = (json?.data || [])[0];
            const snapshot = buildTodayWritingSnapshot(row ? {
                chars: row.chars, blocks: row.blocks, createdDocs: row.created_docs, updatedDocs: row.updated_docs,
            } : null, normalized, {
                title: this.i18n.homeTodayWriting, characters: this.i18n.homeWritingNewChars,
                blocks: this.i18n.homeWritingNewBlocks, createdDocs: this.i18n.homeWritingNewDocs,
                updatedDocs: this.i18n.homeWritingEditedDocs, zero: this.i18n.homeTodayWritingZero,
                active: this.i18n.homeTodayWritingActive,
            });
            if (!snapshot) throw new Error("invalid_today_writing");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        // 写作打卡：按用户选择的每日阈值计算连续天数、断档提示与可配置周起始日。
        register("writing-streak", this.i18n.homeWritingStreak, "iconCheck", this.i18n.homeDescWritingStreak, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeWritingStreakConfig(config);
            const since = this.taskWindowStart(normalized.windowDays - 1);
            const notebookScope = buildNotebookBoxScope(normalized.notebook);
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT substr(created, 1, 8) AS day, COUNT(*) AS blocks, COALESCE(SUM(length), 0) AS chars FROM blocks WHERE type<>'d' AND created >= '${since}'${notebookScope} GROUP BY substr(created, 1, 8) ORDER BY day DESC LIMIT ${normalized.windowDays}`,
            });
            const snapshot = buildWritingStreakSnapshot(json?.data, normalized, {
                title: this.i18n.homeWritingStreak, weekdays: this.i18n.homeCalendarWeekdays,
                streak: this.i18n.homeStatStreakDays, pending: this.i18n.homeStreakPending,
                gap: this.i18n.homeStreakGap,
                weeklyStreak: this.i18n.homeStatStreakWeeks, weeklyPending: this.i18n.homeStreakWeeklyPending,
            });
            if (!snapshot) throw new Error("invalid_writing_streak");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        // 倒数日：手动设定目标日期（纪念日/DDL），显示剩余或已过天数；支持每年重复与倒数/累计双模式
        register("countdown", this.i18n.homeCountdown, "iconClock", this.i18n.homeDescCountdown, ["loaded-protyle"], (config) => {
            return buildCountdownSnapshot(new Date(), config, {
                hint: this.i18n.homeCountdownHint, untitled: this.i18n.homeCountdown,
                remaining: this.i18n.homeCountdownRemaining, today: this.i18n.homeCountdownToday,
                passed: this.i18n.homeCountdownPassed, yearly: this.i18n.homeCountdownYearly,
                elapsedDays: this.i18n.homeCountdownElapsed,
            });
        });
        // 日历月视图：本月日历网格（周一开头），有日记的日期可点击直达
        register("journal-calendar", this.i18n.homeJournalCalendar, "iconCalendar", this.i18n.homeDescJournalCalendar, ["loaded-protyle"], async (config, _device, context) => {
            const normalized = normalizeJournalCalendarConfig(config);
            const now = new Date();
            const base = new Date(now.getFullYear(), now.getMonth() + normalized.monthOffset, 1);
            const year = base.getFullYear();
            const month = base.getMonth();
            const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
            const attrPrefix = `custom-dailynote-${year}${String(month + 1).padStart(2, "0")}`;
            const notebookScope = buildNotebookBoxScope(normalized.notebook, "b");
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT b.id, b.content, b.updated, a.name AS daily_attr FROM blocks b LEFT JOIN attributes a ON a.block_id=b.id AND a.name GLOB '${attrPrefix}[0-3][0-9]' WHERE b.type='d'${notebookScope} AND (a.name IS NOT NULL OR b.content LIKE '${prefix}%') ORDER BY b.updated DESC, b.id ASC LIMIT 200`,
            });
            // Hoist both matchers: they depend only on the month prefix, so
            // compiling them per row would rebuild identical regexes up to the query
            // limit (200) times on every calendar render.
            const attrRe = new RegExp(`^${attrPrefix}(\\d{2})$`);
            const titleRe = new RegExp(`^${prefix}(\\d{2})(?:\\D|$)`);
            const journalByDay = new Map<string, string>();
            ((json?.data || []) as Array<{id: string; content: string; daily_attr?: string}>).forEach((row) => {
                const attrMatch = String(row.daily_attr || "").match(attrRe);
                const titleMatch = String(row.content).match(titleRe);
                const day = Number(attrMatch?.[1] || titleMatch?.[1] || 0);
                if (day >= 1 && day <= 31 && !journalByDay.has(String(day))) journalByDay.set(String(day), row.id);
            });
            const firstWeekday = new Date(year, month, 1).getDay();
            const leadingBlanks = normalized.weekStart === "周日" ? firstWeekday : (firstWeekday + 6) % 7;
            const showLunar = normalized.showLunar;
            const lunarFormatter = showLunar ? (() => {
                try {
                    return new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {month: "numeric", day: "numeric"});
                } catch (_) {
                    return null;
                }
            })() : null;
            const gridStart = new Date(year, month, 1 - leadingBlanks);
            const gridDates = Array.from({length: 42}, (_unused, index) =>
                new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
            let holidays = new Map<string, {date: string; name: string; isOffDay: boolean}>();
            if (normalized.showHolidays) {
                // holiday-cn 说明 12 月日期可能由下一年度公告修订，因此网格涉及的每个
                // 年份同时检查其下一年度文件；最多三个年度请求且均受 24 小时缓存约束。
                const yearSet = new Set<number>();
                gridDates.forEach((date) => {
                    yearSet.add(date.getFullYear());
                    yearSet.add(date.getFullYear() + 1);
                });
                const years = [...yearSet].slice(0, 3);
                const payloads = await Promise.all(years.map(async (entryYear) => {
                    try {
                        return await loadHolidayYear(entryYear, {signal: context?.signal});
                    } catch (_) {
                        return null;
                    }
                }));
                holidays = mergeHolidayPayloads(payloads.filter(Boolean));
            }
            const items: Array<{label: string; value: string; done?: boolean; outside?: boolean; secondary?: string; holiday?: string; weekend?: boolean}> = [];
            for (let index = 0; index < 42; index += 1) {
                const date = gridDates[index];
                const inMonth = date.getFullYear() === year && date.getMonth() === month;
                const visible = inMonth || normalized.showAdjacent;
                const dayKey = String(date.getDate());
                const lunar = inMonth && lunarFormatter ? lunarFormatter.format(date).slice(0, 16) : "";
                const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                const holiday = holidayPresentation(holidays.get(isoDate), {work: this.i18n.homeHolidayWork});
                const secondary = visible ? [holiday?.label, lunar].filter(Boolean).join(" · ").slice(0, 32) : "";
                const isToday = date.getFullYear() === now.getFullYear()
                    && date.getMonth() === now.getMonth()
                    && date.getDate() === now.getDate();
                items.push({
                    label: visible ? dayKey : "",
                    value: inMonth ? journalByDay.get(dayKey) || "" : "",
                    ...(visible && isToday ? {done: true} : {}),
                    ...(inMonth ? {} : {outside: true}),
                    ...(secondary ? {secondary} : {}),
                    ...(visible && holiday ? {holiday: holiday.kind} : {}),
                    weekend: date.getDay() === 0 || date.getDay() === 6,
                });
            }
            const title = this.i18n.homeCalendarMonthFormat
                .replace("{year}", String(year))
                .replace("{month}", String(month + 1));
            const weekdays = this.i18n.homeCalendarWeekdays || "一二三四五六日";
            const calendarWeekdays = normalized.weekStart === "周日"
                ? `${weekdays.slice(-1)}${weekdays.slice(0, -1)}`
                : weekdays;
            return {
                title, items, calendarWeekdays,
                calendarOffset: normalized.monthOffset,
                calendarPeriodOptions: Array.from({length: 49}, (_unused, index) => {
                    const offset = index - 24;
                    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
                    return {offset, label: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`};
                }),
                stat: {value: String(journalByDay.size), label: this.i18n.homeStatMonthlyJournals},
            };
        }, {timeoutMs: 2000, cacheTtlMs: 1500});
        // 快速记录：Flomo 式一键记一句到今日日记（点击后弹输入框，需确认追加）
        // 近期写作活跃度：补齐零值日期，支持块/字符口径与最多 14 桶的紧凑密度。
        register("recent-writing-activity", this.i18n.homeRecentWritingActivity, "iconChart", this.i18n.homeDescRecentWritingActivity, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeRecentWritingActivityConfig(config);
            const notebookScope = buildNotebookBoxScope(normalized.notebook);
            const since = this.taskWindowStart(normalized.days - 1);
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT substr(created, 1, 8) AS day, COUNT(*) AS blocks, COALESCE(SUM(length), 0) AS chars FROM blocks WHERE type<>'d' AND created >= '${since}'${notebookScope} GROUP BY substr(created, 1, 8) ORDER BY day ASC LIMIT ${normalized.days}`,
            });
            const snapshot = buildRecentWritingActivitySnapshot(json?.data, normalized, {
                title: this.i18n.homeRecentWritingActivity, blocks: this.i18n.homeStatWritingBlocks,
                characters: this.i18n.homeUnitChars, average: this.i18n.homeWritingDailyAverage,
                empty: this.i18n.homeWritingActivityEmpty,
                strength: this.i18n.homeWritingStrength, strengthHalfLife: this.i18n.homeWritingStrengthHalfLife,
            });
            if (!snapshot) throw new Error("invalid_writing_activity");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        // 近期日记：按日期标题探测已存在的日记，绝不创建缺失日期。
        register("recent-daily-notes", this.i18n.homeRecentDailyNotes, "iconCalendar", this.i18n.homeDescRecentDailyNotes, ["switch-protyle", "loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeRecentDailyNotesConfig(config);
            const notebookScope = buildNotebookBoxScope(normalized.notebook);
            const now = new Date();
            const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (normalized.days - 1));
            const from = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT id, root_id, content, hpath, updated, COALESCE((SELECT SUM(CASE WHEN c.type<>'d' THEN c.length ELSE 0 END) FROM blocks c WHERE c.root_id=blocks.id), 0) AS characters, COUNT(*) OVER() AS total_count FROM blocks WHERE type='d'${notebookScope} AND content GLOB '20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]*' AND content >= '${from}' AND content < '${today}~' ORDER BY content DESC LIMIT 48`,
            });
            const snapshot = buildRecentDailyNotesSnapshot(json?.data, normalized, {
                title: this.i18n.homeRecentDailyNotes, stat: this.i18n.homeStatRecentDaily, empty: this.i18n.homeRecentDailyEmpty,
            });
            if (!snapshot) throw new Error("invalid_recent_daily_notes");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1500});
        // 文档关系摘要：仅查询活动文档的直接子块与引用它的块，限制数量并保持只读。
        register("document-relations-summary", this.i18n.homeDocumentRelationsSummary, "iconGraph", this.i18n.homeDescDocumentRelationsSummary, ["switch-protyle", "loaded-protyle"], async (config, _device, context) => {
            const {rootId, docTitle} = this.resolveActiveWidgetDoc(context);
            if (!rootId || !BLOCK_ID_RE.test(rootId)) return {items: [], emptyHint: this.i18n.homeCurrentDocumentMissing};
            const escaped = rootId.split("'").join("''");
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT id, content, id AS target_id, 'child' AS relation FROM blocks WHERE root_id='${escaped}' AND parent_id='${escaped}' UNION ALL SELECT id, content, root_id AS target_id, 'reference' AS relation FROM blocks WHERE id<>'${escaped}' AND markdown LIKE '%((${escaped}%' ORDER BY relation ASC, id DESC LIMIT 64`,
            });
            const rows = (json?.data || []) as Array<{id?: string; content?: string; target_id?: string; relation?: string}>;
            const snapshot = buildDocumentRelationsSnapshot(rows, config, {
                title: this.i18n.homeDocumentRelationsSummary, stat: this.i18n.homeStatRelations,
                child: this.i18n.homeRelationChild, reference: this.i18n.homeRelationReference,
                referenceCount: this.i18n.homeRelationReferenceCount,
                empty: this.i18n.homeRelationsEmpty, emptyFiltered: this.i18n.homeRelationsFilteredEmpty,
            }, Date.now(), "fresh", docTitle);
            if (!snapshot) throw new Error("invalid_document_relations");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        // 当前文档大纲：复用 Agent 大纲扁平化口径，仅读取活动文档且限制标题数量。
        register("current-document-outline", this.i18n.homeCurrentDocumentOutline, "iconList", this.i18n.homeDescCurrentDocumentOutline, ["switch-protyle", "loaded-protyle"], async (config, _device, context) => {
            const {rootId, docTitle} = this.resolveActiveWidgetDoc(context);
            if (!rootId || !BLOCK_ID_RE.test(rootId)) return {items: [], emptyHint: this.i18n.homeCurrentDocumentMissing};
            // SiYuan 3.8.x only returns the heading tree when preview is enabled;
            // preview=false yields an empty response for the same document id.
            const json = await this.fetchKernelJson("/api/outline/getDocOutline", {id: rootId, preview: true});
            if (!Array.isArray(json?.data)) throw new Error("invalid_document_outline");
            const headings = flattenOutline(json.data, 64);
            const snapshot = buildOutlineWidgetSnapshot(headings, config, {
                title: this.i18n.homeCurrentDocumentOutline, stat: this.i18n.homeStatOutlineHeadings,
                level: this.i18n.homeOutlineLevel, empty: this.i18n.homeOutlineEmpty,
                emptyFiltered: this.i18n.homeOutlineFilteredEmpty,
            }, Date.now(), "fresh", docTitle);
            if (!snapshot) throw new Error("invalid_document_outline");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        // 近期预约：复用日记插件确认过的 attributes.custom-reservation 数据契约，只读查询。
        register("today-reservations", this.i18n.homeTodayReservations, "iconClock", this.i18n.homeDescTodayReservations, ["switch-protyle", "loaded-protyle"], async (config) => {
            const normalized = normalizeTodayReservationsConfig(config);
            const notebookScope = buildNotebookBoxScope(normalized.notebook, "B");
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT B.id, B.content, B.hpath, B.updated, A.value AS date FROM blocks AS B INNER JOIN attributes AS A ON A.block_id=B.id AND (A.name='custom-lv-raikiri-reservation' OR A.name='custom-reservation') WHERE A.value >= strftime('%Y%m%d', datetime('now','localtime')) AND A.value <= strftime('%Y%m%d', datetime('now','localtime','+${normalized.days} days'))${notebookScope} ORDER BY A.value, B.updated DESC LIMIT 48`,
            });
            if (!Array.isArray(json?.data)) throw new Error("invalid_today_reservations");
            const snapshot = buildTodayReservationsSnapshot(json.data, normalized, {
                title: this.i18n.homeTodayReservations, stat: this.i18n.homeStatReservations,
                today: this.i18n.homeReservationToday, overdue: this.i18n.homeReservationOverdue,
                empty: this.i18n.homeReservationsEmpty, emptyFiltered: this.i18n.homeReservationsFilteredEmpty,
            });
            if (!snapshot) throw new Error("invalid_today_reservations");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        register("quick-capture", this.i18n.homeQuickCapture, "iconAdd", this.i18n.homeDescQuickCapture, [], (config) => ({
            items: [{label: this.i18n.quickCaptureAction, value: buildQuickCaptureAction(config)}],
        }));
        // 插件命令启动器：枚举其他插件的命令，任何插件无需适配即可进面板一键触发
        register("plugin-commands", this.i18n.homePluginCommands, "iconPlugin", this.i18n.homeDescCmds, [], (config) => {
            const snapshot = buildPluginCommandsSnapshot(this.getPluginCommands(), config, {
                stat: this.i18n.homePluginCommandsStat, empty: this.i18n.homePluginCommandsEmpty,
                emptyFiltered: this.i18n.homePluginCommandsFilteredEmpty,
            });
            if (!snapshot) throw new Error("invalid_plugin_commands");
            return snapshot;
        });
        // 内核数据组件群（T-6321~T-6325、T-6328，v3.8.x 只读端点）：投影逻辑在
        // kernel-widget-model.js，这里只做端点调用与空态归一。
        register("pinned-docs", this.i18n.homePinnedDocs, "iconBookmark", this.i18n.homeDescPinnedDocs, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const json = await this.fetchKernelJson("/api/filetree/getPinnedDocs", {});
            if (!Array.isArray(json?.data)) throw new Error("invalid_pinned_docs");
            const normalized = normalizePinnedDocsConfig(config);
            let pinnedDocs = json.data;
            if (normalized.showPath) {
                const ids = pinnedDocs.slice(0, normalized.limit)
                    .map((doc: any) => String(doc?.id || ""))
                    .filter((id: string) => BLOCK_ID_RE.test(id));
                if (ids.length > 0) {
                    const quoted = [...new Set(ids)].map((id) => `'${id}'`).join(",");
                    const metadata = await this.fetchKernelJson("/api/query/sql", {
                        stmt: `SELECT id, hpath FROM blocks WHERE type='d' AND id IN (${quoted}) LIMIT 12`,
                    });
                    const pathById = new Map((Array.isArray(metadata?.data) ? metadata.data : [])
                        .map((row: any) => [String(row?.id || ""), String(row?.hpath || "")]));
                    pinnedDocs = pinnedDocs.map((doc: any) => ({...doc, hpath: pathById.get(String(doc?.id || "")) || ""}));
                }
            }
            const snapshot = buildPinnedDocsSnapshot({...json, data: pinnedDocs}, normalized, {
                title: this.i18n.homePinnedDocs,
                empty: this.i18n.homePinnedDocsEmpty,
                stat: this.i18n.homePinnedDocsStat,
                children: this.i18n.homePinnedDocsChildren,
                unavailable: this.i18n.homePinnedDocsUnavailable,
                unavailableShort: this.i18n.homePinnedDocsUnavailableShort,
            });
            if (!snapshot) throw new Error("invalid_pinned_docs");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        register("inbox-shorthands", this.i18n.homeInbox, "iconInbox", this.i18n.homeDescInbox, [], async (config) => {
            const normalized = normalizeInboxConfig(config);
            const json = await this.fetchKernelJson("/api/inbox/getShorthands", {page: normalized.page});
            const snapshot = buildInboxSnapshot(json, normalized, {
                title: this.i18n.homeInbox, empty: this.i18n.homeInboxEmpty,
                emptyFiltered: this.i18n.homeInboxFilteredEmpty, page: this.i18n.homeInboxPage,
            });
            if (!snapshot) return {emptyHint: this.i18n.homeInboxUnavailable, items: []};
            return snapshot;
        }, {timeoutMs: 2500, cacheTtlMs: 30000});
        register("recent-updates", this.i18n.homeRecentUpdates, "iconRefresh", this.i18n.homeDescRecentUpdates, ["switch-protyle", "loaded-protyle", "destroy-protyle"], async (config) => {
            const json = await this.fetchKernelJson("/api/block/getRecentUpdatedBlocks", {});
            const snapshot = buildRecentUpdatesSnapshot(json, config, {
                title: this.i18n.homeRecentUpdates, empty: this.i18n.homeRecentUpdatesEmpty,
                statDocuments: this.i18n.homeRecentUpdatesStat, statBlocks: this.i18n.homeRecentUpdatesBlocks,
                blocks: this.i18n.homeRecentUpdatesBlocks,
            });
            if (!snapshot) throw new Error("invalid_recent_updates");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        register("data-health", this.i18n.homeDataHealth, "iconCloud", this.i18n.homeDescDataHealth, ["loaded-protyle"], async (config) => {
            const json = await this.fetchKernelJson("/api/asset/getMissingAssets", {});
            const snapshot = buildDataHealthSnapshot(json, config, {
                title: this.i18n.homeDataHealth, empty: this.i18n.homeDataHealthEmpty, stat: this.i18n.homeDataHealthStat,
                statMany: this.i18n.homeDataHealthStatMany,
            });
            if (!snapshot) throw new Error("invalid_data_health");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        register("database-list", this.i18n.homeDatabaseList, "iconDatabase", this.i18n.homeDescDatabaseList, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeDatabaseListConfig(config);
            // T-6850/P8：绑定了具体数据库 → 按数据形态（当前视图的列+行）投影，
            // 复用 database-table 的两级取数管线（块 ID 0 行 → getAttributeView 解析库 ID 重试）；
            // 未绑定保持"全库清单"形态。库不可用或无列时回退清单，不渲染空卡。
            if (normalized.blockId) {
                const fetchView = (id: string, extra: Record<string, unknown> = {}) =>
                    this.fetchKernelJson("/api/av/renderAttributeView", {id, pageSize: 100, ...extra});
                let json = await fetchView(normalized.blockId);
                if (!json?.data?.view?.rows?.length) {
                    try {
                        const full = await this.fetchKernelJson("/api/av/getAttributeView", {id: normalized.blockId});
                        const dbId = full?.data?.av?.id;
                        const viewID = full?.data?.av?.viewID;
                        if (typeof dbId === "string" && dbId && dbId !== normalized.blockId && typeof viewID === "string" && viewID) {
                            json = await fetchView(dbId, {viewID});
                        }
                    } catch (_) { /* 保持首呼结果 */ }
                }
                const tableSnapshot = buildAvTableSnapshot(json, normalized, {
                    title: this.i18n.homeDatabaseList, empty: this.i18n.homeAvTableEmpty,
                    stat: this.i18n.homeAvTableRows,
                });
                if (tableSnapshot) return tableSnapshot;
            }
            const notebookScope = buildNotebookBoxScope(normalized.notebook);
            const keywordScope = normalized.query ? ` AND (content LIKE '%${normalized.query}%' OR hpath LIKE '%${normalized.query}%')` : "";
            const orderBy = normalized.sortBy === "名称" ? "content COLLATE NOCASE, updated DESC"
                : normalized.sortBy === "路径" ? "hpath COLLATE NOCASE, content COLLATE NOCASE" : "updated DESC";
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT id, content, hpath, updated, COUNT(*) OVER() AS total_count FROM blocks WHERE type = 'av'${notebookScope}${keywordScope} ORDER BY ${orderBy} LIMIT ${normalized.limit}`,
            });
            const snapshot = buildDatabaseListSnapshot(json?.data, normalized, {
                title: this.i18n.homeDatabaseList, empty: this.i18n.homeDatabaseListEmpty,
                emptyFiltered: this.i18n.homeDatabaseListFilteredEmpty, stat: this.i18n.homeDatabaseListStat,
            });
            if (!snapshot) throw new Error("invalid_database_list");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 1000});
        register("saved-searches", this.i18n.homeSavedSearches, "iconSearch", this.i18n.homeDescSavedSearches, ["loaded-protyle"], async (config) => {
            const json = await this.fetchKernelJson("/api/storage/getCriteria", {});
            const snapshot = buildSavedSearchesSnapshot(json, config, {
                title: this.i18n.homeSavedSearches, empty: this.i18n.homeSavedSearchesEmpty, stat: this.i18n.homeSavedSearchesStat,
                emptyFiltered: this.i18n.homeSavedSearchesFilteredEmpty,
                methods: [this.i18n.homeCriteriaMethod0, this.i18n.homeCriteriaMethod1, this.i18n.homeCriteriaMethod2, this.i18n.homeCriteriaMethod3, this.i18n.homeCriteriaMethod4],
            });
            if (!snapshot) throw new Error("invalid_saved_searches");
            return snapshot;
        }, {timeoutMs: 1200, cacheTtlMs: 2000});
        // 数据库表格（T-6330 / ADR 0058）：用户绑定一个数据库块，投影其当前视图
        // （筛选/排序/分页交还内核）；只读，行点击按块 ID 打开。
        register("database-table", this.i18n.homeAvTable, "iconDatabase", this.i18n.homeDescAvTable, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeAvTableConfig(config);
            if (!normalized.blockId) return {emptyHint: this.i18n.homeAvTableConfigHint, items: []};
            // T-6470：嵌入/镜像库块 ID≠库 ID，块 ID 调用 rows=0；pageSize 取数，0 行经 getAttributeView 解析库 ID 重试（证据 kernel-api-smoke）。
            const json = await this.renderAttributeViewWithFallback(normalized.blockId, "/api/av/renderAttributeView");
            const snapshot = buildAvTableSnapshot(json, normalized, {
                title: this.i18n.homeAvTable, empty: this.i18n.homeAvTableEmpty,
                stat: this.i18n.homeAvTableRows,
            });
            if (!snapshot) return {emptyHint: this.i18n.homeAvTableUnavailable, items: []};
            return snapshot;
        }, {timeoutMs: 1500, cacheTtlMs: 1000});
        // 数据库看板（T-7354 / ADR 0247）：用户绑定属性视图，按分组桶聚合展示
        register("database-board", this.i18n.homeDatabaseBoard || "数据库看板", "iconLayoutRight", this.i18n.homeDescDatabaseBoard, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeAvBoardConfig(config);
            if (!normalized.blockId) return {emptyHint: this.i18n.homeAvTableConfigHint, items: []};
            const json = await this.renderAttributeViewWithFallback(normalized.blockId);
            const snapshot = buildAvBoardSnapshot(json, normalized, {
                title: this.i18n.homeDatabaseBoard || "数据库看板",
                empty: this.i18n.homeAvTableEmpty || "暂无数据行",
                stat: this.i18n.homeAvTableRows || "分组/行数",
            });
            if (!snapshot) return {emptyHint: this.i18n.homeAvTableUnavailable || "属性视图暂不可用", items: []};
            return snapshot;
        }, {timeoutMs: 1500, cacheTtlMs: 1000});
        // 闪卡复习推演（T-7355 / ADR 0248）：SM-2 调度推演与每日队列进度
        register("flashcard-review", this.i18n.homeFlashcardReview || "闪卡复习", "iconRiffCard", this.i18n.homeDescFlashcardReview, ["loaded-protyle", "destroy-protyle"], async (config) => {
            const normalized = normalizeFlashcardReviewConfig(config);
            const notebookFilter = normalizeAgentNotebookId(normalized.notebook);
            let payload: {code: number; data: unknown[]} = {code: 0, data: []};
            if (notebookFilter) {
                const json = await this.fetchKernelJson("/api/riff/getNotebookRiffDueCards", {notebook: notebookFilter});
                payload = {code: 0, data: Array.isArray(json?.data) ? json.data : []};
            } else {
                const notebooks = (await this.loadNotebooks()).slice(0, 12);
                const aggregatedCards: unknown[] = [];
                for (let index = 0; index < notebooks.length; index += 4) {
                    const chunk = await Promise.all(notebooks.slice(index, index + 4).map(async (nb) => {
                        const json = await this.fetchKernelJson("/api/riff/getNotebookRiffDueCards", {notebook: nb.id});
                        return Array.isArray(json?.data) ? json.data : [];
                    }));
                    for (const list of chunk) {
                        aggregatedCards.push(...list);
                        if (aggregatedCards.length >= 100) break;
                    }
                    if (aggregatedCards.length >= 100) break;
                }
                payload = {code: 0, data: aggregatedCards};
            }
            const snapshot = buildFlashcardReviewSnapshot(payload, normalized, {
                title: this.i18n.homeFlashcardReview || "闪卡复习",
                empty: this.i18n.homeFlashcardEmpty || "当前范围没有待复习闪卡",
                stat: this.i18n.homeFlashcardReviewStat || "今日/待复习",
            });
            if (!snapshot) return {emptyHint: this.i18n.homeFlashcardEmpty || "当前范围没有待复习闪卡", items: []};
            return snapshot;
        }, {timeoutMs: 2500, cacheTtlMs: 2000});
    }

    private resolveActiveWidgetDoc(context: any): {rootId: string; docTitle: string} {
        const active = this.isMobile
            ? this.getMobileTabs().find((tab) => tab.id === this.getMobileActiveTabId())
            : this.getActiveTab();
        return {
            rootId: context?.activeDocContext?.rootId || (active ? this.rootIdOf(active) : ""),
            docTitle: context?.activeDocContext?.title || (active ? this.titleOf(active) : ""),
        };
    }

    private async renderAttributeViewWithFallback(blockId: string, renderEndpoint = "/api/av/renderAttributeView"): Promise<any> {
        const fetchView = (id: string, extra: Record<string, unknown> = {}) =>
            this.fetchKernelJson(renderEndpoint, {id, pageSize: 100, ...extra});
        const first = await fetchView(blockId);
        if (first?.data?.view?.rows?.length) return first;
        try {
            const full = await this.fetchKernelJson("/api/av/getAttributeView", {id: blockId});
            const dbId = full?.data?.av?.id;
            const viewID = full?.data?.av?.viewID;
            if (typeof dbId === "string" && dbId && dbId !== blockId && typeof viewID === "string" && viewID) {
                return await fetchView(dbId, {viewID});
            }
        } catch (_) { /* 保持首呼结果 */ }
        return first;
    }

    // 全库扫描时间窗起点：days 天前的 "YYYYMMDDHHmmss"（思源 updated 同格式，可直接字符串比较）
    private taskWindowStart(days: number): string {
        const d = new Date(Date.now() - Math.max(1, days) * 86400000);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}000000`;
    }
}
