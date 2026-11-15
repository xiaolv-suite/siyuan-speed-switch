// 小驴雷切 —— 统计优先关键指标栏 UI (T-7690~T-7692)
// 挂载至切换器与工作台主内容顶层，大数字配小标签，竖分隔而非卡片包裹，支持一键联动与自适应折叠。

import {
    buildPlatformMetrics,
    resolveMetricActionKey,
    IPlatformMetricsStats,
    IPlatformMetricsLabels,
    IPlatformMetricItem,
} from "./platform-metrics-model";

export interface IPlatformMetricsBarOptions {
    stats: IPlatformMetricsStats;
    labels?: IPlatformMetricsLabels;
    i18n?: Record<string, string>;
    activeKey?: string | null;
    onSelect?: (key: string, actionKey: string) => void;
}

export interface IPlatformMetricsBarHandle {
    element: HTMLElement;
    update: (newStats?: IPlatformMetricsStats, newActiveKey?: string | null) => void;
    destroy: () => void;
}

export function renderPlatformMetricsBar(
    container: HTMLElement,
    options: IPlatformMetricsBarOptions
): IPlatformMetricsBarHandle {
    let currentStats = {...options.stats};
    const host = {i18n: options.i18n || {}};
    const currentLabels: IPlatformMetricsLabels = {
        tabs: options.labels?.tabs || host.i18n.platformMetricTabs,
        favorites: options.labels?.favorites || host.i18n.platformMetricFavorites,
        tasks: options.labels?.tasks || host.i18n.platformMetricTasks,
        history: options.labels?.history || host.i18n.platformMetricHistory,
    };
    let currentActiveKey: string | null = options.activeKey || null;

    const barEl = document.createElement("div");
    barEl.className = "sw-platform-metrics-bar";
    barEl.setAttribute("role", "region");
    barEl.setAttribute("aria-label", currentLabels.tabs ? "工作平台关键指标" : "Platform Key Metrics");

    const itemMap = new Map<string, {itemEl: HTMLElement; valEl: HTMLElement}>();

    const rebuildItems = () => {
        barEl.innerHTML = "";
        itemMap.clear();
        const metrics: IPlatformMetricItem[] = buildPlatformMetrics(currentStats, currentLabels);

        metrics.forEach((metric, index) => {
            const itemEl = document.createElement("div");
            itemEl.className = "sw-platform-metric-item"
                + (metric.isPrimary ? "" : " is-secondary")
                + (metric.isDataAccent ? " is-data-accent" : "")
                + (currentActiveKey === metric.key ? " is-active" : "");
            itemEl.setAttribute("role", "button");
            itemEl.setAttribute("tabindex", "0");
            itemEl.setAttribute("data-key", metric.key);
            itemEl.setAttribute("aria-label", `${metric.label}: ${metric.value}`);
            itemEl.setAttribute("aria-pressed", currentActiveKey === metric.key ? "true" : "false");

            const valEl = document.createElement("span");
            valEl.className = "sw-platform-metric-value";
            valEl.textContent = metric.value;

            const labelEl = document.createElement("span");
            labelEl.className = "sw-platform-metric-label";
            labelEl.textContent = metric.label;

            itemEl.appendChild(valEl);
            itemEl.appendChild(labelEl);

            const handleTrigger = () => {
                const nextKey = currentActiveKey === metric.key ? null : metric.key;
                currentActiveKey = nextKey;
                updateActiveClasses();
                if (options.onSelect) {
                    const actionKey = resolveMetricActionKey(metric.key);
                    options.onSelect(metric.key, actionKey);
                }
            };

            itemEl.addEventListener("click", handleTrigger);
            itemEl.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTrigger();
                }
            });

            barEl.appendChild(itemEl);
            itemMap.set(metric.key, {itemEl, valEl});

            // 最后一个指标之后不需要分隔线
            if (index < metrics.length - 1) {
                const divider = document.createElement("div");
                divider.className = "sw-platform-metric-divider" + (metric.isPrimary ? "" : " is-secondary");
                divider.setAttribute("aria-hidden", "true");
                barEl.appendChild(divider);
            }
        });
    };

    const updateActiveClasses = () => {
        itemMap.forEach(({itemEl}, key) => {
            const isActive = currentActiveKey === key;
            itemEl.classList.toggle("is-active", isActive);
            itemEl.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    };

    rebuildItems();
    container.appendChild(barEl);

    return {
        element: barEl,
        update: (newStats?: IPlatformMetricsStats, newActiveKey?: string | null) => {
            if (newStats) {
                currentStats = {...currentStats, ...newStats};
            }
            if (typeof newActiveKey !== "undefined") {
                currentActiveKey = newActiveKey;
            }
            const metrics = buildPlatformMetrics(currentStats, currentLabels);
            metrics.forEach((metric) => {
                const mapped = itemMap.get(metric.key);
                if (mapped) {
                    mapped.valEl.textContent = metric.value;
                    mapped.itemEl.setAttribute("aria-label", `${metric.label}: ${metric.value}`);
                }
            });
            updateActiveClasses();
        },
        destroy: () => {
            barEl.remove();
            itemMap.clear();
        },
    };
}
