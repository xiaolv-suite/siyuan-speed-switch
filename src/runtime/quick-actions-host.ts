import {getActiveTab, openTab} from "siyuan";
import {lvLaunchpad} from "../libs/lv-notice-kit";
import {logger} from "../logger";
import {resolveQuickActionSurfaceState, resolveIconReference, normalizeCustomIcon, isImageIconReference, normalizeQuickActionText} from "../util";
import {pinyinTitleHit} from "../search-model";
import {sanitizeQuickActions, getBuiltinQuickActions, getDefaultQuickActionTargets, resolveQuickActionSupport, getQuickActionCommandTargets, getGlobalQuickActions, shouldRenderQuickAction} from "../quick-actions";
import {createFloatingBallActionExecutor} from "../floating-ball-actions";
import {checkFloatingBallSettingsBudget} from "../floating-ball-settings-model";
import {MESSAGE_DEFAULT_MS, BLOCK_ID_RE, QUICK_ACTIONS_KEY, QUICK_ACTIONS_MAX, ICON_CATALOG, ICON_CATEGORIES} from "../constants";
import {type QuickActionTarget, type QuickActionKind, type QuickActionSupport, type IQuickAction, type IQuickActionPickerCandidate, type IQuickActionPluginCommand, type IQuickActionPluginLike, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface QuickActionsHostRuntime extends Omit<ISpeedSwitchHost, "getQuickActions" | "saveQuickActions" | "getPluginCommands" | "getQuickActionDeclaredTargets" | "getQuickActionSupport" | "hostCommandsAvailable" | "runHostCommand" | "getAvailableIconSymbols" | "renderQuickActionIcon" | "moduleActionEnabled" | "renderQuickActions" | "executeQuickAction" | "getQuickActionPickerCandidates" | "renderQuickActionIconButton" | "getAvailableQuickActionIcons" | "openQuickActionIconPicker"> {}
export class QuickActionsHostRuntime {
    private getQuickActions(): IQuickAction[] {
        return sanitizeQuickActions(this.data[QUICK_ACTIONS_KEY], QUICK_ACTIONS_MAX).items;
    }

    private saveQuickActions(actions: IQuickAction[]) {
        const normalized = sanitizeQuickActions(actions, QUICK_ACTIONS_MAX).items;
        if (!checkFloatingBallSettingsBudget(this.getSettings().floatingBall, normalized).ok) {
            showMessage(this.i18n.floatingBallImportFailed);
            return;
        }
        this.data[QUICK_ACTIONS_KEY] = normalized;
        this.saveDataDebounced(QUICK_ACTIONS_KEY);
        this.refreshOpenSwitchers();
        this.refreshSidebar();
        this.refreshFloatingBallPanels();
        if (typeof document === "object") {
            document.querySelector<HTMLElement>(".sw-floating-ball-settings")
                ?.dispatchEvent(new Event("sw-floating-ball-refresh"));
        }
    }

    public async handleQuickAction(action: string): Promise<void> {
        if (!action) {
            this.showSwitcher();
            return;
        }
        const info = (msg: string, haptic = false) => {
            if (haptic) lvLaunchpad.haptic(10);
            showMessage(msg, 2000, "info");
        };
        if (action.includes("打开暂存栈顶切片") || action.includes("栈顶切片")) {
            const top = this.getSnippetStack()?.items?.[0];
            if (!top) return info("暂存栈为空，无栈顶切片", true);
            const targetId = top.sourceBlockId || top.sourceDocId || top.rootId;
            if (targetId && BLOCK_ID_RE.test(targetId)) {
                if (this.isMobile) void this.mobileOpenDoc(top.sourceDocId || top.rootId || targetId);
                else void this.bridge.openTab({app: this.app, doc: {id: targetId}});
            } else {
                this.openSnippetStackDialog();
            }
            info(`已打开栈顶切片「${top.title || "原子切片"}」`, true);
        } else if (action.includes("搜索当前文档切片") || action.includes("当前文档切片")) {
            const activeTab = this.isMobile
                ? this.getMobileTabs().find((tab) => tab.id === this.getMobileActiveTabId())
                : this.getActiveTab();
            const activeRootId = activeTab ? (this.rootIdOf(activeTab) || "") : (this.resolveActiveHostEditor()?.protyle?.block?.rootID || "");
            const items = this.getSnippetStack()?.items || [];
            const n = activeRootId ? items.filter((it: any) => it.sourceDocId === activeRootId || it.sourceBlockId === activeRootId || it.rootId === activeRootId).length : -1;
            this.openSnippetStackDialog();
            info(n > 0 ? `当前文档共有 ${n} 条暂存切片` : n === 0 ? "当前文档暂无切片记录" : "未检测到当前活跃文档，已打开切片库", true);
        } else if (action.includes("库") || action.includes("暂存") || action.includes("切片库")) {
            this.openSnippetStackDialog();
            lvLaunchpad.haptic(10);
        } else if (action.includes("捕获") || action.includes("选区") || action.includes("切片当前文档")) {
            await this.executeStackCapture();
            lvLaunchpad.haptic(10);
        } else if (action.includes("悬浮球") || action.includes("开关")) {
            const s = this.getSettings();
            const current = s.floatingBall || {};
            const surfaceKey = this.isMobile ? "mobile" : "desktop";
            const next = !(current.enabled?.[surfaceKey] ?? s.fabEnabled);
            this.updateSettings({
                fabEnabled: next,
                floatingBall: {
                    ...current,
                    enabled: {...(current.enabled || {}), [surfaceKey]: next},
                },
            });
            this.updateFloatingBallVisibility();
            info(next ? "动作悬浮球已开启" : "动作悬浮球已关闭", true);
        } else if (action.includes("双栏")) {
            this.updateSettings({columns: 2});
            info("已切换至双栏对照模式");
        } else if (action.includes("三栏")) {
            this.updateSettings({columns: 3});
            info("已切换至三栏专注模式");
        } else if (action.includes("单栏") || action.includes("重置")) {
            this.updateSettings({columns: 0});
            info("已重置为默认单栏自适应布局");
        } else if (action.includes("编织") || action.includes("专题")) {
            const stack = this.getSnippetStack();
            if (stack?.items?.length) await this.synthesizeSnippetsWithAi(stack.items);
            else info("暂存栈为空，无法编织");
        } else {
            this.showSwitcher();
        }
    }

    /**
     * 供第三方插件注册稳定的公开动作。持久化配置只保存 adapter id/value；
     * 不保存函数或 DOM 选择器；插件卸载后对应入口会安全地变为无动作。
     */
    public registerQuickActionAdapter(id: string, handler: (value: string) => void | Promise<void>, targets?: QuickActionTarget[]): () => void {
        const unregister = this.actions.registerQuickActionAdapter(id, handler, targets);
        this.refreshFloatingBallPanels();
        return () => {
            unregister();
            this.refreshFloatingBallPanels();
        };
    }

    /**
     * Register a persistent entry for another plugin. The callback stays in
     * memory while the provider is loaded; only serializable metadata is saved.
     */
    public registerQuickAction(options: {
        id: string;
        label: string;
        icon?: string;
        value?: string;
        targets?: QuickActionTarget[];
        handler: (value: string) => void | Promise<void>;
    }): () => void {
        const unregister = this.actions.registerQuickAction(options);
        const actionValue = options?.value ? `${options.id}/${options.value}` : options?.id;
        if (actionValue) {
            const declaredTargets = Array.isArray(options?.targets) ? options.targets : undefined;
            const actions = this.getQuickActions();
            const existing = actions.find((item) => item.kind === "adapter" && item.value === actionValue);
            if (existing) {
                existing.label = normalizeQuickActionText(options?.label, 80) || existing.label;
                existing.icon = options?.icon || existing.icon;
                existing.targets = declaredTargets ? [...declaredTargets] : existing.targets;
                this.saveQuickActions(actions);
            }
        }
        this.refreshFloatingBallPanels();
        return () => {
            unregister();
            this.refreshFloatingBallPanels();
        };
    }

    private getPluginCommands(): IQuickActionPluginCommand[] {
        const plugins = (this.app as unknown as {plugins?: IQuickActionPluginLike[]} | null | undefined)?.plugins;
        if (!Array.isArray(plugins)) return [];
        const commands: IQuickActionPluginCommand[] = [];
        const seen = new Set<string>();
        plugins.forEach((plugin) => {
            const pluginName = typeof plugin?.name === "string" ? plugin.name : "";
            if (!pluginName || pluginName === this.name || !Array.isArray(plugin.commands)) return;
            const pluginTitle = normalizeQuickActionText(plugin.displayName, 40) || pluginName;
            plugin.commands.forEach((command) => {
                if (!command || typeof command !== "object") return;
                const commandKey = typeof command?.langKey === "string" ? command.langKey : "";
                if (!commandKey || (!command.callback && !command.globalCallback)) return;
                const value = `${pluginName}::${commandKey}`;
                if (seen.has(value)) return;
                seen.add(value);
                const safeId = `${pluginName}-${commandKey}`.replace(/[^A-Za-z0-9_-]/g, "-");
                const commandLabel = normalizeQuickActionText(command.langText || plugin.i18n?.[commandKey] || commandKey, 24) || commandKey;
                commands.push({
                    id: `command-${safeId}`,
                    value,
                    label: commandLabel,
                    icon: typeof command.icon === "string"
                        && /^[A-Za-z][A-Za-z0-9_-]*$/.test(command.icon)
                        && command.icon !== "iconCommand"
                        ? command.icon : "iconPlugin",
                    pluginName,
                    pluginTitle,
                    commandKey,
                    declaredTargets: this.getQuickActionDeclaredTargets({kind: "command", value} as IQuickAction),
                });
            });
        });
        return commands;
    }

    private getQuickActionDeclaredTargets(action: IQuickAction): QuickActionTarget[] | undefined {
        if (action.kind === "command") {
            const plugins = (this.app as unknown as {plugins?: IQuickActionPluginLike[]} | null | undefined)?.plugins;
            return getQuickActionCommandTargets(plugins, action.value) as QuickActionTarget[] | undefined;
        }
        // Host commands ship a source-verified surface set in their catalog
        // entry (T-6790); treat it as the declaration.
        if (action.kind === "global" && Array.isArray(action.targets)) {
            return [...action.targets];
        }
        if (action.kind !== "adapter") return undefined;
        const adapterId = action.value.split("/", 1)[0];
        return this.actions.adapterTargets.get(adapterId);
    }

    private getQuickActionSupport(action: IQuickAction, target: QuickActionTarget): QuickActionSupport {
        // globalCommand is only exported by SiYuan 3.8.3+; older hosts must
        // see these actions as unsupported rather than broken at runtime.
        if (action.kind === "global" && !this.hostCommandsAvailable()) return "unsupported";
        return resolveQuickActionSupport(action.kind, action.value, target,
            this.getQuickActionDeclaredTargets(action)) as QuickActionSupport;
    }

    /** SiYuan 3.8.3+ exposes globalCommand on the plugin instance (API.ts createAPI). */
    private hostCommandsAvailable(): boolean {
        return typeof (this as unknown as {globalCommand?: unknown}).globalCommand === "function";
    }

    /** Dispatch a verified host command (T-6790 catalog) through the official bridge. */
    private runHostCommand(value: string): boolean {
        const bridge = this as unknown as {globalCommand?: (command: string, app: unknown) => unknown};
        if (typeof bridge.globalCommand !== "function") return false;
        bridge.globalCommand.call(this, value, this.app);
        return true;
    }

    /**
     * Return only SVG symbol ids from the current document.  Plugin DOM
     * elements can legitimately share an id with an icon-like value, so
     * getElementById alone is not sufficient for deciding whether a symbol
     * reference is renderable.
     */
    private getAvailableIconSymbols(): Set<string> {
        return new Set(Array.from(document.querySelectorAll<SVGSymbolElement>("symbol[id]"))
            .map((symbol) => symbol.id)
            .filter((id) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id)));
    }

    private renderQuickActionIcon(host: HTMLElement, raw: string, fallback: string | string[] = "iconFile") {
        host.innerHTML = "";
        const resolved = resolveIconReference(raw, this.getAvailableIconSymbols(), fallback);
        host.classList.remove("sw__quick-action-icon--image", "sw__quick-action-icon--emoji");
        if (resolved.type === "image") {
            const image = document.createElement("img");
            image.alt = "";
            image.loading = "lazy";
            image.referrerPolicy = "no-referrer";
            image.src = resolved.value;
            image.className = "sw__quick-action-icon-image";
            image.addEventListener("error", () => {
                if (image.parentNode === host) this.renderQuickActionIcon(host, "", fallback);
            }, {once: true});
            host.appendChild(image);
            host.classList.add("sw__quick-action-icon--image");
            return;
        }
        if (resolved.type === "emoji") {
            host.textContent = resolved.value;
            host.classList.add("sw__quick-action-icon--emoji");
            return;
        }
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", `#${resolved.value}`);
        use.setAttribute("xlink:href", `#${resolved.value}`);
        svg.appendChild(use);
        host.appendChild(svg);
    }

    // T-7026（ADR 0099）D7：模块级快捷动作可用性——仅覆盖平台表面类内建动作，
    // 第三方 provider 动作不经此判定（其能力声明自有契约）。
    private moduleActionEnabled(value: string): boolean {
        const visibility = this.getSettings().moduleVisibility;
        if (!visibility) return true;
        if (value === "home") return visibility.workbench !== false;
        if (value === "snippet-studio") return visibility.studio !== false;
        return true;
    }

    private renderQuickActions(container: HTMLElement, surface: "desktop" | "sidebar" | "mobile", searchInput: HTMLInputElement | null, close: () => void, selector = ".sw__quick-actions") {
        const host = container.querySelector<HTMLElement>(selector);
        if (!host) return;
        host.innerHTML = "";
        const settings = this.getSettings();
        const isMobileBottomBar = surface === "mobile"
            && selector === ".sw__quick-actions"
            && (Boolean(host.closest(".sw__mobile")) || host.classList.contains("sw__mobile-bottom-bar"));
        const presentation = resolveQuickActionSurfaceState(surface, settings, selector);
        const {display, isRightRail, collapsed} = presentation;
        host.classList.toggle("sw__quick-actions--icons", display === "icons" || (collapsed && isRightRail));
        host.classList.toggle("sw__quick-actions--hidden", !isMobileBottomBar && display === "hidden");
        host.classList.toggle("sw__mobile-bottom-bar--qa-hidden", isMobileBottomBar && display === "hidden");
        host.classList.toggle("sw__quick-actions--collapsed", collapsed && display !== "hidden");

        const appendMobilePrimaryNav = () => {
            if (!isMobileBottomBar) return;
            const navItems: Array<{nav: string; cls: string; icon: string; label: string; aria: string; active?: boolean}> = [
                {nav: "stack", cls: "sw__mobile-nav-stack", icon: "iconCode", label: "切片库", aria: "切片库"},
                {nav: "search", cls: "sw__mobile-nav-search", icon: "iconSearch", label: "搜索", aria: this.i18n.searchTabs, active: true},
                {nav: "favorites", cls: "sw__mobile-nav-fav", icon: "iconStar", label: this.i18n.favorites, aria: this.i18n.favorites},
                {nav: "settings", cls: "sw__mobile-nav-settings", icon: "iconSettings", label: this.i18n.settingsShort, aria: this.i18n.settings},
            ];
            navItems.forEach((item) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = `sw__quick-action sw__mobile-nav-item ${item.cls}${item.active ? " is-active" : ""}`;
                btn.dataset.nav = item.nav;
                btn.setAttribute("aria-label", item.aria);
                btn.title = item.aria;
                const iconSpan = document.createElement("span");
                iconSpan.className = "sw__quick-action-icon";
                iconSpan.innerHTML = `<svg width="18" height="18"><use xlink:href="#${item.icon}"></use></svg>`;
                const labelSpan = document.createElement("span");
                labelSpan.className = "sw__quick-action-label sw__mobile-nav-label";
                labelSpan.textContent = item.label;
                btn.append(iconSpan, labelSpan);
                host.appendChild(btn);
            });
        };

        // 移动端单层主导航与快捷栏配置（隐藏/仅图标/折叠）彻底解耦：任何快捷栏设置下主导航均可见
        appendMobilePrimaryNav();
        if (display === "hidden") return;

        const collapseButton = document.createElement("button");
        collapseButton.type = "button";
        collapseButton.className = "sw__quick-action sw__quick-action--collapse";
        collapseButton.setAttribute("aria-label", collapsed ? this.i18n.quickExpand : this.i18n.quickCollapse);
        collapseButton.title = collapsed ? this.i18n.quickExpand : this.i18n.quickCollapse;
        collapseButton.innerHTML = `<span class="sw__quick-action-icon"><svg><use xlink:href="#${collapsed ? (isRightRail ? "iconLeft" : "iconUp") : (isRightRail ? "iconRight" : "iconDown")}"></use></svg></span>`;
        collapseButton.addEventListener("click", () => {
            if (surface === "desktop" && isRightRail) this.updateSettings({quickActionsCollapsedDesktopRight: !collapsed});
            else if (surface === "desktop") this.updateSettings({quickActionsCollapsedDesktopBottom: !collapsed});
            else if (surface === "sidebar") this.updateSettings({quickActionsCollapsedSidebar: !collapsed});
            else this.updateSettings({quickActionsCollapsedMobile: !collapsed});
        });
        host.appendChild(collapseButton);
        if (collapsed && !isRightRail) return;
        const actions = this.getQuickActions()
            .filter((action) => shouldRenderQuickAction(action, surface, "switcher", this.getQuickActionDeclaredTargets(action)))
            // T-7026（ADR 0099）D7：模块级快捷动作过滤——禁用模块的动作不出现在
            // 工具栏/更多面板/悬浮球面板（执行侧由路由层校验兜底）。
            .filter((action) => this.moduleActionEnabled(action.value))
            // 移动端单层底栏已包含唯一「搜索/设置」主导航，跳过重复项防止出现双「搜索/设置」
            .filter((action) => !(isMobileBottomBar && action.kind === "builtin" && (action.value === "search" || action.value === "settings")))
            .sort((a, b) => a.order - b.order);
        // The same action host is used by desktop, sidebar, and mobile. Only
        // hide it when the current surface has no enabled actions; hiding all
        // non-desktop surfaces made the newly added entries unreachable there.
        actions.forEach((action) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "sw__quick-action b3-tooltips b3-tooltips__n";
            button.setAttribute("aria-label", action.label);
            button.title = action.label;
            const icon = document.createElement("span");
            icon.className = "sw__quick-action-icon";
            const pluginFallback = action.kind === "adapter" || action.kind === "command"
                ? ["iconPlugin", "iconFile"] : "iconFile";
            this.renderQuickActionIcon(icon, action.icon, pluginFallback);
            const label = document.createElement("span");
            label.className = "sw__quick-action-label";
            label.textContent = action.label;
            button.append(icon, label);
            button.addEventListener("click", () => this.executeQuickAction(action, searchInput, close, surface));
            host.appendChild(button);
        });
        // 组件面板入口：桌面与手机底栏都常驻（手机端此前只能绕道"更多"菜单）
        if ((surface === "desktop" || surface === "mobile") && this.getAvailablePlatformSurfaces().includes("workbench")) {
            const homeButton = document.createElement("button");
            homeButton.type = "button";
            homeButton.className = "sw__quick-action sw__quick-action--home b3-tooltips b3-tooltips__n";
            homeButton.setAttribute("aria-label", this.i18n.secondPanel);
            homeButton.title = this.i18n.secondPanel;
            homeButton.innerHTML = `<span class="sw__quick-action-icon"><svg><use xlink:href="#iconLayoutHome"></use></svg></span><span class="sw__quick-action-label">${this.i18n.secondPanel}</span>`;
            homeButton.addEventListener("click", () => {
                close();
                this.openPlatformSurface("workbench", "switcher", {entry: "quick-action"});
            });
            host.appendChild(homeButton);
        }
        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "sw__quick-action sw__quick-action--add b3-tooltips b3-tooltips__n";
        addButton.setAttribute("aria-label", this.i18n.addQuickAction);
        addButton.title = this.i18n.addQuickAction;
        const addIcon = document.createElement("span");
        addIcon.className = "sw__quick-action-icon";
        addIcon.innerHTML = '<svg><use xlink:href="#iconAdd"></use></svg>';
        const addLabel = document.createElement("span");
        addLabel.className = "sw__quick-action-label";
        addLabel.textContent = this.i18n.addQuickAction;
        addButton.append(addIcon, addLabel);
        addButton.addEventListener("click", () => {
            close();
            this.openSetting("quickActions");
        });
        host.appendChild(addButton);
    }

    private executeQuickAction(action: IQuickAction, searchInput: HTMLInputElement | null, close: () => void, surface?: QuickActionTarget) {
        const actionSurface = surface || (this.isMobile ? "mobile" : "desktop");
        const executor = createFloatingBallActionExecutor({
            adapters: this.actions.adapters,
            registry: this.actions.registry,
            getDockByType: (type: string) => this.getDockByType(type),
            plugins: (this.app as unknown as {plugins?: IQuickActionPluginLike[]} | null | undefined)?.plugins,
            context: {surface: actionSurface, source: "quick-actions"},
            close,
            onSwitcher: () => this.showSwitcher(),
            onSearch: () => {
                if (searchInput?.isConnected) {
                    searchInput.focus();
                    return;
                }
                // Home/second-panel callers do not own a search input. Keep
                // the action useful by opening the correct switcher surface
                // and asking that surface to focus its real input.
                this.showSwitcher(true);
            },
            onJournal: () => this.openJournal(),
            onSettings: () => this.openSetting(),
            onHome: () => this.openPlatformSurface("workbench", "switcher", {entry: "quick-action"}),
            onSnippetStudio: () => this.openPlatformSurface("studio", "switcher", {entry: "quick-action"}),
            onQuickCapture: () => this.openQuickCapture(),
            onPreviousTab: () => this.cycleFloatingBallTab(-1),
            onNextTab: () => this.cycleFloatingBallTab(1),
            onScrollTop: () => this.scrollFloatingBallSurface(actionSurface, "top"),
            onScrollBottom: () => this.scrollFloatingBallSurface(actionSurface, "bottom"),
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
            onGlobalCommand: (action: {value: string}) => this.runHostCommand(action.value)
                ? undefined : {ok: false, reason: "unavailable"},
        });
        void Promise.resolve(executor(action)).then((result) => {
            if (result?.ok) return;
            const reason = result?.reason === "failed" ? "failed" : "unavailable";
            logger.warn(`quick action ${reason}`, action.value);
            showMessage(
                reason === "failed" ? this.i18n.quickActionFailed : this.i18n.quickActionUnavailable,
                MESSAGE_DEFAULT_MS,
                "error",
            );
        }).catch((error) => {
            // The executor normalises provider errors, but keep this final
            // boundary defensive so a host callback can never create an
            // unhandled rejection in a toolbar click handler.
            logger.warn("quick action execution failed", error);
            showMessage(this.i18n.quickActionFailed, MESSAGE_DEFAULT_MS, "error");
        });
    }

    private getQuickActionPickerCandidates(actions: IQuickAction[]): IQuickActionPickerCandidate[] {
        const existing = new Set(actions.map((action) => `${action.kind}:${action.value}`));
        const targetNames: Record<QuickActionTarget, string> = {
            desktop: this.i18n.quickDesktop,
            sidebar: this.i18n.quickSidebar,
            mobile: this.i18n.quickMobile,
        };
        const describe = (kind: QuickActionKind, value: string, targets: QuickActionTarget[], declared?: QuickActionTarget[]) => {
            const supported = targets.filter((target) =>
                resolveQuickActionSupport(kind, value, target, declared) !== "unsupported");
            const parts = supported.map((target) => targetNames[target]);
            if (resolveQuickActionSupport(kind, value, "mobile", declared) === "unknown" && !supported.includes("mobile")) {
                parts.push(this.i18n.quickMobileUnknown);
            }
            return parts.join(" · ");
        };
        const candidates: IQuickActionPickerCandidate[] = [];
        const builtinLabels: Record<string, string> = {
            switcher: this.i18n.quickBuiltinSwitcher,
            search: this.i18n.quickBuiltinSearch,
            journal: this.i18n.quickBuiltinJournal,
            settings: this.i18n.quickBuiltinSettings,
            home: this.i18n.secondPanel,
            "snippet-studio": this.i18n.platformStudio,
            "quick-capture": this.i18n.quickBuiltinQuickCapture,
            "previous-tab": this.i18n.quickBuiltinPreviousTab,
            "next-tab": this.i18n.quickBuiltinNextTab,
            "scroll-top": this.i18n.quickBuiltinScrollTop,
            "scroll-bottom": this.i18n.quickBuiltinScrollBottom,
            "sync-now": this.i18n.quickBuiltinSyncNow,
            "insert-template": this.i18n.quickBuiltinInsertTemplate,
            "cycle-doc-set": this.i18n.quickBuiltinCycleDocSet,
            "cycle-ball-preset": this.i18n.quickBuiltinCycleBallPreset,
            "throw-window": this.i18n.quickBuiltinThrowWindow,
            "hide-keyboard": this.i18n.quickBuiltinHideKeyboard,
            "jump-back": this.i18n.quickBuiltinJumpBack,
            "jump-forward": this.i18n.quickBuiltinJumpForward,
        };
        getBuiltinQuickActions().forEach((raw) => {
            const action = raw as IQuickAction;
            if (existing.has(`builtin:${action.value}`)) return;
            action.label = builtinLabels[action.value] || action.label;
            candidates.push({
                id: action.id,
                label: action.label,
                icon: action.icon,
                group: this.i18n.quickBuiltin,
                secondary: describe(action.kind, action.value, action.targets),
                searchText: `${action.label} ${action.value} ${this.i18n.quickBuiltin}`,
                action,
            });
        });
        const globalLabels: Record<string, string> = {
            outline: this.i18n.quickGlobalOutline,
            bookmark: this.i18n.quickGlobalBookmark,
            tag: this.i18n.quickGlobalTag,
            inbox: this.i18n.quickGlobalInbox,
            backlinks: this.i18n.quickGlobalBacklinks,
            recentDocs: this.i18n.quickGlobalRecentDocs,
            recentClosed: this.i18n.quickGlobalRecentClosed,
            riffCard: this.i18n.quickGlobalRiffCard,
            editReadonly: this.i18n.quickGlobalEditReadonly,
        };
        getGlobalQuickActions().forEach((raw) => {
            const action = raw as IQuickAction;
            if (existing.has(`global:${action.value}`)) return;
            action.label = globalLabels[action.value] || action.label;
            candidates.push({
                id: action.id,
                label: action.label,
                icon: action.icon,
                group: this.i18n.quickHostCommands,
                secondary: describe(action.kind, action.value, action.targets, action.targets),
                searchText: `${action.label} ${action.value} ${this.i18n.quickHostCommands}`,
                action,
            });
        });
        this.getDockPanels().forEach((panel) => {
            if (existing.has(`dock:${panel.type}`)) return;
            const targets = getDefaultQuickActionTargets("dock", panel.type) as QuickActionTarget[];
            const safeType = panel.type.replace(/[^A-Za-z0-9_-]/g, "-");
            const dockLabel = normalizeQuickActionText(panel.title, 24) || panel.type;
            const action: IQuickAction = {
                id: `dock-${safeType}`,
                label: dockLabel,
                icon: panel.icon || "iconDock",
                kind: "dock",
                value: panel.type,
                targets,
                order: 0,
                enabled: true,
            };
            candidates.push({
                id: action.id,
                label: dockLabel,
                icon: action.icon,
                group: this.i18n.quickDock,
                secondary: describe(action.kind, action.value, targets),
                searchText: `${dockLabel} ${panel.type} ${this.i18n.quickDock}`,
                action,
            });
        });
        this.actions.providers.forEach((provider: any) => {
            if (existing.has(`adapter:${provider.value}`)) return;
            const safeValue = provider.value.replace(/[^A-Za-z0-9_-]/g, "-");
            const providerLabel = normalizeQuickActionText(provider.label, 24) || provider.id;
            const action: IQuickAction = {
                id: `adapter-${safeValue}`,
                label: providerLabel,
                icon: provider.icon,
                kind: "adapter",
                value: provider.value,
                targets: [...provider.targets],
                order: 0,
                enabled: true,
            };
            candidates.push({
                id: action.id,
                label: providerLabel,
                icon: provider.icon,
                // T-6811 按来源插件分组：同一插件的动作聚合在以其命名的分组下
                group: providerLabel || this.i18n.quickPluginActions,
                fallbackIcon: ["iconPlugin", "iconFile"],
                secondary: describe(action.kind, action.value, action.targets, provider.declaredTargets),
                searchText: `${providerLabel} ${provider.id} ${provider.value} ${this.i18n.quickPluginActions}`,
                action,
            });
        });
        this.getPluginCommands().forEach((command) => {
            if (existing.has(`command:${command.value}`)) return;
            const targets = getDefaultQuickActionTargets("command", command.value, command.declaredTargets) as QuickActionTarget[];
            const displayLabel = normalizeQuickActionText(command.label, 24) || normalizeQuickActionText(command.value, 24);
            const pluginTitle = normalizeQuickActionText(command.pluginTitle, 32) || command.pluginName;
            const action: IQuickAction = {
                id: command.id,
                label: displayLabel,
                icon: command.icon,
                kind: "command",
                value: command.value,
                targets,
                order: 0,
                enabled: true,
            };
            candidates.push({
                id: action.id,
                label: displayLabel,
                icon: command.icon,
                // T-6811 按来源插件分组：同一插件的命令聚合在以其命名的分组下
                group: pluginTitle || command.pluginName || this.i18n.quickPluginCommands,
                fallbackIcon: ["iconPlugin", "iconFile"],
                secondary: `${pluginTitle} · ${describe(action.kind, action.value, targets, command.declaredTargets)}`,
                searchText: `${displayLabel} ${pluginTitle} ${command.pluginName} ${command.commandKey} ${this.i18n.quickPluginCommands}`,
                action,
            });
        });
        return candidates;
    }

    private renderQuickActionIconButton(button: HTMLButtonElement, icon: string) {
        button.innerHTML = "";
        const preview = document.createElement("span");
        preview.className = "sw-setting__quick-icon-preview";
        this.renderQuickActionIcon(preview, icon, ["iconPlugin", "iconFile"]);
        const name = document.createElement("span");
        name.className = "sw-setting__quick-icon-name";
        name.textContent = isImageIconReference(icon) ? this.i18n.quickIconImage : /^icon/.test(icon) ? icon.slice(4) : icon;
        const arrow = document.createElement("svg");
        arrow.className = "sw-setting__quick-icon-arrow";
        arrow.innerHTML = '<use xlink:href="#iconDown"></use>';
        button.append(preview, name, arrow);
    }

    private getAvailableQuickActionIcons(current: string): string[] {
        const fallback = [
            "iconLayout", "iconSearch", "iconCalendar", "iconSettings", "iconFile", "iconFolder",
            "iconDock", "iconPlugin", "iconAdd", "iconClock", "iconTask", "iconBookmark",
        ];
        const loaded = Array.from(document.querySelectorAll<SVGSymbolElement>("symbol[id]"))
            .map((symbol) => symbol.id)
            .filter((id) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(id));
        const emoji = ["⭐", "📅", "🔍", "✅", "⚡"];
        return Array.from(new Set([current, ...fallback, ...loaded, ...emoji].filter(Boolean))).sort((a, b) => a.localeCompare(b));
    }

    private openQuickActionIconPicker(action: IQuickAction, onPick: (icon: string) => void) {
        // T-7178：捕获触发元素，关闭时回焦
        const ae = document.activeElement as HTMLElement | null;
        const iconOpener = ae && typeof ae.focus === 'function' ? ae : null;
        this.activeIconPickerCleanup?.();
        this.activeIconPickerCleanup = null;
        document.querySelector(".sw-quick-icon-picker-overlay")?.remove();
        const overlay = document.createElement("div");
        overlay.className = "sw-quick-icon-picker-overlay";
        const sheet = document.createElement("div");
        sheet.className = "sw-quick-icon-picker";
        sheet.setAttribute("role", "dialog");
        sheet.setAttribute("aria-modal", "true");
        sheet.setAttribute("aria-label", this.i18n.quickChooseIcon);
        const header = document.createElement("div");
        header.className = "sw-quick-icon-picker__header";
        const title = document.createElement("strong");
        title.textContent = this.i18n.quickChooseIcon;
        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "b3-button b3-button--text sw-quick-icon-picker__close";
        closeButton.setAttribute("aria-label", this.i18n.close);
        closeButton.innerHTML = '<svg><use xlink:href="#iconClose"></use></svg>';
        header.append(title, closeButton);
        const search = document.createElement("input");
        search.type = "search";
        search.className = "b3-text-field sw-quick-icon-picker__search";
        search.placeholder = this.i18n.quickIconSearch;
        search.setAttribute("aria-label", this.i18n.quickIconSearch);
        const custom = document.createElement("input");
        custom.type = "text";
        custom.className = "b3-text-field sw-quick-icon-picker__custom";
        custom.placeholder = this.i18n.quickIconCustom;
        custom.setAttribute("aria-label", custom.placeholder);
        custom.value = /^icon[A-Za-z0-9_-]+$/.test(action.icon || "") ? "" : (action.icon || "");
        const customApply = document.createElement("button");
        customApply.type = "button";
        customApply.className = "b3-button sw-quick-icon-picker__custom-apply sw-quick-icon-picker__custom-lv-raikiri-apply";
        customApply.textContent = this.i18n.quickIconApplyCustom || "使用自定义图标";
        const customRow = document.createElement("div");
        customRow.className = "sw-quick-icon-picker__custom-row sw-quick-icon-picker__custom-lv-raikiri-row";
        const customPreview = document.createElement("span");
        customPreview.className = "sw-quick-icon-picker__preview";
        customPreview.setAttribute("aria-label", this.i18n.quickIconPreview);
        const customHint = document.createElement("small");
        customHint.className = "sw-quick-icon-picker__hint";
        customHint.textContent = this.i18n.quickIconCustomHint;
        const refreshCustomPreview = () => {
            custom.setCustomValidity("");
            const candidate = normalizeCustomIcon(custom.value);
            customApply.disabled = !candidate;
            this.renderQuickActionIcon(customPreview, candidate || "iconPlugin", ["iconPlugin", "iconFile"]);
        };
        custom.addEventListener("input", refreshCustomPreview);
        customRow.append(customPreview, custom, customApply);
        const grid = document.createElement("div");
        grid.className = "sw-quick-icon-picker__grid";
        const icons = this.getAvailableQuickActionIcons(action.icon);

        // T-6811 图标目录：分类浏览 + 中文/拼音/英文 id 搜索。
        // 目录里没有的宿主图标归入"其他"，Emoji 归入"表情"。
        const catalogMap = new Map<string, {zh: string; en: string; category: string}>(
            ICON_CATALOG.map((entry) => [entry[0], {zh: entry[1], en: entry[2], category: entry[3]}]),
        );
        const categorize = (icon: string): {zh: string; en: string; category: string} => {
            const entry = catalogMap.get(icon);
            if (entry) return entry;
            if (/^icon[A-Za-z0-9_-]+$/.test(icon)) return {zh: icon, en: icon.toLowerCase(), category: "其他"};
            return {zh: "表情", en: "emoji", category: "表情"};
        };
        const items = icons.map((icon) => ({icon, meta: categorize(icon)}));
        const categoryOrder = [...ICON_CATEGORIES, "表情", "其他"];
        const presentCategories = categoryOrder.filter((category) =>
            items.some((item) => item.meta.category === category));
        let activeCategory = "全部";

        const cats = document.createElement("div");
        cats.className = "sw-quick-icon-picker__cats";
        // Categories filter the same icon grid; they do not switch tabpanels.
        // Use a labelled pressed-button group so screen readers do not enter a
        // tab interaction model without matching panels/roving focus.
        cats.setAttribute("role", "group");
        cats.setAttribute("aria-label", this.i18n.quickIconCategory || this.i18n.quickIconCategoryAll || "Category");
        const renderCats = () => {
            cats.textContent = "";
            for (const category of [this.i18n.quickIconCategoryAll || "全部", ...presentCategories]) {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "sw-quick-icon-picker__cat" + (category === activeCategory ? " is-active" : "");
                chip.textContent = category;
                chip.setAttribute("aria-pressed", String(category === activeCategory));
                chip.addEventListener("click", () => {
                    activeCategory = category;
                    renderCats();
                    renderIcons();
                });
                cats.appendChild(chip);
            }
        };
        renderCats();

        const renderIcons = () => {
            const keyword = search.value.trim().toLocaleLowerCase();
            grid.innerHTML = "";
            const hit = (icon: string, meta: {zh: string; en: string; category: string}) => {
                if (!keyword) return true;
                if (icon.toLocaleLowerCase().includes(keyword)) return true;
                if (meta.zh.toLocaleLowerCase().includes(keyword)) return true;
                if (meta.en.toLowerCase().includes(keyword)) return true;
                // 中文拼音首字母/全拼（复用 T-6805 引擎）
                if (pinyinTitleHit(meta.zh, keyword)) return true;
                return false;
            };
            const visible = items.filter((item) =>
                (activeCategory === "全部" || item.meta.category === activeCategory)
                && hit(item.icon, item.meta));
            if (!visible.length) {
                const empty = document.createElement("div");
                empty.className = "sw-quick-icon-picker__hint";
                empty.textContent = this.i18n.quickIconSearchEmpty || this.i18n.noOpenHistory;
                grid.appendChild(empty);
                return;
            }
            let lastCategory = "";
            visible.forEach((item) => {
                if (item.meta.category !== lastCategory) {
                    lastCategory = item.meta.category;
                    const heading = document.createElement("div");
                    heading.className = "sw-quick-icon-picker__group-title";
                    heading.textContent = item.meta.category;
                    grid.appendChild(heading);
                }
                const option = document.createElement("button");
                option.type = "button";
                option.className = "sw-quick-icon-picker__item";
                option.classList.toggle("is-selected", item.icon === action.icon);
                option.title = item.meta.zh === item.icon ? item.icon : `${item.meta.zh} · ${item.icon}`;
                option.setAttribute("aria-label", option.title);
                this.renderQuickActionIcon(option, item.icon, ["iconPlugin", "iconFile"]);
                option.addEventListener("click", () => {
                    cleanup();
                    onPick(item.icon);
                });
                grid.appendChild(option);
            });
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                cleanup();
                if (iconOpener) iconOpener.focus({preventScroll: true});
            }
        };
        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            if (this.activeIconPickerCleanup === cleanup) this.activeIconPickerCleanup = null;
            document.removeEventListener("keydown", onKeyDown);
            overlay.remove();
            // T-7178：关闭后回焦触发元素
            if (iconOpener && iconOpener.isConnected) iconOpener.focus({preventScroll: true});
        };
        this.activeIconPickerCleanup = cleanup;
        closeButton.addEventListener("click", cleanup);
        customApply.addEventListener("click", () => {
            const candidate = normalizeCustomIcon(custom.value);
            if (!candidate) {
                custom.setCustomValidity(this.i18n.quickIconInvalid);
                custom.reportValidity?.();
                return;
            }
            cleanup();
            onPick(candidate);
        });
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) cleanup();
        });
        search.addEventListener("input", renderIcons);
        document.addEventListener("keydown", onKeyDown);
        sheet.append(header, search, cats, customRow, customHint, grid);
        overlay.appendChild(sheet);
        document.body.appendChild(overlay);
        renderIcons();
        refreshCustomPreview();
        // T-7178：移动端也入焦搜索框（历史仅桌面入焦）
        search.focus({preventScroll: true});
        // T-7178：Tab 循环约束——首末回绕，焦点不逃逸 overlay
        overlay.addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key !== "Tab") return;
            const focusables = Array.from(overlay.querySelectorAll("button, input")).filter((el): el is HTMLButtonElement | HTMLInputElement => !el.hasAttribute("disabled"));
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus({preventScroll: true});
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus({preventScroll: true});
            }
        });
    }
}
