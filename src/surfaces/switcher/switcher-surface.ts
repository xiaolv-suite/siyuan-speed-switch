export interface ISwitcherSurfaceLabels {
    searchTabs: string;
    cancel?: string;
    searchFilters: string;
    setSortBy: string;
    exitFullscreen: string;
    enterFullscreen: string;
    journalBtn: string;
    homeRefreshAll?: string;
    settings: string;
    snippetStudioOpen: string;
    platformGuideButton?: string;
    homeActivityStreamTitle?: string;
    chipsLabel?: string;
    quickActions?: string;
    backTop?: string;
    [key: string]: string | undefined;
}

export function buildSwitcherHtml(fullscreen: boolean, i18n: ISwitcherSurfaceLabels): string {
    return `<div class="speed-switch sw__body sw-platform-surface sw-platform-surface--switcher${fullscreen ? " sw--fullscreen" : ""}" data-sw-surface="switcher">
    <div class="sw__main">
        <div class="sw__dock fn__none"></div>
        <div class="sw__content">
            <div class="sw__toolbar">
                <div class="sw__search-wrap">
                    <svg class="sw__search-icon" width="14" height="14"><use xlink:href="#iconSearch"></use></svg>
                    <input class="b3-text-field sw__search" placeholder="${i18n.searchTabs}" aria-label="${i18n.searchTabs}" autocomplete="off" spellcheck="false" />
                    <button type="button" class="sw__search-clear fn__none b3-tooltips b3-tooltips__s" aria-label="${i18n.cancel || "清除"}" title="${i18n.cancel || "清除"}">
                        <svg width="12" height="12"><use xlink:href="#iconClose"></use></svg>
                    </button>
                    <button type="button" class="sw__search-filter-btn b3-tooltips b3-tooltips__s" aria-label="${i18n.searchFilters} · 筛选笔记本/路径/类型" title="${i18n.searchFilters}">
                        <svg width="14" height="14"><use xlink:href="#iconFilter"></use></svg>
                    </button>
                </div>
                <div class="sw__select-wrap">
                    <div class="sw__fav-dd"></div>
                </div>
                <div class="sw__select-wrap">
                    <div class="sw__history-dd"></div>
                </div>
                <div class="sw__select-wrap">
                    <button type="button" class="b3-button b3-button--text sw__sort-trigger b3-tooltips b3-tooltips__s" aria-label="${i18n.setSortBy} · 排序与分组">
                        <svg width="16" height="16"><use xlink:href="#iconSort"></use></svg>
                        <span class="sw__sort-trigger-label"></span>
                    </button>
                </div>
                <button type="button" class="b3-button b3-button--text sw__icon-btn sw__fullscreen-btn b3-tooltips b3-tooltips__s" aria-label="${fullscreen ? i18n.exitFullscreen : i18n.enterFullscreen} · 切换全屏" title="${fullscreen ? i18n.exitFullscreen : i18n.enterFullscreen}">
                    <svg class="sw__fs-enter" width="16" height="16" viewBox="0 0 24 24"><path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <svg class="sw__fs-exit" width="16" height="16" viewBox="0 0 24 24"><path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="b3-button b3-button--text sw__icon-btn sw__journal-btn b3-tooltips b3-tooltips__s" aria-label="${i18n.journalBtn} · 打开或新建今日日记" title="${i18n.journalBtn}">
                    <svg width="16" height="16"><use xlink:href="#iconCalendar"></use></svg>
                </button>
                <button type="button" class="b3-button b3-button--text sw__icon-btn sw__refresh-btn b3-tooltips b3-tooltips__s" aria-label="${i18n.homeRefreshAll || "刷新"} · 刷新页签与组件数据" title="${i18n.homeRefreshAll || "刷新"}">
                    <svg width="16" height="16"><use xlink:href="#iconRefresh"></use></svg>
                </button>
                <button type="button" class="b3-button b3-button--text sw__icon-btn sw__settings-btn b3-tooltips b3-tooltips__s" aria-label="${i18n.settings} · 插件设置" title="${i18n.settings}">
                    <svg width="16" height="16"><use xlink:href="#iconSettings"></use></svg>
                </button>
                <button type="button" class="b3-button b3-button--text sw__icon-btn sw__snippet-studio-btn b3-tooltips b3-tooltips__s" aria-label="${i18n.snippetStudioOpen} · 代码片段实验室" title="${i18n.snippetStudioOpen}">
                    <svg width="16" height="16"><use xlink:href="#iconCode"></use></svg>
                </button>
                <button type="button" class="b3-button b3-button--text sw__icon-btn sw__help-guide-btn b3-tooltips b3-tooltips__s" aria-label="${i18n.platformGuideButton || "快速开始"} · 使用说明与快捷键指引" title="${i18n.platformGuideButton || "快速开始"}">
                    <svg width="16" height="16"><use xlink:href="#iconHelp"></use></svg>
                </button>
                <button type="button" class="b3-button b3-button--text sw__icon-btn sw__activity-stream-btn b3-tooltips b3-tooltips__s" aria-label="${i18n.homeActivityStreamTitle || "今日生态流"}" title="${i18n.homeActivityStreamTitle || "今日生态流"}">
                    <svg width="16" height="16"><use xlink:href="#iconSparkles"></use></svg>
                </button>
            </div>
            <div class="sw__mode-chips-bar" role="group" aria-label="${i18n.chipsLabel || "模式"}"></div>
            <div class="sw__scroll" tabindex="0"></div>
            <div class="sw__workbench-dock fn__none"></div>
            <div class="sw__quick-actions" role="toolbar" aria-label="${i18n.quickActions || "快捷操作"}"></div>
            <div class="sw__ecosystem-status" role="status" title="小驴全家桶协同指示器"></div>
            <button type="button" class="sw__back-top b3-tooltips b3-tooltips__n" aria-label="${i18n.backTop || "回到顶部"}">
                <svg><use xlink:href="#iconUp"></use></svg>
            </button>
        </div>
        <div class="sw__quick-rail fn__none" role="toolbar" aria-label="${i18n.quickActions || "快捷操作"}"></div>
    </div>
</div>`;
}
