// 小驴雷切插件入口（微内核架构 · S11 彻底解耦收敛 < 400 行）
import {Plugin, Dialog, getAllTabs, openTab, type TPluginDataChangeReason} from "siyuan";
import "./index.scss";
import {createHostBridge, type HostBridge} from "./core/bridge";
import {createTieredStorageEngine, type TieredStorageEngine} from "./core/storage";
import {createDisposerRegistry, type DisposerRegistry} from "./core/disposer";
import {createNavigationService, type NavigationService} from "./services/navigation";
import {createSearchService, type SearchService} from "./services/search";
import {createQuickActionService, type QuickActionService} from "./services/actions";
import {createHomeWorkbenchService, type HomeWorkbenchService} from "./services/workbench";
import {createFloatingBallService, type FloatingBallService} from "./services/ball";
import {showMessage as lvShowMessage, withDocLock, lvSnapshotVault, ensureXiaolvDiaryZone, buildXiaolvLifeLogAttrs} from "./libs/lv-notice-kit";
import {attachXiaolvLifeLogIal} from "./journal-actions";
import {logger} from "./logger";
import {createRequestService} from "./request-service";
import {createDocSearchState} from "./doc-search-state";
import {openSecondPanelSurface} from "./surfaces/workbench/workbench-surface";
import {createPlatformSurfaceAdapter} from "./platform-surface-model";
import {registerReadOnlyAgentCapabilities, registerAgentActionCapability, normalizeAgentNotebookId} from "./agent-capabilities";
import {WORKSPACE_PLAN_SPEC, WORKSPACE_EXECUTE_SPEC, buildWorkspacePlan, validateWorkspacePlan, isWorkspacePlanExpired, runWorkspacePlan} from "./agent-workspace-plan";
import {createWorkspaceHostHandlers} from "./agent-workspace-registry";
import {createWorkspaceActionExecutor} from "./agent-workspace-actions";
import {normalizeDocumentSets} from "./document-sets";
import {openDocumentOnDesktop} from "./document-actions";
import {getSiyuan} from "./types";
import {BLOCK_ID_RE, DOCUMENT_SETS_KEY, PERSISTENT_TIER2_KEYS, SETTINGS_KEY} from "./constants";
import type {ISpeedSwitchHost, ISwSettings, PlatformSurface, PlatformSurfaceContext} from "./runtime/plugin-types";
import {initRuntimeState} from "./runtime/runtime-state";
import {bindRuntimeDomains} from "./runtime/runtime-binder";
import {RUNTIME_DOMAINS} from "./runtime/runtime-domains";
import {showMessage, getActivePluginInstance, setActivePluginInstance} from "./runtime/runtime-notice";
import {LifecycleCommandsRuntime} from "./runtime/lifecycle-commands";
import {StorageSyncRuntime} from "./runtime/storage-sync";
import {SettingsHostRuntime} from "./runtime/settings-host";
import {PlatformSurfaceRuntime} from "./runtime/platform-surface-host";
import {SwitcherDialogRuntime} from "./runtime/switcher-dialog";
import {MobileSwitcherRuntime} from "./runtime/mobile-switcher-host";

export * from "./runtime/plugin-types";
export {mountPlatformChrome, resolvePlatformSurfaceLabels, PLATFORM_SURFACES} from "./runtime/platform-chrome";

export interface SpeedSwitchPlugin extends ISpeedSwitchHost {}

/**
 * 小驴雷切（SpeedSwitchPlugin）微内核主类
 * 单一事实源持有八大领域服务与统一状态，组合委托各内聚域控制器。
 */
export class SpeedSwitchPlugin extends Plugin {
    declare i18n: Record<string, string>;
    public isMobile = false;
    public activeDialogs: Set<Dialog> = new Set();
    public tier2Ready = false;
    public tier2LoadingPromise?: Promise<void>;
    public tier2ScheduledTimer?: number;
    public tier2IdleId?: number;
    public readonly requestService = createRequestService();
    public docSearchState = createDocSearchState();

    // 宿主抽象层网桥（S1）：统一代理内核请求、文档锁、页签生命周期与系统通知
    public bridge: HostBridge = createHostBridge({
        fetchKernelJson: async (url: string, body?: any, timeoutOrOptions?: any, options?: any) => {
            const result = await this.fetchKernelJsonOutcome(url, body, timeoutOrOptions, options);
            return result.ok ? result.value : null;
        },
        getAllTabs: () => (this.isMobile ? this.getMobileTabs() : getAllTabs()),
        getActiveTab: () => this.getActiveTab(),
        openTab: (options: any) => openTab(options),
        withDocLock: <T>(docId: string, action: () => Promise<T>) => withDocLock(docId, action),
        showNotice: (message: string, timeoutMs: number = 5000, icon?: "info" | "error") => lvShowMessage(message, timeoutMs, icon),
    });
    public get hostBridge(): HostBridge { return this.bridge; }
    public showNotice(message: string, timeoutMs: number = 5000, icon?: "info" | "error"): void {
        this.bridge.showNotice(message, timeoutMs, icon);
    }

    // 分级持久化引擎（S2）：统一代理 Tier1 实时与 Tier2 异步数据存取
    public storage: TieredStorageEngine = createTieredStorageEngine({
        driver: {
            loadData: (key: string) => this["loadData"](key),
            saveData: (key: string, data: any) => this["saveData"](key, data),
        },
        defaultDebounceMs: 800,
        beforeSave: async (key: string) => {
            if (PERSISTENT_TIER2_KEYS.includes(key) && !this.tier2Ready && !this.isUnloading && typeof this.ensureTier2Loaded === "function") {
                await this.ensureTier2Loaded();
            }
        },
        onSaveStatusChange: (key: string, status: "pending" | "ok" | "failed", err?: any) => {
            if (status === "pending") {
                this.lastSaveOutcome[key] = "pending";
            } else if (status === "ok") {
                this.lastSaveOutcome[key] = "ok";
            } else {
                this.lastSaveOutcome[key] = "failed";
            }
            if (key === SETTINGS_KEY) this.notifySettingsSaveState();
            if (status === "failed" && err) logger.warn("save data fail", err);
        },
        getPendingData: (key: string) => this.data?.[key],
        tier2Loader: async () => {
            if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
            return (this.data || {}) as Record<string, any>;
        },
    });

    // 统一生命周期管理中枢（S3）
    public disposer: DisposerRegistry = createDisposerRegistry();

    // S4 导航与历史记录领域服务
    public navigation: NavigationService = createNavigationService({
        bridge: this.bridge,
        storage: this.storage,
        disposer: this.disposer,
        isMobile: () => this.isMobile,
        getApp: () => this.app,
        getI18n: () => this.i18n,
        showMessage: (message: string, timeoutMs?: number, icon?: "info" | "error") => this.showNotice(message, timeoutMs, icon),
        scheduleAnimationFrame: (cb: () => void) => this.scheduleAnimationFrame(cb),
        getData: (key: string) => this.data?.[key],
        setData: (key: string, val: any) => { if (this.data) this.data[key] = val; },
        saveDataDebounced: (key: string) => this.saveDataDebounced(key),
        isTier2Ready: () => this.tier2Ready,
    });

    // S5 统一搜索模型与过滤器领域服务
    public search: SearchService = createSearchService({
        bridge: this.bridge,
        storage: this.storage,
        disposer: this.disposer,
        isMobile: () => this.isMobile,
        getI18n: () => this.i18n,
    });

    // S6 快捷动作与跨插件执行调度领域服务
    public actions: QuickActionService = createQuickActionService({
        bridge: this.bridge,
        storage: this.storage,
        disposer: this.disposer,
        isMobile: () => this.isMobile,
        getI18n: () => this.i18n,
        showMessage: (message: string, timeoutMs?: number, icon?: "info" | "error") => this.showNotice(message, timeoutMs, icon),
        refreshPanels: () => this.refreshFloatingBallPanels(),
    });

    // S7 工作台 Bento 运行时调度领域服务
    public workbench: HomeWorkbenchService = createHomeWorkbenchService({
        bridge: this.bridge,
        storage: this.storage,
        disposer: this.disposer,
        isMobile: () => this.isMobile,
        getI18n: () => this.i18n,
        showMessage: (message: string, timeoutMs?: number, icon?: "info" | "error") => this.showNotice(message, timeoutMs, icon),
    });
    public get homeRuntime(): any { return this.workbench.homeRuntime; }

    // S8 悬浮球手势与物理状态领域服务
    public ball: FloatingBallService = createFloatingBallService({
        bridge: this.bridge,
        storage: this.storage,
        disposer: this.disposer,
        isMobile: () => this.isMobile,
        getSettings: () => this.getSettings(),
        updateSettings: (patch: Record<string, unknown>) => this.updateSettings(patch),
        getQuickActions: () => this.getQuickActions(),
        getI18n: () => this.i18n,
    });

    constructor(options?: ConstructorParameters<typeof Plugin>[0]) {
        super(options as ConstructorParameters<typeof Plugin>[0]);
        initRuntimeState(this);
        bindRuntimeDomains(this, RUNTIME_DOMAINS);
    }

    public async onload() {
        if (this.disposer.isDisposed) this.disposer = createDisposerRegistry();
        await this.runPluginOnload();
    }

    async onDataChanged(reason?: TPluginDataChangeReason) {
        if (this.isUnloading || this.dataChangeReloadInFlight) {
            this.dataChangeReloadQueued = true;
            return;
        }
        this.dataChangeReloadInFlight = true;
        const generation = this.lifecycleGeneration;
        const stale = () => this.isUnloading || this.lifecycleGeneration !== generation;
        try {
            do {
                this.dataChangeReloadQueued = false;
                await this.loadPersistentKeys();
                if (stale()) return;
                this.settingsCache = null;
                this.updateFloatingBallVisibility();
                this.captureStorageMigrationSnapshot();
                this.initFavCollapsed();
                this.scheduleSidebarRefresh();
            } while (this.dataChangeReloadQueued && !stale());
        } catch (error) {
            logger.warn("data change refresh fail", {reason: reason || "unknown"});
            logger.debug(error);
        } finally {
            this.dataChangeReloadInFlight = false;
            this.dataChangeReloadQueued = false;
        }
    }

    public async onunload() {
        this.isUnloading = true;
        if (getActivePluginInstance() === this) setActivePluginInstance(null);
        this.lifecycleGeneration += 1;
        this.cancelTier2Schedule();
        this.tier2LoadingPromise = undefined;
        this.thumbApiControllers?.forEach((controller) => { try { controller.abort(); } catch (_) {} });
        this.thumbApiControllers?.clear();
        const pendingSaves = this.flushPendingSaves();
        this.tier2Ready = false;
        this.vaultCleaner?.();
        this.vaultCleaner = undefined;
        const vaultPluginId = "siyuan-speed-switch";
        lvSnapshotVault.unregister(vaultPluginId);
        this.disposer.dispose();
        this.activeDialogs.forEach((dialog) => {
            try { if (dialog && typeof dialog.destroy === "function") dialog.destroy(); } catch (_) {}
        });
        this.activeDialogs.clear();
        this.snippetStudioDialog?.destroy();
        this.snippetStudioDialog = null;
        this.platformSwitcherDialog?.destroy();
        this.platformSwitcherDialog = null;
        this.mobileSwitcherDialog?.destroy();
        this.mobileSwitcherDialog = null;
        this.workbenchDialog?.destroy();
        this.workbenchDialog = null;
        this.platformGuideDialog?.destroy();
        this.platformGuideDialog = null;
        this.settingsDialog?.destroy();
        this.settingsDialog = null;
        if (typeof document !== "undefined") {
            document.querySelectorAll<HTMLElement>(".sw-platform-dialog").forEach((el) => {
                el.closest<HTMLElement>(".b3-dialog")?.remove();
            });
            document.querySelectorAll<HTMLElement>(".sw__palette-backdrop").forEach((el) => el.remove());
        }
        if (typeof window !== "undefined") {
            delete (window as any).siyuanSpeedSwitch;
        }
        await this.cleanupRuntimeOnUnload();
        try {
            await pendingSaves;
        } catch (err) {
            logger.warn("flushPendingSaves on unload failed", err);
        }
    }

    public async uninstall() { return LifecycleCommandsRuntime.prototype.uninstall.call(this); }

    public onLayoutReady() {
        if (typeof performance !== "undefined" && typeof performance.mark === "function") {
            try { performance.mark("siyuan-speed-switch-layoutready-start"); } catch { /* ignore */ }
        }
        this.updateFloatingBallVisibility();
        this.bindEditorSelectionObserver();
        this.exposePublicApi();
        if (typeof window !== "undefined" && !(window as any).siyuanSpeedSwitch?.whenReady) {
            (window as any).siyuanSpeedSwitch = {whenReady: () => true, openSwitcher: () => { if (!this.isMobile && !this.isUnloading) this.showSwitcher(true); }};
        }
        this.mountExternalCommands();
        this.setupBreadcrumbEntry();
        this.scheduleTier2Load();
        if (typeof performance !== "undefined" && typeof performance.mark === "function") {
            try {
                performance.mark("siyuan-speed-switch-layoutready-end");
                if (typeof performance.measure === "function") {
                    performance.measure("siyuan-speed-switch-layoutready", "siyuan-speed-switch-layoutready-start", "siyuan-speed-switch-layoutready-end");
                }
            } catch { /* ignore */ }
        }
    }

    public openSetting(initialPanel?: string, returnTo?: any, returnContext?: any): void { return SettingsHostRuntime.prototype.openSetting.call(this, initialPanel, returnTo, returnContext); }

    public showSwitcher(focusSearch = false, returnTo?: any, context?: any): void { return SwitcherDialogRuntime.prototype.showSwitcher.call(this, focusSearch, returnTo, context); }

    public openPlatformSurface(surface: PlatformSurface, returnTo: PlatformSurface = "switcher", context?: PlatformSurfaceContext | null): void {
        if (this.isUnloading) return;
        if (typeof this.ensureTier2Loaded === "function") {
            void this.ensureTier2Loaded().catch((err: unknown) => { logger.warn("openPlatformSurface tier2 load fail", err); });
        }
        if (!this.getAvailablePlatformSurfaces().includes(surface)) {
            showMessage(this.i18n.moduleDisabledReceipt.replace("{x}", this.platformSurfaceDisplayName(surface)));
            return;
        }
        this.notePlatformSurface(surface, context);
        const openSurface = createPlatformSurfaceAdapter({
            switcher: (nextReturnTo: PlatformSurface, nextContext: PlatformSurfaceContext | null) => this.isMobile
                ? this.showMobileSwitcher(false, nextReturnTo, nextContext)
                : this.showSwitcher(false, nextReturnTo, nextContext),
            workbench: (_nextReturnTo: PlatformSurface, nextContext: PlatformSurfaceContext | null): void => {
                const globalFn = typeof (globalThis as any).openSecondPanel === "function" ? (globalThis as any).openSecondPanel : null;
                if (typeof openSecondPanelSurface === "function") void openSecondPanelSurface(this, nextContext);
                else if (globalFn) globalFn.call(this, nextContext);
            },
            studio: (nextReturnTo: PlatformSurface, nextContext: PlatformSurfaceContext | null) => this.openSnippetStudio(nextReturnTo, nextContext),
        });
        openSurface(surface, returnTo, context);
    }

    public openPlatformGuide(returnTo?: any): void { return SettingsHostRuntime.prototype.openPlatformGuide.call(this, returnTo); }
    public openSnippetStudio(returnTo?: any, context?: any): void { return PlatformSurfaceRuntime.prototype.openSnippetStudio.call(this, returnTo, context); }
    public getStartupPerformanceMetrics(): Record<string, number> { return StorageSyncRuntime.prototype.getStartupPerformanceMetrics.call(this); }

    public createSwitcherDialog(settings: ISwSettings, fullscreen: boolean, release: {fn: () => void}, returnTo: PlatformSurface = "switcher", context: PlatformSurfaceContext | null = null): Dialog {
        return SwitcherDialogRuntime.prototype.createSwitcherDialog.call(this, settings, fullscreen, release, returnTo, context);
    }

    public createMobileSwitcherDialog(release: {fn: () => void}): Dialog {
        return MobileSwitcherRuntime.prototype.createMobileSwitcherDialog.call(this, release);
    }

    public registerWorkspacePlanCapabilities(pluginWithAgent: {addAgentCapability?: (options: Record<string, unknown>) => string}) {
        const onFail = (error: unknown, spec: {name?: string}) => logger.warn(`register Agent capability ${spec?.name || "unknown"} fail`, error);
        registerReadOnlyAgentCapabilities(pluginWithAgent, [{
            spec: WORKSPACE_PLAN_SPEC,
            handler: async (args: Record<string, unknown>) => {
                const plan = buildWorkspacePlan(args);
                if (!plan || !plan.steps.length) return {error: "no valid steps"};
                return {structuredContent: plan, result: JSON.stringify(plan)};
            },
        }], onFail);
        registerAgentActionCapability(pluginWithAgent, {
            spec: WORKSPACE_EXECUTE_SPEC,
            effects: {localRead: true, localWrite: true, dataEgress: false, externalCost: false},
            handler: async (args: Record<string, unknown>) => {
                if (this.getSettings().agentActionsEnabled === false) return {error: "agent actions disabled"};
                const plan = args?.plan && typeof args.plan === "object" ? args.plan : args;
                if (!validateWorkspacePlan(plan).ok) return {error: "invalid plan"};
                if (isWorkspacePlanExpired(plan)) return {error: "plan expired"};
                const handlers = createWorkspaceHostHandlers({
                    navigation: {isMobile: this.isMobile, app: this.app, openTab, tabs: getSiyuan()?.mobile?.tabs, logger},
                    documentSet: {
                        getSet: (setId: string) => {
                            const sets = normalizeDocumentSets(this.data[DOCUMENT_SETS_KEY]).sets as Array<{setId?: string}>;
                            return sets.find((item) => item.setId === setId) || null;
                        },
                        openDocument: (rootId: string) => this.isMobile ? this.mobileOpenDoc(rootId) : openDocumentOnDesktop({rootId, app: this.app, openTab, logger}),
                    },
                    write: {
                        readTask: async (id: string) => {
                            const json = await this.fetchKernelJson("/api/query/sql", {
                                stmt: `SELECT markdown, content FROM blocks WHERE id='${id.replace(/'/g, "''")}' AND type IN ('i','p')`,
                            });
                            return (json?.data || [])[0];
                        },
                        updateBlock: async (id: string, markdown: string) => {
                            const json = await this.fetchKernelJson("/api/block/updateBlock", {
                                dataType: "markdown", data: this.clampTaskWritePayload(markdown), id,
                            });
                            return !!json && json.code === 0;
                        },
                        createDocument: async (payload: {notebook: string; title: string; markdown: string}) => {
                            const notebooks = await this.loadNotebooks();
                            const target = normalizeAgentNotebookId(payload.notebook)
                                ? notebooks.find((nb: any) => nb.id === payload.notebook)
                                : notebooks.find((nb: any) => nb.name === payload.notebook);
                            if (!target) return {docId: ""};
                            const created = await this.fetchKernelJson("/api/filetree/createDocWithMd", {
                                notebook: target.id, path: payload.title, markdown: payload.markdown,
                            });
                            if (!created || created.code !== 0) return {docId: ""};
                            if (typeof created.data === "string" && BLOCK_ID_RE.test(created.data)) return {docId: created.data};
                            const cleanTitle = (payload.title || "").replace(/^\/+/, "");
                            const locate = await this.fetchKernelJson("/api/query/sql", {
                                stmt: `SELECT id FROM blocks WHERE box='${target.id}' AND type='d' AND content='${cleanTitle.split("'").join("''")}' ORDER BY created DESC LIMIT 1`,
                            });
                            return {docId: (locate?.data || [])[0]?.id || ""};
                        },
                        ensureJournal: (notebook: string) => this.ensureTodayJournal(notebook),
                        appendBlock: async (docId: string, content: string) => {
                            const zone = await ensureXiaolvDiaryZone(docId);
                            const attrs = buildXiaolvLifeLogAttrs({type: "工作区计划", source: "雷切", module: "workspace-plan", body: content});
                            const json = await this.fetchKernelJson("/api/block/insertBlock", {
                                previousID: zone.anchorBlockId, parentID: docId, dataType: "markdown",
                                data: attachXiaolvLifeLogIal(content, attrs),
                            });
                            return !!json && json.code === 0;
                        },
                        notebook: normalizeAgentNotebookId(this.getSettings().journalNotebook),
                    },
                });
                const receipt = await runWorkspacePlan(plan, {approved: true, runStep: createWorkspaceActionExecutor(handlers)});
                return {structuredContent: receipt, result: JSON.stringify(receipt)};
            },
        }, onFail);
    }
}

export default SpeedSwitchPlugin;
