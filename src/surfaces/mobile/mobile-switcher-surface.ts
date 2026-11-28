export interface IMobileSwitcherSurfaceLabels {
    dialogSwitcherTitle?: string;
    platformCloseHint?: string;
    searchTabs: string;
    searchTabsMobile?: string;
    cancel?: string;
    searchFilters: string;
    setSortBy: string;
    sortMru: string;
    sortLayout: string;
    sortLayoutDesc: string;
    sortUpdatedDesc: string;
    sortTitleAsc: string;
    sortTitleDesc: string;
    close: string;
    favorites: string;
    journalBtn: string;
    settings: string;
    settingsShort: string;
    platformGuideButton?: string;
    chipsLabel: string;
    quickActions: string;
    [key: string]: string | undefined;
}

export function buildMobileSwitcherHtml(i18n: IMobileSwitcherSurfaceLabels): string {
    return `<div class="speed-switch sw__body sw__mobile sw__mobile--initializing sw-platform-surface sw-platform-surface--switcher" data-sw-surface="switcher" style="visibility:hidden;opacity:0;pointer-events:none">
    <div class="sw__toolbar sw__mobile-toolbar">
        <div class="sw__search-wrap">
            <svg class="sw__search-icon" width="14" height="14"><use xlink:href="#iconSearch"></use></svg>
            <input class="b3-text-field sw__search" placeholder="${i18n.searchTabsMobile || "搜索页签/文档…"}" aria-label="${i18n.searchTabs}" autocomplete="off" spellcheck="false" />
            <button type="button" class="sw__search-clear fn__none" aria-label="${i18n.cancel || "清除"}" title="${i18n.cancel || "清除"}">
                <svg width="12" height="12"><use xlink:href="#iconClose"></use></svg>
            </button>
            <button type="button" class="sw__search-filter-btn" aria-label="${i18n.searchFilters}" title="${i18n.searchFilters}">
                <svg width="15" height="15"><use xlink:href="#iconFilter"></use></svg>
            </button>
        </div>
        <button type="button" class="b3-button b3-button--text sw__sort-btn" aria-label="${i18n.setSortBy}"></button>
        <select class="b3-select sw__sort fn__none" aria-label="${i18n.setSortBy}">
            <option value="mru">${i18n.sortMru}</option>
            <option value="layout">${i18n.sortLayout}</option>
            <option value="layoutDesc">${i18n.sortLayoutDesc}</option>
            <option value="updatedDesc">${i18n.sortUpdatedDesc}</option>
            <option value="titleAsc">${i18n.sortTitleAsc}</option>
            <option value="titleDesc">${i18n.sortTitleDesc}</option>
        </select>
        <button type="button" class="b3-button b3-button--text sw__icon-btn sw__mobile-close-btn" aria-label="${i18n.close}">
            <svg width="16" height="16"><use xlink:href="#iconClose"></use></svg>
        </button>
        <div class="sw__toolbar-row2">
            <button type="button" class="b3-button b3-button--text sw__icon-btn sw__mobile-fav-btn" aria-label="${i18n.favorites}">
                <svg width="16" height="16"><use xlink:href="#iconStar"></use></svg><span class="sw__mobile-chip-label">${i18n.favorites}</span>
            </button>
            <div class="sw__history-dd"></div>
            <button type="button" class="b3-button b3-button--text sw__icon-btn sw__journal-btn" aria-label="${i18n.journalBtn}" title="${i18n.journalBtn}">
                <svg width="16" height="16"><use xlink:href="#iconCalendar"></use></svg><span class="sw__mobile-chip-label">${i18n.journalBtn}</span>
            </button>
            <button type="button" class="b3-button b3-button--text sw__icon-btn sw__settings-btn" aria-label="${i18n.settings}">
                <svg width="16" height="16"><use xlink:href="#iconSettings"></use></svg><span class="sw__mobile-chip-label">${i18n.settingsShort}</span>
            </button>
            <button type="button" class="b3-button b3-button--text sw__icon-btn sw__help-guide-btn" aria-label="${i18n.platformGuideButton || "指南"}">
                <svg width="16" height="16"><use xlink:href="#iconHelp"></use></svg><span class="sw__mobile-chip-label">${i18n.platformGuideButton || "指南"}</span>
            </button>
        </div>
    </div>
    <div class="sw__mode-chips-bar" role="group" aria-label="${i18n.chipsLabel}"></div>
    <div class="sw__scroll" tabindex="0"></div>
    <div class="sw__quick-actions sw__mobile-bottom-bar" role="toolbar" aria-label="${i18n.quickActions}"></div>
</div>`;
}
