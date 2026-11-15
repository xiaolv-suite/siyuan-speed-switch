// 平台统计优先关键指标纯函数模型 (T-7666)
// 遵循无状态纯函数设计，数据由调用方提供，零副作用。

export interface IPlatformMetricItem {
    key: "tabs" | "favs" | "tasks" | "history" | string;
    label: string;
    value: string;
    isPrimary: boolean;
    isDataAccent: boolean;
}

export interface IPlatformMetricsStats {
    tabsCount?: number;
    favsCount?: number;
    tasksCount?: number;
    historyCount?: number;
}

export interface IPlatformMetricsLabels {
    tabs?: string;
    favorites?: string;
    tasks?: string;
    history?: string;
}

export function boundedMetricCount(count: unknown, max = 999): number {
    const num = Number(count);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.min(Math.floor(num), max);
}

export function formatMetricDisplay(count: unknown): string {
    const bounded = boundedMetricCount(count);
    return bounded > 99 ? "99+" : String(bounded);
}

export function buildPlatformMetrics(
    stats: IPlatformMetricsStats = {},
    labels: IPlatformMetricsLabels = {}
): IPlatformMetricItem[] {
    return [
        {
            key: "tabs",
            label: labels.tabs || "已开页签",
            value: formatMetricDisplay(stats.tabsCount),
            isPrimary: true,
            isDataAccent: false,
        },
        {
            key: "favs",
            label: labels.favorites || "我的收藏",
            value: formatMetricDisplay(stats.favsCount),
            isPrimary: false,
            isDataAccent: false,
        },
        {
            key: "tasks",
            label: labels.tasks || "今日待办",
            value: formatMetricDisplay(stats.tasksCount),
            isPrimary: true,
            isDataAccent: true, // 采用极光青绿数据语义色
        },
        {
            key: "history",
            label: labels.history || "最近文档",
            value: formatMetricDisplay(stats.historyCount),
            isPrimary: false,
            isDataAccent: false,
        },
    ];
}

export function resolveMetricActionKey(key: string): string {
    switch (key) {
        case "tabs": return "tabs";
        case "favs": return "favorites";
        case "tasks": return "task";
        case "history": return "history";
        default: return "all";
    }
}
