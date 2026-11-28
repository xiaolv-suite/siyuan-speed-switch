import {getAllTabs, getActiveTab, openTab} from "siyuan";
import {lvSurfaceStack} from "../libs/lv-notice-kit";
import {logger} from "../logger";
import {resolveFavoriteRootId} from "../util";
import {resolveQuickActionLabel} from "../quick-actions";
import {applySavedSearchFilters} from "../doc-search-ui";
import {getBridgeSafely} from "../api/ecosystem-bridge-kit";
import {resolveFloatingBallClickAction, resolveFloatingActionAvailability, normalizeFloatingBallConfig, applyFloatingBallPreset, pickNextFloatingBallPreset, findFloatingAction} from "../floating-ball-model";
import {createFloatingBallUi, FloatingBallUiController, FloatingBallPosition, FloatingBallSurface} from "../floating-ball-ui";
import {createFloatingBallActionExecutor} from "../floating-ball-actions";
import {scrollSurfaceTo} from "../floating-ball-generic-actions";
import {createFloatingBallPanelController} from "../floating-ball-panel";
import {MESSAGE_DEFAULT_MS, BLOCK_ID_RE} from "../constants";
import {type IOverlayClose, type QuickActionTarget, type IQuickAction, type IQuickActionPluginLike, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface FloatingBallHostRuntime extends Omit<ISpeedSwitchHost, "refreshFloatingBallPanels" | "cycleFloatingBallTab" | "scrollFloatingBallSurface" | "executeFloatingBallSavedSearch" | "cycleBallPreset" | "getFloatingBallActions" | "executeFloatingBallBoundAction" | "executeFloatingBallBoundGesture" | "executeFloatingBallSurfaceAction" | "createFloatingBallSurface" | "buildFloatingBallHubPayload" | "executeFloatingBallHubItem" | "toggleFloatingBallFirstLayerPin" | "destroyFloatingBallSurface" | "persistFloatingBallPosition" | "suspendFABForDialog" | "updateFABVisibility" | "updateFloatingBallVisibility"> {}
export class FloatingBallHostRuntime {
    private refreshFloatingBallPanels() {
        if (this.floatingBallPanels.size === 0) return;
        const config = this.getSettings().floatingBall || {};
        const actions = this.getFloatingBallActions();
        const savedSearches = this.getSavedSearches();
        const selectionContext = typeof this.resolveActiveSelectionContext === "function" ? this.resolveActiveSelectionContext() : null;
        this.floatingBallPanels.forEach((panel, surface) => panel?.update({
            config,
            actions,
            savedSearches,
            selectionContext,
            ...(typeof this.buildFloatingBallHubPayload === "function" ? this.buildFloatingBallHubPayload(surface, actions) : {}),
        }));
    }

    /** Cycle through the host's current tabs, wrapping at either edge. */
    private cycleFloatingBallTab(offset: number): boolean {
        const tabs = this.currentTabs();
        const activeId = this.isMobile ? this.getMobileActiveTabId() : this.getActiveTab()?.id;
        const result = this.ball.cycleTab(offset, activeId, tabs);
        if (!result?.tab) return false;
        this.activateTab(result.tab);
        return true;
    }

    /** Scroll the active document first, then fall back to a visible host list. */
    private scrollFloatingBallSurface(surface: QuickActionTarget, edge: "top" | "bottom") {
        const preferred: HTMLElement[] = [];
        if (surface !== "sidebar") {
            const active = this.isMobile
                ? this.getMobileTabs().find((tab) => tab.id === this.getMobileActiveTabId())
                : this.getActiveTab();
            const panel = (active as unknown as {panelElement?: HTMLElement} | undefined)?.panelElement;
            const content = panel?.querySelector<HTMLElement>(".protyle-content, .protyle-wysiwyg");
            if (content) preferred.push(content);
        }
        return scrollSurfaceTo(document, surface, this.sidebarElement, edge, {preferredElements: preferred});
    }

    // T-6891（T-6857 余项）：固定数字槽保存搜索回放。槽位只保存 searchId，
    // 执行时重新从当前设置解析对象，删除或损坏后只报告不可用，不把数字静默
    // 改指向另一条搜索。桌面/手机使用各自切换器实例，侧栏复用常驻 DOM。
    private executeFloatingBallSavedSearch(surface: FloatingBallSurface, reference: unknown): {ok: boolean; reason?: string} {
        const searchId = typeof (reference as {searchId?: unknown})?.searchId === "string"
            ? String((reference as {searchId: string}).searchId).trim() : "";
        const saved = searchId ? this.getSavedSearches().find((item) => item?.id === searchId) : undefined;
        if (!saved?.query) {
            showMessage(this.i18n.quickActionUnavailable, MESSAGE_DEFAULT_MS, "error");
            return {ok: false, reason: "unavailable"};
        }

        let root: HTMLElement | null = null;
        let onClose: IOverlayClose = () => undefined;
        if (surface === "sidebar") {
            root = this.sidebarElement?.isConnected ? this.sidebarElement : null;
            onClose = () => this.refreshSidebar();
        } else {
            this.showSwitcher(true);
            const dialog = this.isMobile ? this.mobileSwitcherDialog : this.platformSwitcherDialog;
            root = dialog?.element?.isConnected ? dialog.element : null;
            onClose = () => dialog?.destroy();
        }
        const scrollElement = root?.querySelector<HTMLElement>(".sw__scroll");
        const searchInput = root?.querySelector<HTMLInputElement>(".sw__search");
        if (!scrollElement || !searchInput) {
            showMessage(this.i18n.quickActionUnavailable, MESSAGE_DEFAULT_MS, "error");
            return {ok: false, reason: "unavailable"};
        }
        applySavedSearchFilters.call(this, scrollElement, searchInput, saved, onClose);
        return {ok: true};
    }

    // T-6803 循环切换悬浮球场景预设：无预设/单预设时提示；切换后气泡提示场景名。
    private cycleBallPreset(): void {
        const current = normalizeFloatingBallConfig(this.getSettings().floatingBall);
        const next = pickNextFloatingBallPreset(current.presets, current.currentPresetId);
        if (!next) {
            showMessage(this.i18n.floatingBallPresetCycleNone, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        const applied = applyFloatingBallPreset(current, next.id);
        if (!applied.preset) return;
        this.updateSettings({floatingBall: applied.config});
        showMessage(this.i18n.floatingBallPresetApplied.replace("{x}", applied.preset.name), MESSAGE_DEFAULT_MS);
    }

    /** Build the floating-ball catalogue from the shared quick-action model.
     * Persisted actions remain authoritative; picker candidates fill in
     * registered builtins, docks, providers and commands without copying a
     * second action definition into the floating-ball layer.
     */
    private getFloatingBallActions(): IQuickAction[] {
        const saved = this.getQuickActions();
        const seen = new Set(saved.map((action) => `${action.kind}:${action.value}`));
        // T-6845：标签经宿主 i18n 解析（catalog 中文兜底），球面板与底栏同语言
        const result = saved.map((action) => ({...action, label: resolveQuickActionLabel(action, this.i18n)}));
        this.getQuickActionPickerCandidates(saved).forEach((candidate) => {
            const action = candidate.action;
            const key = `${action.kind}:${action.value}`;
            if (seen.has(key)) return;
            seen.add(key);
            result.push({...action, label: resolveQuickActionLabel(action, this.i18n)});
        });
        const providers = this.actions.registry?.snapshot?.() || [];
        return result.map((action) => {
            let available = true;
            let providerId = "";
            let source = "";
            if (action.kind === "adapter") {
                providerId = action.value.split("/")[0];
                const provider = providers.find((item: {id: string; name?: string}) => item.id === providerId);
                available = this.actions.adapters.has(providerId) || Boolean(provider);
                source = provider?.name || providerId;
            } else if (action.kind === "command") {
                const [pluginId, commandKey] = action.value.split("::");
                const plugin = (this.app as unknown as {plugins?: IQuickActionPluginLike[]} | null | undefined)?.plugins?.find((item) => item.name === pluginId);
                const command = plugin?.commands?.find((item) => item.langKey === commandKey);
                available = typeof (command?.callback || command?.globalCallback) === "function";
                providerId = pluginId;
                source = pluginId;
            } else if (action.kind === "global") {
                available = this.hostCommandsAvailable();
                providerId = "siyuan";
                source = this.i18n.quickHostSource;
            } else if (action.kind === "dock") {
                available = Boolean(this.getDockByType(action.value));
            }
            return {...action, available, providerId, source, providerName: source,
                declaredTargets: this.getQuickActionDeclaredTargets(action),
                ...(available ? {} : {providerMissing: true, reason: "provider-missing"})};
        });
    }

    private executeFloatingBallBoundAction(surface: FloatingBallSurface, reference: unknown) {
        const ref = reference as {actionId?: unknown; id?: unknown; value?: unknown} | null;
        const actionId = [ref?.actionId, ref?.id, ref?.value].find((value) => typeof value === "string" && value.trim());
        const id = typeof actionId === "string" ? actionId.trim() : "";
        const catalog = this.getFloatingBallActions();
        const candidate = id ? findFloatingAction(catalog, id) : null;
        const descriptor = this.getSettings().floatingBall?.actions?.[surface]
            ?.find((entry: {actionId?: string; id?: string; value?: string}) =>
                [entry.actionId, entry.id, entry.value].some((value) => value === id));
        const action = candidate && descriptor?.mobileOverride === true
            ? {...candidate, mobileOverride: true} : candidate;
        const availability = resolveFloatingActionAvailability(action, surface, {
            resolveSupport: (item: IQuickAction, target: QuickActionTarget) => this.getQuickActionSupport(item, target),
        });
        if (descriptor?.enabled === false || availability.status !== "supported") {
            showMessage(this.i18n.quickActionUnavailable, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        this.executeFloatingBallSurfaceAction(surface, action);
    }

    // T-6919（悬浮球手势纵深第一批）：双击/长按绑定值的统一路由——词汇表与四向
    // 快滑一致（""=未绑定静默返回，"more"=更多面板，动作 id 查目录后走执行器，
    // 未知值不可用回执）。不并入 onFlickAction 以保持 T-6886 契约切片稳定。
    private executeFloatingBallBoundGesture(surface: FloatingBallSurface, bound: unknown): void {
        const actionId = typeof bound === "string" ? bound.trim() : "";
        if (!actionId) return;
        if (actionId === "more") {
            this.refreshFloatingBallPanels();
            this.floatingBallPanels.get(surface)?.openMore();
            return;
        }
        const action = findFloatingAction(this.getFloatingBallActions() as IQuickAction[], actionId);
        if (!action) {
            showMessage(this.i18n.quickActionUnavailable, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        const availability = resolveFloatingActionAvailability(action, surface, {
            resolveSupport: (item: IQuickAction, target: QuickActionTarget) => this.getQuickActionSupport(item, target),
        });
        if (availability.status === "unsupported" || availability.status === "unavailable") {
            showMessage(this.i18n.quickActionUnavailable, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        this.executeFloatingBallSurfaceAction(surface, action);
    }

    private executeFloatingBallSurfaceAction(surface: FloatingBallSurface, action: unknown) {
        const controller = this.floatingBallUis.get(surface);
        const panel = this.floatingBallPanels.get(surface);
        if (!controller) return;
        panel?.closeMore({restoreFocus: false});
        const restoreControllerState = controller?.beginExecution() || (() => undefined);
        const executor = createFloatingBallActionExecutor({
            adapters: this.actions.adapters,
            registry: this.actions.registry,
            context: {surface: `floating-ball:${surface}`},
            plugins: (this.app as unknown as {plugins?: IQuickActionPluginLike[]} | null | undefined)?.plugins,
            getDockByType: (type: string) => this.getDockByType(type),
            close: () => panel?.closeMore({restoreFocus: false}),
            // T-6869（ADR 0079 §7）：悬浮球=全局触发器，轻触恢复上次表面；失效回退切换器。
            onSwitcher: () => this.openPlatformFromBall(),
            onSearch: () => {
                if (surface === "sidebar") {
                    this.sidebarElement?.querySelector<HTMLInputElement>(".sw__search")?.focus();
                } else {
                    this.showSwitcher(true);
                }
            },
            onJournal: () => this.openJournal(),
            onSettings: () => this.openSetting(),
            onHome: () => this.openPlatformSurface("workbench", "switcher", {entry: "floating-ball"}),
            onSnippetStudio: () => this.openPlatformSurface("studio", "switcher", {entry: "floating-ball"}),
            onQuickCapture: () => this.openQuickCapture(),
            onPreviousTab: () => this.cycleFloatingBallTab(-1),
            onNextTab: () => this.cycleFloatingBallTab(1),
            onScrollTop: () => this.scrollFloatingBallSurface(surface, "top"),
            onScrollBottom: () => this.scrollFloatingBallSurface(surface, "bottom"),
            onSyncNow: () => this.syncNow(),
            onInsertTemplate: () => this.openTemplatePicker(),
            onCycleDocSet: () => this.cycleDocumentSet(),
            onCycleBallPreset: () => this.cycleBallPreset(),
            onThrowToWindow: () => this.throwActiveDocToWindow()
                ? undefined : {ok: false, reason: "unavailable"},
            onHideKeyboard: () => this.hideMobileKeyboard()
                ? undefined : {ok: false, reason: "unavailable"},
            onJumpBack: () => this.jumpBack().then((ok) => {
                if (!ok) showMessage(this.i18n.jumpStackEmpty, MESSAGE_DEFAULT_MS, "error");
            }),
            onJumpForward: () => this.jumpForward().then((ok) => {
                if (!ok) showMessage(this.i18n.jumpStackEmpty, MESSAGE_DEFAULT_MS, "error");
            }),
            // T-6856 目录扩充：marks/剪贴板/关闭页签复用既有命令实现
            onMarkSet: () => this.setSessionMark(),
            onMarkJump: () => this.jumpToSessionMark(),
            onClipboard: () => this.openClipboardEntry(),
            onCloseTab: () => this.closeActiveTabForAction()
                ? undefined : {ok: false, reason: "unavailable"},
            onKeepRoaming: () => this.executeKeepRoaming(),
            onStackCapture: () => this.executeStackCapture(),
            onGleanClip: () => this.executeContextPromotionAction("glean-clip"),
            onCommonSnippet: () => this.executeContextPromotionAction("common-snippet"),
            onCardsCreate: () => this.executeContextPromotionAction("cards-create"),
            onGlobalCommand: (action: {value: string}) => this.runHostCommand(action.value)
                ? undefined : {ok: false, reason: "unavailable"},
        });
        void executor(action).then((result) => {
            if (this.floatingBallUis.get(surface) !== controller) return;
            if (!result.ok) {
                const message = result.reason === "failed"
                    ? this.i18n.quickActionFailed
                    : this.i18n.quickActionUnavailable;
                showMessage(message, MESSAGE_DEFAULT_MS, "error");
            }
            restoreControllerState();
        }).catch((error) => {
            if (this.floatingBallUis.get(surface) !== controller) return;
            logger.warn("floating-ball action failed", error);
            showMessage(this.i18n.quickActionFailed, MESSAGE_DEFAULT_MS, "error");
            restoreControllerState();
        });
    }

    /**
     * Mount one portal with independent click and drag actions per surface.
     * Sidebar resolves its host lazily because SiYuan
     * creates and replaces dock content on demand.
     */
    private createFloatingBallSurface(surface: FloatingBallSurface): FloatingBallUiController {
        const settings = this.getSettings();
        const config = settings.floatingBall || {};
        const position = config.position?.[surface] || {edge: "right", yRatio: 0.72};
        const isSidebar = surface === "sidebar";
        let controller = this.floatingBallUis.get(surface);
        if (!controller) {
            controller = createFloatingBallUi({
                surface,
                document,
                host: isSidebar ? (this.sidebarElement || document.body) : document.body,
                resolveHost: isSidebar
                    ? () => this.sidebarElement?.isConnected ? this.sidebarElement : null
                    : () => document.body,
                resolveBounds: isSidebar
                    ? () => {
                        const host = this.sidebarElement;
                        if (!host?.isConnected) return null;
                        const rect = host.getBoundingClientRect();
                        return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom};
                    }
                    : undefined,
                position,
                touchSlopPx: config.behavior?.touchSlopPx,
                idleOpacity: config.appearance?.idleOpacity,
                idleDelayMs: config.appearance?.idleDelayMs,
                halfHide: config.appearance?.halfHide,
                hideOnFullscreen: config.behavior?.hideOnFullscreen,
                hideOnScroll: config.behavior?.hideOnScroll,
                resolveScrollTarget: isSidebar ? () => this.sidebarElement : undefined,
                excludeScrollTarget: !isSidebar ? (target) => Boolean((target as Node).nodeType && this.sidebarElement?.contains(target as Node)) : undefined,
                recoveryLabel: this.i18n.floatingBallRestoreVisible,
                resolveLayer: () => Number((window as any).siyuan?.zIndex),
                size: isSidebar ? undefined : config.appearance?.size,
                snap: config.behavior?.snap,
                marginPx: config.appearance?.marginPx,
                edgeAvoidPx: surface === "mobile" && config.behavior?.edgeAvoidMobile ? 12 : 0,
                ariaLabel: this.i18n.switchTabs,
                onOpenSwitcher: () => {
                    const current: any = this.getSettings().floatingBall || {};
                    if (!(this.fabModalDepth === 0 || current.behavior?.yieldToModals === false)) return;
                    const requested = current.clickAction?.[surface] || "switcher";
                    const moreActionId = "__floating-ball-more__";
                    if (requested === moreActionId || requested === "more") {
                        this.refreshFloatingBallPanels();
                        this.floatingBallPanels.get(surface)?.openMore();
                        return;
                    }
                    const descriptor = current.actions?.[surface]?.find((entry: any) => entry.actionId === requested);
                    const resolved = resolveFloatingBallClickAction(requested, this.getFloatingBallActions(), surface, {
                        descriptor,
                        resolveSupport: (action: IQuickAction, target: QuickActionTarget) => this.getQuickActionSupport(action, target),
                    });
                    this.executeFloatingBallSurfaceAction(surface, resolved.action);
                },
                onOpenMore: () => {
                    this.refreshFloatingBallPanels();
                    this.floatingBallPanels.get(surface)?.openMore();
                },
                // T-6886（T-6858 第一批）：四向快滑动作分发——按方向读取绑定值
                // （more=更多面板；其余按动作值在目录中查找后走既有执行器）。
                onFlickAction: (direction: "up" | "down" | "left" | "right") => {
                    const current: any = this.getSettings().floatingBall || {};
                    const bound = direction === "up" ? "more" : current.behavior?.flickActions?.[direction];
                    if (!bound) return;
                    if (bound === "more") {
                        this.refreshFloatingBallPanels();
                        this.floatingBallPanels.get(surface)?.openMore();
                        return;
                    }
                    const action = findFloatingAction(this.getFloatingBallActions() as IQuickAction[], bound);
                    if (!action) {
                        showMessage(this.i18n.quickActionUnavailable, MESSAGE_DEFAULT_MS, "error");
                        return;
                    }
                    const availability = resolveFloatingActionAvailability(action, surface, {
                        resolveSupport: (item: IQuickAction, target: QuickActionTarget) => this.getQuickActionSupport(item, target),
                    });
                    if (availability.status === "unsupported" || availability.status === "unavailable") {
                        showMessage(this.i18n.quickActionUnavailable, MESSAGE_DEFAULT_MS, "error");
                        return;
                    }
                    this.executeFloatingBallSurfaceAction(surface, action);
                },
                onBeforeTargeting: () => this.refreshFloatingBallPanels(),
                onDismissOverlays: () => this.floatingBallPanels.get(surface)?.closeMore({restoreFocus: false}),
                // T-6919（悬浮球手势纵深第一批）：双击/长按——绑定实时读取，路由走
                // executeFloatingBallBoundGesture（""=未绑定，UI 侧也不会触发回调）。
                isDoubleTapBound: () => !!this.getSettings().floatingBall?.behavior?.doubleTapAction,
                isLongPressBound: () => !!this.getSettings().floatingBall?.behavior?.longPressAction,
                onDoubleTap: () => this.executeFloatingBallBoundGesture(surface, this.getSettings().floatingBall?.behavior?.doubleTapAction),
                onLongPress: () => this.executeFloatingBallBoundGesture(surface, this.getSettings().floatingBall?.behavior?.longPressAction),
                onActionTarget: (target) => {
                    const actionButton = target.closest("[data-action-id]") as HTMLElement | null;
                    actionButton?.click();
                },
                onPositionChange: (next) => this.persistFloatingBallPosition(surface, next),
            });
            this.floatingBallUis.set(surface, controller);
        }
        controller.update({
            position,
            touchSlopPx: config.behavior?.touchSlopPx,
            idleOpacity: config.appearance?.idleOpacity,
            idleDelayMs: config.appearance?.idleDelayMs,
            halfHide: config.appearance?.halfHide,
            hideOnFullscreen: config.behavior?.hideOnFullscreen,
            hideOnScroll: config.behavior?.hideOnScroll,
            size: isSidebar ? undefined : config.appearance?.size,
            snap: config.behavior?.snap,
            marginPx: config.appearance?.marginPx,
            edgeAvoidPx: surface === "mobile" && config.behavior?.edgeAvoidMobile ? 12 : 0,
            ariaLabel: this.i18n.switchTabs,
        });
        controller.mount();
        const container = controller.getElement();
        if (container) {
            const availableActions = this.getFloatingBallActions();
            const panelOptions = {
                document,
                container,
                surface,
                config,
                actions: availableActions,
                savedSearches: this.getSavedSearches(),
                selectionContext: typeof this.resolveActiveSelectionContext === "function" ? this.resolveActiveSelectionContext() : null,
                isPluginInstalled: (pluginId: string) => Boolean(getBridgeSafely(pluginId as any)),
                ...(typeof this.buildFloatingBallHubPayload === "function" ? this.buildFloatingBallHubPayload(surface, availableActions) : {}),
                includeBuiltins: false,
                labels: {
                    more: this.i18n.floatingBallMore,
                    close: this.i18n.close,
                    unavailable: this.i18n.quickActionUnavailable,
                    empty: this.i18n.quickActionUnavailable,
                    search: this.i18n.floatingBallActionSearch,
                    noResults: this.i18n.quickPickerEmpty,
                    builtin: this.i18n.quickBuiltin,
                    component: this.i18n.secondPanel,
                    plugin: this.i18n.floatingBallPluginActions,
                    other: this.i18n.floatingBallOtherActions,
                    unknown: this.i18n.quickSupportUnknown,
                    mobileTry: this.i18n.floatingBallMobileTryStatus,
                    providerMissing: this.i18n.floatingBallProviderMissing,
                    disabled: this.i18n.floatingBallActionDisabled,
                    enabled: this.i18n.floatingBallEnabled,
                    manage: this.i18n.floatingBallManageActions,
                    savedSearches: this.i18n.floatingBallSavedSearches,
                    savedSearch: this.i18n.floatingBallDigitSlotSearch,
                    savedSearchUnavailable: this.i18n.floatingBallDigitSlotUnavailable,
                    configureDigitSlot: this.i18n.floatingBallConfigureDigitSlot,
                    recommended: this.i18n.floatingBallRecommended,
                    hubAll: this.i18n.chipsAll,
                    hubTabs: this.i18n.chipsTabs,
                    hubFavorites: this.i18n.unifiedFavorites,
                    hubRecent: this.i18n.homeRecentDocuments,
                    hubDocSets: this.i18n.unifiedDocSets,
                    toggleFailed: this.i18n.quickActionFailed,
                    builtins: {
                        switcher: this.i18n.switchTabs, search: this.i18n.quickBuiltinSearch,
                        journal: this.i18n.quickBuiltinJournal, settings: this.i18n.quickBuiltinSettings,
                        home: this.i18n.secondPanel,
                    },
                },
                onAction: (action: unknown) => (action as {digitSlotBound?: boolean})?.digitSlotBound
                    ? this.executeFloatingBallBoundAction(surface, action)
                    : this.executeFloatingBallSurfaceAction(surface, action),
                onSavedSearch: (saved: unknown) => this.executeFloatingBallSavedSearch(surface, saved),
                onConfigureDigitSlot: (index: number | null, _reference: unknown, targetSurface: FloatingBallSurface) => {
                    this.openSetting("floatingBall");
                    const settings = Array.from(document.querySelectorAll<HTMLElement>(
                        ".sw-settings-dialog .sw-floating-ball-settings",
                    )).pop();
                    if (!settings) return;
                    const surfaceSelect = settings.querySelector<HTMLSelectElement>(".sw-floating-ball-settings__surface select");
                    if (surfaceSelect && Array.from(surfaceSelect.options).some((item) => item.value === targetSurface)) {
                        surfaceSelect.value = targetSurface;
                        surfaceSelect.dispatchEvent(new window.Event("change", {bubbles: true}));
                    }
                    const slots = Array.from(settings.querySelectorAll<HTMLSelectElement>("[data-digit-slot]"));
                    const slot = Number.isInteger(index) && index !== null && index >= 0 && index < slots.length
                        ? slots[index] : slots.find((item) => !item.value) || slots[0];
                    slot?.scrollIntoView?.({block: "center"});
                    slot?.focus({preventScroll: true});
                },
                onUnavailable: () => showMessage(this.i18n.quickActionUnavailable, MESSAGE_DEFAULT_MS, "error"),
                resolveSupport: (action: IQuickAction, target: QuickActionTarget) => this.getQuickActionSupport(action, target),
                onManageSettings: () => this.openSetting("floatingBall"),
                onToggleAction: (actionId: string, enabled: boolean) => {
                    const current = this.getSettings().floatingBall;
                    const surfaceActions = current?.actions?.[surface] || [];
                    this.updateSettings({floatingBall: {
                        ...current,
                        actions: {...current?.actions, [surface]: surfaceActions.map((entry: any) =>
                            entry.actionId === actionId ? {...entry, enabled} : entry)},
                    }});
                },
                onOpenMore: () => controller?.setState("more"),
                onCloseMore: () => {
                    if (controller?.getState() === "more") controller.setState("docked");
                },
                surfaceStack: typeof lvSurfaceStack !== "undefined" ? lvSurfaceStack : undefined,
            };
            let panel = this.floatingBallPanels.get(surface);
            if (!panel) {
                panel = createFloatingBallPanelController(panelOptions);
                if (panel) {
                    this.floatingBallPanels.set(surface, panel);
                    panel.mount();
                }
            } else {
                panel.update(panelOptions);
            }
        }
        return controller;
    }

    private buildFloatingBallHubPayload(surface: FloatingBallSurface, catalogActions: IQuickAction[]) {
        const rawTabs = this.currentTabs();
        const activeId = this.isMobile ? this.getMobileActiveTabId() : this.getActiveTab()?.id;
        const tabs = rawTabs.slice(0, 16).map((tab) => {
            const rootId = this.rootIdOf(tab) || "";
            const active = Boolean(activeId && tab.id === activeId);
            return {kind: "tab", id: tab.id, rootId, title: this.titleOf(tab) || rootId || tab.id, active, badge: active ? this.i18n.floatingBallPresetCurrent : "", icon: "iconFile"};
        });
        const favorites = this.getFavorites().slice(0, 20).map((fav) => ({
            kind: "favorite", id: fav.key, rootId: resolveFavoriteRootId(fav) || "", title: fav.title || fav.key, subtitle: fav.group || "", icon: "iconStar",
        }));
        const seen = new Set<string>();
        const recent: Array<Record<string, unknown>> = [];
        this.getClosedHistory().slice(0, 5).forEach((e) => {
            if (!e.rootId || seen.has(e.rootId)) return;
            seen.add(e.rootId);
            recent.push({kind: "closed", id: e.rootId, rootId: e.rootId, title: e.title || e.rootId, badge: this.i18n.unifiedClosed, icon: "iconHistory"});
        });
        this.getOpenHistory().slice(0, 10).forEach((e) => {
            const k = e.rootId || e.key;
            if (!k || seen.has(k)) return;
            seen.add(k);
            recent.push({kind: "recent", id: k, rootId: e.rootId || "", title: e.title || k, icon: "iconHistory"});
        });
        const docSets = this.getDocumentSets().slice(0, 12).map((s: any) => ({
            kind: "doc-set", id: String(s.setId || ""), title: String(s.name || ""), subtitle: `${Array.isArray(s.entries) ? s.entries.length : 0} ${this.i18n.unifiedDocSetDocs}`, icon: "iconFolder",
        })).filter((s) => s.id && s.title);
        const payload = this.ball.buildHubPayload(surface, catalogActions, {
            tabs,
            favorites,
            recent,
            docSets,
        });
        return {
            catalogActions,
            hubContent: {tabs: payload.tabs, favorites: payload.favorites, recent: payload.recent, docSets: payload.docSets},
            onHubItem: (item: Record<string, unknown>) => this.executeFloatingBallHubItem(item),
            onPinFirstLayer: (action: Record<string, unknown>, pinned: boolean, target: FloatingBallSurface) =>
                this.toggleFloatingBallFirstLayerPin(action, pinned, target || surface),
        };
    }

    private executeFloatingBallHubItem(item: Record<string, unknown>) {
        const kind = String(item?.kind || ""), id = String(item?.id || ""), rootId = String(item?.rootId || "");
        const openDoc = (docId: string) => {
            if (!BLOCK_ID_RE.test(docId)) return;
            if (this.isMobile) void this.mobileOpenDoc(docId);
            else void this.bridge.openTab({app: this.app, doc: {id: docId}});
        };
        if (kind === "tab") {
            if (this.isMobile) return openDoc(rootId);
            const target = this.bridge.getAllTabs().find((t) => t.id === id || (rootId && this.rootIdOf(t) === rootId));
            return target ? this.activateTab(target) : openDoc(rootId);
        }
        if (kind === "favorite") {
            const fav = this.getFavorites().find((e) => e.key === id);
            return fav ? void this.jumpToFavorite(fav, () => undefined) : openDoc(rootId);
        }
        if (kind === "closed" || kind === "recent") {
            const docId = rootId || id;
            if (kind === "closed" && BLOCK_ID_RE.test(docId)) void this.removeClosedHistoryEntry(docId).catch((err) => logger.warn("removeClosedHistoryEntry fail", err));
            return openDoc(docId);
        }
        if (kind === "doc-set" && id) void this.restoreDocumentSetFromHome(id);
    }

    private toggleFloatingBallFirstLayerPin(action: Record<string, unknown>, nextPinned: boolean, surface: FloatingBallSurface) {
        const actionId = String(action?.actionId || action?.id || "").trim();
        if (!actionId) return;
        const current: any = normalizeFloatingBallConfig(this.getSettings().floatingBall);
        const list: Array<Record<string, any>> = Array.isArray(current.actions?.[surface]) ? current.actions[surface].map((e: any) => ({...e})) : [];
        const idx = list.findIndex((e) => e.actionId === actionId);
        if (nextPinned && list.filter((e, i) => i !== idx && e.enabled !== false && e.firstLayer === true).length >= 5) {
            showMessage(this.i18n.floatingBallActionsTip, MESSAGE_DEFAULT_MS);
            return;
        }
        if (idx >= 0) list[idx] = {...list[idx], enabled: true, firstLayer: nextPinned};
        else if (nextPinned) list.push({actionId, enabled: true, firstLayer: true, order: (list.length + 1) * 10});
        this.updateSettings({floatingBall: {...current, actions: {...current.actions, [surface]: list}}});
        this.refreshFloatingBallPanels();
    }

    private destroyFloatingBallSurface(surface: FloatingBallSurface) {
        this.floatingBallPanels.get(surface)?.destroy();
        this.floatingBallPanels.delete(surface);
        const controller = this.floatingBallUis.get(surface);
        controller?.destroy();
        this.floatingBallUis.delete(surface);
        if (surface === "mobile") {
            this.floatingBallUi = null;
            this.fabElement = null;
        }
    }

    private persistFloatingBallPosition(surface: FloatingBallSurface, position: FloatingBallPosition) {
        if (this.ball) {
            this.ball.persistPosition(surface, position);
            return;
        }
        const current = this.getSettings();
        const currentBall = current.floatingBall || {};
        this.updateSettings({
            floatingBall: {
                ...currentBall,
                position: {
                    ...(currentBall.position || {}),
                    [surface]: {...position},
                },
            },
        });
    }

    private suspendFABForDialog(onDestroy?: () => void): () => void {
        // T-6481：不再覆写 dialog.destroy——宿主 Dialog 的 destroyCallback 才是契约，
        // 且 Escape / 遮罩关闭也会走到它。这里返回释放函数，由调用方接进 destroyCallback。
        // T-6487：原实现在非移动端直接 return，onDestroy 永不触发——桌面端用 Escape 关掉
        // 日记笔记本选择弹窗时，调用方 Promise 会永久挂起。
        const modalControllers = [...this.floatingBallUis.values()];
        const shouldYield = this.getSettings().floatingBall?.behavior?.yieldToModals !== false;
        // T-7014（T-7012 留账收口）：宿主来源焦点恢复——弹窗打开前记录来源控件
        // （悬浮球本体/顶栏按钮/面包屑等），关闭释放时若焦点已回落 body 且来源
        // 仍在文档中，把焦点送回来源控件，不再丢给 body。鸭子类型判断
        // （isConnected + focus），不依赖 HTMLElement 全局（宿主测试沙箱无此全局）。
        const activeCandidate = document.activeElement as HTMLElement | null;
        const focusOrigin = activeCandidate && typeof activeCandidate.focus === "function" && activeCandidate.isConnected
            ? activeCandidate
            : null;
        // Count dialogs even when no ball exists yet: enabling a surface from
        // Settings must not put a newly mounted ball above that dialog.
        this.fabModalDepth += 1;
        this.floatingBallPanels.forEach((panel) => panel?.closeMore({restoreFocus: false}));
        if (shouldYield) {
            modalControllers.forEach((controller) => controller.setSuspended(true));
            this.fabElement?.classList.add("sw__fab--hidden");
        }
        let released = false;
        return () => {
            if (released) return;
            released = true;
            this.fabModalDepth = Math.max(0, this.fabModalDepth - 1);
            onDestroy?.();
            if (this.fabModalDepth === 0) {
                const restore = () => {
                    if (this.fabModalDepth === 0) {
                        this.floatingBallUis.forEach((controller) => {
                            controller.setSuspended(false);
                            (controller as any).recalculateActivityState?.();
                        });
                        this.fabElement?.classList.remove("sw__fab--hidden");
                    }
                };
                if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
                    window.requestAnimationFrame(restore);
                } else {
                    restore();
                }
            }
            // 焦点已回落 body（弹窗收走了焦点又被移除）且来源仍连接时才恢复；
            // 用户已自行聚焦别处或来源随弹窗销毁时诚实放弃。
            if (focusOrigin?.isConnected
                && (document.activeElement === document.body || document.activeElement == null)) {
                try {
                    focusOrigin.focus({preventScroll: true});
                } catch (_) {
                    focusOrigin.focus();
                }
            }
        };
    }

    private updateFABVisibility() {
        this.updateFloatingBallVisibility();
    }

    /** Refresh all spatial entries after settings/data or host layout changes. */
    private updateFloatingBallVisibility() {
        const settings = this.getSettings();
        // T-7026（ADR 0099）D6：模块级关闭则任何端都不挂载（叠加既有 per-surface 开关）；
        // 已挂载的控制器幂等销毁，重新开启后经 updateFloatingBallVisibility 恢复。
        if (settings.moduleVisibility?.floatingBall === false) {
            (Object.freeze(["desktop", "sidebar", "mobile"]) as FloatingBallSurface[])
                .forEach((surface) => this.destroyFloatingBallSurface(surface));
            return;
        }
        const config = settings.floatingBall || {};
        const enabled = (surface: FloatingBallSurface) => Boolean(config.enabled?.[surface]);
        // ADR 0072: the sidebar portal is withdrawn (it duplicated the
        // desktop-window ball inside the same host window). The sweep below
        // still destroys a stale sidebar controller left by an earlier release.
        const surfaces: FloatingBallSurface[] = this.isMobile ? ["mobile"] : ["desktop"];

        // A frontend switch/hot reload must not leave a controller from the
        // previous surface alive.  The controller's destroy is idempotent.
        (Object.freeze(["desktop", "sidebar", "mobile"]) as FloatingBallSurface[])
            .filter((surface) => !surfaces.includes(surface))
            .forEach((surface) => this.destroyFloatingBallSurface(surface));

        surfaces.forEach((surface) => {
            if (!enabled(surface)) {
                this.destroyFloatingBallSurface(surface);
                return;
            }
            const controller = this.createFloatingBallSurface(surface);
            const suspended = this.fabModalDepth > 0 && config.behavior?.yieldToModals !== false;
            controller.setSuspended(suspended);
            if (surface === "mobile") {
                this.floatingBallUi = controller;
                this.fabElement = controller.getElement();
                this.fabElement?.classList.toggle("sw__fab--hidden", suspended);
            }
        });
    }
}
