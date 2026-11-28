import {Dialog} from "siyuan";
import {loadChunkWithRetry} from "../core/chunk-loader";
import {logger} from "../logger";
import {normalizeRecycleStore} from "../snippet-recycle";
import {normalizeSnippetGroupStore} from "../snippet-groups";
import {normalizeSurfaceId, normalizeSurfaceContext, resolveSurfaceReturnTarget, encodeSurfaceFocusSource, filterSurfacesByVisibility} from "../platform-surface-model";
import {mountPlatformDialogCloseHint, mountPlatformDialogTitleWrap} from "../platform-dom";
import {resolvePanelSize} from "../settings-model";
import {SNIPPET_RECYCLE_KEY, SNIPPET_GROUPS_KEY, DEFAULT_HOTKEY, SECOND_PANEL_HOTKEY, PANEL_SCALE_DEFAULT, PANEL_SIZE_MIN_PX, StudioSizeMode, STUDIO_SIZE_MODES} from "../constants";
import {getSiyuan} from "../types";
import {type PlatformSurface, type PlatformSurfaceContext, type PlatformSurfaceLabels, type PlatformSurfaceChromeOptions, type SnippetStudioController, type ISwSettings, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";
import {PLATFORM_SURFACES, mountPlatformChrome, mountPlatformChrome as mountPlatformChromeDom, resolvePlatformSurfaceLabels as resolvePlatformSurfaceLabelsHelper} from "./platform-chrome";

export interface PlatformSurfaceRuntime extends Omit<ISpeedSwitchHost, "notePlatformSurface" | "platformSurfaceDisplayName" | "openPlatformFromBall" | "resolvePanelDialogSize" | "loadSnippetStudioModule"> {}
export class PlatformSurfaceRuntime {
    // T-6869：平台表面打开时的会话级记录（悬浮球"恢复上次表面"的数据来源）。
    private notePlatformSurface(surface: PlatformSurface, context?: PlatformSurfaceContext | null) {
        this.lastPlatformSurface = normalizeSurfaceId(surface, "switcher");
        this.lastPlatformContext = normalizeSurfaceContext(context);
    }

    // 表面装配模块（second-panel-ui 等）经 host 钩子记录工作台打开；开放给 this 参数模式。
    public notePlatformSurfaceOpened(surface: PlatformSurface, context?: PlatformSurfaceContext | null) {
        this.notePlatformSurface(surface, context);
    }

    // 当前端的可用表面清单：片段实验室仍是桌面专属（ADR 0078），移动端只有切换器/工作台。
    public getAvailablePlatformSurfaces(): PlatformSurface[] {
        // T-7026（ADR 0099）：端侧可用 ∩ 模块启用——SurfaceNav available、悬浮球回退
        // 目标、设置预览入口等消费方经此自动继承模块过滤。
        const base = this.isMobile ? ["switcher", "workbench"] as PlatformSurface[] : [...PLATFORM_SURFACES];
        return filterSurfacesByVisibility(base, this.getSettings().moduleVisibility);
    }

    // T-7026（ADR 0099）：表面显示名——路由拒绝回执与顶栏菜单共用同一文案源。
    private platformSurfaceDisplayName(surface: PlatformSurface): string {
        if (surface === "workbench") return this.i18n.secondPanel;
        if (surface === "studio") return this.i18n.platformStudio;
        return this.i18n.platformSwitcher;
    }

    // T-6869（ADR 0079 §7）：悬浮球轻触=打开平台并恢复上次表面；上次表面在当前端
    // 不可用（如移动端的桌面专属片段实验室）或会话外非法值时，安全回退切换器。
    private openPlatformFromBall() {
        this.openPlatformSurface(
            resolveSurfaceReturnTarget(this.lastPlatformSurface, this.getAvailablePlatformSurfaces()),
            "switcher",
            {entry: "fab"},
        );
    }

    public getPlatformSurfaceLabels(): PlatformSurfaceLabels {
        return resolvePlatformSurfaceLabelsHelper({
            platformName: this.i18n.platformName,
            platformSubtitle: this.i18n.platformSubtitle,
            platformContext: this.i18n.platformContext,
            platformSwitcher: this.i18n.platformSwitcher,
            platformWorkbench: this.i18n.platformWorkbench,
            platformStudio: this.i18n.platformStudio,
            platformSwitcherHint: this.i18n.platformSwitcherHint,
            platformWorkbenchHint: this.i18n.platformWorkbenchHint,
            platformStudioHint: this.i18n.platformStudioHint,
            switchTabs: this.i18n.switchTabs,
            secondPanel: this.i18n.secondPanel,
            snippetStudioTitle: this.i18n.snippetStudioTitle,
        });
    }

    // 快捷键设置只读取思源当前 keymap，不写回宿主配置；未自定义时回退到
    // 插件注册的默认值，让设置页明确展示“当前生效值”而不是静态猜测。
    public getPlatformShortcutBindings(): {switcher: string; workbench: string} {
        const pluginKeymap = getSiyuan()?.config?.keymap?.plugin?.[this.name] || {};
        const resolve = (id: string, fallback: string) => {
            const custom = pluginKeymap[id]?.custom;
            return typeof custom === "string" && custom.trim() ? custom.trim() : fallback;
        };
        return {
            switcher: resolve("switchTabs", DEFAULT_HOTKEY),
            workbench: resolve("secondPanel", SECOND_PANEL_HOTKEY),
        };
    }

    public mountPlatformChrome(root: HTMLElement, options: PlatformSurfaceChromeOptions): HTMLElement {
        return mountPlatformChromeDom(root, options);
    }

    // Experimental desktop-only studio. It is deliberately reachable from
    // the tab panel toolbar so it does not become a second global command or
    // a mobile surface before the wide layout has real device evidence.
    public openSnippetStudio(returnTo: PlatformSurface = "switcher", context?: PlatformSurfaceContext | null) {
        if (this.isMobile) return;
        if (typeof this.ensureTier2Loaded === "function") {
            void this.ensureTier2Loaded().catch((err) => {
                logger.warn("openSnippetStudio tier2 load fail", err);
            });
        }
        context = context || ({entry: "internal"} as PlatformSurfaceContext);
        if (!this.getAvailablePlatformSurfaces().includes("studio")) {
            showMessage(this.i18n.moduleDisabledReceipt.replace("{x}", this.i18n.moduleStudio));
            return;
        }
        if (this.snippetStudioDialog?.element.isConnected) return;
        this.notePlatformSurface("studio", context);
        const holder: {dialog: Dialog | null; controller: SnippetStudioController | null} = {dialog: null, controller: null};
        const releaseFab = this.suspendFABForDialog();
        // T-6986（D1 决断）：工作室尺寸模式 fullscreen/adaptive/custom——默认保持全屏
        // （ADR 0080 不回退）；adaptive/custom 沿用 resolvePanelSize 的最小尺寸与
        // 视口钳制语义（与工作台 openSecondPanel 同一管线），不再叠加全屏容器类。
        const studioSettings = this.getSettings();
        const studioViewport = {width: window.innerWidth, height: window.innerHeight, minWidth: PANEL_SIZE_MIN_PX, minHeight: PANEL_SIZE_MIN_PX};
        const studioMode: StudioSizeMode = STUDIO_SIZE_MODES.includes(studioSettings.studioSizeMode)
            ? studioSettings.studioSizeMode
            : "fullscreen";
        const size = studioMode === "fullscreen"
            ? {width: studioViewport.width, height: studioViewport.height}
            : studioMode === "adaptive"
                ? resolvePanelSize({...studioSettings, panelSizeMode: "adaptive", panelScale: PANEL_SCALE_DEFAULT}, studioViewport)
                : resolvePanelSize({...studioSettings, panelSizeMode: "custom", dialogWidth: studioSettings.studioWidth, dialogHeight: studioSettings.studioHeight}, studioViewport);
        const dialog = new Dialog({
            title: this.i18n.dialogStudioTitle || "片段实验室",
            content: '<div class="sw-snippet-studio-host"></div>',
            width: `${size.width}px`,
            height: `${size.height}px`,
            disableClose: true,
            destroyCallback: () => {
                holder.controller?.dispose();
                holder.controller = null;
                if (this.snippetStudioDialog === holder.dialog) this.snippetStudioDialog = null;
                releaseFab();
            },
        });
        holder.dialog = dialog;
        this.snippetStudioDialog = dialog;
        dialog.element.classList.add("sw-dialog-host");
        // 全屏模式才叠加 fullscreen 容器类（T-6941 的 100vw/100vh 跟随规则随之生效）；
        // 自适应/固定模式用 Dialog 内联尺寸，缩窗后保持打开时尺寸（与工作台语义一致）。
        if (studioMode === "fullscreen") {
            dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("sw-dialog--fullscreen");
            const isElectronFrameless = !this.isMobile && typeof document !== "undefined"
                && (/Electron/i.test(navigator?.userAgent || "") || Boolean(document.querySelector("#minWindow, #maxWindow, #closeWindow, .toolbar__window")));
            if (isElectronFrameless) {
                dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("sw-dialog--frameless-avoidance");
            }
        }
        dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("sw-dialog--snippet-studio", "sw-platform-dialog", "sw-platform-dialog--studio");
        mountPlatformDialogTitleWrap(dialog.element, this.i18n.dialogStudioTitle || "片段实验室", "", "iconCode");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        dialog.element.querySelector<HTMLElement>(".b3-dialog__body")?.classList.add("sw-scroll-locked");
        const root = dialog.element.querySelector<HTMLElement>(".sw-snippet-studio-host");
        if (!root) {
            dialog.destroy();
            return;
        }
        // Lazy Studio chunk 尚未到达时，Dialog 默认关闭被禁用，原本会出现一段
        // 没有任何退出入口的空白等待态。先挂一层可销毁的临时平台头部；正式
        // Studio mount 时会由 mountPlatformChrome 幂等移除并替换，不触碰脏稿守卫。
        const loading = document.createElement("div");
        loading.className = "sw-studio-loading";
        loading.setAttribute("role", "status");
        loading.setAttribute("aria-live", "polite");
        const loadingSpinner = document.createElement("span");
        loadingSpinner.className = "sw-studio-loading__spinner";
        loadingSpinner.setAttribute("aria-hidden", "true");
        const loadingLabel = document.createElement("span");
        loadingLabel.textContent = this.i18n.snippetLoading;
        loading.append(loadingSpinner, loadingLabel);
        root.appendChild(loading);
        mountPlatformChrome(root, {
            surface: "studio",
            labels: this.getPlatformSurfaceLabels(),
            available: this.getAvailablePlatformSurfaces(),
            status: {state: "loading", label: this.i18n.snippetLoading},
            onHelp: () => this.openPlatformGuide("studio"),
            helpLabel: this.i18n.platformGuideButton,
            closeHint: this.i18n.platformCloseHint,
            closeLabel: this.i18n.close,
            onClose: () => dialog.destroy(),
        });
        const loadingKeydown = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || event.defaultPrevented) return;
            event.preventDefault();
            event.stopPropagation();
            dialog.destroy();
        };
        root.addEventListener("keydown", loadingKeydown);
        const tier2Gate = typeof this.ensureTier2Loaded === "function" && !this.tier2Ready
            ? this.ensureTier2Loaded().catch(() => {})
            : Promise.resolve();
        void Promise.all([this.loadSnippetStudioModule((mod) => mod), tier2Gate]).then(([{mountSnippetStudio}]) => {
            root.removeEventListener("keydown", loadingKeydown);
            if (!dialog.element.isConnected || this.snippetStudioDialog !== dialog) return;
            holder.controller = mountSnippetStudio(root, {
                i18n: this.i18n as unknown as Record<string, string>,
                getConfig: () => (window as {siyuan?: {config?: unknown}}).siyuan?.config || {},

                session: this.snippetStudioSession,
                // T-7025（ADR 0100）：回收站持久化通道——插件侧 sw_snippet_recycle key，
                // 写入走防抖队列；归一/去重/三限淘汰在 snippet-recycle 纯模型（写入侧
                // appendRecycleEntry 先归一；启动侧 runStorageMigration 已归一），此处裸存取
                // 避免主图增长（production graph 上限 71，契约钉住）。
                recycle: {
                    load: () => normalizeRecycleStore(this.data[SNIPPET_RECYCLE_KEY]),
                    save: (next: unknown) => {
                        this.data[SNIPPET_RECYCLE_KEY] = (next && typeof next === "object" && (next as any).store) ? (next as any).store : next;
                        this.saveDataDebounced(SNIPPET_RECYCLE_KEY);
                    },
                },
                groups: {
                    load: () => normalizeSnippetGroupStore(this.data[SNIPPET_GROUPS_KEY]),
                    save: (next: unknown) => {
                        this.data[SNIPPET_GROUPS_KEY] = normalizeSnippetGroupStore(next);
                        this.saveDataDebounced(SNIPPET_GROUPS_KEY);
                    },
                },
                gist: {
                    load: () => this.getSettings().snippetGist,
                    save: (next: unknown) => this.updateSettings({snippetGist: next as ISwSettings["snippetGist"]}),
                },
                stack: {
                    load: () => this.getSnippetStack(),
                    save: (next: unknown) => this.saveSnippetStack(next),
                    captureSelection: () => this.captureSelectionToStack(),
                    assemble: (target: "journal" | "current-doc" | "new-doc" | "copy", opts?: Record<string, unknown>) =>
                        this.assembleSnippetStackToDoc(target, opts),
                    openBlock: (blockId: string, item?: Record<string, unknown>) =>
                        this.openSnippetStackBlock(blockId, item, () => dialog.destroy()),
                    fetchGleanFoldTree: () => this.fetchGleanActiveFoldTree(),
                    onAiRefine: (item: any, ctx?: {signal?: AbortSignal; inlineWait?: boolean}) =>
                        this.runRefineSnippetWithAi(item, ctx?.signal, Boolean(ctx?.inlineWait)),
                    onAiSynthesize: (items: any[], ctx?: {signal?: AbortSignal; inlineWait?: boolean}) =>
                        this.runSynthesizeSnippetsWithAi(items, ctx?.signal, Boolean(ctx?.inlineWait)),
                },
                objectId: !context?.objectKind || context.objectKind === "snippet" ? context.objectId || "" : "",
                platform: {
                    labels: this.getPlatformSurfaceLabels(),
                    status: {state: "ready", label: this.i18n.platformConnected},
                    onHelp: () => this.openPlatformGuide("studio"),
                    helpLabel: this.i18n.platformGuideButton,
                    onSettings: () => {
                        if (!dialog.element.isConnected) return;
                        const focusSource = encodeSurfaceFocusSource(dialog.element.ownerDocument?.activeElement || null);
                        dialog.destroy();
                        this.openSetting(undefined, "studio", {
                            entry: "back", ...(context?.objectKind ? {objectKind: context.objectKind} : {}),
                            ...(context?.objectId ? {objectId: context.objectId} : {}), ...(context?.query ? {query: context.query} : {}),
                            ...(focusSource ? {focusSource} : {}),
                        });
                    },
                    settingsLabel: this.i18n.settings,
                    closeHint: this.i18n.platformCloseHint,
                    available: this.getAvailablePlatformSurfaces(),
                    context: context || null,
                    mount: mountPlatformChrome,
                    onNavigate: (surface: PlatformSurface) => {
                        if (this.isUnloading || !dialog.element.isConnected) return;
                        // T-7012：离开前捕获焦点来源并透传 query，供返回后恢复现场。
                        const focusSource = encodeSurfaceFocusSource(dialog.element.ownerDocument?.activeElement || null);
                        dialog.destroy();
                        dialog.element?.remove();
                        this.openPlatformSurface(surface, returnTo, {
                            entry: "surface-nav", objectKind: context?.objectKind, objectId: context?.objectId,
                            query: context?.query, ...(focusSource ? {focusSource} : {}),
                        });
                    },
                    onClose: (guarded = false) => {
                        if (!guarded && holder.controller && !holder.controller.canClose()) return;
                        dialog.destroy();
                    },
                    closeLabel: this.i18n.close,
                },
                onBack: (guarded = false) => {
                    if (!guarded && holder.controller && !holder.controller.canClose()) return;
                    // T-7012：返回前捕获焦点来源（studio 内多为无描述符控件，空值诚实降级）。
                    const focusSource = encodeSurfaceFocusSource(dialog.element.ownerDocument?.activeElement || null);
                    dialog.destroy();
                    dialog.element?.remove();
                    if (!this.isUnloading) this.openPlatformSurface(returnTo, "switcher", {
                        entry: "back", objectKind: context?.objectKind, objectId: context?.objectId, query: context?.query,
                        ...(focusSource ? {focusSource} : {}),
                    });
                },
            });
            void holder.controller.ready.catch((error) => logger.warn("snippet studio load failed", error));
        }).catch((error) => {
            root.removeEventListener("keydown", loadingKeydown);
            logger.warn("snippet studio import failed", error);
            // The Dialog is intentionally non-dismissible while the studio is
            // mounted so its own Back action can protect unsaved drafts. If
            // the lazy chunk cannot load, restore the switcher instead of
            // leaving an empty modal with no recovery path.
            if (this.snippetStudioDialog === dialog || dialog.element?.isConnected) {
                dialog.destroy();
                if (!this.isUnloading) {
                    showMessage(this.i18n.snippetFailed);
                    this.showSwitcher(false, returnTo);
                }
            }
        });
    }

    // Shared sizing for the desktop switcher and second-panel dialogs:
    // fullscreen fills the viewport, adaptive follows the configured screen
    // ratio, custom uses the fixed pixel settings.
    private resolvePanelDialogSize(settings: ISwSettings, fullscreen: boolean) {
        return resolvePanelSize(
            {...settings, panelSizeMode: fullscreen ? "fullscreen" : settings.panelSizeMode},
            {
                width: window.innerWidth,
                height: window.innerHeight,
                minWidth: PANEL_SIZE_MIN_PX,
                minHeight: PANEL_SIZE_MIN_PX,
                maxWidth: 1600,
            },
        );
    }

    public openMainView(): void {
        if (typeof this.ensureTier2Loaded === "function") {
            void this.ensureTier2Loaded().catch((err) => {
                logger.warn("openMainView tier2 load fail", err);
            });
        }
        this.showSwitcher();
    }

    private loadSnippetStudioModule<T>(onFulfilled: (mod: any) => T): Promise<T> {
        return loadChunkWithRetry(() => new Promise<any>((resolve, reject) => {
            void import(/* webpackChunkName: "snippet-studio" */ "../snippet-studio-ui").then(resolve, reject);
        })).then((mod) => onFulfilled(mod));
    }
}
