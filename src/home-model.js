"use strict";

const HOME_SCHEMA_VERSION = 1;
const DEVICES = Object.freeze(["desktop", "sidebar", "mobile"]);
const MOBILE_HOME_SIZE = "medium";
// 开箱组合与用户布局分开：只初始化新状态，或补全可证明未改动的旧四卡。
const HOME_DEFAULTS_VERSION = 2;
const HOME_DEFAULT_WIDGETS = Object.freeze([
    {moduleId: "external-local-time", x: 0, y: 0, w: 4, h: 3, size: "small"},
    {moduleId: "year-progress", x: 4, y: 0, w: 4, h: 3, size: "small"},
    {moduleId: "today-journal", x: 8, y: 0, w: 4, h: 3, size: "small"},
    {moduleId: "today-tasks", x: 0, y: 3, w: 6, h: 3, size: "medium"},
    {moduleId: "recent-documents", x: 6, y: 3, w: 6, h: 3, size: "medium"},
].map(Object.freeze));
const HOME_DEFAULT_MODULE_IDS = Object.freeze(HOME_DEFAULT_WIDGETS.map((item) => item.moduleId));

// T-7360: 工作台黄金场景化预设布局库（Scene Presets）
const WORKBENCH_SCENE_PRESETS = Object.freeze([
    {
        id: "default",
        title: "全景工作流",
        description: "近期文档、日记、待办、时间、年度进度与笔记统计",
        icon: "iconLayout",
        widgets: HOME_DEFAULT_WIDGETS,
    },
    {
        id: "minimal",
        title: "极简行动",
        description: "聚焦核心行动：今日日记、待办任务与本地时间",
        icon: "iconCheck",
        widgets: Object.freeze([
            {moduleId: "today-journal", x: 0, y: 0, w: 6, h: 3, size: "small"},
            {moduleId: "today-tasks", x: 6, y: 0, w: 6, h: 3, size: "small"},
            {moduleId: "external-local-time", x: 0, y: 3, w: 12, h: 3, size: "wide"},
        ].map(Object.freeze)),
    },
    {
        id: "research",
        title: "学术与复盘",
        description: "属性看板、闪卡复习、笔记统计与近期文档",
        icon: "iconGraph",
        widgets: Object.freeze([
            {moduleId: "database-board", x: 0, y: 0, w: 8, h: 3, size: "wide"},
            {moduleId: "flashcard-review", x: 8, y: 0, w: 4, h: 3, size: "small"},
            {moduleId: "recent-documents", x: 0, y: 3, w: 6, h: 3, size: "medium"},
            {moduleId: "note-stats", x: 6, y: 3, w: 6, h: 3, size: "medium"},
        ].map(Object.freeze)),
    },
    {
        id: "daily",
        title: "打卡与生活",
        description: "小驴打卡桥接、每日放送与年度进度",
        icon: "iconCalendar",
        widgets: Object.freeze([
            {moduleId: "checkin-today", x: 0, y: 0, w: 6, h: 3, size: "medium"},
            {moduleId: "checkin-streak", x: 6, y: 0, w: 6, h: 3, size: "medium"},
            {moduleId: "external-anime-bangumi", x: 0, y: 3, w: 8, h: 3, size: "wide"},
            {moduleId: "year-progress", x: 8, y: 3, w: 4, h: 3, size: "small"},
        ].map(Object.freeze)),
    },
]);

function applyWorkbenchScenePreset(state, presetId, device = "desktop") {
    const targetDevice = ["desktop", "sidebar", "mobile"].includes(device) ? device : "desktop";
    const sourceState = state && typeof state === "object" ? state : {instances: [], layouts: {}};
    const matched = WORKBENCH_SCENE_PRESETS.find((p) => p.id === presetId) || WORKBENCH_SCENE_PRESETS[0];

    const sourceInstances = Array.isArray(sourceState.instances) ? sourceState.instances : [];
    const sourceInstanceMap = new Map(sourceInstances.map((inst) => [inst?.instanceId, inst]));
    const instances = [];
    const layoutEntries = [];
    const presetIds = new Set();
    const presetModuleIds = new Set();
    matched.widgets.forEach((item, index) => {
        const {moduleId, ...layout} = item;
        presetIds.add(moduleId);
        presetModuleIds.add(moduleId);
        const existing = sourceInstanceMap.get(moduleId)
            || sourceInstances.find((candidate) => candidate?.moduleId === moduleId && candidate.config && typeof candidate.config === "object" && !Array.isArray(candidate.config) && Object.keys(candidate.config).length > 0);
        instances.push({
            instanceId: moduleId,
            moduleId,
            enabled: true,
            config: existing && existing.config && typeof existing.config === "object" && !Array.isArray(existing.config)
                ? {...existing.config}
                : (moduleId === "external-local-time" ? {showSeconds: "否"} : {}),
        });
        layoutEntries.push({
            instanceId: moduleId,
            ...layout,
            collapsed: false,
            ...(targetDevice === "mobile" ? {x: 0, y: index * 3, w: 12} : {}),
        });
    });

    // R9: 保留其他端（移动端/侧栏）独有布局引用的组件实例，防止 normalizeHomeState 误抹；
    // 同时保留曾自定义过 config 的非预设组件实例，切换预设后再切回/重新添加时不丢失参数。
    const otherDeviceIds = new Set();
    ["desktop", "sidebar", "mobile"].forEach((d) => {
        if (d === targetDevice) return;
        const entries = Array.isArray(sourceState.layouts?.[d]) ? sourceState.layouts[d] : [];
        entries.forEach((entry) => {
            if (entry && entry.instanceId) otherDeviceIds.add(entry.instanceId);
        });
    });
    sourceInstances.forEach((inst) => {
        if (!inst || !inst.instanceId || presetIds.has(inst.instanceId)) return;
        const hasCustomConfig = Boolean(
            inst.config && typeof inst.config === "object" && !Array.isArray(inst.config)
            && Object.keys(inst.config).length > 0,
        );
        if (otherDeviceIds.has(inst.instanceId) || (hasCustomConfig && !presetModuleIds.has(inst.moduleId))) {
            presetIds.add(inst.instanceId);
            instances.push({
                ...inst,
                config: inst.config && typeof inst.config === "object" && !Array.isArray(inst.config) ? {...inst.config} : {},
            });
        }
    });

    const nextLayouts = {...(sourceState.layouts || {})};
    nextLayouts[targetDevice] = layoutEntries;

    const nextState = {
        ...sourceState,
        instances,
        layouts: nextLayouts,
    };
    return {
        state: nextState,
        changed: true,
        preset: matched,
    };
}

function resolveHomeStarterSize(moduleId, supported) {
    const starter = HOME_DEFAULT_WIDGETS.find((item) => item.moduleId === moduleId);
    return starter && supported.includes(starter.size) ? starter.size : "";
}

// T-7858：显式恢复默认组件时复用黄金 Bento 开箱布局（含 w/h），不再回退通用预设档尺寸，
// 保证「恢复默认」与首开初始化产出完全一致的黄金布局。
function resolveHomeStarterLayout(moduleId, supported) {
    const starter = HOME_DEFAULT_WIDGETS.find((item) => item.moduleId === moduleId);
    if (!starter || !supported.includes(starter.size)) return null;
    return {size: starter.size, w: starter.w, h: starter.h};
}

function normalizeHomeDefaultsVersion(value, persisted = true) {
    return Number.isSafeInteger(value) && value >= 0 && value <= 99 ? value : persisted ? 1 : 0;
}

function isOriginalFourCardState(state, device) {
    if (device !== "desktop" || state.instances.length !== 4) return false;
    const original = HOME_DEFAULT_WIDGETS.slice(0, 4);
    if (!state.instances.every((item, index) => item.instanceId === original[index].moduleId
        && item.moduleId === original[index].moduleId && item.enabled === true
        && Object.keys(item.config || {}).length === 0)) return false;
    return Object.entries(state.layouts).every(([surface, entries]) => {
        if (surface !== device) return entries.length === 0;
        return entries.length === 4 && entries.every((entry, index) => {
            const expected = original[index];
            return entry.instanceId === expected.moduleId && entry.collapsed === false
                && ["x", "y", "w", "h", "size"].every((key) => entry[key] === expected[key]);
        });
    });
}

function prepareHomeDefaultState(state, device, availableIds) {
    if (state.defaultsVersion >= HOME_DEFAULTS_VERSION) return {state, changed: false};
    if (state.defaultsVersion === 1 && device !== "desktop" && isOriginalFourCardState(state, "desktop")) return {state, changed: false};
    const fresh = state.defaultsVersion === 0 && state.instances.length === 0
        && Object.values(state.layouts).every((entries) => entries.length === 0);
    const upgrade = state.defaultsVersion === 1 && isOriginalFourCardState(state, device);
    if ((fresh || upgrade) && HOME_DEFAULT_MODULE_IDS.some((id) => !availableIds.has(id))) return {state, changed: false};
    const additions = fresh ? HOME_DEFAULT_WIDGETS : upgrade ? HOME_DEFAULT_WIDGETS.slice(4) : [];
    const next = {...state, defaultsVersion: HOME_DEFAULTS_VERSION,
        instances: [...state.instances], layouts: {...state.layouts}};
    next.layouts[device] = [...(state.layouts[device] || [])];
    additions.forEach((item, index) => {
        const {moduleId, ...layout} = item;
        next.instances.push({instanceId: moduleId, moduleId, enabled: true,
            config: moduleId === "external-local-time" ? {showSeconds: "否"} : {}});
        next.layouts[device].push({instanceId: moduleId, ...layout, collapsed: false,
            ...(device === "mobile" ? {x: 0, y: index * 3, w: 12} : {})});
    });
    return {state: next, changed: true};
}
const AVAILABILITY_LEVELS = Object.freeze(["ready", "conditional", "external"]);
const CONDITIONAL_MODULES = new Set([
    "today-tasks", "bookmarks", "journal-monthly", "flashcard-due", "quick-capture",
    "on-this-day", "recent-daily-notes", "document-relations-summary",
    "current-document-outline", "today-reservations", "journal-calendar", "writing-streak", "plugin-commands",
]);

const _ynOpts = ["是", "否"];
const _nyOpts = ["否", "是"];
const yn = (key, label, defaults = "是") => ({key, label, type: "select", options: _ynOpts, defaults});
const ny = (key, label) => ({key, label, type: "select", options: _nyOpts, defaults: "否"});
const sel = (key, label, options, defaults) => ({key, label, type: "select", options, defaults});
const num = (key, label, min, max, defaults) => ({key, label, type: "number", min, max, defaults});
const txt = (key, label, defaults = "") => ({key, label, type: "text", defaults});
const nb = (label = "限定笔记本") => ({key: "notebook", label, type: "notebook"});
const mod = (moduleId, title, icon, sizes, configSchema, extra) => ({
    moduleId, title, icon, category: "siyuan", supportedDevices: DEVICES, readOnly: true, sizes, protocolVersion: 2, configSchema, ...extra,
});
const extMod = (moduleId, title, icon, sizes, configSchema, extra) =>
    mod(moduleId, title, icon, sizes, configSchema, {availability: "external", ...extra});
const checkinMod = (moduleId, title, icon, sizes, order, configSchema, extra) =>
    extMod(moduleId, title, icon, sizes, configSchema, {source: {pluginId: "siyuan-checkin", name: "小驴打卡", icon: "iconCheck", order}, ...extra});

const DEFAULT_MODULES = Object.freeze([
    mod("recent-documents", "近期文档", "iconHistory", ["small", "medium", "wide", "large", "full"], [
        num("limit", "显示条数", 1, 8, 8),
        yn("showPath", "显示文档路径"),
        ny("showRank", "显示最近序号"),
    ]),
    mod("today-journal", "今日日记", "iconCalendar", ["xs", "small"], [
        nb("日记笔记本"),
    ]),
    mod("today-tasks", "今日待办", "iconCheck", ["small", "medium", "tall", "large", "full"], [
        num("limit", "条数上限", 1, 5, 5),
        ny("allDocuments", "扫描全部文档"),
        nb(),
        ny("showCompleted", "显示已完成"),
        num("days", "时间范围（天）", 7, 365, 30),
        txt("query", "筛选待办或文档"),
        sel("sortBy", "排序方式", ["最近更新", "文档名称"], "最近更新"),
        yn("showDocument", "显示来源文档"),
        ny("showPath", "显示文档路径"),
        ny("showRank", "显示序号"),
    ]),
    mod("fixed-document", "指定文档", "iconFile", ["xs", "small", "medium"], [
        {key: "docId", label: "文档 ID", type: "document", defaults: ""},
        txt("title", "显示名称"),
        yn("showPath", "显示文档路径"),
    ]),
    mod("favorites", "收藏", "iconStar", ["small", "medium", "wide", "large", "full"], [
        num("limit", "显示条数", 1, 8, 8),
        {key: "group", label: "收藏分组", type: "favorite-group", defaults: ""},
        yn("showGroup", "显示所属分组"),
        yn("showPath", "显示文档路径"),
        yn("showUnavailable", "显示失效收藏"),
    ]),
    mod("document-sets", "文档集", "iconLayout", ["medium", "tall", "large"], [
        num("limit", "显示条数", 1, 5, 5),
        sel("sortBy", "排序方式", ["最近使用", "名称", "文档数"], "最近使用"),
        yn("showCount", "显示文档数"),
        yn("showUpdated", "显示最近使用日期"),
    ]),
    mod("tags", "标签", "iconTags", ["small", "medium", "tall"], [
        num("limit", "显示条数", 1, 12, 8),
        txt("query", "筛选标签"),
        sel("sortBy", "排序方式", ["数量", "名称"], "数量"),
        yn("showCount", "显示块数量"),
        yn("showHierarchy", "显示标签层级"),
        yn("showRank", "显示序号", "否"),
    ]),
    mod("bookmarks", "书签", "iconBookmark", ["small", "medium", "tall"], [
        num("limit", "显示条数", 1, 6, 6),
        txt("query", "筛选书签"),
        sel("sortBy", "排序方式", ["数量", "名称"], "数量"),
        yn("showCount", "显示块数量"),
        yn("showEmpty", "显示空书签"),
        ny("showRank", "显示序号"),
    ]),
    mod("journal-monthly", "本月日记", "iconCalendar", ["medium", "wide", "large"], [
        num("limit", "条数上限", 1, 20, 12),
        nb(),
        num("monthOffset", "月份偏移", -24, 24, 0),
        sel("sortBy", "排序方式", ["日期", "最近更新"], "日期"),
        yn("showPath", "显示文档路径"),
        ny("showUpdated", "显示更新时间"),
        ny("showRank", "显示序号"),
    ]),
    mod("note-stats", "笔记统计", "iconGraph", ["medium", "wide"], [
        nb(),
        num("days", "趋势窗口（天）", 7, 90, 7),
        sel("primaryMetric", "主指标", ["文档数", "估算字数"], "文档数"),
        yn("showTrend", "显示环比趋势"),
        yn("showStrength", "显示写作强度", "否"),
    ]),
    mod("year-progress", "年度进度", "iconRefresh", ["xs", "small", "medium"], [
        sel("period", "统计周期", ["年度", "季度", "月份"], "年度"),
        yn("showElapsed", "显示已过天数"),
        yn("showRemaining", "显示剩余天数"),
    ]),
    mod("external-local-time", "时间与日期", "iconClock", ["xs", "small", "medium"], [
        sel("hourFormat", "小时制", ["24 小时制", "12 小时制"], "24 小时制"),
        ny("showSeconds", "显示秒"),
        yn("showDate", "显示日期"),
        sel("emphasis", "数字大小", ["标准", "大", "特大"], "标准"),
    ]),
    mod("external-world-clock", "世界时钟", "iconClock", ["xs", "small", "medium", "wide", "large", "full"], [
        txt("cities", "城市（中文名或 IANA，逗号分隔，如 上海,东京）"),
        sel("hourFormat", "小时制", ["24 小时制", "12 小时制"], "24 小时制"),
    ]),
    extMod("external-weather-open-meteo", "近期天气", "iconCloud", ["small", "medium", "wide", "large"], [
        txt("city", "城市或邮编"),
        sel("temperatureUnit", "温度单位", ["°C", "°F"], "°C"),
        num("forecastDays", "预报天数", 2, 5, 4),
        yn("showApparent", "显示体感温度"),
        ny("showWind", "显示风速"),
    ]),
    extMod("external-air-quality", "空气质量", "iconCloud", ["small", "medium", "wide"], [
        txt("city", "城市或邮编（与天气相互独立）"),
        ny("showPollutants", "显示更多污染物"),
    ]),
    extMod("external-anime-bangumi", "每日放送", "iconVideo", ["medium", "wide", "large", "full"], [
        sel("dayRange", "放送范围", ["今天", "明天", "本周"], "今天"),
        num("limit", "条目上限", 2, 12, 6),
        yn("showCovers", "显示封面"),
        ny("showDates", "显示日期"),
        yn("showScore", "显示评分"),
    ], {viewType: "media"}),
    // T-6971 批次⑥：列表流家族行流组件不做英雄位（full），声明档位一律 M/W/L
    extMod("external-hot-news-dailyhot", "热搜事件", "iconGraph", ["medium", "wide", "large"], [
        txt("endpoint", "DailyHotApi 完整接口"),
        txt("apiBase", "基址（可选，填后按路由拼接口）"),
        sel("route", "热榜路由", ["weibo", "zhihu", "bilibili", "baidu", "douyin", "douban-movie", "ithome", "36kr", "sspai", "v2ex"], "weibo"),
        num("limit", "条目上限", 3, 12, 8),
        yn("showHot", "显示热度"),
        yn("showTime", "显示时间"),
        yn("showRank", "显示排名"),
    ]),
    extMod("external-news-hackernews", "Hacker News 热门", "iconGraph", ["medium", "wide", "large"], [
        sel("board", "榜单（非首页榜单会在标题追加标注）", ["首页", "最佳", "问答", "展示"], "首页"),
        num("limit", "条目上限", 3, 12, 8),
        yn("showMeta", "显示得分"),
        ny("showTime", "显示时间"),
    ]),
    extMod("external-status-uptimekuma", "服务状态", "iconCloud", ["small", "medium", "wide"], [
        txt("endpoint", "Uptime Kuma 完整地址"),
        txt("slug", "状态页 slug"),
        yn("showPing", "显示延迟"),
        yn("showUptime", "显示在线率"),
    ]),
    extMod("external-fx-frankfurter", "汇率参考", "iconGraph", ["small", "medium", "wide"], [
        txt("base", "基准货币（3 位代码）", "CNY"),
        txt("quotes", "目标货币（逗号分隔，1-6 个）", "USD,EUR,JPY,GBP,HKD"),
        yn("showDate", "显示牌价日期"),
        ny("showInverse", "显示反向汇率"),
    ]),
    extMod("external-rss-miniflux", "未读文章", "iconRss", ["medium", "wide", "large"], [
        txt("endpoint", "Miniflux 实例地址"),
        {key: "token", label: "API Token（设置 → API 密钥）", type: "secret", defaults: ""},
        {key: "categoryId", label: "分类筛选", type: "miniflux-category", defaults: ""},
        num("limit", "条目上限", 1, 50, 20),
        sel("sortBy", "排序", ["最新优先", "最旧优先"], "最新优先"),
        yn("showDate", "显示日期"),
        yn("showFeed", "显示来源"),
        ny("showRank", "显示序号"),
    ]),
    extMod("external-rss-subscription", "RSS 订阅", "iconRss", ["medium", "wide", "large"], [
        txt("url", "RSS / Atom 订阅地址"),
        txt("title", "显示标题（可选，留空读 feed 自带标题）"),
        num("maxItems", "条目上限", 1, 30, 10),
        yn("showDate", "显示日期"),
        yn("showFeedTitle", "显示来源名"),
        ny("showRank", "显示序号"),
        ny("hideRead", "只看未读"),
    ]),
    extMod("external-ical-events", "iCal 日程", "iconCalendar", ["medium", "wide", "large", "full"], [
        txt("url", "iCal 订阅地址（.ics）"),
        num("windowDays", "日程窗口（天）", 1, 60, 14),
        num("maxEvents", "条目上限", 1, 12, 6),
    ]),
    extMod("external-github-contrib", "GitHub 贡献", "iconGraph", ["medium", "wide", "large", "full"], [
        txt("username", "GitHub 用户名"),
        num("windowDays", "统计窗口（天）", 28, 366, 84),
        {key: "token", label: "个人访问令牌（可选，仅经请求头传递）", type: "secret", defaults: ""},
    ], {viewType: "heatmap"}),
    mod("external-quote-daily", "每日引言", "iconQuote", ["xs", "small", "medium"], [
        {key: "quotes", label: "自定义语录（每行一条，可选 —— 分隔出处）", type: "textarea", defaults: ""},
        yn("showSource", "显示出处"),
        sel("emphasis", "文字大小", ["标准", "大", "特大"], "标准"),
    ]),
    mod("external-device-battery", "设备电量", "iconDashboard", ["xs", "small", "medium"], [
        yn("showEstimate", "显示预计时间"),
        yn("showSource", "显示数据来源行"),
    ], {supportedDevices: ["desktop", "sidebar"]}),
    extMod("external-news-newsnow", "实时资讯", "iconList", ["medium", "wide", "large"], [
        txt("endpoint", "NewsNow 完整接口"),
        num("limit", "条目上限", 3, 12, 8),
        yn("showHot", "显示热度"),
        yn("showTime", "显示时间"),
        yn("showRank", "显示排名"),
    ]),
    {moduleId: "external-activitywatch-time", title: "使用时长", icon: "iconClock", category: "siyuan", availability: "external", supportedDevices: ["desktop", "sidebar"], readOnly: true, sizes: ["small", "medium", "wide", "large", "full"], protocolVersion: 2, configSchema: [
        txt("endpoint", "ActivityWatch 本机地址", "http://127.0.0.1:5600"),
        num("hours", "统计范围（小时）", 1, 168, 24),
        num("limit", "应用上限", 3, 10, 6),
        ny("showPercent", "显示时长占比"),
        yn("showRank", "显示排名"),
        {key: "bucketId", label: "桶 ID（留空自动选择）", type: "activitywatch-bucket", defaults: ""},
    ]},
    mod("recent-edits", "近期编辑", "iconEdit", ["medium", "wide", "large"], [
        num("limit", "显示条数", 1, 5, 5),
        nb(),
        num("days", "最近天数", 1, 3650, 30),
        txt("query", "标题或路径过滤"),
        yn("showPath", "显示文档路径"),
        yn("showUpdated", "显示编辑时间"),
        ny("showRank", "显示序号"),
    ]),
    mod("flashcard-due", "闪卡待复习", "iconClock", ["small", "medium", "tall"], [
        nb(),
        num("limit", "显示条数", 1, 12, 8),
        sel("sortBy", "全部笔记本排序", ["待复习数量", "笔记本顺序"], "待复习数量"),
        yn("showNotebook", "显示来源笔记本"),
        ny("showPath", "显示文档路径"),
        ny("showRank", "显示序号"),
    ]),
    mod("random-review", "随机回顾", "iconRefresh", ["small", "medium", "tall"], [
        num("days", "多久未看（天）", 7, 3650, 90),
        nb(),
        {key: "parentDocument", label: "限定父文档（随机选择其子文档）", type: "document", defaults: ""},
        num("limit", "每批篇数", 1, 6, 3),
        yn("showPath", "显示文档路径"),
    ]),
    mod("quick-capture", "快速记录", "iconAdd", ["xs", "small", "medium"], [
        nb("目标日记笔记本"),
        txt("initialText", "预填短语（最多 24 字）"),
        ny("includeTime", "预填当前时间"),
    ], {readOnly: false}),
    extMod("clipped-unread", "剪藏待读", "iconBookmark", ["small", "medium", "tall"], [
        txt("tag", "标签名", "剪藏"),
        num("limit", "条数上限", 1, 12, 8),
        nb(),
        sel("sortBy", "排序方式", ["最近剪藏", "名称"], "最近剪藏"),
        yn("showPath", "显示文档路径"),
        yn("showUpdated", "显示最近剪藏时间"),
        ny("showRank", "显示序号"),
    ], {source: {pluginId: "siyuan-clipper", name: "思源剪藏", icon: "iconBookmark", collection: "剪藏"}}),
    mod("on-this-day", "往年今日", "iconClock", ["small", "medium", "tall"], [
        num("limit", "条数上限", 1, 3, 3),
        nb(),
        num("yearRange", "回看年份", 1, 100, 20),
        sel("sortBy", "排序方式", ["最近年份", "最早年份"], "最近年份"),
        yn("showYear", "显示年份"),
        yn("showPath", "显示文档路径"),
        ny("showRank", "显示序号"),
    ]),
    // T-6971 批次⑦：今日写作 = 目标型组件，上限 M（规格卡建议 S/M）
    mod("today-writing", "今日写作", "iconEdit", ["small", "medium"], [
        nb(),
        num("goal", "每日字符目标", 0, 50000, 1000),
        yn("showBlocks", "显示新增内容块"),
        yn("showNewDocs", "显示新建文档"),
        yn("showEditedDocs", "显示修订文档"),
    ]),
    mod("recent-writing-activity", "近期写作活跃度", "iconChart", ["medium", "wide", "large"], [
        num("days", "统计天数", 7, 366, 14),
        nb(),
        sel("metric", "统计指标", ["内容块", "新增字符"], "内容块"),
        sel("density", "图形密度", ["每日", "紧凑"], "每日"),
        yn("showZero", "显示零值日期"),
        sel("view", "视图", ["列表", "年历"], "列表"),
        num("yearOffset", "年历年份偏移（0 为今年）", -3, 0, 0),
        yn("showAverage", "显示日均值"),
        ny("showStrength", "显示写作强度"),
    ]),
    mod("recent-daily-notes", "近期日记", "iconCalendar", ["small", "medium", "wide"], [
        num("days", "回看天数", 7, 60, 14),
        num("limit", "条数上限", 1, 5, 5),
        nb(),
        sel("sortBy", "排序方式", ["日期", "最近更新"], "日期"),
        yn("showPath", "显示文档路径"),
        ny("showUpdated", "显示更新时间"),
        ny("showRank", "显示序号"),
    ]),
    mod("document-relations-summary", "文档关系摘要", "iconGraph", ["small", "medium", "wide"], [
        num("limit", "条数上限", 1, 6, 6),
        sel("relation", "关系类型", ["全部", "子块", "引用"], "全部"),
        txt("query", "筛选关系内容"),
        yn("showType", "显示关系类型"),
        yn("showRank", "显示序号", "否"),
    ]),
    mod("current-document-outline", "当前文档大纲", "iconList", ["small", "medium", "tall", "wide"], [
        num("limit", "标题上限", 1, 8, 8),
        txt("query", "筛选标题"),
        num("maxDepth", "最大标题层级", 1, 8, 8),
        yn("showLevel", "显示标题层级"),
        yn("showRank", "显示序号", "否"),
    ]),
    mod("today-reservations", "近期预约", "iconClock", ["small", "medium", "wide"], [
        num("days", "未来天数", 0, 14, 3),
        num("overdueDays", "包含过期天数（已停用）", 0, 0, 0),
        num("limit", "条数上限", 1, 4, 4),
        nb(),
        txt("query", "筛选预约内容或路径"),
        sel("sortBy", "排序方式", ["预约时间", "最近更新"], "预约时间"),
        yn("showDate", "显示预约日期"),
        yn("showStatus", "显示今天或过期状态"),
        yn("showPath", "显示所在路径"),
        ny("showRank", "显示序号"),
    ]),
    mod("journal-calendar", "日历月视图", "iconCalendar", ["large", "full"], [
        num("monthOffset", "月份偏移", -24, 24, 0),
        sel("weekStart", "每周起始日", ["周一", "周日"], "周一"),
        yn("showAdjacent", "显示相邻月份日期"),
        ny("showLunar", "显示农历"),
        ny("showHolidays", "显示中国节假日"),
        nb(),
    ], {viewType: "calendar"}),
    // T-6971 批次⑦：写作打卡 = 强状态数值组件，上限 M（规格卡建议 S/M）
    mod("writing-streak", "写作打卡", "iconCheck", ["small", "medium"], [
        nb(),
        num("windowDays", "连续统计窗口（天）", 30, 365, 90),
        sel("metric", "达标指标", ["新增字符", "内容块"], "新增字符"),
        num("dailyGoal", "每日达标值", 1, 5000, 1),
        sel("weekStart", "每周起始日", ["周一", "周日"], "周一"),
        yn("todayGrace", "今天未达标时延续昨日"),
        num("weeklyGoal", "每周达标天数（0 为关闭）", 0, 7, 0),
        sel("restDays", "豁免休息日（不计达标也不断签）", ["无", "周末", "周六", "周日", "周一", "周二", "周三", "周四", "周五"], "无"),
    ], {viewType: "weekdays"}),
    mod("countdown", "倒数日", "iconClock", ["xs", "small", "medium", "large"], [
        txt("title", "名称"),
        {key: "targetDate", label: "目标日期", type: "date", defaults: ""},
        sel("mode", "统计方式", ["倒数", "累计"], "倒数"),
        sel("repeat", "重复", ["不重复", "每年"], "不重复"),
        yn("showTargetDate", "显示目标日期"),
        sel("emphasis", "数字大小", ["标准", "大", "特大"], "标准"),
    ]),
    mod("plugin-commands", "插件命令", "iconPlugin", ["small", "medium", "wide", "large"], [
        num("limit", "条数上限", 1, 5, 5),
        txt("query", "搜索命令或插件"),
        txt("plugin", "限定插件名称"),
        sel("sortBy", "排序方式", ["插件顺序", "命令名称", "插件名称"], "插件顺序"),
        yn("showPlugin", "显示来源插件"),
        ny("showRank", "显示序号"),
    ]),
    {moduleId: "checkin-summary", title: "打卡摘要", icon: "iconCalendar", category: "plugin", supportedDevices: DEVICES, readOnly: true, sizes: ["xs", "small", "medium"]},
    // —— 小驴打卡桥接组件（ADR 0057）：由本插件内建 adapter 消费打卡公开生态 API v4，
    // 但 source 把来源标注为 siyuan-checkin，商店据此把它们归到「小驴打卡」一组。 ——
    checkinMod("checkin-today", "今日打卡", "iconCheck", ["small", "medium", "tall", "wide", "large"], 1, [
        num("limit", "显示条数", 1, 12, 6),
        txt("group", "只看分组（留空为全部）"),
        yn("showGroup", "显示分组"),
    ]),
    checkinMod("checkin-streak", "连续记录", "iconRefresh", ["small", "medium", "wide"], 2, [
        num("limit", "排行条数", 1, 12, 6),
        yn("showRank", "显示排名"),
    ]),
    checkinMod("checkin-year-heatmap", "打卡热力图", "iconGraph", ["medium", "wide", "large", "full"], 3, [
        num("yearOffset", "回溯年数", 0, 5, 0),
    ], {viewType: "heatmap"}),
    checkinMod("checkin-weekly", "本周打卡", "iconCalendar", ["small", "medium", "wide"], 4, [
        num("limit", "显示周数", 1, 12, 6),
    ]),
    checkinMod("checkin-occasions", "近期事项", "iconCheck", ["small", "medium", "tall"], 5, [
        num("limit", "显示条数", 1, 12, 6),
        yn("showKind", "显示类型"),
    ]),
    checkinMod("checkin-monthly", "本月打卡", "iconCalendar", ["small", "medium", "wide"], 6, [
        num("limit", "显示条数", 1, 12, 6),
        yn("showRank", "显示排名"),
    ]),
    mod("pinned-docs", "置顶文档", "iconBookmark", ["small", "medium", "wide"], [
        num("limit", "显示条数", 1, 6, 6),
        yn("showPath", "显示文档路径"),
        yn("showChildCount", "显示子文档数"),
        ny("showRank", "显示置顶序号"),
        yn("showUnavailable", "显示不可用文档"),
    ]),
    extMod("inbox-shorthands", "收集箱", "iconInbox", ["small", "medium", "wide"], [
        num("page", "云端页码", 1, 100, 1),
        num("limit", "显示条数", 1, 12, 8),
        txt("query", "筛选标题或正文"),
        yn("showPreview", "显示正文摘要"),
        yn("showLinkHost", "显示链接来源"),
        ny("showRank", "显示序号"),
    ], {source: {pluginId: "siyuan-cloud", name: "思源云端收集箱", icon: "iconInbox", collection: "收集箱", kind: "external"}, network: "remote", auth: "host"}),
    mod("recent-updates", "最近更新", "iconRefresh", ["medium", "wide", "large"], [
        num("limit", "显示条数", 1, 5, 5),
        yn("groupByDocument", "同文档更新合并"),
        yn("showPath", "显示文档路径"),
        yn("showUpdated", "显示更新时间"),
        ny("showRank", "显示序号"),
    ]),
    mod("data-health", "数据健康", "iconCloud", ["small", "medium", "wide"], [
        num("limit", "清单上限", 1, 12, 8),
        txt("query", "筛选名称或路径"),
        sel("sortBy", "排序方式", ["清单顺序", "名称"], "清单顺序"),
        yn("showPath", "显示资源路径"),
        ny("showRank", "显示序号"),
    ]),
    mod("database-list", "数据库", "iconDatabase", ["medium", "wide", "large"], [
        {key: "blockId", label: "绑定单个数据库（表格形态）", type: "database", defaults: ""},
        num("limit", "显示条数", 1, 5, 5),
        nb(),
        txt("query", "名称或路径过滤"),
        sel("sortBy", "排序方式", ["最近更新", "名称", "路径"], "最近更新"),
        yn("showPath", "显示所在路径"),
        ny("showUpdated", "显示更新时间"),
        ny("showRank", "显示序号"),
    ]),
    mod("saved-searches", "已存筛选", "iconSearch", ["small", "medium", "wide"], [
        num("limit", "显示条数", 1, 5, 5),
        txt("query", "名称或关键词过滤"),
        sel("method", "搜索方式", ["全部", "文本", "查询语法", "SQL", "正则", "语义"], "全部"),
        sel("sortBy", "排序方式", ["原顺序", "名称"], "原顺序"),
        yn("showKeyword", "显示搜索词"),
        yn("showMethod", "显示搜索方式"),
        yn("showScope", "显示搜索范围"),
        ny("showRank", "显示序号"),
    ]),
    mod("database-table", "数据库表格", "iconDatabase", ["medium", "wide", "large"], [
        {key: "blockId", label: "选择数据库", type: "database", defaults: ""},
        {key: "columns", label: "展示内容（最多 3 项）", type: "database-columns", defaults: ""},
        num("limit", "显示条数", 1, 8, 8),
        yn("showColumnNames", "显示字段名"),
        ny("showRank", "显示行号"),
    ]),
    mod("database-board", "数据库看板", "iconLayoutRight", ["medium", "wide", "large"], [
        {key: "blockId", label: "选择数据库", type: "database", defaults: ""},
        txt("groupBy", "分组字段"),
        num("limit", "每组条数", 1, 12, 6),
        yn("showCounts", "显示计数"),
        ny("showPercent", "显示占比"),
    ]),
    mod("flashcard-review", "闪卡复习", "iconRiffCard", ["small", "medium", "wide"], [
        nb(),
        num("dailyLimit", "今日上限", 5, 200, 30),
        yn("showPercent", "显示掌握进度"),
        ny("showForecast", "显示推演预测"),
    ]),
]);

const BUILTIN_EXTENSION_MODULES = Object.freeze([]);

function text(value, max = 128) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}

function normalizeConfig(value, depth = 0) {
    if (depth > 3 || !value || typeof value !== "object" || Array.isArray(value)) return {};
    const result = {};
    Object.keys(value).slice(0, 32).forEach((key) => {
        if (!/^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/.test(key)) return;
        const item = value[key];
        if (typeof item === "string") result[key] = item.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 512);
        else if (typeof item === "number" && Number.isFinite(item)) result[key] = item;
        else if (typeof item === "boolean") result[key] = item;
        else if (item && typeof item === "object" && !Array.isArray(item)) result[key] = normalizeConfig(item, depth + 1);
    });
    return result;
}

function normalizeDevice(value) {
    return DEVICES.includes(value) ? value : "desktop";
}

// T-7186：布局档位词汇与 HOME_WIDGET_SIZES 七档一致；归一化必须全量接受。
const LAYOUT_SIZES = Object.freeze(["xs", "small", "medium", "tall", "wide", "large", "full"]);
function normalizeLayout(value) {
    const source = value && typeof value === "object" ? value : {};
    const number = (key, fallback, max) => {
        const n = Number(source[key]);
        return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.floor(n))) : fallback;
    };
    // T-7186：档位词汇 = HOME_WIDGET_SIZES 七档（constants.ts 为视觉事实源）。
    // 历史只留四档导致 xs/tall/full 在落盘回读时被静默清空（T-7186 修复）。
    const size = LAYOUT_SIZES.includes(source.size) ? source.size : "";
    return {x: number("x", 0, 99), y: number("y", 0, 999), w: Math.max(1, number("w", 1, 12)), h: Math.max(1, number("h", 1, 12)), collapsed: source.collapsed === true, size};
}

// T-6969（ADR 0091）：工作台材质目录——纯展示声明，只影响呈现层底色与文字色，
// 不触及组件读取/刷新/配置。显式声明优先，未声明的 moduleId 回退 plain。
// vibrant 仅授予内容自带语义配色的组件（天气=天空），其余组件不得自动取色。
const HOME_TILE_MATERIALS = {
    'external-local-time': 'dark',
    'external-world-clock': 'dark',
    'external-quote-daily': 'dark',
    'external-weather-open-meteo': 'vibrant',
    'external-air-quality': 'vibrant',
    'checkin-streak': 'accent',
    'checkin-today': 'accent',
    'checkin-weekly': 'accent',
    'checkin-summary': 'accent',
    // T-6971 批次⑦：今日写作与写作打卡同为强状态数值组件 → accent（本批提议扩展落地）
    'writing-streak': 'accent',
    'today-writing': 'accent',
    countdown: 'accent',
};

// T-6969 Slice 2：每模块默认档位——添加组件时商店默认选中的档位（键 = 既有
// HOME_WIDGET_SIZES 七档词汇，且必须在该模块 sizes 白名单内，否则回退）。
const HOME_TILE_DEFAULT_SIZES = {
    // T-6980 / T-6971 批次⑧：导航与历史组件按规格卡声明默认档。
    'recent-documents': 'wide',
    'pinned-docs': 'medium',
    // T-7274：首次紧凑工作台使用小卡，用户仍可在商店/编辑态改回 medium。
    favorites: 'small',
    tags: 'small',
    bookmarks: 'small',
    'document-sets': 'medium',
    'fixed-document': 'small',
    'current-document-outline': 'wide',
    'document-relations-summary': 'medium',
    'external-world-clock': 'full',
    'external-weather-open-meteo': 'wide',
    'external-air-quality': 'small',
    'external-quote-daily': 'small',
    countdown: 'small',
    'year-progress': 'small',
    'external-local-time': 'medium',
    'external-rss-subscription': 'wide',
    'external-rss-miniflux': 'wide',
    // T-6971 批次⑥修复：键名必须等于真实 moduleId（external-hot-news-dailyhot），
    // 此前误写 external-news-dailyhot 导致默认档永远走回退而非 wide。
    'external-hot-news-dailyhot': 'wide',
    'external-news-newsnow': 'wide',
    'external-news-hackernews': 'wide',
    'external-github-contrib': 'large',
    'external-activitywatch-time': 'large',
    'journal-calendar': 'large',
    'external-ical-events': 'medium',
    'checkin-today': 'small',
    'checkin-streak': 'wide',
    'checkin-weekly': 'medium',
    'checkin-monthly': 'medium',
    'checkin-year-heatmap': 'large',
    'checkin-occasions': 'medium',
    'checkin-summary': 'medium',
    'database-list': 'medium',
    'database-table': 'wide',
    'database-board': 'wide',
    'flashcard-review': 'medium',
    'saved-searches': 'medium',
    'data-health': 'small',
    'recent-updates': 'wide',
    'recent-edits': 'wide',
    'random-review': 'small',
    'plugin-commands': 'small',
    'today-journal': 'small',
    'journal-monthly': 'medium',
    'recent-daily-notes': 'wide',
    'on-this-day': 'small',
    'today-tasks': 'small',
    'today-reservations': 'small',
    'flashcard-due': 'small',
    'inbox-shorthands': 'medium',
    'quick-capture': 'small',
    'clipped-unread': 'small',
    'external-anime-bangumi': 'medium',
    'external-fx-frankfurter': 'small',
    'external-status-uptimekuma': 'small',
    'external-device-battery': 'small',
    // T-6971 批次⑦：写作统计家族默认档（规格总表「实现对照」）
    'today-writing': 'small',
    'writing-streak': 'small',
    'recent-writing-activity': 'wide',
    'note-stats': 'medium',
};

// T-6969 Slice 3（ADR 0091）：X 英雄位约束——每面板至多 1 个 full 档；超出者
// 降级为 large（8×5）。纯函数：返回降级数量，调用方决定是否落盘。
// T-7030：编辑态重排纯函数——拖拽落点与键盘/按钮移动共用一套索引计算。
// 语义与既有 drop 处理一致：先摘除 from 再插入 to（以缩短后的下标为准）；
// 输入不可变（复制后拼接），同位/越界/找不到一律 moved=false 原样返回。
// T-7030 切片③：拖拽边缘自动滚动增量——指针距滚动容器上/下缘 edgeSize 内时
// 给出固定速度增量（上负下正），已到边界（scrollTop 到顶/底或不可滚）返回 0。
function computeEdgeScrollDelta(offsetY, viewportHeight, scrollTop, maxScrollTop, edgeSize = 48, speed = 14) {
    if (!Number.isFinite(offsetY) || !Number.isFinite(viewportHeight) || maxScrollTop <= 0) return 0;
    if (offsetY <= edgeSize) return scrollTop <= 0 ? 0 : -speed;
    if (offsetY >= viewportHeight - edgeSize) return scrollTop >= maxScrollTop ? 0 : speed;
    return 0;
}
function moveLayoutEntry(list, fromId, toId) {
    const items = (Array.isArray(list) ? list : []).slice();
    const from = items.findIndex((entry) => entry && entry.instanceId === fromId);
    const to = items.findIndex((entry) => entry && entry.instanceId === toId);
    if (from < 0 || to < 0 || from === to) return {list: items, moved: false};
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    return {list: items, moved: true};
}

function moveLayoutEntryByOffset(list, instanceId, delta) {
    const items = (Array.isArray(list) ? list : []).slice();
    const index = items.findIndex((entry) => entry && entry.instanceId === instanceId);
    const to = index + delta;
    if (index < 0 || to < 0 || to >= items.length || delta === 0) return {list: items, moved: false};
    const [moved] = items.splice(index, 1);
    items.splice(to, 0, moved);
    return {list: items, moved: true};
}
function enforceHomeHeroConstraint(list) {
    const entries = Array.isArray(list) ? list : [];
    let seen = false;
    let demoted = 0;
    const next = entries.map((entry) => {
        if (!entry || entry.size !== 'full') return entry;
        if (!seen) { seen = true; return entry; }
        demoted += 1;
        return { ...entry, size: 'large', w: 8, h: 5 };
    });
    return { list: next, demoted };
}

// 解析默认档位：显式声明且在 supported 内 → 用之；否则 supported 含 medium → medium；
// 否则 supported 首个。保证任何模块都有合法默认档。
function resolveHomeTileDefaultSize(moduleId, supported, fallback) {
    const sizes = Array.isArray(supported) && supported.length > 0 ? supported : [];
    const preferred = HOME_TILE_DEFAULT_SIZES[String(moduleId || '')];
    if (preferred && sizes.includes(preferred)) return preferred;
    const fb = String(fallback || 'medium');
    if (sizes.includes(fb)) return fb;
    return sizes[0] || '';
}

const HOME_TILE_MATERIAL_FALLBACK = 'plain';

function resolveHomeTileMaterial(moduleId) {
    const material = HOME_TILE_MATERIALS[String(moduleId || '')];
    return material === 'dark' || material === 'accent' || material === 'vibrant' ? material : HOME_TILE_MATERIAL_FALLBACK;
}

function resolveMobileHomeSize(value) {
    const sizes = Array.isArray(value) ? value : [];
    return sizes.includes(MOBILE_HOME_SIZE) ? MOBILE_HOME_SIZE : (sizes[0] || MOBILE_HOME_SIZE);
}

function normalizeMobileLayout(value) {
    const normalized = normalizeLayout(value);
    return {...normalized, x: 0, w: 12};
}


// 协议 v2 字段归一化
const PROTOCOL_VERSIONS = [1, 2];
const REFRESH_EVENTS = ["switch-protyle", "loaded-protyle", "destroy-protyle"];
const CONFIG_FIELD_TYPES = ["text", "number", "select", "notebook", "date", "document", "favorite-group", "textarea", "secret", "database", "database-columns"];
const LEGACY_MODULE_ALIASES = Object.freeze({"host-recent-docs": "recent-documents"});

function normalizeIsoDate(value) {
    const raw = text(value, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
    const time = Date.parse(`${raw}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === raw ? raw : "";
}

function normalizeProtocolVersion(value) {
    return PROTOCOL_VERSIONS.includes(value) ? value : 1;
}

// T-7161：icon 字段会进入 SVG <use> 引用与商店渲染，第三方来源可写任意文本。
// 只接受合法 symbol ID（思源约定 iconXxx），其余一律回退，杜绝标记进入 DOM。
const ICON_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;

function normalizeIconId(value, fallback) {
    const raw = typeof value === "string" ? value.trim() : "";
    return ICON_ID_PATTERN.test(raw) ? raw : (fallback || "");
}

function normalizeClickCommand(value) {
    const raw = text(value, 128);
    return /^[A-Za-z0-9_-]{1,64}::[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : "";
}

function normalizeHomepage(value) {
    const raw = text(value, 256);
    if (!raw) return "";
    try {
        const url = new URL(raw);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
        return "";
    }
}

function normalizeRefreshOn(value) {
    return Array.isArray(value)
        ? REFRESH_EVENTS.filter((event) => value.includes(event)).slice(0, 3)
        : [];
}

// 协议 v2.4：来源（source）是结构化插件身份，取代过去用 author 自由文本
// 猜来源的做法。pluginId 是稳定分组键，name 是展示名，collection 用于同
// 一个插件内再分系列（如「打卡」「番茄」），order 是组件在套件内的建议顺序。
function normalizeSourceOrder(value) {
    const raw = Number(value);
    return Number.isFinite(raw) ? Math.min(999, Math.max(0, Math.trunc(raw))) : 0;
}

function normalizeSource(value) {
    if (!value || typeof value !== "object") return null;
    const pluginId = text(value.pluginId, 64).replace(/[^A-Za-z0-9._:-]/g, "");
    const name = text(value.name, 64);
    if (!pluginId && !name) return null;
    return {
        pluginId: pluginId || name,
        name: name || pluginId,
        icon: normalizeIconId(value.icon, ""),
        version: text(value.version, 32),
        homepage: normalizeHomepage(value.homepage),
        collection: text(value.collection, 48),
        order: normalizeSourceOrder(value.order),
    };
}

function normalizeConfigSchema(value) {
    if (!Array.isArray(value)) return [];
    // 深度优化后的内置组件需要同时表达来源、范围与显示层级；12 项仍保持有界，
    // 且配置对话框已有分区、滚动与 sticky 操作栏承载长表单（ADR 0061）。
    return value.slice(0, 12).reduce((fields, raw) => {
        if (!raw || typeof raw !== "object") return fields;
        const key = typeof raw.key === "string" ? raw.key.replace(/[^A-Za-z0-9_-]/g, "") : "";
        const label = text(raw.label, 32);
        if (!/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(key) || !label) return fields;
        const type = CONFIG_FIELD_TYPES.includes(raw.type) ? raw.type : "text";
        const field = {key, label, type};
        if (type === "number") {
            const rawMin = Number.isFinite(raw.min) ? Math.trunc(raw.min) : 0;
            const rawMax = Number.isFinite(raw.max) ? Math.trunc(raw.max) : 100;
            field.min = Math.min(rawMin, rawMax);
            field.max = Math.max(rawMin, rawMax);
            if (Number.isFinite(raw.defaults)) field.defaults = Math.max(field.min, Math.min(field.max, Math.trunc(raw.defaults)));
        } else if (type === "select") {
            const options = (Array.isArray(raw.options) ? raw.options : []).slice(0, 12)
                .map((option) => text(typeof option === "object" ? option?.label : option, 32)).filter(Boolean);
            field.options = [...new Set(options)].slice(0, 12);
            if (field.options.length === 0) return fields;
            const selected = text(raw.defaults, 32);
            field.defaults = field.options.includes(selected) ? selected : field.options[0];
        } else if (type === "notebook") {
            // 选项由宿主渲染时用思源笔记本列表动态填充
        } else if (type === "date") {
            field.defaults = normalizeIsoDate(raw.defaults);
        } else if (type === "document") {
            const defaults = text(raw.defaults, 64);
            field.defaults = /^\d{14}-[0-9a-z]+$/i.test(defaults) ? defaults : "";
        } else {
            field.defaults = text(raw.defaults, 128);
        }
        fields.push(field);
        return fields;
    }, []);
}

function normalizeModuleDefinition(value) {
    if (!value || typeof value !== "object") return null;
    const moduleId = text(value.moduleId, 64).replace(/[^A-Za-z0-9._:-]/g, "");
    const title = text(value.title, 64);
    if (!moduleId || !title) return null;
    const supportedDevices = Array.isArray(value.supportedDevices)
        ? DEVICES.filter((device) => value.supportedDevices.includes(device))
        : ["desktop"];
    if (supportedDevices.length === 0) return null;
    const sizeKeys = LAYOUT_SIZES; // T-7186：与归一化词汇同源，防双档表漂移
    const sizes = Array.isArray(value.sizes) ? sizeKeys.filter((key) => value.sizes.includes(key)) : [];
    const availability = AVAILABILITY_LEVELS.includes(value.availability)
        ? value.availability
        : value.category !== "siyuan" ? "external" : CONDITIONAL_MODULES.has(moduleId) ? "conditional" : "ready";
    return {
        moduleId, title,
        icon: normalizeIconId(value.icon, "iconFile"),
        category: text(value.category, 32) || "custom",
        supportedDevices,
        readOnly: value.readOnly !== false,
        sizes: sizes.length > 0 ? sizes : ["medium"],
        description: text(value.description, 96),
        availability,
        protocolVersion: normalizeProtocolVersion(value.protocolVersion),
        viewType: ["calendar", "weekdays", "media", "heatmap"].includes(value.viewType) ? value.viewType : "",
        author: text(value.author, 64),
        homepage: normalizeHomepage(value.homepage),
        source: normalizeSource(value.source),
        clickCommand: normalizeClickCommand(value.clickCommand),
        configSchema: normalizeConfigSchema(value.configSchema),
        refreshOn: normalizeRefreshOn(value.refreshOn),
    };
}

function registerModules(definitions = []) {
    const map = new Map();
    [...DEFAULT_MODULES, ...(Array.isArray(definitions) ? definitions : [])].forEach((item) => {
        const normalized = normalizeModuleDefinition(item);
        if (normalized) map.set(normalized.moduleId, normalized);
    });
    return [...map.values()];
}

function modulesForDevice(definitions, device) {
    const target = normalizeDevice(device);
    return registerModules(definitions).filter((module) => module.supportedDevices.includes(target));
}

function normalizeInstances(value, definitions = DEFAULT_MODULES, allowedModuleIds = null) {
    const known = new Map(registerModules(definitions).map((item) => [item.moduleId, item]));
    const seen = new Set();
    const seenInstanceIds = new Set();
    return (Array.isArray(value) ? value : []).reduce((items, item) => {
        if (!item || typeof item !== "object") return items;
        const rawModuleId = text(item.moduleId, 64);
        const moduleId = LEGACY_MODULE_ALIASES[rawModuleId] || rawModuleId;
        // T-7069：运行时注册的第三方组件（registerHomeModule，calendar#17）不在
        // 内置定义表里，归一化时必须按允许名单保留，否则商店添加即被清除。
        if ((!known.has(moduleId) && !(allowedModuleIds && allowedModuleIds.has(moduleId))) || seen.has(moduleId)) return items;
        const instanceId = text(item.instanceId, 64) || moduleId;
        if (seenInstanceIds.has(instanceId)) return items;
        seen.add(moduleId);
        seenInstanceIds.add(instanceId);
        items.push({instanceId, moduleId, enabled: item.enabled !== false, config: normalizeConfig(item.config)});
        return items;
    }, []);
}

/**
 * @param {unknown} value
 * @param {Set<string> | null} [allowedModuleIds]
 * @returns {{schemaVersion: number, defaultsVersion: number, instances: Array<{instanceId: string, moduleId: string, enabled: boolean, config: Record<string, unknown>}>, layouts: Record<string, Array<{instanceId: string, x: number, y: number, w: number, h: number, collapsed: boolean}>>}}
 */
function normalizeHomeState(value, allowedModuleIds = null) {
    const hasPersistedState = Boolean(value && typeof value === "object" && !Array.isArray(value));
    const source = hasPersistedState ? value : {};
    const instances = normalizeInstances(source.instances, DEFAULT_MODULES, allowedModuleIds);
    const layouts = {};
    DEVICES.forEach((device) => {
        const entries = source.layouts?.[device];
        const normalizeEntry = device === "mobile" ? normalizeMobileLayout : normalizeLayout;
        layouts[device] = Array.isArray(entries) ? entries.slice(0, 64).map((entry) => ({instanceId: text(entry?.instanceId, 64), ...normalizeEntry(entry)})).filter((entry) => entry.instanceId) : [];
    });
    const activeIds = new Set(instances.map((item) => item.instanceId));
    DEVICES.forEach((device) => {
        const occupied = new Set();
        layouts[device] = layouts[device].filter((entry) => {
            if (!activeIds.has(entry.instanceId) || occupied.has(entry.instanceId)) return false;
            occupied.add(entry.instanceId);
            return true;
        });
    });
    return {schemaVersion: HOME_SCHEMA_VERSION, defaultsVersion: normalizeHomeDefaultsVersion(source.defaultsVersion, hasPersistedState), instances, layouts};
}

function migrateHomeState(value, allowedModuleIds = null) {
    const hasPersistedState = Boolean(value && typeof value === "object" && !Array.isArray(value));
    const source = hasPersistedState ? value : {};
    const migrated = normalizeHomeState({
        defaultsVersion: normalizeHomeDefaultsVersion(source.defaultsVersion, hasPersistedState),
        instances: source.instances || source.widgets || [],
        layouts: source.layouts || {desktop: source.layout || []},
    }, allowedModuleIds);
    return migrated;
}

function resolveLayoutConflicts(layouts, instances = []) {
    const allowed = new Set((Array.isArray(instances) ? instances : []).map((item) => text(item?.instanceId, 64)).filter(Boolean));
    const result = {};
    DEVICES.forEach((device) => {
        const occupied = new Set();
        result[device] = (Array.isArray(layouts?.[device]) ? layouts[device] : []).map((entry) => ({
            instanceId: text(entry?.instanceId, 64), ...normalizeLayout(entry),
        })).filter((entry) => {
            if (!allowed.has(entry.instanceId) || occupied.has(entry.instanceId)) return false;
            occupied.add(entry.instanceId);
            return true;
        });
    });
    return result;
}

function getModuleDefinition(definitions, moduleId) {
    return registerModules(definitions).find((item) => item.moduleId === text(moduleId, 64)) || null;
}

// 快速记录与插件命令是主页本地交互模型，不新增生产图模块，保持面板启动路径紧凑。
const QUICK_CAPTURE_ACTION_PREFIX = "action:quick-capture";
function widgetText(value, max = 96) {
    return typeof value === "string"
        ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
        : "";
}
function normalizeQuickCaptureConfig(value) {
    const source = value && typeof value === "object" ? value : {};
    const notebook = widgetText(source.notebook, 64);
    return {
        notebook: /^\d{14}-[0-9a-z]+$/i.test(notebook) ? notebook : "",
        initialText: widgetText(source.initialText, 24),
        includeTime: source.includeTime === "是" || source.includeTime === true,
    };
}
function buildQuickCaptureAction(config) {
    const normalized = normalizeQuickCaptureConfig(config);
    if (!normalized.notebook && !normalized.initialText && !normalized.includeTime) return QUICK_CAPTURE_ACTION_PREFIX;
    const bytes = new TextEncoder().encode(normalized.initialText);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    return `${QUICK_CAPTURE_ACTION_PREFIX}:${normalized.notebook}:${normalized.includeTime ? 1 : 0}:${encoded}`;
}
function parseQuickCaptureAction(value) {
    if (value === QUICK_CAPTURE_ACTION_PREFIX) return normalizeQuickCaptureConfig({});
    if (typeof value !== "string" || !value.startsWith(`${QUICK_CAPTURE_ACTION_PREFIX}:`)) return null;
    try {
        const payload = value.slice(QUICK_CAPTURE_ACTION_PREFIX.length + 1);
        const first = payload.indexOf(":");
        const second = payload.indexOf(":", first + 1);
        if (first < 0 || second < 0) return null;
        const encoded = payload.slice(second + 1).replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="));
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return normalizeQuickCaptureConfig({
            notebook: payload.slice(0, first),
            includeTime: payload.slice(first + 1, second) === "1",
            initialText: new TextDecoder().decode(bytes),
        });
    } catch (_) {
        return null;
    }
}
function buildQuickCaptureInitialText(config, now = new Date()) {
    const normalized = normalizeQuickCaptureConfig(config);
    const prefix = normalized.includeTime && now instanceof Date && Number.isFinite(now.getTime())
        ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} `
        : "";
    return `${prefix}${normalized.initialText}`.slice(0, 160);
}
function normalizePluginCommandsConfig(value) {
    const source = value && typeof value === "object" ? value : {};
    const rawLimit = Math.trunc(Number(source.limit));
    return {
        limit: Number.isFinite(rawLimit) ? Math.min(5, Math.max(1, rawLimit)) : 5,
        query: widgetText(source.query || source.filter, 64),
        plugin: widgetText(source.plugin, 64),
        sortBy: ["插件顺序", "命令名称", "插件名称"].includes(source.sortBy) ? source.sortBy : "插件顺序",
        showPlugin: source.showPlugin !== "否" && source.showPlugin !== false,
        showRank: source.showRank === "是" || source.showRank === true,
    };
}
// T-6464：localeCompare 缺省 locale 随宿主 ICU 漂移（CI 镜像升级实证：同一测试
// 在新旧 Runner 上给出不同的 CJK 顺序）。中文排序显式钉定拼音 Collator。
const zhSortCollator = new Intl.Collator("zh-Hans-CN");
const compareZh = (left, right) => zhSortCollator.compare(left, right);

function buildPluginCommandsSnapshot(commands, config, labels = {}) {
    if (!Array.isArray(commands)) return null;
    const normalized = normalizePluginCommandsConfig(config);
    const query = normalized.query.toLocaleLowerCase();
    const pluginQuery = normalized.plugin.toLocaleLowerCase();
    const entries = [];
    const seen = new Set();
    commands.forEach((command, order) => {
        if (!command || typeof command !== "object") return;
        const value = widgetText(command.value, 128);
        const label = widgetText(command.label, 96);
        const pluginName = widgetText(command.pluginName, 64);
        const pluginTitle = widgetText(command.pluginTitle, 64) || pluginName;
        if (!value || !label || seen.has(value)) return;
        const searchText = `${label}\n${pluginTitle}\n${pluginName}\n${widgetText(command.commandKey, 64)}`.toLocaleLowerCase();
        if (query && !searchText.includes(query)) return;
        if (pluginQuery && !`${pluginTitle}\n${pluginName}`.toLocaleLowerCase().includes(pluginQuery)) return;
        seen.add(value);
        entries.push({value, label, pluginTitle, order});
    });
    entries.sort((left, right) => {
        if (normalized.sortBy === "命令名称") return compareZh(left.label, right.label) || left.order - right.order;
        if (normalized.sortBy === "插件名称") return compareZh(left.pluginTitle, right.pluginTitle) || compareZh(left.label, right.label) || left.order - right.order;
        return left.order - right.order;
    });
    const items = entries.slice(0, normalized.limit).map((entry, index) => ({
        label: entry.label,
        value: `cmd:${entry.value}`,
        ...(normalized.showPlugin && entry.pluginTitle ? {secondary: entry.pluginTitle} : {}),
        ...(normalized.showRank ? {rank: index + 1} : {}),
    }));
    return {
        stat: {value: entries.length > items.length ? `${items.length}/${entries.length}` : String(entries.length), label: widgetText(labels.stat, 32) || "可执行命令"},
        emptyHint: items.length === 0
            ? (query || pluginQuery ? widgetText(labels.emptyFiltered, 96) || "没有符合筛选条件的插件命令" : widgetText(labels.empty, 96) || "暂无可执行插件命令")
            : "",
        items,
    };
}

// T-6967 S2：15 分钟心跳族唯一登记处——工作台心跳刷新（second-panel-ui）与
// 商店详情元信息「刷新」行（home-store-ui）同源消费；放本模块是因为两个消费方
// 都已依赖 home-model（避免为 11 个 id 拉入 46 KB 的 external-widget-model 整模块）。
// 新增联网组件进入心跳族时只改这一个清单（契约 batch3/batch6 钉住成员）。
const LIFE_HEARTBEAT_MODULE_IDS = Object.freeze([
    "external-weather-open-meteo",
    "external-air-quality",
    "external-anime-bangumi",
    "external-hot-news-dailyhot",
    "external-news-newsnow",
    "external-news-hackernews",
    "external-activitywatch-time",
    "external-status-uptimekuma",
    "external-fx-frankfurter",
    "external-rss-miniflux",
    "external-rss-subscription",
]);

function isLifeHeartbeatModule(moduleId) {
    return LIFE_HEARTBEAT_MODULE_IDS.includes(typeof moduleId === "string" ? moduleId : "");
}

// T-7485: 小组件自定义静默刷新周期与离线容灾配置预设
const REFRESH_INTERVAL_PRESETS = Object.freeze([
    {value: 0, label: "跟随系统默认（15分钟）"},
    {value: 5, label: "5 分钟"},
    {value: 10, label: "10 分钟"},
    {value: 15, label: "15 分钟"},
    {value: 30, label: "30 分钟"},
    {value: 60, label: "1 小时"},
]);

function resolveWidgetRefreshInterval(config, defaultMinutes = 15) {
    if (!config || typeof config !== "object") return {minutes: defaultMinutes, ms: defaultMinutes * 60 * 1000};
    const raw = Number(config.refreshIntervalMinutes ?? config.refreshInterval);
    if (!Number.isFinite(raw) || raw <= 0) return {minutes: defaultMinutes, ms: defaultMinutes * 60 * 1000};
    const clamped = Math.min(1440, Math.max(1, Math.trunc(raw)));
    return {minutes: clamped, ms: clamped * 60 * 1000};
}

function getSecretConfigKeysByModule(definitions = []) {
    const modules = registerModules(Array.isArray(definitions) ? definitions : []);
    const map = new Map();
    modules.forEach((mod) => {
        if (!mod || !Array.isArray(mod.configSchema)) return;
        const secretKeys = mod.configSchema
            .filter((field) => field && field.type === "secret" && typeof field.key === "string" && field.key)
            .map((field) => field.key);
        if (secretKeys.length > 0) {
            map.set(mod.moduleId, secretKeys);
        }
    });
    return map;
}

function sanitizeHomeStateSecrets(homeState, definitions = []) {
    if (!homeState || typeof homeState !== "object") return homeState ?? null;
    const secretMap = getSecretConfigKeysByModule(definitions);
    const cloned = {
        ...homeState,
        ...(Array.isArray(homeState.instances) ? {
            instances: homeState.instances.map((inst) => {
                if (!inst || typeof inst !== "object") return inst;
                const config = inst.config && typeof inst.config === "object" && !Array.isArray(inst.config)
                    ? {...inst.config}
                    : {};
                const secretKeys = secretMap.get(inst.moduleId) || [];
                for (const key of secretKeys) {
                    if (Object.prototype.hasOwnProperty.call(config, key)) {
                        config[key] = "";
                    }
                }
                return {...inst, config};
            }),
        } : {}),
    };
    return cloned;
}

function restoreHomeStateSecrets(incomingHomeState, existingHomeState, definitions = []) {
    if (!incomingHomeState || typeof incomingHomeState !== "object") return incomingHomeState;
    if (!existingHomeState || typeof existingHomeState !== "object" || !Array.isArray(existingHomeState.instances)) {
        return incomingHomeState;
    }
    const secretMap = getSecretConfigKeysByModule(definitions);
    const existingByInstanceId = new Map();
    const existingByModuleId = new Map();
    existingHomeState.instances.forEach((inst) => {
        if (!inst || typeof inst !== "object") return;
        if (inst.instanceId) existingByInstanceId.set(inst.instanceId, inst);
        if (inst.moduleId && !existingByModuleId.has(inst.moduleId)) existingByModuleId.set(inst.moduleId, inst);
    });
    if (!Array.isArray(incomingHomeState.instances)) return incomingHomeState;
    return {
        ...incomingHomeState,
        instances: incomingHomeState.instances.map((inst) => {
            if (!inst || typeof inst !== "object") return inst;
            const secretKeys = secretMap.get(inst.moduleId) || [];
            if (secretKeys.length === 0) return inst;
            const existing = existingByInstanceId.get(inst.instanceId) || existingByModuleId.get(inst.moduleId);
            const existingConfig = existing?.config && typeof existing.config === "object" ? existing.config : null;
            if (!existingConfig) return inst;
            const config = inst.config && typeof inst.config === "object" && !Array.isArray(inst.config)
                ? {...inst.config}
                : {};
            for (const key of secretKeys) {
                const incomingVal = typeof config[key] === "string" ? config[key] : "";
                const existingVal = typeof existingConfig[key] === "string" ? existingConfig[key] : "";
                if (!incomingVal && existingVal) {
                    config[key] = existingVal;
                }
            }
            return {...inst, config};
        }),
    };
}

module.exports = {
    LAYOUT_SIZES, REFRESH_INTERVAL_PRESETS, resolveWidgetRefreshInterval, LIFE_HEARTBEAT_MODULE_IDS, isLifeHeartbeatModule, HOME_TILE_MATERIALS, HOME_TILE_MATERIAL_FALLBACK, resolveHomeTileMaterial, HOME_TILE_DEFAULT_SIZES, resolveHomeTileDefaultSize, enforceHomeHeroConstraint, moveLayoutEntry, moveLayoutEntryByOffset, computeEdgeScrollDelta, HOME_SCHEMA_VERSION, HOME_DEFAULTS_VERSION, HOME_DEFAULT_WIDGETS, HOME_DEFAULT_MODULE_IDS, resolveHomeStarterSize, resolveHomeStarterLayout, normalizeHomeDefaultsVersion, prepareHomeDefaultState, DEVICES, DEFAULT_MODULES, BUILTIN_EXTENSION_MODULES, AVAILABILITY_LEVELS, MOBILE_HOME_SIZE, resolveMobileHomeSize, normalizeMobileLayout, normalizeProtocolVersion, normalizeClickCommand, normalizeHomepage, normalizeRefreshOn, normalizeIconId, normalizeIsoDate, normalizeConfigSchema, normalizeModuleDefinition, registerModules, modulesForDevice, getModuleDefinition, normalizeInstances, normalizeLayout, normalizeHomeState, migrateHomeState, resolveLayoutConflicts, QUICK_CAPTURE_ACTION_PREFIX, normalizeQuickCaptureConfig, buildQuickCaptureAction, parseQuickCaptureAction, buildQuickCaptureInitialText, normalizePluginCommandsConfig, buildPluginCommandsSnapshot, WORKBENCH_SCENE_PRESETS, applyWorkbenchScenePreset, sanitizeHomeStateSecrets, restoreHomeStateSecrets};
