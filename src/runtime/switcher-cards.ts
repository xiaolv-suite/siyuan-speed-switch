import {getAllTabs, getActiveTab} from "siyuan";
import {lvNotify} from "../libs/lv-notice-kit";
import {resolveEffectiveMotion} from "../libs/lv-ui-prefs";
import {lvMascot} from "../libs/ui/mascots";
import {logger} from "../logger";
import {getVisibleSwitcherCards, detectSpecialTabKind, sortItems as sortItemsUtil, sortGroupItems as sortGroupItemsUtil, groupTabsByMode, resolveIconFallback, buildTabGroupsByParent, resolveTabRootId, isSuccessfulMobileTabsResult} from "../util";
import {formatChangedWindowStart, updatedChangedWithin} from "../recent-closed";
import {buildOpenedDocumentScope, buildSearchDocumentFilterMatcher, formatUpdatedBadge, matchesParsedQuery, parseSearchQuery, pinyinTitleHit, resolveSearchNotebookId} from "../search-model";
import {cancelDocPreview, mountDocPreviewPane} from "../doc-search-ui";
import {MESSAGE_DEFAULT_MS, TAB_SETTLE_MS, TAB_VERIFY_TIMEOUT_MS, THUMB_BATCH, GROUP_FLOW_GAP_PX, TabGroupMode} from "../constants";
import {getSiyuan, IProtyleTabModel} from "../types";
import {type ITabGroupRenderCtx, type Tab, type IDocSearchFilters, type SortBy, type IOverlayClose, type ISwSettings, type IGroupedTab, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface SwitcherCardsRuntime extends Omit<ISpeedSwitchHost, "getActiveTab" | "filterCards" | "sortItems" | "renderList" | "updateDigitBadges" | "sortGroupItems" | "renderTabGroup" | "renderGroupedList" | "renderNamedTabGroup" | "acquireGroupCard" | "buildTabGroupGrid" | "syncCardState" | "buildEmptyState" | "handleTogglePin" | "handleToggleFav" | "closeActiveTabForAction" | "closeTabQuietly" | "waitForTabStates" | "sleep" | "handleCloseTab" | "createCard" | "buildCardThumb" | "buildCardMeta" | "refreshCardUpdatedBadges" | "buildCardIcon" | "buildCardActions" | "bindCardLongPress" | "titleOf" | "rootIdOf" | "pinKeyOf" | "escapeAttr" | "currentTabs"> {}
export class SwitcherCardsRuntime {
    // 获取当前活动页签（可能为 undefined）
    private getActiveTab(): Tab | undefined {
        try {
            // The default `wndActive=true` guard returns undefined whenever the
            // host window is not OS-focused (headless/remote WebView, a dock
            // opened from another window, or a background automation run).
            // Keep that result as the fast path, then ask SiYuan for the
            // current tab without the focus gate so read-only widgets still
            // follow the document the user just opened.
            return getActiveTab() || getActiveTab(false) || undefined;
        } catch (e) {
            logger.warn("get active tab fail", e);
        }
        return undefined;
    }

    // 按关键字过滤卡片，整组无匹配时隐藏分组；返回可见卡片数
    private filterCards(
        scrollElement: HTMLElement,
        keyword: string,
        contentRoots: Set<string> = new Set(),
        filters: IDocSearchFilters = this.docSearchState.filters.get(scrollElement) || {},
        parsedQuery?: {phrases: string[]; excludes: string[]; terms: string[]},
    ): number {
        const kw = keyword.trim().toLowerCase();
        // 深入穿透检索模式（@大纲, ^正文块, #标签, !书签, >命令, -待办, ?速查等）直接短路，页签区无需计算本地拼音与标题包含
        const isHyphenTaskMode = kw.startsWith("- ") || kw.startsWith("－ ")
            || ((kw.startsWith("-") || kw.startsWith("－")) && (
                !kw.includes(" ")
                || !(kw.match(/\x22([^\x22]*)\x22|(\S+)/g) || []).some((t, idx) => idx > 0 && !t.startsWith("-") && !t.startsWith("－"))
            ));
        const isPenetrationMode = /^(@|＠|\^|＾|#|＃|!|！|\*|＊|>|》|\?|？|task:|task：|\[ \])/.test(kw)
            || isHyphenTaskMode;
        if (isPenetrationMode) {
            scrollElement.querySelectorAll<HTMLElement>(".sw__card").forEach((card) => {
                card.classList.add("fn__none");
                card.removeAttribute("data-sw-digit");
            });
            scrollElement.querySelectorAll<HTMLElement>(".sw__group:not(.sw__doc-results)").forEach((group) => {
                group.classList.add("fn__none");
            });
            return 0;
        }

        const parsed = parsedQuery || parseSearchQuery(keyword);
        const parsedPositive = parsed.phrases.length + parsed.terms.length;
        const pinyinOn = this.getSettings().pinyinMatch !== false;
        const allowLocalTitleMatch = (!filters.method || filters.method === "keyword")
            && (!filters.types || filters.types.document === true)
            && !filters.subTypes;
        const matchesScope = buildSearchDocumentFilterMatcher(filters);
        const searchIndex = (this.cardSearchIndex ||= new WeakMap());
        let visible = 0;
        scrollElement.querySelectorAll<HTMLElement>(".sw__card").forEach((card) => {
            const rawTitle = card.dataset.title || "";
            const rawPath = card.dataset.searchPath || "";
            const rawPlugin = card.dataset.pluginName || "";
            let indexed = searchIndex.get(card);
            if (!indexed || indexed.rawTitle !== rawTitle || indexed.rawPath !== rawPath || indexed.rawPlugin !== rawPlugin) {
                indexed = {rawTitle, rawPath, rawPlugin, title: rawTitle.toLowerCase(), path: rawPath.toLowerCase(), plugin: rawPlugin.toLowerCase()};
                searchIndex.set(card, indexed);
            }
            const {title, path, plugin} = indexed;
            const rootId = card.dataset.rootId || "";
            const matchesScopeCard = matchesScope({
                path: card.dataset.searchPath || "",
                hPath: card.dataset.searchPath || "",
                notebookId: card.dataset.notebookId || "",
            });
            const excluded = parsed.excludes.some((bad) => title.includes(bad) || path.includes(bad) || (plugin && plugin.includes(bad)));
            const titleMatch = excluded
                ? false
                : (parsedPositive > 0 || parsed.excludes.length > 0
                    ? parsed.phrases.every((phrase) => title.includes(phrase) || (plugin && plugin.includes(phrase)))
                        && parsed.terms.every((term) => title.includes(term) || (plugin && plugin.includes(term)) || (pinyinOn && pinyinTitleHit(title, term)))
                    : (!kw || title.includes(kw) || (plugin && plugin.includes(kw))));
            const pathMatch = excluded
                ? false
                : (parsedPositive > 0 || parsed.excludes.length > 0
                    ? matchesParsedQuery(path, parsed)
                    : (!kw || path.includes(kw)));
            const match = matchesScopeCard
                && (!kw || (allowLocalTitleMatch && titleMatch) || contentRoots.has(rootId));
            card.classList.toggle("fn__none", !match);
            const contentHit = match && contentRoots.has(rootId) && !(allowLocalTitleMatch && (titleMatch || pathMatch));
            card.dataset.swSearchMatch = contentHit ? "opened-content" : (match ? "title" : "");
            const meta = card.querySelector<HTMLElement>(".sw__meta");
            meta?.querySelector(".sw__search-match-source")?.remove();
            if (contentHit && meta) {
                const source = document.createElement("span");
                source.className = "sw__search-match-source";
                source.textContent = this.i18n.docSearchSourceOpened;
                source.setAttribute("aria-label", this.i18n.docSearchSourceOpened);
                meta.appendChild(source);
            }
            if (match) {
                visible++;
            }
        });
        // 只处理页签卡片分组；全库文档结果区（.sw__doc-results）内部无卡片，
        // 误判为空组会导致继续输入时文档区被 fn__none 永久隐藏
        scrollElement.querySelectorAll<HTMLElement>(".sw__group:not(.sw__doc-results)").forEach((group) => {
            const count = group.querySelectorAll(".sw__card:not(.fn__none)").length;
            group.classList.toggle("fn__none", count === 0);
        });
        this.updateDigitBadges(scrollElement);
        return visible;
    }

    // 排序领域逻辑位于 util.js；这里仅注入宿主 Tab 适配器，避免 UI 层持有排序细节。
    private sortItems(items: IGroupedTab[], sortBy: SortBy, mru: string[], updatedMap: {[rootId: string]: string}) {
        return sortItemsUtil(items, sortBy, mru, {
            titleOf: (item) => this.titleOf(item.tab),
            rootIdOf: (item) => this.rootIdOf(item.tab) || "",
            pinKeyOf: (item) => this.pinKeyOf(item.tab),
            updatedMap,
        });
    }

    // 按窗口分组并渲染全部页签
    // onOverlayClose：激活页签/打开文档后的收尾（弹窗销毁；侧边栏刷新）
    // onTabsChanged：关闭页签后的收尾（弹窗保持打开；侧边栏刷新）
    private renderList(scrollElement: HTMLElement, tabs: Tab[], activeTab: Tab | undefined,
                       opts: {onOverlayClose: IOverlayClose, onTabsChanged: IOverlayClose},
                       sortBy: SortBy, updatedMap: {[rootId: string]: string} = {}) {
        // T-7833：守卫根滚动容器——若误入子栏（.sw__tab-content 等），立即回溯至真实 .sw__scroll 根，杜绝二次嵌套双预览
        scrollElement = scrollElement.closest<HTMLElement>(".sw__scroll") || scrollElement;
        // 清空前收集旧卡片：排序切换/列表刷新时同页签卡片直接复用（移动 DOM 而非重建），
        // 已渲染的缩略图原样保留，重排瞬时完成
        // keepInFlight：列表异步富化重跑 renderList 是同目标冗余取消——掐断在途预览读取
        // 只会把 200 回包变 null（"预览未完整加载"）；在途回包由 wantedRootId 校验收货
        cancelDocPreview(scrollElement, true);
        // T-7009：异步重绘/排序切换的现场保持——innerHTML 清空前捕获滚动与焦点；
        // 焦点卡片按 tabId 在新列表找回（DOM 复用移动的是同一元素，可重新聚焦；
        // 焦点回归经 T-7007 的 focusin 委托联动预览，现场完整），找不到诚实放弃。
        const scenePrevScrollTop = scrollElement.scrollTop;
        const sceneActive = document.activeElement instanceof HTMLElement && scrollElement.contains(document.activeElement)
            ? document.activeElement : null;
        const sceneFocusTabId = sceneActive?.closest<HTMLElement>(".sw__card[data-tab-id]")?.dataset.tabId || "";
        // 焦点是否已在本表面内（含搜索框等列表外控件）：在则重绘不得抢默认焦点；
        // 不在（首次打开无焦点）才落默认首卡。
        const surfaceRoot = scrollElement.closest<HTMLElement>(".sw-platform-surface") || scrollElement.parentElement;
        const sceneFocusInSurface = !!(document.activeElement instanceof HTMLElement
            && surfaceRoot && surfaceRoot.contains(document.activeElement));
        const restoreListScene = () => {
            if (scenePrevScrollTop > 0) {
                scrollElement.scrollTop = Math.min(scenePrevScrollTop, Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight));
            }
            if (sceneFocusTabId) {
                const restored = Array.from(scrollElement.querySelectorAll<HTMLElement>(".sw__card"))
                    .find((card) => card.dataset.tabId === sceneFocusTabId);
                restored?.focus({preventScroll: true});
            }
        };
        const reusable = new Map<string, HTMLElement>();
        scrollElement.querySelectorAll<HTMLElement>(".sw__card").forEach((card) => {
            if (card.dataset.tabId) {
                reusable.set(card.dataset.tabId, card);
            }
        });
        const isSidebar = Boolean(scrollElement.closest(".sw--sidebar"));
        const settings = this.getSettings();
        const measuredWidth = (reusable.size === 0 && !isSidebar && !this.isMobile && typeof this.resolvePanelDialogSize === "function")
            ? this.resolvePanelDialogSize(settings, settings.fullscreen).width
            : (scrollElement.clientWidth || (scrollElement.parentElement?.clientWidth ?? 0));
        scrollElement.innerHTML = "";
        scrollElement.style.setProperty("--sw-thumb-height", `${settings.thumbHeight}px`);
        this.groupFlowObserver?.disconnect();
        this.groupFlowObserver = null;

        const activeTabId = activeTab?.id;
        const activeRootId = activeTab ? (this.rootIdOf(activeTab) || "") : (this.resolveActiveHostEditor()?.protyle?.block?.rootID || "");
        const mru = this.getMru();
        const pinned = new Set(this.getPinned());
        const favorites = new Set(this.getFavorites().map((item) => item.key));

        const ctx: ITabGroupRenderCtx = {reusable, activeTabId, pinned, favorites, mru, settings, updatedMap, opts};
        ctx.activeRootId = activeRootId;

        const useTabPreview = !this.isMobile && !isSidebar && (measuredWidth >= 680 || (!scrollElement.isConnected && ((settings.dialogWidth || 880) >= 680 || window.innerWidth >= 800)));
        let layout: HTMLElement | null = null;
        let contentHost: HTMLElement = scrollElement;
        if (useTabPreview) {
            layout = document.createElement("div");
            layout.className = "sw__tab-preview";
            const content = document.createElement("div");
            content.className = "sw__tab-content";
            layout.appendChild(content);
            contentHost = content;
        }

        const all: IGroupedTab[] = [];
        const focusState: {defaultFocusIndex: number; matchedActive?: boolean; matchedMru?: boolean} = {defaultFocusIndex: 0};
        const groupMode = settings.groupBy;
        if (groupMode === "none") {
            // 按 parent（Wnd）分栏分组，保持 getAllTabs 的布局树顺序
            const groups = buildTabGroupsByParent(tabs, scrollElement);
            groups.forEach((group) => {
                const ordered = this.sortGroupItems(group, sortBy, mru, pinned, updatedMap);
                this.renderTabGroup(contentHost, ordered, ctx, all, focusState);
            });
        } else {
            this.renderGroupedList(contentHost, tabs, activeTab, groupMode, ctx, all, focusState, opts, sortBy, updatedMap);
        }

        if (all.length === 0) {
            scrollElement.appendChild(this.buildEmptyState(scrollElement));
            // T-7009：空态同样恢复滚动现场（钳制后通常归零）
            restoreListScene();
            return;
        }

        // 页签区与文档结果区共用一个预览窗格；直接装配布局流，杜绝全卡片二次遍历拔插与强制 Reflow
        if (layout) {
            scrollElement.querySelectorAll(".sw__doc-preview").forEach((el) => el.remove());
            scrollElement.appendChild(layout);
            mountDocPreviewPane.call(this, layout, scrollElement, measuredWidth);
        }

        // 初始焦点：打开面板时键盘用户直接落在默认卡片本体上（T-7007 主焦点模型）
        // T-7009：默认首卡焦点只服务首次打开（本表面内尚无焦点）；异步重绘/排序
        // 切换时焦点已在表面内（搜索框或某张卡片），不得被默认焦点抢走。
        if (!sceneFocusInSurface) {
            this.focusCard(all[focusState.defaultFocusIndex]?.card, true);
        }

        // 视口懒渲染缩略图：复用卡片跳过，新卡片滚入可视区时才生成
        this.renderThumbnails(all, scrollElement, THUMB_BATCH);
        // T-6820 数字直达角标：渲染后刷新前 9 个可见卡片的数字标记
        this.updateDigitBadges(scrollElement);
        // T-7009：恢复重绘前的滚动位置与焦点卡片
        restoreListScene();
    }

    // T-6820 数字直达可发现性：为前 9 个可见卡片写入 1-9 角标（CSS ::after 渲染），
    // 与 bindKeydown 的数字直达一一对应；第 9 个之后的卡片与隐藏/折叠分组卡片移除标记。
    private updateDigitBadges(scrollElement: HTMLElement) {
        scrollElement.querySelectorAll<HTMLElement>(".sw__card[data-sw-digit]").forEach((card) => delete card.dataset.swDigit);
        (getVisibleSwitcherCards(scrollElement) as HTMLElement[]).forEach((card, index) => {
            const digit = index < 9 ? String(index + 1) : "";
            if (digit) card.dataset.swDigit = digit;
            else delete card.dataset.swDigit;
        });
    }

    // 单一分组排序：置顶页签固定在前，其余按 sortBy 排列（restItems 内部 sort 走 stable 排序）
    private sortGroupItems(
        group: IGroupedTab[],
        sortBy: SortBy,
        mru: string[],
        pinned: Set<string>,
        updatedMap: {[rootId: string]: string},
    ): IGroupedTab[] {
        return sortGroupItemsUtil(group, sortBy, mru, pinned, updatedMap, {
            titleOf: (item) => this.titleOf(item.tab),
            rootIdOf: (item) => this.rootIdOf(item.tab) || "",
            pinKeyOf: (item) => this.pinKeyOf(item.tab),
        });
    }

    // 渲染单一分组：label + grid + 各卡片；卡片获取委托 acquireGroupCard；累积 defaultFocusIndex
    private renderTabGroup(
        scrollElement: HTMLElement,
        ordered: IGroupedTab[],
        ctx: ITabGroupRenderCtx,
        all: IGroupedTab[],
        focusState: {defaultFocusIndex: number; matchedActive?: boolean; matchedMru?: boolean},
    ) {
        const groupEl = document.createElement("div");
        groupEl.className = "sw__group";
        const label = document.createElement("div");
        label.className = "sw__window-label";
        label.textContent = `${this.i18n.currentWindow} · ${ordered.length}`;
        groupEl.appendChild(label);

        const grid = this.buildTabGroupGrid(scrollElement, ordered.length, ctx.settings);

        ordered.forEach((item) => {
            const card = this.acquireGroupCard(item, ctx, false);
            grid.appendChild(card);
            item.card = card;
            all.push(item);
            // 默认聚焦决策：优先比对当前活动文档（tabId 或 rootId），命中则将 defaultFocusIndex 指向当前卡片；
            // 若未命中再平滑回退至 MRU 最近使用的页签或首卡
            const itemRootId = this.rootIdOf(item.tab) || "";
            const isItemActive = Boolean(
                (ctx.activeTabId && item.tab.id === ctx.activeTabId) ||
                (ctx.activeRootId && itemRootId === ctx.activeRootId)
            );
            if (isItemActive) {
                focusState.defaultFocusIndex = all.length - 1;
                focusState.matchedActive = true;
            } else if (!focusState.matchedActive) {
                if (ctx.mru.indexOf(this.pinKeyOf(item.tab)) === 0) {
                    focusState.defaultFocusIndex = all.length - 1;
                    focusState.matchedMru = true;
                }
            }
        });
        groupEl.appendChild(grid);
        scrollElement.appendChild(groupEl);
    }

    // 分组渲染主路径：解析分组上下文（收藏分组/笔记本/创建时间）→ groupTabsByMode →
    // 稀疏组流式布局（组块宽度=内容卡片数，上限满宽）；异步数据（创建时间/笔记本名）
    // 就绪后若有关键新数据则重排一次
    private renderGroupedList(
        scrollElement: HTMLElement,
        tabs: Tab[],
        activeTab: Tab | undefined,
        groupMode: TabGroupMode,
        ctx: ITabGroupRenderCtx,
        all: IGroupedTab[],
        focusState: {defaultFocusIndex: number; matchedActive?: boolean; matchedMru?: boolean},
        listOpts: {onOverlayClose: IOverlayClose, onTabsChanged: IOverlayClose},
        sortBy: SortBy,
        updatedMap: {[rootId: string]: string},
    ) {
        const favoriteGroupByKey = new Map<string, string>();
        this.getFavorites().forEach((fav) => favoriteGroupByKey.set(fav.key, fav.group || ""));
        const hadNotebookCache = this.notebookListCache !== null;
        const notebookMap = new Map((this.notebookListCache || []).map((nb) => [nb.id, nb.name]));
        const notebookOrder = (this.notebookListCache || []).map((nb) => nb.id);
        const rootIdOf = (tab: Tab) => this.rootIdOf(tab) || "";
        const pluginsList = getSiyuan()?.ws?.app?.plugins;
        const defs = groupTabsByMode(tabs, groupMode, {
            pinKeyOf: (tab: Tab) => this.pinKeyOf(tab),
            isFavorite: (key: string) => ctx.favorites.has(key),
            favoriteGroupOf: (key: string) => favoriteGroupByKey.get(key) || "",
            favoriteGroupOrder: this.getFavGroupRegistry(),
            plugins: pluginsList,
            notebookIdOf: (tab: Tab) => {
                const resolved = resolveSearchNotebookId(tab as unknown) || "";
                // T-6475：路径回退会产出幻影笔记本 ID（思源文档路径首段是根文档 ID 而
                // 非笔记本 ID，真机实证 id≠box）。凡不在真实笔记本清单里的结果，用
                // rootId→box 缓存纠正（异步富化按需填充）。
                if (!notebookMap.has(resolved)) {
                    const fromRoot = this.rootNotebookCache[rootIdOf(tab)];
                    if (fromRoot) return fromRoot;
                }
                return resolved;
            },
            pathOf: (tab: Tab) => {
                const t = tab as unknown as {path?: string; hPath?: string; model?: {path?: string; hPath?: string; editor?: {protyle?: {path?: string}}}};
                return t.path || t.hPath || t.model?.path || t.model?.hPath || t.model?.editor?.protyle?.path || "";
            },
            notebookNameOf: (id: string) => {
                const fromCache = notebookMap.get(id) || "";
                if (fromCache) return fromCache;
                // T-6473 分组识别修复：笔记本缓存缺失（未就绪/已关闭/旧数据残留的 ID）时，
                // 从该组页签自带的笔记本名元数据恢复，避免组标签退化成裸 ID
                for (const tab of tabs) {
                    if (resolveSearchNotebookId(tab as unknown) !== id) continue;
                    const t = tab as unknown as {notebookName?: string; notebook?: string; boxName?: string};
                    const name = t.notebookName || t.notebook || t.boxName || "";
                    if (name) return String(name).trim();
                }
                return "";
            },
            notebookOrder,
            createdOf: (key: string) => this.createdByIdCache[key] || "",
            labels: {
                unknownNotebook: this.i18n.groupUnknownNotebook,
                ungroupedFavorite: this.i18n.groupUngroupedFavorite,
                unfavorited: this.i18n.groupUnfavorited,
                unknownMonth: this.i18n.groupUnknownMonth,
                rootPath: this.i18n.groupRootPath,
                pluginGroup: this.i18n.groupPluginPages,
            },
        });
        defs.forEach((def) => {
            const ordered = this.sortGroupItems(def.items.map((tab: Tab) => ({tab})), sortBy, ctx.mru, ctx.pinned, updatedMap);
            this.renderNamedTabGroup(scrollElement, def, ordered, ctx, all, focusState);
        });
        const rootScroll = scrollElement.closest<HTMLElement>(".sw__scroll") || scrollElement;
        if (groupMode === "createdMonth") {
            const missing = tabs.some((tab) => {
                const rootId = rootIdOf(tab);
                return !!rootId && !(rootId in this.createdByIdCache);
            });
            if (missing) {
                void this.loadUpdatedMap(tabs).then(() => {
                    // 请求过的 rootId 无论查到与否都落键（未命中记 ""），保证只重排一次不循环
                    tabs.forEach((tab) => {
                        const rootId = rootIdOf(tab);
                        if (rootId && !(rootId in this.createdByIdCache)) this.createdByIdCache[rootId] = "";
                    });
                    if (!rootScroll.isConnected) return;
                    this.renderList(rootScroll, tabs, activeTab, listOpts, sortBy, updatedMap);
                }).catch((err) => logger.warn("loadUpdatedMap on createdMonth failed", err));
            }
        } else if (groupMode === "notebook") {
            // T-6475 + 打开性能优化：合并笔记本清单拉取与缺失归属 SQL 富化为单链；
            // 仅当确实改善了组名/归属映射时才触发最多一次重排，杜绝首开重复 renderList
            const needEnrichRun = !hadNotebookCache || tabs.some((tab) => {
                const rootId = rootIdOf(tab);
                if (!rootId || rootId in this.rootNotebookCache) return false;
                const resolved = resolveSearchNotebookId(tab as unknown) || "";
                return !(resolved && notebookMap.has(resolved));
            });
            if (needEnrichRun) {
                const notebookReady = hadNotebookCache
                    ? Promise.resolve(this.notebookListCache as Array<{id: string; name: string}>)
                    : this.loadNotebooks().then((notebooks) => {
                        this.notebookListCache = notebooks;
                        return notebooks;
                    });
                void notebookReady.then(async (notebooks) => {
                    if (!rootScroll.isConnected || notebooks.length === 0) return;
                    const known = new Set(notebooks.map((nb) => nb.id));
                    const unknownRoots: string[] = [];
                    for (const tab of tabs) {
                        if (detectSpecialTabKind(tab, {plugins: pluginsList}).isSpecial) continue;
                        const rootId = rootIdOf(tab);
                        if (!rootId || rootId in this.rootNotebookCache) continue;
                        const resolved = resolveSearchNotebookId(tab as unknown) || "";
                        if (resolved && known.has(resolved)) continue;
                        unknownRoots.push(rootId);
                    }
                    let resolvedAnyNewBox = false;
                    const enrich = unknownRoots.length > 0
                        ? this.loadRootNotebookMap(unknownRoots).then(() => {
                            tabs.forEach((tab) => {
                                const rootId = rootIdOf(tab);
                                if (rootId) {
                                    if (this.rootNotebookCache[rootId]) resolvedAnyNewBox = true;
                                    if (!(rootId in this.rootNotebookCache)) this.rootNotebookCache[rootId] = "";
                                }
                            });
                        })
                        : null;
                    if (enrich) await enrich;
                    if (!rootScroll.isConnected) return;
                    const resolvedMissingLabel = !hadNotebookCache && defs.some((def) => {
                        const id = (def as {id?: string}).id;
                        return Boolean(id && known.has(id) && def.label === id);
                    });
                    if (resolvedMissingLabel || resolvedAnyNewBox) {
                        this.renderList(rootScroll, tabs, activeTab, listOpts, sortBy, updatedMap);
                    }
                }).catch((err) => logger.warn("notebook group enrich failed", err));
            }
        }
    }

    // 命名分组块：可折叠组头（图标+名称+计数）+ 内容网格；块宽 = span 列（上限满宽），
    // 多个组块在 .sw--grouped-flow 下横向流动换行，小分组不再各占一整排
    private renderNamedTabGroup(
        scrollElement: HTMLElement,
        def: {key: string; label: string; icon: string; items: Tab[]},
        ordered: IGroupedTab[],
        ctx: ITabGroupRenderCtx,
        all: IGroupedTab[],
        focusState: {defaultFocusIndex: number; matchedActive?: boolean; matchedMru?: boolean},
        span = 0,
        cellWidth = 0,
    ) {
        const collapsed = this.groupCollapseState.has(def.key);
        const groupEl = document.createElement("div");
        groupEl.className = "sw__group sw__group--named" + (collapsed ? " sw__group--collapsed" : "");
        const header = document.createElement("button");
        header.type = "button";
        header.className = "sw__group-header";
        header.setAttribute("aria-expanded", collapsed ? "false" : "true");
        header.innerHTML = '<svg class="sw__group-chevron"><use xlink:href="#' + (collapsed ? "iconRight" : "iconDown") + '"></use></svg>'
            + '<svg class="sw__group-icon"><use xlink:href="#' + (def.icon || "iconFile") + '"></use></svg>'
            + '<span class="sw__group-title"></span>'
            + '<span class="sw__group-count">' + ordered.length + '</span>';
        header.querySelector<HTMLElement>(".sw__group-title")!.textContent = def.label;
        header.setAttribute("aria-label", def.label + " (" + ordered.length + ")");
        header.addEventListener("click", () => {
            const nextCollapsed = !this.groupCollapseState.has(def.key);
            if (nextCollapsed) {
                this.groupCollapseState.add(def.key);
            } else {
                this.groupCollapseState.delete(def.key);
            }
            groupEl.classList.toggle("sw__group--collapsed", nextCollapsed);
            header.setAttribute("aria-expanded", nextCollapsed ? "false" : "true");
            header.querySelector<SVGUseElement>(".sw__group-chevron use")?.setAttribute("xlink:href", "#" + (nextCollapsed ? "iconRight" : "iconDown"));
            if (nextCollapsed && groupEl.querySelector(".sw__card.sw__focused")) {
                const fallback = getVisibleSwitcherCards(scrollElement)[0] as HTMLElement | undefined;
                if (fallback) this.focusCard(fallback, false);
                else groupEl.querySelectorAll<HTMLElement>(".sw__card.sw__focused").forEach((c) => {
                    c.classList.remove("sw__focused");
                    c.removeAttribute("aria-current");
                });
            }
            this.updateDigitBadges(scrollElement);
        });
        groupEl.appendChild(header);

        const grid = this.buildTabGroupGrid(scrollElement, ordered.length, ctx.settings);
        if (span > 0 && cellWidth > 0) {
            // 组块宽度 = span 张标准卡片 + 块间距；内部 repeat(span, 1fr) 在确定宽度下每列
            // 恰好等于标准网格的 1fr 宽——卡片尺寸与不分组时逐像素一致
            groupEl.style.width = `${Math.round(span * cellWidth + (span - 1) * GROUP_FLOW_GAP_PX)}px`;
            grid.style.gridTemplateColumns = `repeat(${span}, 1fr)`;
        }
        ordered.forEach((item) => {
            const card = this.acquireGroupCard(item, ctx, false);
            grid.appendChild(card);
            item.card = card;
            all.push(item);
            // 默认聚焦决策：优先比对当前活动文档（tabId 或 rootId），命中则将 defaultFocusIndex 指向当前卡片；
            // 若未命中再平滑回退至 MRU 最近使用的页签或首卡
            const itemRootId = this.rootIdOf(item.tab) || "";
            const isItemActive = Boolean(
                (ctx.activeTabId && item.tab.id === ctx.activeTabId) ||
                (ctx.activeRootId && itemRootId === ctx.activeRootId)
            );
            if (isItemActive) {
                focusState.defaultFocusIndex = all.length - 1;
                focusState.matchedActive = true;
            } else if (!focusState.matchedActive) {
                if (ctx.mru.indexOf(this.pinKeyOf(item.tab)) === 0) {
                    focusState.defaultFocusIndex = all.length - 1;
                    focusState.matchedMru = true;
                }
            }
        });
        groupEl.appendChild(grid);
        scrollElement.appendChild(groupEl);
    }

    // 取得分组内单张卡片：优先复用旧卡片（同步状态类/图标/标题，缩略图不动，事件沿旧闭包），否则新建；
    // 双端分组渲染共用（renderTabGroup/renderMobileCardsInGroup），手机端追加 sw__mobile-card 修饰类
    private acquireGroupCard(item: IGroupedTab, ctx: ITabGroupRenderCtx, mobile: boolean): HTMLElement {
        const isPinned = ctx.pinned.has(this.pinKeyOf(item.tab));
        const isFaved = ctx.favorites.has(this.pinKeyOf(item.tab));
        let card = ctx.reusable.get(item.tab.id);
        if (card) {
            this.syncCardState(card, item.tab, item.tab.id === ctx.activeTabId, isPinned, isFaved, ctx);
            ctx.reusable.delete(item.tab.id);
        } else {
            card = this.createCard(item, item.tab.id === ctx.activeTabId, isPinned, isFaved, ctx, {
                onActivate: (tab) => this.activateTab(tab, ctx.opts.onOverlayClose),
                onTogglePin: (tab, cardEl) => this.handleTogglePin(tab, cardEl),
                onToggleFav: (tab, cardEl) => this.handleToggleFav(tab, cardEl),
                onCloseTab: (tab, cardEl) => this.handleCloseTab(tab, cardEl, ctx.opts.onTabsChanged),
            });
        }
        if (mobile) {
            card.classList.add("sw__mobile-card");
        }
        return card;
    }

    // 构造分组卡片网格；侧边栏由专用设置 sidebarLayout 控制列数（CSS 自动响应宽度），弹窗仍用全局 columns
    private buildTabGroupGrid(scrollElement: HTMLElement, count: number, settings: ISwSettings): HTMLElement {
        const grid = document.createElement("div");
        grid.className = "sw__grid";
        const isSidebar = !!scrollElement.closest(".sw--sidebar");
        if (!isSidebar && settings.columns >= 2) {
            grid.style.gridTemplateColumns = `repeat(${settings.columns}, 1fr)`;
        }
        return grid;
    }

    // 复用旧卡片时同步状态：置顶/收藏/激活类名与图标、标题文本
    private syncCardState(card: HTMLElement, tab: Tab, isActive: boolean, isPinned: boolean, isFaved: boolean, ctx: ITabGroupRenderCtx) {
        this.cardTabs.set(card, tab);
        // Keep surface-specific modifiers when a card is reused during a
        // mobile list refresh.  `renderMobileList` deliberately reuses DOM
        // nodes to preserve thumbnails, but resetting className below used
        // to drop `sw__mobile-card`, making refreshed cards fall back to the
        // desktop layout until the next full dialog rebuild.
        const isMobileCard = card.classList.contains("sw__mobile-card");
        const previousRootId = card.dataset.rootId || "";
        const previousTitle = card.dataset.title || "";
        const previousPluginName = card.dataset.pluginName || "";
        const rootId = this.rootIdOf(tab) || "";
        const special = detectSpecialTabKind(tab, {plugins: getSiyuan()?.ws?.app?.plugins});
        const nextPluginName = special.isSpecial ? (special.badgeText || "") : "";
        card.className = "sw__card"
            + (isActive ? " sw__active" : "")
            + (isPinned ? " sw__pinned" : "")
            + (isFaved ? " sw__faved" : "");
        if (isMobileCard) {
            card.classList.add("sw__mobile-card");
        }
        const title = this.titleOf(tab);
        card.dataset.title = title;
        card.dataset.pluginName = nextPluginName;
        // T-7007：复用卡片跨页签重挂时同步可访问名称，读屏不读出旧标题。
        card.setAttribute("aria-label", title);
        card.dataset.rootId = rootId;
        card.dataset.notebookId = resolveSearchNotebookId(tab as unknown);
        card.dataset.searchPath = buildOpenedDocumentScope(tab as unknown)?.path || "";
        card.querySelector<HTMLElement>(".sw__meta")?.replaceWith(this.buildCardMeta(tab, ctx));
        if (previousRootId !== rootId || previousPluginName !== nextPluginName || (special.isSpecial && previousTitle !== title)) {
            card.querySelector<HTMLElement>(".sw__thumb")?.replaceWith(this.buildCardThumb(tab));
        }
        const iconUse = card.querySelector<SVGElement>(".sw__pin use");
        if (iconUse) {
            iconUse.setAttribute("xlink:href", isPinned ? "#iconPin" : "#iconUnpin");
        }
        const pinButton = card.querySelector<HTMLElement>(".sw__pin");
        const pinLabel = isPinned ? this.i18n.unpinTab : this.i18n.pinTab;
        pinButton?.setAttribute("aria-label", pinLabel);
        pinButton?.setAttribute("title", pinLabel);
        const favButton = card.querySelector<HTMLElement>(".sw__fav-btn");
        const favLabel = isFaved ? this.i18n.unfavoriteTab : this.i18n.favoriteTab;
        favButton?.setAttribute("aria-label", favLabel);
        favButton?.setAttribute("title", favLabel);
    }

    // 空态：主文案 + 引导副文案（提示可搜索全库文档）
    /** DL2 阶段3：空态吉祥物（mascot 偏好门控，关闭回退线性 emoji） */
    public resolveLvMascotHtml(): string {
        try {
            if (resolveEffectiveMotion().mascot) return lvMascot("carry", { class: "sw__empty-mascot" });
        } catch {
            // ignore（kit 缺失等异常回退 emoji）
        }
        return `<div style="font-size:32px;">🗂️</div>`;
    }

    private buildEmptyState(surfaceRoot?: Element | null): HTMLElement {
        const empty = document.createElement("div");
        empty.className = "sw__empty";
        // DL2 阶段3：桌面空态同样落吉祥物（与移动端同口径，mascot 偏好门控）
        empty.innerHTML = `<div class="sw__empty-message" role="status" aria-live="polite">${this.resolveLvMascotHtml()}<div class="sw__empty-title"></div><div class="sw__empty-sub"></div></div>`;
        empty.querySelector(".sw__empty-title")!.textContent = this.i18n.noOpenedTabs;
        empty.querySelector(".sw__empty-sub")!.textContent = this.i18n.emptyHint;
        if (this.recentSearchQueries.length > 0) {
            const recentBox = document.createElement("div");
            recentBox.className = "sw__recent-queries";
            const recentLbl = document.createElement("span");
            recentLbl.className = "sw__recent-query-label";
            recentLbl.textContent = this.i18n.recentSearchQueries;
            recentBox.appendChild(recentLbl);
            this.recentSearchQueries.forEach((q) => {
                const qChip = document.createElement("button");
                qChip.type = "button";
                qChip.className = "b3-button b3-button--text sw__recent-query-chip";
                qChip.textContent = q;
                qChip.addEventListener("click", () => {
                    const searchInput = resolveEmptyTargetSurface()?.querySelector<HTMLInputElement>(".sw__search");
                    if (searchInput) {
                        searchInput.value = q;
                        searchInput.dispatchEvent(new (searchInput.ownerDocument.defaultView || window).Event("input", {bubbles: true}));
                        searchInput.focus();
                    }
                });
                recentBox.appendChild(qChip);
            });
            const clearHistoryBtn = document.createElement("button");
            clearHistoryBtn.type = "button";
            clearHistoryBtn.className = "b3-button b3-button--text sw__recent-query-clear";
            clearHistoryBtn.textContent = this.i18n.cancel || "清空";
            clearHistoryBtn.title = this.i18n.cancel || "清空";
            clearHistoryBtn.addEventListener("click", () => {
                this.recentSearchQueries = [];
                recentBox.remove();
            });
            recentBox.appendChild(clearHistoryBtn);
            empty.appendChild(recentBox);
        }
        const actions = document.createElement("div");
        actions.className = "sw__empty-actions";
        const searchSurface = empty.closest<HTMLElement>(".sw-platform-surface")
            || surfaceRoot?.closest<HTMLElement>(".sw-platform-surface")
            || surfaceRoot
            || this.sidebarElement
            || document.querySelector<HTMLElement>(".sw__mobile[data-sw-surface='switcher']");
        const resolveEmptyTargetSurface = () => {
            const targetSurface = empty.closest<HTMLElement>(".sw-platform-surface")
                || empty.closest<HTMLElement>(".sw-platform-dialog")
                || empty.closest<HTMLElement>(".sw--sidebar")
                || searchSurface;
            return targetSurface;
        };
        const addAction = (action: string, label: string, callback: () => void) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "b3-button b3-button--outline sw__empty-action";
            button.dataset.action = action;
            button.textContent = label;
            button.setAttribute("aria-label", label);
            button.addEventListener("click", callback);
            actions.appendChild(button);
        };
        const closeSwitcherDialog = () => {
            if (this.platformSwitcherDialog?.element.contains(empty)) this.platformSwitcherDialog.destroy();
            if (this.mobileSwitcherDialog?.element.contains(empty)) this.mobileSwitcherDialog.destroy();
        };
        addAction("focus-search", this.i18n.platformGuideSearchAction || "开始搜索", () => {
            const targetSurface = resolveEmptyTargetSurface();
            targetSurface?.querySelector<HTMLInputElement>(".sw__search")?.focus({preventScroll: true});
        });
        const available = this.getAvailablePlatformSurfaces();
        if (available.includes("workbench")) {
            addAction("open-workbench", this.i18n.platformGuideWorkbenchAction || "打开工作台", () => {
                closeSwitcherDialog();
                this.openPlatformSurface("workbench", "switcher", {entry: "surface-nav"});
            });
        }
        if (available.includes("studio")) {
            addAction("open-studio", this.i18n.platformGuideStudioAction || "打开片段实验室", () => {
                closeSwitcherDialog();
                this.openPlatformSurface("studio", "switcher", {entry: "surface-nav"});
            });
        }
        addAction("open-guide", this.i18n.platformGuideButton || "快速开始", () => this.openPlatformGuide("switcher"));
        empty.appendChild(actions);
        const syntaxBar = document.createElement("div");
        syntaxBar.className = "sw__empty-syntax-bar";
        syntaxBar.setAttribute("role", "toolbar");
        syntaxBar.setAttribute("aria-label", "功能速查与穿透检索快捷入口");
        const shortcuts: Array<{label: string; prefix?: string; desc: string; run?: () => void}> = [
            {label: ": 大纲", prefix: ":", desc: "输入冒号搜索当前或全局大纲标题"},
            {label: "# 标签", prefix: "#", desc: "输入井号按标签检索笔记"},
            {label: "! 书签", prefix: "!", desc: "输入感叹号检索书签标记"},
            {label: "^ 正文块", prefix: "^", desc: "输入尖号深入检索段落/列表/代码块"},
            {label: "? 技巧", prefix: "?", desc: "查看全部穿透搜索模式语法技巧"},
            {label: "⌘K 动作画板", desc: "在卡片上按 ⌘K 执行分屏、复制块超链等操作"},
            {label: "↩ 撤销关闭", desc: "一键重新打开刚才关闭的页签", run: () => {
                const restored = this.undoLastClosedTab?.();
                if (restored) closeSwitcherDialog();
            }},
        ];
        shortcuts.forEach((sc) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "b3-button b3-button--text sw__empty-syntax-chip b3-tooltips b3-tooltips__s";
            btn.textContent = sc.label;
            btn.setAttribute("aria-label", `${sc.label} · ${sc.desc}`);
            btn.title = sc.desc;
            btn.addEventListener("click", () => {
                if (typeof sc.run === "function") {
                    sc.run();
                    return;
                }
                const searchInput = resolveEmptyTargetSurface()?.querySelector<HTMLInputElement>(".sw__search");
                if (searchInput && sc.prefix) {
                    searchInput.value = sc.prefix;
                    searchInput.dispatchEvent(new (searchInput.ownerDocument.defaultView || window).Event("input", {bubbles: true}));
                    searchInput.focus();
                }
            });
            syntaxBar.appendChild(btn);
        });
        empty.appendChild(syntaxBar);

        // T-7406 空态卡片全键盘无障碍导航（左右/上下循环移动，首项 ArrowUp 或 Escape 回焦搜索框）
        const emptyNavTargets = Array.from(empty.querySelectorAll<HTMLButtonElement>(".sw__empty-action, .sw__empty-syntax-chip"));
        emptyNavTargets.forEach((btn, idx) => {
            btn.addEventListener("keydown", (e: KeyboardEvent) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault();
                    emptyNavTargets[(idx + 1) % emptyNavTargets.length]?.focus();
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault();
                    if (idx === 0) {
                        const targetSurface = resolveEmptyTargetSurface();
                        targetSurface?.querySelector<HTMLInputElement>(".sw__search")?.focus({preventScroll: true});
                    } else {
                        emptyNavTargets[(idx - 1 + emptyNavTargets.length) % emptyNavTargets.length]?.focus();
                    }
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    const targetSurface = resolveEmptyTargetSurface();
                    targetSurface?.querySelector<HTMLInputElement>(".sw__search")?.focus({preventScroll: true});
                }
            });
        });

        return empty;
    }

    // 置顶/取消置顶：更新状态、图标与提示文案，并调整卡片位置（置顶移动到本组最前）
    private handleTogglePin(tab: Tab, card: HTMLElement) {
        const isPinned = this.togglePinned(tab);
        const iconUse = card.querySelector<SVGElement>(".sw__pin use");
        if (iconUse) {
            iconUse.setAttribute("xlink:href", isPinned ? "#iconPin" : "#iconUnpin");
        }
        const pinButton = card.querySelector<HTMLElement>(".sw__pin");
        const pinLabel = isPinned ? this.i18n.unpinTab : this.i18n.pinTab;
        pinButton?.setAttribute("aria-label", pinLabel);
        pinButton?.setAttribute("title", pinLabel);
        if (pinButton) {
            lvNotify.inline(pinButton, isPinned ? (this.i18n.pinTab || "已固定") : (this.i18n.unpinTab || "已取消固定"));
        }
        card.classList.toggle("sw__pinned", isPinned);
        if (isPinned) {
            card.parentElement?.prepend(card);
            this.focusCard(card);
        }
    }

    // 收藏/取消收藏（右键菜单入口）：更新卡片标识与提示文案，并刷新顶栏收藏下拉
    private async handleToggleFav(tab: Tab, card: HTMLElement): Promise<void> {
        const isFaved = await this.toggleFavorite(tab);
        this.refreshCardFavState(tab, card);
        this.refreshFavSelects();
        const favBtn = card.querySelector<HTMLElement>(".sw__fav-btn");
        if (favBtn) {
            lvNotify.inline(favBtn, isFaved ? (this.i18n.favoriteTab || "已收藏") : (this.i18n.unfavoriteTab || "已取消收藏"));
        }
    }

    // 按双端适配关闭单个页签（仅关闭动作本身，不含卡片移除/列表刷新等收尾）；
    // 返回是否真正关闭成功，供批量关闭准确计数
    // T-6856 close-tab 动作：关闭活动页签。无活动页签或关闭失败时给出明确
    // 回执（返回 false → executor 报 unavailable）；手机端复用 MobileTabs 分支。
    private async closeActiveTabForAction(): Promise<boolean> {
        const active = this.getActiveTab();
        if (!active) {
            showMessage(this.i18n.sessionMarkNoDoc, MESSAGE_DEFAULT_MS, "error");
            return false;
        }
        const closed = await this.closeTabQuietly(active);
        if (!closed) showMessage(this.i18n.closeTabFailed, MESSAGE_DEFAULT_MS, "error");
        return closed;
    }

    private async closeTabQuietly(tab: Tab): Promise<boolean> {        if (this.isMobile) {
            // 手机端：MobileTabs.close 关闭页签；必须保持宿主对象调用（裸调用丢 this），
            // await 返回值以便批量关闭时串行等待，完成后给状态一小段沉降时间
            try {
                const tabs = getSiyuan()?.mobile?.tabs;
                if (typeof tabs?.close !== "function") {
                    return false;
                }
                const result = await tabs.close(tab.id);
                if (!isSuccessfulMobileTabsResult(result)) {
                    logger.warn("mobile close tab non-success result", result);
                }
                await this.sleep(TAB_SETTLE_MS);
                // T-6925（真机反馈）：宿主 close 的副作用会把我们的切换器压到原生
                // 浮层之下（关非活动页签弹页签总览、关活动页签走 closeModel），
                // 统一在沉降后恢复前置。
                this.restoreMobileSwitcherAboveHostPanels();
                return isSuccessfulMobileTabsResult(result);
            } catch (e) {
                logger.warn("mobile close tab fail", e);
                return false;
            }
        }
        try {
            tab.parent.removeTab(tab.id);
            // 杩炵画 removeTab 鏃剁粰鎬濇簮 DOM/鐘舵€佷竴甯ф矇闄嶆椂闂达紝闄嶄綆婕忓叧姒傜巼
            await this.sleep(TAB_SETTLE_MS);
            return true;
        } catch (e) {
            logger.warn("close tab fail", e);
            return false;
        }
    }

    // 在统一时间窗内核对整组结果，避免逐项等待导致批量操作随页签数线性变慢。
private async waitForTabStates(ids: string[], shouldBeOpen: boolean, matchTabId = false): Promise<Set<string>> {
        const pending = new Set(ids);
        const verified = new Set<string>();
        if (pending.size === 0) {
            return verified;
        }
        const deadline = Date.now() + TAB_VERIFY_TIMEOUT_MS;
        do {
            const tabs = this.currentTabs();
            const opened = new Set(tabs.map((tab) => matchTabId ? tab.id : this.pinKeyOf(tab)));
            pending.forEach((id) => {
                if (opened.has(id) === shouldBeOpen) {
                    verified.add(id);
                    pending.delete(id);
                }
            });
            if (pending.size === 0) {
                return verified;
            }
            await this.sleep(TAB_SETTLE_MS);
        } while (Date.now() < deadline);
        return verified;
    }

    // 小驴工具：批量开/关页签时避免竞态
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    // 关闭页签：移除页签与卡片；侧边栏模式下整列表刷新（弹窗保持打开）
    private async handleCloseTab(tab: Tab, card: HTMLElement, onTabsChanged: IOverlayClose) {
        // 等待页签真正关闭后再移除卡片，保证 onTabsChanged（侧边栏刷新）触发时读到最新列表
        const closed = await this.closeTabQuietly(tab);
        if (!closed) {
            showMessage(this.i18n.closeTabFailed, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        // 先取引用再移除卡片（remove 后 closest 返回 null）
        const group = card.closest(".sw__group");
        const scroll = card.closest(".sw__scroll");
        card.remove();
        // 同步所在分组：更新计数，组内清空则移除分组容器（弹窗模式不整列表重建）
        if (group) {
            const count = group.querySelectorAll(".sw__card").length;
            if (count === 0) {
                group.remove();
            } else {
                const label = group.querySelector<HTMLElement>(".sw__window-label");
                if (label) {
                    label.textContent = `${this.i18n.currentWindow} · ${count}`;
                }
            }
        }
        // 全部页签关闭后展示空态（弹窗保持打开，用户可搜索全库文档打开新的）
        if (scroll && scroll.querySelectorAll(".sw__card").length === 0 && !scroll.querySelector(".sw__doc-results")) {
            scroll.appendChild(this.buildEmptyState(scroll));
        }
        onTabsChanged();
    }

    // 构建一张页签卡片（缩略图区域 + 底部信息 + 置顶/收藏/关闭按钮 + 右键菜单）
    private createCard(item: IGroupedTab, isActive: boolean, isPinned: boolean, isFaved: boolean,
                       ctx: ITabGroupRenderCtx,
                       handlers: {
                           onActivate: (tab: Tab) => void,
                           onTogglePin: (tab: Tab, card: HTMLElement) => void,
                           onToggleFav: (tab: Tab, card: HTMLElement) => void,
                           onCloseTab: (tab: Tab, card: HTMLElement) => void,
                       }): HTMLElement {
        const tab = item.tab;
        const card = document.createElement("div");
        this.cardTabs.set(card, tab);
        card.className = "sw__card"
            + (isActive ? " sw__active" : "")
            + (isPinned ? " sw__pinned" : "")
            + (isFaved ? " sw__faved" : "");
        // T-7007：卡片是真实 DOM 焦点目标（主焦点模型）——键盘用户 Tab/方向键
        // 直接落在卡片上，读屏读出标题；附属动作按钮（pin/fav/close）在卡片
        // 获得焦点后经 :focus-within 可见。点击激活与右键菜单行为不变。
        const special = detectSpecialTabKind(tab, {plugins: getSiyuan()?.ws?.app?.plugins});
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", this.titleOf(tab));
        card.dataset.tabId = tab.id;
        card.dataset.title = this.titleOf(tab);
        card.dataset.pluginName = special.isSpecial ? (special.badgeText || "") : "";
        card.dataset.rootId = this.rootIdOf(tab) || "";
        card.dataset.notebookId = resolveSearchNotebookId(tab as unknown);
        card.dataset.searchPath = buildOpenedDocumentScope(tab as unknown)?.path || "";

        card.appendChild(this.buildCardThumb(tab));
        card.appendChild(this.buildCardMeta(tab, ctx));
        card.appendChild(this.buildCardActions(tab, card, isPinned, isFaved, handlers));
        item.card = card;

        // 桌面右键 / 手机长按：均弹同一操作菜单（pin / fav / 分组 / close）
        card.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.openCardMenu(this.cardTabs.get(card) || tab, card, handlers, event.clientX, event.clientY);
        });
        this.cardMenuHandlers.set(card, handlers);
        // T-7344 & T-7353：卡片次级动作快捷键唤出（⌘K）与免呼出单键直达执行
        card.addEventListener("keydown", (event: KeyboardEvent) => {
            const currentTab = this.cardTabs.get(card) || tab;
            const isCtrlOrCmd = event.ctrlKey || event.metaKey;

            // 1. ⌘K / Ctrl+K 唤出次级动作画板
            if (isCtrlOrCmd && event.key.toLowerCase() === "k") {
                event.preventDefault();
                event.stopPropagation();
                this.openCardActionPalette(currentTab, card, handlers);
                return;
            }

            // 2. T-7353 快捷键免呼出直达执行
            // Ctrl+Enter / Cmd+Enter: 右侧分屏打开
            if (isCtrlOrCmd && event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("open-right", currentTab, card, handlers);
                return;
            }
            // Alt+Enter: 下方分屏打开
            if (event.altKey && event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("open-bottom", currentTab, card, handlers);
                return;
            }
            // Alt+C: 复制思源块链接
            if (event.altKey && !isCtrlOrCmd && event.key.toLowerCase() === "c") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("copy-block-link", currentTab, card, handlers);
                return;
            }
            // Alt+M: 复制 Markdown 链接
            if (event.altKey && !isCtrlOrCmd && event.key.toLowerCase() === "m") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("copy-markdown-link", currentTab, card, handlers);
                return;
            }
            // Alt+P: 切换置顶
            if (event.altKey && !isCtrlOrCmd && event.key.toLowerCase() === "p") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("toggle-pin", currentTab, card, handlers);
                return;
            }
            // Alt+D: 切换收藏
            if (event.altKey && !isCtrlOrCmd && event.key.toLowerCase() === "d") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("toggle-fav", currentTab, card, handlers);
                return;
            }
            // Alt+R: 在思阅中阅读
            if (event.altKey && !isCtrlOrCmd && event.key.toLowerCase() === "r") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("open-in-reader", currentTab, card, handlers);
                return;
            }
            // Alt+V: 在思播中播放
            if (event.altKey && !isCtrlOrCmd && event.key.toLowerCase() === "v") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("open-in-media", currentTab, card, handlers);
                return;
            }
            // Alt+S: 保存当前已开页签为文档集
            if (event.altKey && !isCtrlOrCmd && event.key.toLowerCase() === "s") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("save-as-doc-set", currentTab, card, handlers);
                return;
            }
            // Alt+T: 撤销恢复最后关闭的页签
            if (event.altKey && !isCtrlOrCmd && event.key.toLowerCase() === "t") {
                event.preventDefault();
                event.stopPropagation();
                this.executePaletteAction("undo-closed-tab", currentTab, card, handlers);
                return;
            }
        });
        if (this.isMobile) {
            this.bindCardLongPress(card, tab, handlers);
        }

        // 点击整卡切换到该页签；mouseenter 用于键盘导航的悬浮聚焦
        card.addEventListener("click", () => handlers.onActivate(this.cardTabs.get(card) || tab));
        card.addEventListener("mouseenter", () => this.focusCard(card));
        return card;
    }

    // 缩略图占位（普通文档由 renderThumbnails 分批填入；插件/系统页签直接渲染轻卡片视觉区）
    private buildCardThumb(tab?: Tab): HTMLElement {
        const thumb = document.createElement("div");
        const special = tab ? detectSpecialTabKind(tab, {plugins: getSiyuan()?.ws?.app?.plugins}) : null;
        if (tab && special?.isSpecial) {
            thumb.className = "sw__thumb sw__thumb--special" + (special.isPlugin ? " sw__thumb--plugin" : "");
            const card = document.createElement("div");
            card.className = "sw__thumb-plugin-card";
            const iconWrap = document.createElement("span");
            iconWrap.className = "sw__thumb-plugin-icon";
            const baseIcon = this.buildCardIcon(tab);
            if (baseIcon.classList.contains("sw__icon-emoji") && baseIcon.textContent) {
                iconWrap.classList.add("sw__thumb-plugin-icon--emoji");
                iconWrap.textContent = baseIcon.textContent;
            } else if (baseIcon.firstElementChild) {
                iconWrap.appendChild(baseIcon.firstElementChild);
            } else {
                iconWrap.innerHTML = `<svg aria-hidden="true"><use xlink:href="#${special.icon || "iconSparkles"}"></use></svg>`;
            }
            const copy = document.createElement("div");
            copy.className = "sw__thumb-plugin-copy";
            const tabTitle = this.titleOf(tab);
            const sourceText = special.badgeText || "";
            const eyebrow = document.createElement("span");
            eyebrow.className = "sw__thumb-plugin-source";
            eyebrow.textContent = (sourceText && tabTitle && sourceText !== tabTitle)
                ? sourceText
                : (special.isPlugin ? "插件页面" : (sourceText || "系统页面"));
            const title = document.createElement("span");
            title.className = "sw__thumb-plugin-title";
            title.textContent = tabTitle || sourceText;
            copy.append(eyebrow, title);
            card.append(iconWrap, copy);
            thumb.appendChild(card);
            return thumb;
        }
        thumb.className = "sw__thumb sw__thumb--compact";
        const loading = document.createElement("div");
        loading.className = "sw__thumb-loading";
        loading.setAttribute("role", "status");
        loading.setAttribute("aria-live", "polite");
        loading.innerHTML = `<svg class="sw__spin"><use xlink:href="#iconRefresh"></use></svg><span>${this.i18n.loadingThumbnail}</span>`;
        thumb.appendChild(loading);
        return thumb;
    }

    // 底部：图标 + 标题 + 可选改动信息；图标复用真实页签头内容。
    private buildCardMeta(tab: Tab, ctx?: Pick<ITabGroupRenderCtx, "settings" | "updatedMap">): HTMLElement {
        const meta = document.createElement("div");
        meta.className = "sw__meta";
        meta.appendChild(this.buildCardIcon(tab));
        const titleEl = document.createElement("span");
        titleEl.className = "sw__title";
        titleEl.textContent = this.titleOf(tab);
        meta.appendChild(titleEl);

        const special = detectSpecialTabKind(tab, {plugins: getSiyuan()?.ws?.app?.plugins});
        if (special.isSpecial && special.badgeText) {
            const pluginBadge = document.createElement("span");
            pluginBadge.className = "sw__plugin-badge";
            pluginBadge.textContent = special.badgeText;
            pluginBadge.setAttribute("aria-label", `来源：${special.badgeText}`);
            meta.appendChild(pluginBadge);
        }
        // T-6848：更新时间和改动标记只消费内核 blocks.updated，同最近列表的 7 天判定。
        if (ctx?.settings.showCardUpdatedBadge === true) {
            const rootId = this.rootIdOf(tab);
            const updated = rootId ? ctx.updatedMap[rootId] : undefined;
            const badge = formatUpdatedBadge(updated, Date.now());
            if (badge) {
                const badgeEl = document.createElement("span");
                badgeEl.className = "sw__updated-badge" + (badge.fresh ? " is-fresh" : "");
                badgeEl.textContent = badge.text;
                badgeEl.setAttribute("aria-hidden", "true");
                meta.appendChild(badgeEl);
                if (updatedChangedWithin(updated, formatChangedWindowStart(Date.now()))) {
                    const changedEl = document.createElement("span");
                    changedEl.className = "sw__changed-badge";
                    changedEl.textContent = this.i18n.cardChangedBadge;
                    changedEl.title = this.i18n.cardChangedBadgeTip;
                    meta.appendChild(changedEl);
                }
            }
        }
        return meta;
    }

    private refreshCardUpdatedBadges(scrollElement: HTMLElement, updatedMap: {[rootId: string]: string}) {
        const ctx = {settings: this.getSettings(), updatedMap};
        scrollElement.querySelectorAll<HTMLElement>(".sw__card").forEach((card) => {
            const tab = this.cardTabs.get(card);
            if (tab) card.querySelector<HTMLElement>(".sw__meta")?.replaceWith(this.buildCardMeta(tab, ctx));
        });
    }

    // 卡片图标：思源 svg sprite > emoji 字符 > tab.icon 兜底
    private buildCardIcon(tab: Tab): HTMLElement {
        const iconBox = document.createElement("span");
        iconBox.className = "sw__icon";
        const graphic = tab.headElement?.querySelector<SVGElement>(".item__graphic use");
        const emoji = tab.headElement?.querySelector(".item__icon");
        if (graphic) {
            const href = graphic.getAttribute("xlink:href");
            iconBox.innerHTML = href ? `<svg aria-hidden="true"><use xlink:href="${href}"></use></svg>` : "";
        } else if (emoji) {
            iconBox.textContent = emoji.textContent || "";
            iconBox.classList.add("sw__icon-emoji");
        } else {
            // 兜底：思源图标名走 svg use；emoji 字符（手机端文档自定义图标）按文本渲染
            const fallback = resolveIconFallback(tab.icon || "");
            if (fallback.type === "emoji") {
                iconBox.textContent = fallback.value;
                iconBox.classList.add("sw__icon-emoji");
            } else {
                iconBox.innerHTML = `<svg aria-hidden="true"><use xlink:href="#${fallback.value}"></use></svg>`;
            }
        }
        return iconBox;
    }

    // 角标按钮（置顶 + 收藏 + 关闭），统一返回 Fragment 便于一次性插入
    private buildCardActions(
        tab: Tab,
        card: HTMLElement,
        isPinned: boolean,
        isFaved: boolean,
        handlers: {
            onTogglePin: (tab: Tab, card: HTMLElement) => void,
            onToggleFav: (tab: Tab, card: HTMLElement) => void,
            onCloseTab: (tab: Tab, card: HTMLElement) => void,
        },
    ): DocumentFragment {
        const frag = document.createDocumentFragment();

        // 置顶按钮（左上角）：已置顶显示实心图钉，tooltip 提示当前可执行的操作
        const pinBtn = document.createElement("button");
        pinBtn.type = "button";
        pinBtn.className = "sw__pin";
        pinBtn.setAttribute("aria-label", isPinned ? this.i18n.unpinTab : this.i18n.pinTab);
        pinBtn.title = isPinned ? this.i18n.unpinTab : this.i18n.pinTab;
        pinBtn.innerHTML = `<svg><use xlink:href="${isPinned ? "#iconPin" : "#iconUnpin"}"></use></svg>`;
        let pinBusy = false;
        pinBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            if (pinBusy) return;
            pinBusy = true;
            try {
                handlers.onTogglePin(this.cardTabs.get(card) || tab, card);
            } finally {
                setTimeout(() => { pinBusy = false; }, 180);
            }
        });
        frag.appendChild(pinBtn);

        // 收藏按钮（左上角，紧邻置顶）：未收藏空心星、已收藏实心星（CSS 变量 --b3-icon-star-fill 切换填充）
        const favBtn = document.createElement("button");
        favBtn.type = "button";
        favBtn.className = "sw__fav-btn";
        favBtn.setAttribute("aria-label", isFaved ? this.i18n.unfavoriteTab : this.i18n.favoriteTab);
        favBtn.title = isFaved ? this.i18n.unfavoriteTab : this.i18n.favoriteTab;
        favBtn.innerHTML = '<svg><use xlink:href="#iconStar"></use></svg>';
        favBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            // 点击星标弹出分组菜单：收藏时可直接选分组/新建分组，已收藏时可切换分组或取消收藏
            this.openFavMenu(this.cardTabs.get(card) || tab, card, event);
        });
        frag.appendChild(favBtn);

        // 关闭按钮（右上角）
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "sw__close";
        closeBtn.setAttribute("aria-label", this.i18n.close);
        closeBtn.title = this.i18n.close;
        closeBtn.innerHTML = '<svg><use xlink:href="#iconClose"></use></svg>';
        let closeBusy = false;
        closeBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            if (closeBusy) return;
            closeBusy = true;
            closeBtn.disabled = true;
            try {
                handlers.onCloseTab(this.cardTabs.get(card) || tab, card);
            } finally {
                setTimeout(() => {
                    closeBusy = false;
                    if (closeBtn.isConnected) closeBtn.disabled = false;
                }, 180);
            }
        });
        frag.appendChild(closeBtn);

        // 快捷复制块链接（右上角，紧邻关闭）
        const rootId = this.rootIdOf(tab);
        if (rootId) {
            const copyBtn = document.createElement("button");
            copyBtn.type = "button";
            copyBtn.className = "sw__copy-btn";
            copyBtn.setAttribute("aria-label", this.i18n.actionPaletteCopyBlockLink || "复制块超链接");
            copyBtn.title = (this.i18n.actionPaletteCopyBlockLink || "复制块超链接") + " (Alt+C)";
            copyBtn.innerHTML = '<svg><use xlink:href="#iconLink"></use></svg>';
            copyBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                this.copyToClipboard(`siyuan://blocks/${rootId}`);
                lvNotify.inline(copyBtn, this.i18n.snippetCopied || "已复制到剪贴板");
            });
            frag.appendChild(copyBtn);
        }

        return frag;
    }

    // 手机端长按（≈500ms）弹出与桌面右键一致的操作菜单；
    // 拦截 click 必须注册在 activate 之前（目标节点按注册顺序触发）
    private bindCardLongPress(
        card: HTMLElement,
        tab: Tab,
        handlers: {
            onActivate: (tab: Tab) => void,
            onTogglePin: (tab: Tab, card: HTMLElement) => void,
            onToggleFav: (tab: Tab, card: HTMLElement) => void,
            onCloseTab: (tab: Tab, card: HTMLElement) => void,
        },
    ) {
        let timer: number | undefined;
        let longPressed = false;
        let menuX = 0;
        let menuY = 0;
        let startX = 0;
        let startY = 0;
        const start = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (touch) {
                menuX = touch.clientX;
                menuY = touch.clientY;
                startX = touch.clientX;
                startY = touch.clientY;
            }
            longPressed = false;
            timer = window.setTimeout(() => {
                longPressed = true;
                this.openCardMenu(this.cardTabs.get(card) || tab, card, handlers, menuX, menuY);
            }, 500);
        };
        const cancel = () => {
            if (timer !== undefined) {
                window.clearTimeout(timer);
                timer = undefined;
            }
        };
        const onMove = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (!touch) {
                cancel();
                return;
            }
            const dx = Math.abs(touch.clientX - startX);
            const dy = Math.abs(touch.clientY - startY);
            if (dx > 10 || dy > 10) {
                cancel();
            }
        };
        const end = (event: TouchEvent) => {
            cancel();
            if (longPressed) {
                event.preventDefault();
                window.setTimeout(() => {
                    longPressed = false;
                }, 200);
            }
        };
        card.addEventListener("click", (event) => {
            if (longPressed) {
                longPressed = false;
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        }, true);
        card.addEventListener("touchstart", start, {passive: true});
        card.addEventListener("touchmove", onMove, {passive: true});
        card.addEventListener("touchend", end, {passive: false});
        card.addEventListener("touchcancel", cancel);
    }

    // 页签标题（优先取页签头已渲染文本）
    private titleOf(tab: Tab): string {
        return tab.headElement?.querySelector(".item__text")?.textContent?.trim() || tab.title || tab.id;
    }

    // 每次读取当前模型，避免同一页签导航到新文档后继续使用旧 rootID。
private rootIdOf(tab: Tab): string | null {
        return resolveTabRootId(tab as unknown as {model?: IProtyleTabModel, headElement?: HTMLElement});
    }

    // 置顶键：文档页签用其 rootID（跨会话稳定，重开同一文档置顶状态保留），其余退回页签 id
    private pinKeyOf(tab: Tab): string {
        return this.rootIdOf(tab) || tab.id;
    }

    // 转义 HTML 属性值（分组名等用户输入拼入模板时防注入；Menu label 为 innerHTML 亦需转义）
    private escapeAttr(text: string): string {
        return text.replace(/&/g, "&amp;").split('"').join("&quot;").split("'").join("&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // 手机端数据源适配：思源 getAllTabs() 在手机端（MOBILE 构建）恒返回空数组，
    // 页签数据需从 window.siyuan.mobile.tabs（思源 3.8+ MobileTabs）读取，
    // 包装成与桌面端 Tab 兼容的伪 Tab，使 rootIdOf/titleOf/pinKeyOf/createCard 等直接复用
    private currentTabs(): Tab[] {
        return this.bridge.getAllTabs();
    }
}
