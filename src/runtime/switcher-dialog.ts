import {mountPlatformChrome} from "./platform-chrome";
import {Dialog, getAllTabs, getActiveTab} from "siyuan";
import {buildSwitcherHtml as buildSwitcherHtmlSurface} from "../surfaces";
import {lvEcosystem} from "../libs/lv-notice-kit";
import {logger} from "../logger";
import {clampOversizedIcons} from "../util";
import {bindDocSearchFilter, disposeDocSearchSession, hasDocSearchFilter} from "../doc-search-ui";
import {encodeSurfaceFocusSource, resolveSurfaceFocusRestoreTarget} from "../platform-surface-model";
import {mountPlatformDialogCloseHint, mountPlatformDialogTitleWrap} from "../platform-dom";
import {BACK_TOP_THRESHOLD_PX, TabGroupMode} from "../constants";
import {type Tab, type PlatformSurface, type PlatformSurfaceContext, type SortBy, type IOverlayClose, type ISwSettings, type ISpeedSwitchHost} from "./plugin-types";

export interface SwitcherDialogRuntime extends Omit<ISpeedSwitchHost, "assembleSwitcherParts" | "prepareSwitcherChrome" | "bindSwitcherListArea" | "bindSwitcherBackTop" | "bindSwitcherFullscreenToggle" | "bindSwitcherToolbarActions" | "updateSortTriggerLabel" | "bindSortTriggerMenu"> {}
export class SwitcherDialogRuntime {
    // 打开页签切换器
    public showSwitcher(focusSearch = false, returnTo: PlatformSurface = "switcher", context?: PlatformSurfaceContext | null) {
        if (typeof this.ensureTier2Loaded === "function") {
            void this.ensureTier2Loaded().catch((err) => {
                logger.warn("showSwitcher tier2 load fail", err);
            });
        }
        this.notePlatformSurface("switcher", context);
        // T-7163：新入口（热键/悬浮球等无 context）重置会话现场；往返（带 context）恢复。
        if (!context) this.switcherScene = null;
        // 手机端走独立适配
        if (this.isMobile) {
            this.showMobileSwitcher(focusSearch, returnTo, context);
            return;
        }

        const tabs = this.bridge.getAllTabs();
        const settings = this.getSettings();
        const activeTab = this.bridge.getActiveTab();
        // 全屏模式：切换器铺满整个窗口（Esc 退出由思源 Dialog 默认行为提供）
        const fullscreen = settings.fullscreen;

        // T-6869 单例守卫：热键/悬浮球/表面导航连点不再叠出多个切换器，
        // 先销毁旧实例（其 destroyCallback 串行释放 FAB 挂起），再开新实例。
        if (this.platformSwitcherDialog?.element.isConnected) this.platformSwitcherDialog.destroy();

        // T-6481：Dialog 的 destroyCallback 必须在构造时就成型，而资源是在后续装配方法里
        // 创建的，故用一个可变 holder 把两者接起来（宿主只认构造参数）。
        const releaseFab = this.suspendFABForDialog();
        const switcherRelease: {fn: () => void} = {fn: releaseFab};
        const dialog = this.createSwitcherDialog(settings, fullscreen, switcherRelease, returnTo, context);
        // 宿主主题可能在 Dialog 构造后改写内容，导致平台根节点消失。
        // 在装配任何子模块前销毁空壳，避免留下遮罩并释放 FAB 挂起。
        if (!dialog.element.querySelector<HTMLElement>('[data-sw-surface="switcher"]')) {
            dialog.destroy();
            return;
        }
        // 工具栏、列表/回到顶部/缩略图懒加载 等子模块装配
        this.assembleSwitcherParts(dialog, settings, fullscreen, tabs, activeTab, switcherRelease, focusSearch, returnTo, context);
        // T-7012：跨表面返回焦点——带焦点来源重开时，把焦点送回来源控件
        // （对象行/搜索输入）；找不到保留装配默认首焦点，不强制回退。
        if (context?.focusSource) {
            window.setTimeout(() => {
                if (!dialog.element.isConnected || this.isUnloading) return;
                const surfaceRoot = dialog.element.querySelector<HTMLElement>('[data-sw-surface="switcher"]');
                const target = surfaceRoot ? resolveSurfaceFocusRestoreTarget(surfaceRoot, context.focusSource) : null;
                target?.focus({preventScroll: true});
            }, 0);
        }
    }

    // 构造桌面端切换器 Dialog（内容 HTML + 尺寸），外部只关心装配顺序，不关心 DOM 结构细节
    public createSwitcherDialog(settings: ISwSettings, fullscreen: boolean, release: {fn: () => void}, returnTo: PlatformSurface = "switcher", context: PlatformSurfaceContext | null = null): Dialog {
        const size = this.resolvePanelDialogSize(settings, fullscreen);
        const holder: {dialog: Dialog | null} = {dialog: null};
        const dialog = new Dialog({
            title: this.i18n.dialogSwitcherTitle || "页签切换器",
            content: buildSwitcherHtmlSurface(fullscreen, this.i18n as any),
            width: `${size.width}px`,
            height: `${size.height}px`,
            disableAnimation: true,
            destroyCallback: () => {
                if (this.platformSwitcherDialog === holder.dialog) this.platformSwitcherDialog = null;
                // T-7172：切换器关闭时批量取消在途缩略图回源
                this.cancelThumbFetches();
                // T-7163：销毁前捕获搜索现场，跨面板往返时恢复
                const sceneInput = dialog.element.querySelector<HTMLInputElement>(".sw__search");
                const sceneScroll = dialog.element.querySelector<HTMLDivElement>(".sw__scroll");
                if (sceneInput && sceneScroll) {
                    this.switcherScene = {
                        query: sceneInput.value,
                        filters: {...(this.docSearchState.filters.get(sceneScroll) || {})},
                        scrollTop: sceneScroll.scrollTop,
                    };
                }
                release.fn();
            },
        });
        holder.dialog = dialog;
        this.platformSwitcherDialog = dialog;
        dialog.element.classList.add("sw-dialog-host", "sw-dialog-host--switcher");
        dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("sw-platform-dialog", "sw-platform-dialog--switcher");
        mountPlatformDialogTitleWrap(dialog.element, this.i18n.dialogSwitcherTitle || "页签切换器", "", "iconLvSpeedSwitch");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        const surfaceRoot = dialog.element.querySelector<HTMLElement>('[data-sw-surface="switcher"]');
        if (surfaceRoot) {
            mountPlatformChrome(surfaceRoot, {
                surface: "switcher",
                labels: this.getPlatformSurfaceLabels(),
                available: this.getAvailablePlatformSurfaces(),
                context,
                kbdHints: ["Tab", "1-9", "Enter", this.i18n.platformKbdPreview],
                status: {state: "ready", label: this.i18n.platformConnected},
                onHelp: () => this.openPlatformGuide("switcher"),
                helpLabel: this.i18n.platformGuideButton,
                onSettings: () => {
                    if (!dialog.element.isConnected) return;
                    const focusSource = encodeSurfaceFocusSource(dialog.element.ownerDocument?.activeElement || null);
                    const query = dialog.element.querySelector<HTMLInputElement>("input.sw__search")?.value.trim() || context?.query || "";
                    dialog.destroy();
                    this.openSetting(undefined, "switcher", {
                        entry: "back", ...(context?.objectKind ? {objectKind: context.objectKind} : {}),
                        ...(context?.objectId ? {objectId: context.objectId} : {}), ...(query ? {query} : {}),
                        ...(focusSource ? {focusSource} : {}),
                    });
                },
                settingsLabel: this.i18n.settings,
                closeHint: this.i18n.platformCloseHint,
                onClose: () => dialog.destroy(),
                closeLabel: this.i18n.close,
                onNavigate: (surface: PlatformSurface) => {
                    if (this.isUnloading || !dialog.element.isConnected) return;
                    // T-7012：导航离开前捕获焦点来源，配合 query 透传供返回后恢复现场。
                    const focusSource = encodeSurfaceFocusSource(dialog.element.ownerDocument?.activeElement || null);
                    dialog.destroy();
                    dialog.element?.remove();
                    this.openPlatformSurface(surface, returnTo, {
                        entry: "surface-nav", objectKind: context?.objectKind, objectId: context?.objectId,
                        query: context?.query, ...(focusSource ? {focusSource} : {}),
                    });
                },
            });
        }
        return dialog;
    }

    // 装配：全屏切换、工具栏事件、收藏下拉、列表渲染、搜索过滤、回到顶部、缩略图懒加载
    private assembleSwitcherParts(
        dialog: Dialog,
        settings: ISwSettings,
        fullscreen: boolean,
        tabs: Tab[],
        activeTab: Tab | undefined,
        release: {fn: () => void},
        focusSearch = false,
        returnTo: PlatformSurface = "switcher",
        context?: PlatformSurfaceContext | null,
    ) {
        const releaseFab = release.fn;
        this.prepareSwitcherChrome(dialog, fullscreen);

        // 左侧侧边栏面板列表（与思源 Ctrl+Tab 切换面板一致），按设置排除与显示方式渲染，无可面板时自动隐藏
        const dockElement = dialog.element.querySelector<HTMLDivElement>(".sw__dock");
        this.renderDockList(dockElement, dialog, settings.excludedDocks, settings.dockDisplay);

        // 极速首屏：清理缩略图孤儿条目移出同步关键路径，由微任务异步执行
        queueMicrotask(() => {
            if (dialog.element.isConnected) this.pruneThumbCache(tabs);
        });

        // 宸ュ叿鏍忓紩鐢?
const searchInput = dialog.element.querySelector<HTMLInputElement>(".sw__search");
        const sortSelect = dialog.element.querySelector<HTMLSelectElement>(".sw__sort");
        const scrollElement = dialog.element.querySelector<HTMLDivElement>(".sw__scroll");
        if (!scrollElement) {
            return;
        }
        const closeOverlay = () => dialog.destroy();
        let refreshList: () => void = () => undefined;
        const listOpts = {onOverlayClose: closeOverlay, onTabsChanged: () => refreshList()};
        // 列表区与工具栏排序切换共享的「最近编辑」更新时间映射（loadUpdatedMap 异步回填）
const updatedMap: {[rootId: string]: string} = {};

        refreshList = () => {
            if (!dialog.element.isConnected) {
                return;
            }
            const activeSort = (sortSelect?.value as SortBy) || this.getSettings().sortBy;
            this.renderList(scrollElement, this.bridge.getAllTabs(), this.bridge.getActiveTab(), listOpts,
                activeSort, updatedMap);
            if (searchInput && (searchInput.value.trim() !== "" || hasDocSearchFilter.call(this, scrollElement))) {
                this.applySearch(scrollElement, searchInput, closeOverlay);
            } else {
                // T-6807/T-6814：首次打开（空查询且无筛选）也要呈现零词条工作台
                this.renderWorkbench(scrollElement, "", closeOverlay);
            }
        };
        if (!this.tier2Ready && typeof this.ensureTier2Loaded === "function") {
            void this.ensureTier2Loaded().then(() => {
                if (dialog.element.isConnected && !this.isUnloading) {
                    refreshList();
                }
            }).catch(() => {});
        }
        const refreshQuickActions = () => {
            if (!dialog.element.isConnected) return;
            const currentSettings = this.getSettings();
            const useRightRail = currentSettings.quickActionsRightRail
                && currentSettings.quickActionsDisplayDesktop !== "hidden";
            const targetSelector = useRightRail ? ".sw__quick-rail" : ".sw__quick-actions";
            this.renderQuickActions(dialog.element, "desktop", searchInput, closeOverlay, targetSelector);
            dialog.element.querySelector<HTMLElement>(".sw__body")?.classList.toggle("sw--quick-rail", useRightRail);
            dialog.element.querySelector<HTMLElement>(".sw__quick-actions")?.classList.toggle("fn__none", useRightRail);
            dialog.element.querySelector<HTMLElement>(".sw__quick-rail")?.classList.toggle("fn__none", !useRightRail);
        };
        // T-7163：跨面板往返——恢复会话快照的 query/筛选/滚动（新入口已在 showSwitcher 重置）。
        const switcherScene = context ? this.switcherScene : null;
        if (switcherScene && searchInput) {
            if (Object.keys(switcherScene.filters).length > 0) {
                this.docSearchState.filters.set(scrollElement, {...switcherScene.filters});
            }
            searchInput.value = switcherScene.query;
        } else if (context?.entry === "command" && searchInput) {
            searchInput.value = "> ";
        }
        const restoreSceneScroll = () => {
            if (!switcherScene || !switcherScene.scrollTop) return;
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    if (dialog.element.isConnected) scrollElement.scrollTop = switcherScene.scrollTop;
                });
            });
        };

        const refreshSurface = (): void => {
            refreshList();
            refreshQuickActions();
        };
        dialog.element.querySelector<HTMLButtonElement>(".sw__refresh-btn")?.addEventListener("click", () => {
            this.notebookListCache = null;
            refreshSurface();
        });
        const unregisterRefresh = this.registerSwitcherRefresh(refreshSurface);
        let iconClampFrame = 0;
        const dirtyIconRoots = new Set<Element>();
        const clampIcons = (records?: MutationRecord[]) => {
            this.collectDirtyIconRoots(dialog.element, dirtyIconRoots, records);
            if (dirtyIconRoots.size === 0 || iconClampFrame || !dialog.element.isConnected) return;
            iconClampFrame = requestAnimationFrame(() => {
                iconClampFrame = 0;
                this.flushDirtyIconRoots(dialog.element, dirtyIconRoots);
            });
        };
        const iconObserver = (this.isMobile && typeof MutationObserver === "function")
            ? new MutationObserver(clampIcons) : null;
        const onDialogSearchShortcut = (event: KeyboardEvent) => {
            if (!searchInput || !searchInput.isConnected) return;
            if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "f") {
                if ((event.target as HTMLElement | null)?.closest(".sw__doc-preview-find")) return;
                event.preventDefault();
                event.stopPropagation();
                searchInput.focus({preventScroll: true});
                if (searchInput.value) searchInput.select();
            }
        };
        dialog.element.addEventListener("keydown", onDialogSearchShortcut, true);
        const disposeSearchFilter: () => void = searchInput
            ? bindDocSearchFilter.call(this, dialog.element, scrollElement, searchInput, closeOverlay)
            : () => undefined;
        const modeBar = dialog.element.querySelector<HTMLElement>(".sw__mode-chips-bar");
        const disposeModeChips = this.setupSearchModeChips(modeBar, searchInput, () => {
            if (searchInput) this.applySearch(scrollElement, searchInput, closeOverlay);
        });
        const disposeHistoryDropdown = this.setupOpenHistoryDropdown(dialog.element.querySelector<HTMLElement>(".sw__history-dd"), closeOverlay);
        // T-7040：排序浮层 disposer 由 bindSwitcherToolbarActions 返回后在释放链调用
        let disposeSortMenu: () => void = () => undefined;
        let disposeBackTop: () => void = () => undefined;
        let disposeSearchComposition: () => void = () => undefined;
        let switcherReleased = false;
        release.fn = () => {
            if (switcherReleased) return;
            switcherReleased = true;
            releaseFab();
            unregisterRefresh();
            iconObserver?.disconnect();
            if (iconClampFrame) cancelAnimationFrame(iconClampFrame);
            dirtyIconRoots.clear();
            dialog.element.removeEventListener("keydown", onDialogSearchShortcut, true);
            disposeSearchComposition();
            disposeSearchFilter();
            disposeModeChips();
            disposeBackTop();
            disposeHistoryDropdown();
            disposeSortMenu();
            disposeDocSearchSession.call(this, scrollElement);
        };

        this.bindSwitcherFullscreenToggle(dialog, settings, fullscreen);
        disposeSortMenu = this.bindSwitcherToolbarActions(dialog, searchInput, sortSelect, listOpts, closeOverlay, updatedMap, returnTo, context);

        // 收藏下拉组件：星标触发 + 分组面板（分组可折叠/展开，项点击跳转）
        const favDd = dialog.element.querySelector<HTMLElement>(".sw__fav-dd");
        this.setupFavDropdown(favDd, closeOverlay, refreshList);
        if (sortSelect) {
            sortSelect.value = settings.sortBy;
        }

        // 右侧页签缩略图网格：每次打开都重新克隆渲染，展示各页签的最新状态
        disposeSearchComposition = this.bindSwitcherListArea(dialog, scrollElement, tabs, activeTab, listOpts, settings, searchInput, sortSelect, closeOverlay, updatedMap) || (() => undefined);
        refreshQuickActions();
        restoreSceneScroll();
        if (this.isMobile) {
            iconObserver?.observe(dialog.element, {childList: true, subtree: true});
            requestAnimationFrame(() => { if (dialog.element.isConnected) clampOversizedIcons(dialog.element); });
        }

        // 普通打开仍把焦点交给滚动区，保持键盘卡片导航语义；动作面板
        // 的“搜索”入口显式要求搜索框获得焦点，避免只打开切换器却让
        // 用户再点一次输入框。
        if (focusSearch && searchInput) {
            searchInput.focus();
            if (context?.entry === "command") {
                searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
                this.applySearch(scrollElement, searchInput, closeOverlay);
            }
        } else {
            scrollElement.focus();
        }

        // 回到顶部按钮（RAF 节流与解绑通道）
        disposeBackTop = this.bindSwitcherBackTop(dialog, scrollElement);
    }

    // 弹窗外观准备：全屏模式下给容器加类（去圆角/边框/最大宽度），并锁定 .b3-dialog__body 不整体滚动
    private prepareSwitcherChrome(dialog: Dialog, fullscreen: boolean) {
        if (fullscreen) {
            const swContainer = dialog.element.querySelector(".b3-dialog__container");
            swContainer?.classList.add("sw-dialog--fullscreen");
            const isElectronFrameless = !this.isMobile && typeof document !== "undefined"
                && (/Electron/i.test(navigator?.userAgent || "") || Boolean(document.querySelector("#minWindow, #maxWindow, #closeWindow, .toolbar__window")));
            if (isElectronFrameless) {
                swContainer?.classList.add("sw-dialog--frameless-avoidance");
            }
        }
        // 思源 .b3-dialog__body 默认 overflow:auto，内容一高就会整体滚动把工具栏滚走，
        // 加类锁定它（配套 SCSS 规则见 .sw-scroll-locked），保证只有 .sw__scroll 滚动、顶栏始终固定
        const dialogBody = dialog.element.querySelector<HTMLElement>(".b3-dialog__body");
        if (dialogBody) {
            dialogBody.classList.add("sw-scroll-locked");
        }
    }

    // 绑定切换器列表区：初次渲染 + 键盘导航 + 「最近编辑」排序回源 + 搜索输入
    private bindSwitcherListArea(
        dialog: Dialog,
        scrollElement: HTMLDivElement,
        tabs: Tab[],
        activeTab: Tab | undefined,
        listOpts: {onOverlayClose: IOverlayClose, onTabsChanged: IOverlayClose},
        settings: ISwSettings,
        searchInput: HTMLInputElement | null,
        sortSelect: HTMLSelectElement | null,
        closeOverlay: IOverlayClose,
        updatedMap: {[rootId: string]: string},
    ) {
        // T-7163：初次 paint 与 refreshList 同分支——往返恢复的 query/筛选直接走搜索渲染。
        if (searchInput && (searchInput.value.trim() !== "" || hasDocSearchFilter.call(this, scrollElement))) {
            this.applySearch(scrollElement, searchInput, closeOverlay);
        } else {
            this.renderList(scrollElement, tabs, activeTab, listOpts, settings.sortBy, updatedMap);
            // T-6807/T-6814：首次打开（空查询且无筛选）即呈现零词条工作台（含关联内容行）
            // 优化：优先保证卡片列表完成首屏绘制，零词条工作台微任务随后接入，杜绝同步等待
            queueMicrotask(() => {
                if (dialog.element.isConnected && (!searchInput || !searchInput.value.trim())) {
                    this.renderWorkbench(scrollElement, "", closeOverlay);
                }
            });
        }
        this.bindKeydown(scrollElement, closeOverlay);

        // 最近编辑排序和可选卡片改动信息共用 blocks.updated。默认按 MRU 且未开启
        // 改动标记时，首屏不消费该映射，跳过一次内核 SQL，避免打开切换器被无用请求拖慢。
        if (settings.sortBy === "updatedDesc" || settings.showCardUpdatedBadge === true) {
            this.loadUpdatedMap(tabs).then((map) => {
                Object.assign(updatedMap, map);
                if (!dialog.element.isConnected) return;
                const activeSort = (sortSelect?.value as SortBy) || this.getSettings().sortBy;
                if (activeSort === "updatedDesc" && searchInput && searchInput.value.trim() === "") {
                    this.renderList(scrollElement, this.bridge.getAllTabs(), this.bridge.getActiveTab(), listOpts, "updatedDesc", updatedMap);
                } else if (this.getSettings().showCardUpdatedBadge === true) {
                    this.refreshCardUpdatedBadges(scrollElement, updatedMap);
                }
            }).catch((err) => logger.warn("loadUpdatedMap initial failed", err));
        }

        // 搜索：已打开页签匹配显示在上半部分，同时全库文档结果显示在下半部分
        if (searchInput) {
            return this.bindSearchInputComposition(searchInput, () => {
                this.applySearch(scrollElement, searchInput, closeOverlay);
            }, scrollElement, closeOverlay);
        }
        return (): void => undefined;
    }

    // 绑定回到顶部按钮：滚动超过 240px 显示，点击平滑回顶（RAF 节流 + 被动监听 + 销毁解绑）
    private bindSwitcherBackTop(dialog: Dialog, scrollElement: HTMLElement): () => void {
        const backTopBtn = dialog.element.querySelector<HTMLElement>(".sw__back-top");
        if (!backTopBtn) {
            return () => undefined;
        }
        let rafId = 0;
        const onScroll = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = 0;
                backTopBtn.classList.toggle("sw__show", scrollElement.scrollTop >= BACK_TOP_THRESHOLD_PX);
            });
        };
        const onClick = () => {
            if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = 0;
            }
            scrollElement.scrollTo({top: 0, behavior: (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) ? "auto" : "smooth"});
        };
        scrollElement.addEventListener("scroll", onScroll, {passive: true});
        backTopBtn.addEventListener("click", onClick);
        return () => {
            if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = 0;
            }
            scrollElement.removeEventListener("scroll", onScroll);
            backTopBtn.removeEventListener("click", onClick);
        };
    }

    // 绑定"全屏 ⇄ 普通"原地切换按钮（与关闭弹窗不同：原地切换可以保留搜索/缩略图状态）
    private bindSwitcherFullscreenToggle(dialog: Dialog, settings: ISwSettings, initialFullscreen: boolean) {
        const fsBtn = dialog.element.querySelector<HTMLElement>(".sw__fullscreen-btn");
        const swBody = dialog.element.querySelector<HTMLElement>(".sw__body");
        let isFullscreen = initialFullscreen;
        let isToggling = false;
        const toggleFullscreen = (toFullscreen: boolean) => {
            const container = dialog.element.querySelector<HTMLElement>(".b3-dialog__container");
            if (!container || toFullscreen === isFullscreen || isToggling) {
                return;
            }
            isToggling = true;
            isFullscreen = toFullscreen;
            if (toFullscreen) {
                container.style.width = "100vw";
                // Dynamic viewport units keep the fullscreen surface inside the
                // currently visible area when mobile browser chrome/IME changes.
                // Older WebViews ignore the value and retain the CSS 100vh fallback.
                container.style.height = "100dvh";
                container.classList.add("sw-dialog--fullscreen");
                swBody?.classList.add("sw--fullscreen");
                const isElectronFrameless = !this.isMobile && typeof document !== "undefined"
                    && (/Electron/i.test(navigator?.userAgent || "") || Boolean(document.querySelector("#minWindow, #maxWindow, #closeWindow, .toolbar__window")));
                container.classList.toggle("sw-dialog--frameless-avoidance", isElectronFrameless);
                swBody?.classList.toggle("sw-dialog--frameless-avoidance", isElectronFrameless);
                fsBtn?.setAttribute("aria-label", this.i18n.exitFullscreen);
                fsBtn?.setAttribute("title", this.i18n.exitFullscreen);
            } else {
                const restored = this.resolvePanelDialogSize(settings, false);
                container.style.width = `${restored.width}px`;
                container.style.height = `${restored.height}px`;
                container.classList.remove("sw-dialog--fullscreen");
                swBody?.classList.remove("sw--fullscreen");
                container.classList.remove("sw-dialog--frameless-avoidance");
                swBody?.classList.remove("sw-dialog--frameless-avoidance");
                fsBtn?.setAttribute("aria-label", this.i18n.enterFullscreen);
                fsBtn?.setAttribute("title", this.i18n.enterFullscreen);
            }
            window.requestAnimationFrame(() => {
                isToggling = false;
            });
        };
        fsBtn?.addEventListener("click", () => toggleFullscreen(!isFullscreen));
    }

    // 工具栏顶栏按钮：设置 / 侧边栏 / 日记按钮 + 排序切换；返回排序浮层 disposer 供弹窗释放链调用
    private bindSwitcherToolbarActions(
        dialog: Dialog,
        searchInput: HTMLInputElement | null,
        sortSelect: HTMLSelectElement | null,
        listOpts: {onOverlayClose: () => void, onTabsChanged: () => void},
        closeOverlay: () => void,
        updatedMap: {[rootId: string]: string},
        returnTo: PlatformSurface = "switcher",
        context?: PlatformSurfaceContext | null,
    ): () => void {
        dialog.element.querySelector(".sw__settings-btn")?.addEventListener("click", () => {
            const focusSource = encodeSurfaceFocusSource(dialog.element.ownerDocument?.activeElement || null);
            const query = searchInput?.value.trim() || context?.query || "";
            dialog.destroy();
            // T-7012：设置从切换器打开，关闭后恢复切换器。
            this.openSetting(undefined, "switcher", {
                entry: "back", ...(context?.objectKind ? {objectKind: context.objectKind} : {}),
                ...(context?.objectId ? {objectId: context.objectId} : {}), ...(query ? {query} : {}),
                ...(focusSource ? {focusSource} : {}),
            });
        });
        dialog.element.querySelector(".sw__help-guide-btn")?.addEventListener("click", () => {
            this.openPlatformGuide("switcher");
        });
        dialog.element.querySelector(".sw__activity-stream-btn")?.addEventListener("click", () => {
            this.openActivityStreamDialog();
        });

        const switcherEcoStatus = dialog.element.querySelector<HTMLElement>(".sw__ecosystem-status");
        if (switcherEcoStatus && typeof lvEcosystem !== "undefined" && typeof lvEcosystem.getStatusBadgeText === "function") {
            switcherEcoStatus.textContent = lvEcosystem.getStatusBadgeText();
            switcherEcoStatus.title = switcherEcoStatus.textContent;
        }
        const studioToolbarButton = dialog.element.querySelector<HTMLElement>(".sw__snippet-studio-btn");
        if (!this.getAvailablePlatformSurfaces().includes("studio")) {
            studioToolbarButton?.remove();
        } else {
            studioToolbarButton?.addEventListener("click", () => {
                dialog.destroy();
                this.openPlatformSurface("studio", returnTo, {
                    entry: "toolbar", objectKind: context?.objectKind, objectId: context?.objectId, query: context?.query,
                });
            });
        }
        // 顶栏日记按钮：打开/新建当日日记（未设默认日记本时首次点击弹出选择）
        dialog.element.querySelector(".sw__journal-btn")?.addEventListener("click", () => {
            dialog.destroy();
            this.openJournal();
        });
        // 排序/分组一体化变更：更新设置 → 重排列表 → 补查最近编辑 → 保留搜索词重放筛选
        const replaySearchIfActive = (targetScrollEl: HTMLDivElement | null) => {
            if (targetScrollEl && searchInput && (searchInput.value.trim() !== "" || hasDocSearchFilter.call(this, targetScrollEl))) {
                this.applySearch(targetScrollEl, searchInput, closeOverlay);
            }
        };
        const applySortChange = (nextSort: SortBy) => {
            this.updateSettings({sortBy: nextSort});
            this.updateSortTriggerLabel(dialog.element);
            if (sortSelect) {
                sortSelect.value = nextSort;
            }
            const scrollElement = dialog.element.querySelector<HTMLDivElement>(".sw__scroll");
            // 弹窗存活期间页签可能已增减，重取最新列表；沿用共享 updatedMap，已回源的更新时间不重算
            if (scrollElement) {
                this.renderList(scrollElement, this.bridge.getAllTabs(), this.bridge.getActiveTab(), listOpts, nextSort, updatedMap);
                replaySearchIfActive(scrollElement);
            }
            this.loadUpdatedMap(this.bridge.getAllTabs()).then((map) => {
                Object.assign(updatedMap, map);
                if (dialog.element.isConnected && this.getSettings().sortBy === "updatedDesc") {
                    const el = dialog.element.querySelector<HTMLDivElement>(".sw__scroll");
                    if (el) {
                        this.renderList(el, this.bridge.getAllTabs(), this.bridge.getActiveTab(), listOpts, "updatedDesc", updatedMap);
                        replaySearchIfActive(el);
                    }
                } else if (dialog.element.isConnected && this.getSettings().showCardUpdatedBadge === true) {
                    const el = dialog.element.querySelector<HTMLDivElement>(".sw__scroll");
                    if (el) this.refreshCardUpdatedBadges(el, updatedMap);
                }
            }).catch((err) => logger.warn("loadUpdatedMap on sort change failed", err));
            scrollElement?.focus();
        };
        const applyGroupChange = (nextGroup: TabGroupMode) => {
            this.updateSettings({groupBy: nextGroup});
            this.updateSortTriggerLabel(dialog.element);
            const scrollElement = dialog.element.querySelector<HTMLDivElement>(".sw__scroll");
            if (scrollElement) {
                this.renderList(scrollElement, this.bridge.getAllTabs(), this.bridge.getActiveTab(), listOpts, this.getSettings().sortBy, updatedMap);
                // 分组变化也必须重放当前搜索现场。否则输入框仍显示关键词，
                // 但卡片、统一索引和全库结果已经退回未筛选状态。
                if (searchInput && (searchInput.value.trim() !== "" || hasDocSearchFilter.call(this, scrollElement))) {
                    this.applySearch(scrollElement, searchInput, closeOverlay);
                }
            }
        };
        sortSelect?.addEventListener("change", () => {
            applySortChange(sortSelect.value as SortBy);
        });
        return this.bindSortTriggerMenu(dialog.element, applySortChange, applyGroupChange);
    }

    // 排序触发按钮：标签 = 分组·排序 组合；点击弹出自制浮层（与收藏/最近下拉同模式，
    // 不用思源 Menu——插件弹窗层级可能盖住 body 级菜单），浮层含分组方式与组内排序两段单选
    private updateSortTriggerLabel(scope: HTMLElement) {
        const labelEl = scope.querySelector<HTMLElement>(".sw__sort-trigger .sw__sort-trigger-label");
        if (!labelEl) return;
        const s = this.getSettings();
        const groupLabels: Record<string, string> = {
            none: this.i18n.groupNone,
            notebook: this.i18n.groupNotebook,
            path: this.i18n.groupPath,
            favorites: this.i18n.groupFavorites,
            createdMonth: this.i18n.groupCreatedMonth,
        };
        const sortLabels: Record<string, string> = {
            mru: this.i18n.sortMru,
            layout: this.i18n.sortLayout,
            layoutDesc: this.i18n.sortLayoutDesc,
            updatedDesc: this.i18n.sortUpdatedDesc,
            titleAsc: this.i18n.sortTitleAsc,
            titleDesc: this.i18n.sortTitleDesc,
        };
        labelEl.textContent = (groupLabels[s.groupBy] || s.groupBy) + " · " + (sortLabels[s.sortBy] || s.sortBy);
    }

    private bindSortTriggerMenu(
        scope: HTMLElement,
        applySortChange: (nextSort: SortBy) => void,
        applyGroupChange: (nextGroup: TabGroupMode) => void,
    ): () => void {
        const trigger = scope.querySelector<HTMLButtonElement>(".sw__sort-trigger");
        if (!trigger) return () => undefined;
        trigger.setAttribute("aria-haspopup", "menu");
        trigger.setAttribute("aria-expanded", "false");
        this.updateSortTriggerLabel(scope);
        let panel: HTMLElement | null = null;
        let outsideHandler: ((event: PointerEvent) => void) | null = null;
        let keyHandler: ((event: KeyboardEvent) => void) | null = null;
        let resizeHandler: (() => void) | null = null;
        const closePanel = () => {
            if (!panel) return;
            // T-7040：焦点回归——浮层内焦点随菜单销毁会丢到 body，关闭时还给触发钮
            const focusInside = panel.contains(document.activeElement);
            panel.remove();
            panel = null;
            trigger.setAttribute("aria-expanded", "false");
            if (outsideHandler) document.removeEventListener("pointerdown", outsideHandler, true);
            if (keyHandler) document.removeEventListener("keydown", keyHandler, true);
            if (resizeHandler) window.removeEventListener("resize", resizeHandler);
            outsideHandler = null;
            keyHandler = null;
            resizeHandler = null;
            if (focusInside) { try { trigger.focus({preventScroll: true}); } catch (_) { trigger.focus(); } }
        };
        // T-7040：owner disposer——表面切换/弹窗销毁时由宿主释放链调用；
        // 浮层挂 document.body 且监听注册在 document/window，无 owner 通道时
        // 表面重建会留下幽灵菜单与全局监听残留。
        const disposeSortMenu = () => { closePanel(); };
        const radioRow = (label: string, checked: boolean, onClick: () => void) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "sw__sort-menu-option";
            item.setAttribute("role", "menuitemradio");
            item.setAttribute("aria-checked", String(checked));
            item.innerHTML = "<span></span>" + (checked ? '<svg><use xlink:href="#iconCheck"></use></svg>' : "");
            item.querySelector("span")!.textContent = label;
            item.addEventListener("click", () => {
                closePanel();
                onClick();
            });
            return item;
        };
        const sectionTitle = (label: string) => {
            const title = document.createElement("div");
            title.className = "sw__sort-menu-section";
            title.textContent = label;
            return title;
        };
        trigger.addEventListener("click", () => {
            if (panel) { closePanel(); return; }
            trigger.setAttribute("aria-expanded", "true");
            panel = document.createElement("div");
            panel.className = "sw__sort-menu";
            panel.setAttribute("role", "menu");
            panel.setAttribute("aria-label", this.i18n.setSortBy);
            const s = this.getSettings();
            panel.appendChild(sectionTitle(this.i18n.groupModeTitle));
            ([
                ["notebook", this.i18n.groupNotebook],
                ["path", this.i18n.groupPath],
                ["favorites", this.i18n.groupFavorites],
                ["createdMonth", this.i18n.groupCreatedMonth],
                ["none", this.i18n.groupNone],
            ] as Array<[TabGroupMode, string]>).forEach(([value, label]) => {
                panel!.appendChild(radioRow(label, s.groupBy === value, () => {
                    this.updateSortTriggerLabel(scope);
                    applyGroupChange(value);
                }));
            });
            panel.appendChild(sectionTitle(this.i18n.groupSortTitle));
            ([
                ["mru", this.i18n.sortMru],
                ["layout", this.i18n.sortLayout],
                ["layoutDesc", this.i18n.sortLayoutDesc],
                ["updatedDesc", this.i18n.sortUpdatedDesc],
                ["titleAsc", this.i18n.sortTitleAsc],
                ["titleDesc", this.i18n.sortTitleDesc],
            ] as Array<[SortBy, string]>).forEach(([value, label]) => {
                panel!.appendChild(radioRow(label, s.sortBy === value, () => {
                    this.updateSortTriggerLabel(scope);
                    applySortChange(value);
                }));
            });
            // 挂到 body：dialog.element 不在 .speed-switch 内容容器内，挂这里样式选择器会失配，
            // 浮层退化为文档流裸块；body + fixed + 高 z-index 与手机端排序面板同模式
            document.body.appendChild(panel);
            const positionPanel = () => {
                const rect = trigger.getBoundingClientRect();
                panel.style.top = `${Math.round(rect.bottom + 6)}px`;
                panel.style.right = `${Math.round(Math.max(6, window.innerWidth - rect.right))}px`;
            };
            positionPanel();
            // 排序面板挂在 body 上，窗口尺寸变化后重新计算位置，避免
            // 缩放或旋转后浮层落在旧坐标甚至离开视口。
            resizeHandler = positionPanel;
            window.addEventListener("resize", resizeHandler);
            // T-7192：radiogroup 键盘合同——打开入焦首个 menuitemradio，方向键循环选择。
            const menuItems = Array.from(panel.querySelectorAll<HTMLButtonElement>(".sw__sort-menu-option"));
            if (menuItems.length > 0) menuItems[0].focus({preventScroll: true});
            panel.addEventListener("keydown", (event: KeyboardEvent) => {
                const items = Array.from(panel.querySelectorAll<HTMLButtonElement>(".sw__sort-menu-option"));
                if (items.length === 0) return;
                const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    const dir = event.key === "ArrowDown" ? 1 : -1;
                    const next = items[(currentIndex + dir + items.length) % items.length];
                    next.focus({preventScroll: true});
                } else if (event.key === "Home") {
                    event.preventDefault();
                    items[0].focus({preventScroll: true});
                } else if (event.key === "End") {
                    event.preventDefault();
                    items[items.length - 1].focus({preventScroll: true});
                }
            });
            outsideHandler = (event) => {
                if (!panel?.contains(event.target as Node) && event.target !== trigger && !trigger.contains(event.target as Node)) closePanel();
            };
            document.addEventListener("pointerdown", outsideHandler, true);
            keyHandler = (event) => {
                if (event.isComposing || event.keyCode === 229 || event.key === "Process") return;
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    closePanel();
                }
            };
            document.addEventListener("keydown", keyHandler, true);
        });
        return disposeSortMenu;
    }
}
