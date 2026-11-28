import {Dialog, getFrontend, getActiveTab, openTab} from "siyuan";
import {type DisposerRegistry} from "../core/disposer";
import {runPluginCommand} from "../api/plugin-command";
import {createExternalCommandReceiver, mountExternalCommandTransport, publishExternalReceipt, isExternalNavigationCommand, type ExternalCommandPolicy} from "../api/external-command-receiver";
import {lvNotify, lvBackup, lvSnapshotVault, lvLaunchpad, lvOmnisearch, lvTicker, ensureXiaolvDiaryZone, buildXiaolvLifeLogAttrs} from "../libs/lv-notice-kit";
import {attachXiaolvLifeLogIal} from "../journal-actions";
import {logger} from "../logger";
import {isGlobalShortcutHostReady, safeRegisterPluginCommand} from "../util";
import {disposeSearchSession} from "../search-session";
import {resolveSearchNotebookId} from "../search-model";
import {clearLifeWidgetCaches} from "../life-widget-network";
import {mountRaikiriBridge} from "../api/external-bridge";
import {getBridgeSafely} from "../api/ecosystem-bridge-kit";
import {FloatingBallPosition} from "../floating-ball-ui";
import {AGENT_CAPABILITY_SPECS, flipTaskMarkdown, sanitizeJournalAppend, normalizeAgentDocumentId, normalizeAgentDocumentIds, normalizeAgentNotebookId, registerAgentActionCapability} from "../agent-capabilities";
import {buildAgentReadOnlyAuditSnapshot, createAgentReadOnlyAuditHistory} from "../agent-readonly-audit";
import {SYNC_WATCHDOG_MS, SIDEBAR_DEFAULT_WIDTH_PX, SIDEBAR_DOCK_TYPE, DEFAULT_HOTKEY, SECOND_PANEL_HOTKEY} from "../constants";
import {CARD_ICON_SPRITE, type IDockHandlerSelf, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";
import {setActivePluginInstance, getActivePluginInstance} from "./runtime-notice";

declare let __webpack_public_path__: string;

export interface LifecycleCommandsRuntime extends Omit<ISpeedSwitchHost, "exposePublicApi" | "registerDesktopDock" | "registerMobileEntries" | "bindGlobalEvents" | "bindEcosystemEventSubscriptions" | "unbindEcosystemEventSubscriptions" | "setSyncPresentation" | "clearSyncWatchdog" | "armSyncWatchdog" | "setupBreadcrumbEntry" | "teardownBreadcrumbEntry" | "registerSwitcherRefresh" | "refreshOpenSwitchers" | "scheduleOpenSwitchersRefresh" | "scheduleAnimationFrame" | "configureExternalCommands" | "mountExternalCommands"> {}
export class LifecycleCommandsRuntime {
    async runPluginOnload() {
        if (typeof __webpack_public_path__ !== "undefined" && this.name) {
            const p = typeof window !== "undefined" ? window.location?.pathname || "" : "";
            const idx = p.indexOf("/stage/");
            __webpack_public_path__ = `${idx > 0 ? p.slice(0, idx) : ""}/plugins/${encodeURIComponent(this.name)}/`;
        }
        setActivePluginInstance(this);
        if (typeof performance !== "undefined" && typeof performance.mark === "function") {
            try { performance.mark("siyuan-speed-switch-onload-start"); } catch { /* ignore */ }
        }
        this.isUnloading = false;
        this.lifecycleGeneration += 1;
        // 模态优先 Esc 仲裁：在 lvSurfaceStack 之前注册，防止后台被动提示胶囊吞掉弹窗/编辑态的首按 Esc
        if (typeof window !== "undefined") {
            const onModalEscapeArbiter = (event: KeyboardEvent) => {
                if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
                if (typeof document === "undefined") return;
                if (document.querySelector(".lvct-closeguard, .lv-dialog, .lv-qw-mask, .sw-home-store")) return;
                const commonMenu = document.getElementById("commonMenu");
                if (commonMenu && !commonMenu.classList.contains("fn__none")) return;
                if (document.querySelector(".sw-home__size-menu")) return;
                const healthPreview = document.querySelector<HTMLElement>(".sw-home-health__preview");
                if (healthPreview && healthPreview.offsetParent !== null) {
                    const cancelBtn = healthPreview.querySelector<HTMLButtonElement>(".sw-home-health__actions button:not([data-action='copy'])");
                    if (cancelBtn) {
                        event.preventDefault();
                        event.stopPropagation();
                        cancelBtn.click();
                        return;
                    }
                }
                const healthRoot = document.querySelector<HTMLElement>(".sw-home-health");
                if (healthRoot && !healthRoot.hidden) {
                    const closeBtn = healthRoot.closest<HTMLElement>(".b3-dialog")?.querySelector<HTMLElement>(".b3-dialog__close");
                    if (closeBtn) {
                        event.preventDefault();
                        event.stopPropagation();
                        closeBtn.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
                        return;
                    }
                }
                const wbEdit = document.querySelector<HTMLButtonElement>('.sw-home.is-editing [data-home-action="edit"][aria-pressed="true"]');
                if (wbEdit && !wbEdit.disabled) {
                    const activeEl = document.activeElement as HTMLElement | null;
                    const inTextInput = activeEl && (activeEl.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName));
                    if (!inTextInput) {
                        const wbDialog = wbEdit.closest<HTMLElement>(".b3-dialog__container");
                        const containers = Array.from(document.querySelectorAll<HTMLElement>(".b3-dialog__container"));
                        if (!wbDialog || containers[containers.length - 1] === wbDialog) {
                            event.preventDefault();
                            event.stopPropagation();
                            wbEdit.click();
                            return;
                        }
                    }
                }
                const settingsDlg = document.querySelector<HTMLElement>(".sw-settings-dialog");
                if (settingsDlg) {
                    const containers = Array.from(document.querySelectorAll<HTMLElement>(".b3-dialog__container"));
                    if (containers[containers.length - 1] === settingsDlg) {
                        const settingsSearch = settingsDlg.querySelector<HTMLInputElement>("input.sw-settings__search-input");
                        if (!settingsSearch || !settingsSearch.value) {
                            const closeBtn = settingsDlg.querySelector<HTMLElement>(".b3-dialog__close");
                            if (closeBtn) {
                                event.preventDefault();
                                event.stopPropagation();
                                closeBtn.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
                                return;
                            }
                        }
                    }
                }
                const switcherDlg = document.querySelector<HTMLElement>(".sw-platform-dialog--switcher");
                const surfaceStack = (window as {__LV_SURFACE_STACK__?: Array<{id?: string}>}).__LV_SURFACE_STACK__;
                if (switcherDlg && Array.isArray(surfaceStack) && surfaceStack.some((item) => item?.id === "lv-notice-active-card")) {
                    const containers = Array.from(document.querySelectorAll<HTMLElement>(".b3-dialog__container"));
                    if (containers[containers.length - 1] === switcherDlg
                        && !document.querySelector(".sw-activity-stream-dialog, .sw__palette-backdrop, .sw__sort-menu, .sw__history-panel:not(.fn__none), .sw__fav-panel:not(.fn__none)")) {
                        const searchInput = switcherDlg.querySelector<HTMLInputElement>("input.sw__search");
                        if (!searchInput || !searchInput.value) {
                            const closeBtn = switcherDlg.querySelector<HTMLElement>(".sw-platform-header__close, .b3-dialog__close");
                            if (closeBtn) {
                                event.preventDefault();
                                event.stopPropagation();
                                closeBtn.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
                            }
                        }
                    }
                }
            };
            this.disposer.trackListener(window, "keydown", onModalEscapeArbiter as EventListener, true);
        }
        // 允许同一插件实例在宿主热重载后重新开始一段独立的审计历史。
        if (this.agentReadOnlyAuditHistory.status().disposed) {
            this.agentReadOnlyAuditHistory = createAgentReadOnlyAuditHistory(8);
        }
        this.isMobile = getFrontend() === "mobile" || getFrontend() === "browser-mobile";

        // 尽早注入卡片按钮图标：官方 sprite 为异步注入，首帧渲染的三按钮可能引用到空 symbol
        this.addIcons(CARD_ICON_SPRITE);

        this.fixLegacyHotkey();
        await this.initPersistentData();
        const policyFile = await this.externalJsonIO.read<Partial<ExternalCommandPolicy>>("/data/storage/petal/siyuan-speed-switch/external-bridge-policy.json").catch((): {kind: "missing"} => ({kind: "missing"}));
        const externalPolicy = policyFile.kind === "present" ? policyFile.value : null;
        this.externalCommandPolicy = {enabled: externalPolicy?.enabled === true, allowNavigation: externalPolicy?.allowNavigation === true, allowWrites: externalPolicy?.allowWrites === true};

        // contextMenu 是 v3.8.4 运行时新增参数，随包的类型定义尚未收录——
        // 用结构化局部类型承接（菜单对象运行时只需 addItem），变量传参绕开
        // 字面量多余属性检查。
        type TopBarContextMenu = (menu: {addItem: (item: {icon: string; label: string; click: () => void}) => void}) => void;
        const switcherTopBar: {id?: string; icon: string; title: string; position: "right"; contextMenu: TopBarContextMenu; callback: () => void} = {
            id: "siyuan-speed-switch-topbar",
            icon: "iconLvSpeedSwitch",
            title: this.i18n.switchTabs,
            position: "right",
            contextMenu: (menu) => {
                // T-7026（ADR 0099）D3：顶栏收敛为唯一平台入口——菜单动态列出全部已启用
                // 表面 + 设置；工作台/实验室仍可经 SurfaceNav、快捷动作、命令进入。
                menu.addItem({
                    icon: "iconSettings",
                    label: this.i18n.settings,
                    click: () => void this.openSetting(),
                });
                for (const surface of this.getAvailablePlatformSurfaces()) {
                    if (surface === "switcher") continue;
                    menu.addItem({
                        icon: surface === "workbench" ? "iconLayoutHome" : "iconCode",
                        label: this.platformSurfaceDisplayName(surface),
                        click: () => this.openPlatformSurface(surface, "switcher", {entry: "topbar-context-menu"}),
                    });
                }
            },
            callback: () => {
                this.showSwitcher();
            },
        };
        const topBarEl = this.addTopBar(switcherTopBar);

        // 小驴罗盘 · 家族极速弹射坞（顶栏收敛与极速二级行动标准接入）
        this.launchpadCleaner = lvLaunchpad.register({
            id: "siyuan-speed-switch",
            name: "雷切",
            fullName: "小驴雷切",
            svgIcon: "icon-lv-raikiri",
            color: "#38bdf8",
            desc: "分栏切换 · 选区暂存",
            digit: 2,
            badge: "已就绪",
            badgeType: "success",
            actions: [
                "打开切片库",
                "切片当前文档",
                "打开暂存栈顶切片",
            ],
            topBarElement: topBarEl,
            onClick: () => this.openMainView(),
            onAction: (action) => this.handleQuickAction(action),
        });
        this.disposer.registerFn(() => { this.launchpadCleaner?.(); this.launchpadCleaner = undefined; });

        // 统一万物穿透搜索引擎 (lvOmnisearch)：注册切片暂存文本检索切面与一键还原分栏
        this.omnisearchCleaner = lvOmnisearch.registerProvider("siyuan-speed-switch", (keyword: string) => {
            return this.searchOmniSlices(keyword);
        });
        this.disposer.registerFn(() => { this.omnisearchCleaner?.(); this.omnisearchCleaner = undefined; });

        // 统一节拍时钟 (lvTicker)：跨日自动刷新活动切换器与工作台卡片数据
        this.dateCrossCleaner = lvTicker.onDateCross("siyuan-speed-switch", () => {
            try {
                this.refreshOpenSwitchers();
                this.refreshFloatingBallPanels();
            } catch { /* ignore */ }
        });
        this.disposer.registerFn(() => { this.dateCrossCleaner?.(); this.dateCrossCleaner = undefined; });

        // 全局遮罩点击即关（Backdrop Scrim Click-to-Dismiss · 对齐雷切全弹窗人体工程学）
        const onRaikiriScrimClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && target.classList?.contains("b3-dialog__scrim")) {
                const dialogEl = target.closest(".b3-dialog");
                if (dialogEl && (dialogEl.classList.contains("sw-dialog-host") || dialogEl.querySelector('[class^="sw-"], [class*=" sw-"], [id^="sw-"]'))) {
                    const closeBtn = dialogEl.querySelector<HTMLElement>(".b3-dialog__close, [data-action='close'], .sw-dialog__close");
                    if (closeBtn) {
                        if (typeof closeBtn.click === "function") closeBtn.click();
                        else closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
                    } else {
                        for (const d of this.activeDialogs) {
                            if (d && (d as any).element === dialogEl) {
                                (d as any).destroy?.();
                                break;
                            }
                        }
                    }
                }
            }
        };
        window.addEventListener("click", onRaikiriScrimClick, true);
        this.scrimClickCleaner = () => window.removeEventListener("click", onRaikiriScrimClick, true);
        this.disposer.registerFn(() => { this.scrimClickCleaner?.(); this.scrimClickCleaner = undefined; });

        // 双球共存专项：监听弹射坞罗盘悬浮球位移事件 lv:launchpad:ball-moved（由 lvLaunchpad 派发 detail={edge, yRatio}）
        const onLaunchpadBallMoved = (event: Event) => {
            const detail = (event as CustomEvent)?.detail;
            if (!detail) return;
            const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 800;
            const viewportWidth = window.innerWidth || document.documentElement?.clientWidth || 360;

            this.floatingBallUis.forEach((controller, surface) => {
                const currentPos = controller.getPosition();
                const currentPixelY = (currentPos.yRatio ?? 0.72) * viewportHeight;

                let dist = Infinity;
                if (typeof detail.yRatio === "number" && Number.isFinite(detail.yRatio)) {
                    const otherPixelY = detail.yRatio * viewportHeight;
                    const sameEdge = !detail.edge || detail.edge === currentPos.edge;
                    if (sameEdge) {
                        dist = Math.abs(currentPixelY - otherPixelY);
                    } else {
                        // 在左右异侧时，横向跨屏幕距离必定远超 60px
                        dist = Math.hypot(viewportWidth - 60, currentPixelY - otherPixelY);
                    }
                } else if (Number.isFinite(detail.y ?? detail.clientY ?? detail.top)) {
                    const targetX = Number(detail.x ?? detail.clientX ?? detail.left ?? (currentPos.edge === "right" ? viewportWidth - 30 : 30));
                    const targetY = Number(detail.y ?? detail.clientY ?? detail.top);
                    const el = controller.getElement();
                    const rect = el?.getBoundingClientRect();
                    const myCenterX = rect ? rect.left + rect.width / 2 : (currentPos.edge === "right" ? viewportWidth - 30 : 30);
                    const myCenterY = rect ? rect.top + rect.height / 2 : currentPixelY;
                    dist = Math.hypot(myCenterX - targetX, myCenterY - targetY);
                }

                // 两球位置重叠（距离 < 60px）时自动上下错开 80px，保证避让后中心间距 ≥ 80px
                if (dist < 60) {
                    const shiftY = (currentPixelY + 80 <= viewportHeight - 60) ? 80 : -80;
                    const nextPixelY = Math.max(40, Math.min(viewportHeight - 60, currentPixelY + shiftY));
                    const nextYRatio = Math.max(0.05, Math.min(0.95, nextPixelY / viewportHeight));

                    const nextPos: FloatingBallPosition = {
                        ...currentPos,
                        yRatio: Math.round(nextYRatio * 1000) / 1000,
                    };
                    controller.update({position: nextPos});
                    this.persistFloatingBallPosition(surface, nextPos);
                }
            });
        };
        if (typeof window !== "undefined") {
            window.addEventListener("lv:launchpad:ball-moved", onLaunchpadBallMoved);
            this.launchpadBallMovedCleaner = () => {
                window.removeEventListener("lv:launchpad:ball-moved", onLaunchpadBallMoved);
            };
            this.disposer.registerFn(() => { this.launchpadBallMovedCleaner?.(); this.launchpadBallMovedCleaner = undefined; });
        }

        // T-7026（ADR 0099）D3：第二面板顶栏入口已收敛——顶栏只保留切换器这一个统一
        // 平台入口；工作台经 SurfaceNav/快捷动作/命令/统一入口菜单四条路径进入。

        // 注册侧边栏 dock 面板（桌面）与手机端入口（顶栏 + FAB），互斥
        this.mobileEntryCleaner = lvLaunchpad.ensureUnifiedEntry(this);
        this.disposer.registerFn(() => { this.mobileEntryCleaner?.(); this.mobileEntryCleaner = undefined; });
        lvLaunchpad.registerHostApi({ openTab: (options: any) => this.bridge.openTab(options), app: this.app });
        if (!this.isMobile) {
            this.registerDesktopDock();
        }
        if (this.isMobile) {
            this.registerMobileEntries();
        } else {
            // ADR 0072 / Track A: 悬浮球挂载推迟至 onLayoutReady 之后按需启用
        }

        this.captureRecentOpenSnapshot();
        // T-6796：设置加载完成后应用已保存的皮肤（body 标记）
        this.applySkin();
        // T-6823：密度档位（body 标记）随 onload 一并应用
        this.applyDensity();
        this.bindGlobalEvents();
        // 命令注册经 safeRegisterPluginCommand 隔离：内核 addCommand 抛错（如
        // globalCallback 触发的 sendGlobalShortcut 读 window.siyuan.languages["_trayMenu"]
        // 而 languages 未就绪，issue #1）不得中断 onload——否则后面整个
        // registerAgentCapabilities 与受控动作注册都会被跳过。
        const onCmdFail = (langKey: string, error: unknown) => logger.warn(`register plugin command ${langKey} fail`, error);
        safeRegisterPluginCommand(this, {
            langKey: "switchTabs",
            hotkey: DEFAULT_HOTKEY,
            callback: () => {
                this.showSwitcher();
            },
        }, onCmdFail);

        // 吸收小驴快门思源内部命令面板：Ctrl+Alt+Shift+P (⌥⇧⌘P) 呼出雷切画板直接搜索并执行全量命令（避开小驴考试 ⌥⌘P）
        safeRegisterPluginCommand(this, {
            langKey: "commandPalette",
            hotkey: "⌥⇧⌘P",
            callback: () => {
                this.showSwitcher(true, "switcher", { entry: "command" });
            },
        }, onCmdFail);
        safeRegisterPluginCommand(this, {langKey: "configureExternalBridge", langText: this.i18n.configureExternalBridge, callback: (): void => { void this.configureExternalCommands(); }}, onCmdFail);
        // globalCallback: 焦点不在思源时也执行。思源为这类命令提供系统级
        // 全局热键位（设置→快捷键 里绑定"全局"），触发时会同时把思源带到前台。
        // languages 未就绪的宿主时序下降级为仅应用内热键（见上方 issue #1 注释）。
        const secondPanelCommand: {langKey: string; hotkey: string; callback: () => void; globalCallback?: () => void} = {
            langKey: "secondPanel",
            hotkey: SECOND_PANEL_HOTKEY,
            callback: () => {
                this.openPlatformSurface("workbench", "switcher", {entry: "command"});
            },
        };
        if (isGlobalShortcutHostReady((window as {siyuan?: {languages?: unknown}}).siyuan)) {
            secondPanelCommand.globalCallback = () => {
                this.openPlatformSurface("workbench", "switcher", {entry: "command"});
            };
        }
        safeRegisterPluginCommand(this, secondPanelCommand, onCmdFail);
        // T-6327：思源 v3.8.3 起自带命令面板，多注册命令零 UI 成本地提升可发现性。
        safeRegisterPluginCommand(this, {
            langKey: "openSettings",
            hotkey: "",
            callback: () => {
                void this.openSetting();
            },
        }, onCmdFail);
        safeRegisterPluginCommand(this, {
            langKey: "openJournal",
            hotkey: "",
            callback: () => {
                void this.openJournal();
            },
        }, onCmdFail);
        safeRegisterPluginCommand(this, {
            langKey: "snippetStudioOpen",
            hotkey: "",
            callback: () => {
                this.openPlatformSurface("studio", "switcher", {entry: "plugin-command"});
            },
        }, onCmdFail);
        safeRegisterPluginCommand(this, {
            langKey: "clipboardEntry",
            hotkey: "",
            callback: () => {
                void this.openClipboardEntry();
            },
        }, onCmdFail);
        safeRegisterPluginCommand(this, {
            langKey: "setSessionMark",
            hotkey: "",
            callback: () => {
                this.setSessionMark();
            },
        }, onCmdFail);
        safeRegisterPluginCommand(this, {
            langKey: "jumpToSessionMark",
            hotkey: "",
            callback: () => {
                void this.jumpToSessionMark();
            },
        }, onCmdFail);
        this.registerAgentCapabilities();
        // 受控导航动作：Agent 可把查询结果直接打开为页面（不修改任何笔记数据）
        const pluginWithAgentAction = this as unknown as {
            addAgentCapability?: (options: Record<string, unknown>) => string;
        };
        registerAgentActionCapability(pluginWithAgentAction, {
            spec: AGENT_CAPABILITY_SPECS.openDocument,
            // ADR 0063：效果显式声明 localRead（免确认）——确认链由宿主 Agent 确认卡承担
            effects: {localRead: true, localWrite: false, dataEgress: false, externalCost: false},
            handler: async (args: Record<string, unknown>) => {
                const id = normalizeAgentDocumentId(args?.id);
                if (!id) return {error: "invalid document id"};
                try {
                    if (this.isMobile) {
                        await this.mobileOpenDoc(id);
                    } else {
                        await this.bridge.openTab({app: this.app, doc: {id}});
                    }
                    return this.agentContentResult({ok: true, id});
                } catch (error) {
                    logger.warn("Agent open document fail", error);
                    return {error: "open failed"};
                }
            },
        }, this.onAgentCapFail);

        // 受控导航（批量）：AI 一次打开最多 5 篇文档组成工作区。ADR 0063：批量动作
        // 声明 localWrite → 确认（含标题列表、超时=拒绝）由宿主 Agent 确认卡承担
        // T-6692b 灰度开关：受控写入/批量动作受 agentActionsEnabled 总开关约束（默认开）；
        // 关闭后仅保留只读能力与单文档导航（open-document），执行链一并停用
        const agentActionsOn = this.getSettings().agentActionsEnabled !== false;
        if (agentActionsOn) {
        registerAgentActionCapability(pluginWithAgentAction, {
            spec: AGENT_CAPABILITY_SPECS.openDocuments,
            effects: {localRead: true, localWrite: true, dataEgress: false, externalCost: false},
            handler: async (args: Record<string, unknown>) => {
                const ids = normalizeAgentDocumentIds(args?.ids);
                if (ids.length === 0) return {error: "no valid document ids"};
                const opened: string[] = [];
                const failed: string[] = [];
                for (const id of ids) {
                    try {
                        if (this.isMobile) {
                            await this.mobileOpenDoc(id);
                        } else {
                            await this.bridge.openTab({app: this.app, doc: {id}});
                        }
                        opened.push(id);
                    } catch (error) {
                        logger.warn("Agent batch open document fail", id, error);
                        failed.push(id);
                    }
                }
                return this.agentContentResult({ok: failed.length === 0, opened, failed});
            },
        }, this.onAgentCapFail);

        // 受控写试点：AI 切换任务勾选状态。确认（含任务摘要、超时=拒绝）由宿主
        // Agent 确认卡按 localWrite 声明承担，只改勾选标记不改写任务文本
        registerAgentActionCapability(pluginWithAgentAction, {
            spec: AGENT_CAPABILITY_SPECS.updateTask,
            effects: {localRead: true, localWrite: true, dataEgress: false, externalCost: false},
            handler: async (args: Record<string, unknown>) => {
                const id = normalizeAgentDocumentId(args?.id);
                const done = args?.done === true;
                if (!id) return {error: "invalid task id"};
                const rowJson = await this.fetchKernelJson("/api/query/sql", {
                    stmt: `SELECT markdown, content FROM blocks WHERE id='${id.replace(/'/g, "''")}' AND type IN ('i', 'p')`,
                });
                const row = (rowJson?.data || [])[0] as {markdown?: string; content?: string} | undefined;
                if (!row) return {error: "task not found"};
                const newMarkdown = flipTaskMarkdown(String(row.markdown || ""), done);
                if (!newMarkdown) return {error: "not a task block"};
                const updateJson = await this.fetchKernelJson("/api/block/updateBlock", {
                    dataType: "markdown", data: this.clampTaskWritePayload(newMarkdown), id,
                });
                if (!updateJson || updateJson.code !== 0) return {error: "update failed"};
                return this.agentContentResult({ok: true, id, done});
            },
        }, this.onAgentCapFail);

        // 受控写：AI 在指定笔记本下新建文档（确认由宿主确认卡按 localWrite 声明承担；
        // 参数 notebook 支持 ID 或名称）
        registerAgentActionCapability(pluginWithAgentAction, {
            spec: AGENT_CAPABILITY_SPECS.createDocument,
            effects: {localRead: true, localWrite: true, dataEgress: false, externalCost: false},
            handler: async (args: Record<string, unknown>) => {
                const rawNotebook = String(args?.notebook || "").trim();
                const title = String(args?.title || "").trim().slice(0, 128);
                const markdown = String(args?.markdown || "").slice(0, 4096);
                if (!rawNotebook || !title) return {error: "notebook and title are required"};
                const notebooks = await this.loadNotebooks();
                const target = normalizeAgentNotebookId(rawNotebook)
                    ? notebooks.find((nb) => nb.id === rawNotebook)
                    : notebooks.find((nb) => nb.name === rawNotebook);
                if (!target) return {error: "unknown notebook"};
                const createJson = await this.fetchKernelJson("/api/filetree/createDocWithMd", {
                    notebook: target.id, path: title, markdown,
                });
                if (!createJson || createJson.code !== 0) {
                    logger.warn("Agent create document fail", createJson?.msg);
                    return {error: "create failed"};
                }
                // 优先取 createDocWithMd 同步返回的文档 ID（防 SQLite 异步索引延迟期间查回空串），缺失时按标题回退 SQL
                const directDocId = typeof createJson?.data === "string" ? createJson.data.trim() : "";
                let docId = directDocId;
                if (!docId) {
                    const locate = await this.fetchKernelJson("/api/query/sql", {
                        stmt: `SELECT id FROM blocks WHERE type='d' AND box='${target.id.replace(/'/g, "''")}' AND content='${title.split("'").join("''")}' ORDER BY created DESC LIMIT 1`,
                    });
                    docId = (locate?.data || [])[0]?.id || "";
                }
                return this.agentContentResult({ok: true, notebook: target.id, title, docId});
            },
        }, this.onAgentCapFail);

        // 受控写：向今日日记末尾追加一条内容（日记缺失自动创建；确认由宿主确认卡
        // 按 localWrite 声明承担；只追加不改写）
        registerAgentActionCapability(pluginWithAgentAction, {
            spec: AGENT_CAPABILITY_SPECS.appendToJournal,
            effects: {localRead: true, localWrite: true, dataEgress: false, externalCost: false},
            handler: async (args: Record<string, unknown>) => {
                const content = sanitizeJournalAppend(args?.content);
                if (!content) return {error: "invalid content"};
                const notebook = normalizeAgentNotebookId(this.getSettings().journalNotebook);
                if (!notebook) return {error: "journal notebook not configured"};
                const docId = await this.ensureTodayJournal(notebook);
                if (!docId) return {error: "journal unavailable"};
                const zone = await ensureXiaolvDiaryZone(docId);
                const lifeLogAttrs = buildXiaolvLifeLogAttrs({
                    type: "代理日记",
                    source: "雷切",
                    module: "agent-journal",
                    body: content,
                });
                const appendJson = await this.fetchKernelJson("/api/block/insertBlock", {
                    previousID: zone.anchorBlockId,
                    parentID: docId,
                    dataType: "markdown",
                    data: attachXiaolvLifeLogIal(content, lifeLogAttrs),
                });
                if (!appendJson || appendJson.code !== 0) return {error: "append failed"};
                return this.agentContentResult({ok: true, docId});
            },
        }, this.onAgentCapFail);        }
        const setupDeferredCapabilities = () => {
            if (this.isUnloading) return;
            this.registerWorkspacePlanCapabilities(pluginWithAgentAction);
            this.registerBuiltinHomeAdapters();
        };
        if (typeof queueMicrotask === "function") {
            queueMicrotask(() => setupDeferredCapabilities());
        } else {
            setupDeferredCapabilities();
        }
        if (typeof performance !== "undefined" && typeof performance.mark === "function") {
            try {
                performance.mark("siyuan-speed-switch-onload-end");
                if (typeof performance.measure === "function") {
                    performance.measure("siyuan-speed-switch-onload", "siyuan-speed-switch-onload-start", "siyuan-speed-switch-onload-end");
                }
            } catch { /* ignore */ }
        }
    }

    async cleanupRuntimeOnUnload() {
        this.externalPolicyDialog?.destroy();
        this.externalPolicyDialog = undefined;
        this.snippetStackDialog?.destroy();
        this.snippetStackDialog = null;
        this.lastEditorSelection = null;
        // T-6831：面包屑入口随生命周期拆除
        this.teardownBreadcrumbEntry();
        // T-6823：密度档位标记随生命周期移除
        if (typeof document !== "undefined" && document.body) {
            delete document.body.dataset.swDensity;
        }
        // T-6796 皮肤层：卸载时移除 body 标记，宿主恢复纯净主题
        if (typeof document !== "undefined" && document.body) {
            delete document.body.dataset.swSkin;
        }
        this.syncDepth = 0;
        this.syncRefreshPending = false;
        this.syncing = false;
        this.clearSyncWatchdog();
        this.docSearchState.activeSessions.forEach((session) => disposeSearchSession(session));
        this.docSearchState.activeSessions.clear();
        this.activeAgentSearchControllers.forEach((controller) => controller.abort());
        this.activeAgentSearchControllers.clear();
        this.activeDocumentSetRestoreControllers.forEach((controller) => controller.abort());
        this.activeDocumentSetRestoreControllers.clear();
        this.thumbApiControllers.forEach((controller) => {
            try { controller.abort(); } catch (_) {}
        });
        this.thumbApiControllers.clear();
        // v0.17 阶段 1（D-220）：销毁 workspace 诊断运行时（registry/queue/coordinator）
        this.workspaceRuntimeDiagnostics?.dispose();
        this.workspaceRuntimeDiagnostics = null;
        // v0.17：卸载前写入脱敏 disposed 快照，再销毁历史容器；不向 Agent/UI 透传明细。
        this.agentReadOnlyAuditHistory.record(buildAgentReadOnlyAuditSnapshot({
            status: "unavailable",
            reason: "unavailable",
            disposed: true,
        }));
        this.agentReadOnlyAuditHistory.dispose();
        this.switcherRefreshers.clear();
        this.actions.clear();
        if (this.sidebarRefreshTimer) {
            window.clearTimeout(this.sidebarRefreshTimer);
            this.sidebarRefreshTimer = 0;
        }
        this.groupFlowObserver?.disconnect();
        this.groupFlowObserver = null;
        this.workbench.dispose();
        clearLifeWidgetCaches();
        this.homeModuleChangeListeners.clear();
        this.closeHistoryMenu();
        this.sidebarHistoryDropdownDispose?.();
        this.sidebarHistoryDropdownDispose = null;
        this.sidebarSearchFilterDispose?.();
        this.sidebarSearchFilterDispose = null;
        this.historyDropdownCloseSet.forEach((close) => close());
        this.historyDropdownCloseSet.clear();
        this.activeIconPickerCleanup?.();
        this.activeIconPickerCleanup = null;
        document.querySelectorAll<HTMLElement>(".sw__mobile-sort-overlay, .sw__mobile-sheet-overlay, .sw-quick-icon-picker-overlay").forEach((overlay) => overlay.remove());
        if (typeof document !== "undefined" && document.body) {
            Array.from(document.body.children).forEach((element) => {
                if (element instanceof HTMLElement) {
                    if (element.hasAttribute("inert") && element.getAttribute("aria-hidden") === "true") {
                        element.removeAttribute("inert");
                        element.removeAttribute("aria-hidden");
                    }
                }
            });
        }
        if (this.switcherRefreshFrame !== null) {
            this.switcherRefreshFrameCancel?.();
            this.switcherRefreshFrame = null;
            this.switcherRefreshFrameCancel = null;
        }
        if (this.recentClosedSyncTimer !== null) {
            window.clearTimeout(this.recentClosedSyncTimer);
            this.recentClosedSyncTimer = null;
        }
        this.sidebarResizeObserver?.disconnect();
        this.sidebarResizeObserver = null;
        this.sidebarIconObserver?.disconnect();
        this.sidebarIconObserver = null;
        this.sidebarIconFrameCancel?.();
        this.sidebarIconFrameCancel = null;
        this.removeDock(SIDEBAR_DOCK_TYPE);
        this.sidebarElement = null;
        this.floatingBallPanels.forEach((panel) => panel?.destroy());
        this.floatingBallPanels.clear();
        this.floatingBallUis.forEach((controller) => controller.destroy());
        this.floatingBallUis.clear();
        this.floatingBallUi = null;
        this.fabElement = null;
        this.fabModalDepth = 0;
        if (typeof this.removeTopBar === "function") {
            try {
                this.removeTopBar("siyuan-speed-switch-topbar");
            } catch (error) {
                logger.warn("remove topbar entry fail", error);
            }
        }
    }

    async uninstall() {
        if (!this.isUnloading) await this.onunload();
        logger.info("siyuan-speed-switch uninstalled cleanly");
    }

    /**
     * T-6833 公开钩子：E2E 真实例测试与生态消费的稳定入口
     * （契约对齐小驴打卡 window.siyuanCheckin：whenReady 为就绪信号）。
     * 钩子在 onLayoutReady 后挂载——它的存在本身即代表初始化完成；
     * onunload 移除，不留悬挂引用。只暴露受控动作，不泄漏内部状态。
     * [Epoch 6] 挂载标准化生态服务桥（协议 v1），包含多端工作台呼叫与导航上下文。
     */
    private exposePublicApi() {
        const legacyTarget = {
            whenReady: () => true,
            openSwitcher: () => {
                if (!this.isMobile && !this.isUnloading) {
                    this.showSwitcher(true);
                }
            },
        };
        (window as any).siyuanSpeedSwitch = legacyTarget;

        this.disposeRaikiriBridge = mountRaikiriBridge({
            openSwitcher: (focusSearch = true) => {
                if (!this.isUnloading) {
                    this.showSwitcher(focusSearch);
                }
            },
            openWorkbench: (context) => {
                if (!this.isUnloading) {
                    this.openPlatformSurface("workbench", "switcher", {
                        entry: context?.entry || "external-bridge",
                    });
                }
            },
            openStudio: (context) => {
                if (!this.isUnloading && this.getAvailablePlatformSurfaces().includes("studio")) {
                    this.openPlatformSurface("studio", "switcher", {
                        entry: context?.entry || "external-bridge",
                        objectId: context?.objectId,
                        query: context?.query,
                    });
                }
            },
            getNavigationContext: () => {
                const active = this.bridge.getActiveTab();
                const opened = this.currentTabs();
                return {
                    device: this.isMobile ? "mobile" : "desktop",
                    activeDocument: active ? { id: this.rootIdOf(active) || "", title: this.titleOf(active) } : undefined,
                    openTabs: opened.map((tab) => ({
                        id: this.rootIdOf(tab) || tab.id,
                        rootId: this.rootIdOf(tab) || undefined,
                        title: this.titleOf(tab),
                        path: String((tab as unknown as {path?: string; hPath?: string}).path || (tab as unknown as {hPath?: string}).hPath || ""),
                        notebookId: resolveSearchNotebookId(tab as unknown),
                        source: "tabs",
                    })),
                    closedTabs: this.getClosedHistory().map((entry) => ({
                        id: entry.rootId,
                        rootId: entry.rootId,
                        title: entry.title,
                        ts: entry.closedAt,
                    })),
                    documentSets: this.getDocumentSets().map((set: any) => ({
                        name: String(set?.name || ""),
                        count: Array.isArray(set?.entries) ? set.entries.length : 0,
                    })),
                    availableSurfaces: this.getAvailablePlatformSurfaces(),
                    syncing: this.syncing,
                };
            },
            getWorkspaceStats: () => {
                const opened = this.currentTabs();
                return {
                    openTabCount: opened.length,
                    closedTabCount: this.getClosedHistory().length,
                    documentSetCount: this.getDocumentSets().length,
                    availableSurfaces: this.getAvailablePlatformSurfaces(),
                    isMobile: this.isMobile,
                };
            },
            searchDocuments: async (args) => {
                return await this.searchAgentDocuments(args as unknown as Record<string, unknown>);
            },
            registerHomeModule: (options) => this.registerHomeModule(options),
            openCommandPalette: (focusSearch = true) => {
                if (!this.isUnloading) {
                    this.showSwitcher(focusSearch, "switcher", { entry: "command" });
                }
            },
            getEditorContext: () => {
                try {
                    const sel = window.getSelection();
                    const el = sel && sel.rangeCount > 0 ? (sel.getRangeAt(0).commonAncestorContainer as Node) : null;
                    const hostEl = el instanceof HTMLElement ? el : el?.parentElement;
                    const block = hostEl?.closest?.("[data-node-id]");
                    const doc = hostEl?.closest?.("[data-doc-id]");
                    return {
                        ok: true,
                        data: {
                            blockId: block?.getAttribute("data-node-id") || "",
                            docId: doc?.getAttribute("data-doc-id") || "",
                            selectedText: sel ? sel.toString().trim() : "",
                        },
                    };
                } catch (e) {
                    return { ok: false, message: String(e) };
                }
            },
            runCommand: async (plugin: string, command: string) => runPluginCommand((this.app as any)?.plugins, plugin, command),
        }, legacyTarget);
        this.disposer.registerFn(() => { this.disposeRaikiriBridge?.(); this.disposeRaikiriBridge = null; });
    }

    // 桌面侧边栏 dock：与切换器同样的卡片列表，常驻便于快速切换；
    // resize 只重算缩略图缩放比例，不重建列表（避免闪烁与滚动位置丢失）
    private registerDesktopDock() {
        const self = this;
        this.addDock({
            config: {
                position: "RightBottom",
                size: {width: SIDEBAR_DEFAULT_WIDTH_PX, height: 0},
                icon: "iconLayout",
                title: this.i18n.switchTabs,
                show: false,
            },
            data: {},
            type: SIDEBAR_DOCK_TYPE,
            init() {
                const handler = this as unknown as IDockHandlerSelf;
                self.renderSidebarPanel(handler.element as HTMLElement);
            },
            resize() {
                const handler = this as unknown as IDockHandlerSelf;
                const element = handler.element;
                if (element?.isConnected) {
                    self.rescaleThumbs(element);
                }
            },
        });
    }

    // 手机端入口：动作悬浮球（手机主入口，与罗盘悬浮球并存、职责分工）
    private registerMobileEntries() {
        this.updateFABVisibility();
    }

    // 全局事件：切换 / 打开 / 关闭页签时同步侧边栏高亮或全量刷新
    private bindGlobalEvents() {
        if (this.globalEventHandlers) return;
        const switchProtyle = () => {
            this.refreshSidebarActive();
            this.scheduleOpenSwitchersRefresh();
        };
        // 页签增减（文档打开/关闭）时全量刷新侧边栏列表
        const loadedProtyle = () => {
            this.captureRecentOpenSnapshot();
            if (this.syncing) return;
            // 侧栏全量重建合并调度：批量开关文档时不再逐事件重建
            this.scheduleSidebarRefresh();
            this.scheduleOpenSwitchersRefresh();
        };
        const destroyProtyle = () => {
            this.scheduleRecentClosedSync();
            if (this.syncing) return;
            this.scheduleSidebarRefresh();
            this.scheduleOpenSwitchersRefresh();
        };
        const syncStart = () => {
            this.syncDepth += 1;
            this.syncRefreshPending = true;
            this.armSyncWatchdog();
            this.setSyncPresentation(true);
        };
        const syncFinish = (failed = false) => {
            if (failed) {
                this.syncDepth = 0;
            } else if (this.syncDepth > 0) {
                this.syncDepth -= 1;
            }
            if (this.syncDepth > 0) return;
            this.clearSyncWatchdog();
            this.syncRefreshPending = false;
            this.setSyncPresentation(false);
            this.scheduleSidebarRefresh();
        };
        const syncEnd = () => syncFinish(false);
        const syncFail = () => syncFinish(true);
        const openSiyuanUrlPlugin = (event: CustomEvent<{url: string}>) => {
            const rawUrl = event?.detail?.url;
            if (!rawUrl || typeof rawUrl !== "string") return;
            try {
                const parsed = new URL(rawUrl);
                const surface = parsed.searchParams.get("surface") || parsed.searchParams.get("s");
                const query = parsed.searchParams.get("query") || parsed.searchParams.get("q") || "";
                if (surface === "workbench") {
                    this.openPlatformSurface("workbench", "switcher", {entry: "url-scheme", ...(query ? {query} : {})});
                } else if (surface === "studio") {
                    this.openPlatformSurface("studio", "switcher", {entry: "url-scheme", ...(query ? {query} : {})});
                } else {
                    this.showSwitcher(Boolean(query), "switcher", {entry: "url-scheme", ...(query ? {query} : {})});
                }
            } catch (error) {
                logger.warn("handle open-siyuan-url-plugin fail", error);
            }
        };
        this.globalEventHandlers = {switchProtyle, loadedProtyle, destroyProtyle, syncStart, syncEnd, syncFail, openSiyuanUrlPlugin};
        this.eventBus.on("switch-protyle", switchProtyle);
        this.eventBus.on("loaded-protyle-static", loadedProtyle);
        this.eventBus.on("destroy-protyle", destroyProtyle);
        this.eventBus.on("sync-start", syncStart);
        this.eventBus.on("sync-end", syncEnd);
        this.eventBus.on("sync-fail", syncFail);
        this.eventBus.on("open-siyuan-url-plugin", openSiyuanUrlPlugin as any);
        this.disposer.registerFn(() => {
            if (this.globalEventHandlers && typeof this.eventBus.off === "function") {
                this.eventBus.off("switch-protyle", this.globalEventHandlers.switchProtyle);
                this.eventBus.off("loaded-protyle-static", this.globalEventHandlers.loadedProtyle);
                this.eventBus.off("destroy-protyle", this.globalEventHandlers.destroyProtyle);
                this.eventBus.off("sync-start", this.globalEventHandlers.syncStart);
                this.eventBus.off("sync-end", this.globalEventHandlers.syncEnd);
                this.eventBus.off("sync-fail", this.globalEventHandlers.syncFail);
                if (this.globalEventHandlers.openSiyuanUrlPlugin) {
                    this.eventBus.off("open-siyuan-url-plugin", this.globalEventHandlers.openSiyuanUrlPlugin as any);
                }
                this.globalEventHandlers = null;
            }
        });
        this.bindEcosystemEventSubscriptions();
        // Track A: 全局 selectionchange 选区监听推迟至 onLayoutReady 之后按需启用
        this.noticeHubCleaner = lvNotify.registerPlugin("siyuan-speed-switch");
        this.backupCleaner = lvBackup.register(
            "siyuan-speed-switch",
            async () => this.dumpData(),
            async (data) => this.restoreData(data)
        );
        this.vaultCleaner = lvSnapshotVault.register(this.createSnapshotVaultAdapter());
        this.disposer.registerFn(() => {
            this.noticeHubCleaner?.();
            this.noticeHubCleaner = undefined;
            this.backupCleaner?.();
            this.backupCleaner = undefined;
            this.vaultCleaner?.();
            this.vaultCleaner = undefined;
            const vaultPluginId = "siyuan-speed-switch";
            lvSnapshotVault.unregister(vaultPluginId);
        });
    }

    private bindEcosystemEventSubscriptions() {
        if (typeof window === "undefined") return;
        this.unbindEcosystemEventSubscriptions();
        const child = this.disposer.createChild() as DisposerRegistry;
        this.ecosystemDisposer = child;
        const triggerHomeRefresh = () => {
            if (this.isUnloading) return;
            this.homeModuleChangeListeners.forEach((listener) => {
                try {
                    listener();
                } catch (error) {
                    logger.warn("homeModuleChangeListener error", error);
                }
            });
        };
        // 聚合小驴打卡、闪卡、考试、人脉、管家、拾遗、常用、思阅与思播生命周期事件
        const eventNames = [
            "checkin:event-recorded", "checkin:event-deleted",
            "lv-cards:reviewed", "lv-cards:incremental-extract",
            "lv-exam:session-ended", "lv-exam:wrongbook-changed",
            "lv-home:data-changed",
            "lv-contacts:data-changed",
            "lv-glean:data-changed", "lv-glean:clip-status-changed",
            "xiaolv:common:item-created", "xiaolv:common:item-updated", "xiaolv:common:item-deleted",
            "horizon:action-created",
            "reader:open", "reader:close", "reader:focus", "reader:blur",
            "mediaChanged", "playerDestroy",
        ];
        eventNames.forEach((name) => {
            this.ecosystemUnsubscribers.push(child.trackListener(window, name, () => {
                if (this.workbenchDialog?.element?.isConnected) {
                    this.scheduleAnimationFrame(() => {
                        (this as { _activeEcosystemEvent?: string })._activeEcosystemEvent = name;
                        try { triggerHomeRefresh(); } finally { (this as { _activeEcosystemEvent?: string })._activeEcosystemEvent = undefined; }
                    });
                }
            }));
        });

        // 跨日休眠补跑机制：设备息屏/待机唤醒或焦点回归时检测自然日切换，主动对齐组件与沉淀流
        let lastDateKey = new Date().toDateString();
        const onWakeCheck = () => {
            if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
            const nowKey = new Date().toDateString();
            if (nowKey !== lastDateKey) {
                lastDateKey = nowKey;
                triggerHomeRefresh();
                this.captureRecentOpenSnapshot();
            }
        };
        const unsubFocus = child.trackListener(window, "focus", onWakeCheck);
        const unsubVis = child.trackListener(document, "visibilitychange", onWakeCheck);
        this.ecosystemUnsubscribers.push(unsubFocus, unsubVis);
    }

    private unbindEcosystemEventSubscriptions() {
        if (this.ecosystemDisposer) {
            this.ecosystemDisposer.dispose();
            this.ecosystemDisposer = null;
        }
        this.ecosystemUnsubscribers.forEach((unsub) => unsub());
        this.ecosystemUnsubscribers = [];
    }

    private setSyncPresentation(syncing: boolean) {
        this.syncing = syncing;
        const roots: HTMLElement[] = [];
        if (this.sidebarElement) roots.push(this.sidebarElement);
        document.querySelectorAll<HTMLElement>(".sw-home").forEach((root) => roots.push(root));
        roots.forEach((root) => {
            root.classList.toggle("sw--syncing", syncing);
            root.setAttribute("aria-busy", String(syncing));
            root.dataset.syncing = String(syncing);
        });
    }

    private clearSyncWatchdog() {
        if (this.syncWatchdogTimer !== null) {
            window.clearTimeout(this.syncWatchdogTimer);
            this.syncWatchdogTimer = null;
        }
    }

    private armSyncWatchdog() {
        this.clearSyncWatchdog();
        this.syncWatchdogTimer = window.setTimeout(() => {
            this.syncWatchdogTimer = null;
            if (!this.syncing) return;
            this.syncDepth = 0;
            this.syncRefreshPending = false;
            this.setSyncPresentation(false);
            this.scheduleSidebarRefresh();
        }, SYNC_WATCHDOG_MS);
    }

    private setupBreadcrumbEntry() {
        const host = this as unknown as {
            addBreadcrumbButton?: (options: {id: string; icon: string; title: string; callback: (event: MouseEvent, protyle?: any) => void}) => string;
        };
        if (typeof host.addBreadcrumbButton !== "function") return;
        try {
            this.breadcrumbButtonId = host.addBreadcrumbButton({
                id: "swBreadcrumbEntry",
                icon: "iconSearch",
                title: this.i18n.breadcrumbEntry,
                callback: (_event, protyle) => {
                    if (!this.isMobile && !this.isUnloading) this.showSwitcher(true);
                },
            }) || "";
        } catch (error) {
            logger.warn("breadcrumb entry unavailable", error);
            this.breadcrumbButtonId = "";
        }
    }

    private teardownBreadcrumbEntry() {
        if (!this.breadcrumbButtonId) return;
        const host = this as unknown as {removeBreadcrumbButton?: (id: string) => void};
        if (typeof host.removeBreadcrumbButton === "function") {
            try {
                host.removeBreadcrumbButton(this.breadcrumbButtonId);
            } catch (error) {
                logger.warn("breadcrumb entry teardown fail", error);
            }
        }
        this.breadcrumbButtonId = "";
    }

    private registerSwitcherRefresh(callback: () => void): () => void {
        this.switcherRefreshers.add(callback);
        return () => this.switcherRefreshers.delete(callback);
    }

    private refreshOpenSwitchers() {
        Array.from(this.switcherRefreshers).forEach((refresh) => {
            try {
                refresh();
            } catch (e) {
                logger.warn("refresh switcher fail", e);
            }
        });
    }

    private scheduleOpenSwitchersRefresh() {
        if (this.switcherRefreshFrame !== null || this.switcherRefreshers.size === 0) return;
        const refresh = () => {
            this.switcherRefreshFrame = null;
            this.switcherRefreshFrameCancel = null;
            this.refreshOpenSwitchers();
        };
        if (typeof requestAnimationFrame === "function") {
            const frame = requestAnimationFrame(refresh);
            this.switcherRefreshFrame = frame;
            this.switcherRefreshFrameCancel = () => cancelAnimationFrame(frame);
        } else {
            const timer = window.setTimeout(refresh, 16);
            this.switcherRefreshFrame = timer;
            this.switcherRefreshFrameCancel = () => window.clearTimeout(timer);
        }
    }

    private scheduleAnimationFrame(callback: FrameRequestCallback): number {
        if (typeof requestAnimationFrame === "function") return requestAnimationFrame(callback);
        return window.setTimeout(() => callback(Date.now()), 16);
    }

    private async configureExternalCommands() {
        if (this.isUnloading) return;
        this.externalPolicyDialog?.destroy();
        const dialog = new Dialog({title: "外部桌面命令桥 / External desktop commands", content: `<div style="padding:16px;display:grid;gap:12px"><p>仅接收通过本机思源内核鉴权的有限命令。默认关闭；写入需单独开启。超时请使用原请求 ID 对账。</p><label><input type="checkbox" data-external-enabled> 启用外部命令桥</label><label><input type="checkbox" data-external-navigation> 允许打开文档和白名单插件页面</label><label><input type="checkbox" data-external-writes> 允许写入打卡（仅 recordEventsBatch）</label><button type="button" data-external-save>保存 / Save</button></div>`, width: typeof window !== "undefined" && window.innerWidth < 480 ? "92vw" : "480px", destroyCallback: () => {this.activeDialogs.delete(dialog); if (this.externalPolicyDialog === dialog) this.externalPolicyDialog = undefined;}});
        dialog.element.classList.add("sw-dialog-host");
        this.externalPolicyDialog = dialog;
        this.activeDialogs.add(dialog);
        const read = (selector: string) => dialog.element.querySelector<HTMLInputElement>(selector)!;
        read("[data-external-enabled]").checked = this.externalCommandPolicy.enabled;
        read("[data-external-navigation]").checked = this.externalCommandPolicy.allowNavigation;
        read("[data-external-writes]").checked = this.externalCommandPolicy.allowWrites;
        dialog.element.querySelector<HTMLButtonElement>("[data-external-save]")!.onclick = async () => {
            if (this.isUnloading || this.externalPolicyDialog !== dialog) return;
            const next = {enabled: read("[data-external-enabled]").checked, allowNavigation: read("[data-external-navigation]").checked, allowWrites: read("[data-external-writes]").checked};
            try {
                await this.externalJsonIO.write("/data/storage/petal/siyuan-speed-switch/external-bridge-policy.json", next);
                if (this.isUnloading || this.externalPolicyDialog !== dialog) return;
                this.externalCommandPolicy = next;
                this.mountExternalCommands();
                dialog.destroy();
            } catch { showMessage("外部命令桥设置保存失败 / Save failed", 4000, "error"); }
        };
    }

    private mountExternalCommands() {
        this.externalCommandCleanup?.();
        this.externalCommandCleanup = undefined;
        if (this.isUnloading || !this.externalCommandPolicy.enabled) return;
        if (typeof navigator === "undefined" || !navigator.locks) {
            showMessage("外部命令桥未启动：宿主缺少跨窗口锁 / Web Locks unavailable", 5000, "error");
            return;
        }
        const receiver = createExternalCommandReceiver({
            policy: () => this.externalCommandPolicy,
            load: async () => {
                const disk = await this.externalJsonIO.read("/data/storage/petal/siyuan-speed-switch/external-command-journal.json");
                return disk.kind === "missing" ? null : disk.value;
            },
            save: (entries) => this.externalJsonIO.write("/data/storage/petal/siyuan-speed-switch/external-command-journal.json", entries),
            publish: publishExternalReceipt,
            execute: async (op, args) => {
                const api = (window as any).siyuanSpeedSwitch;
                if (op === "commands.list") return this.getPluginCommands().filter((command: any) => {const [plugin, key] = String(command.value || "").split("::"); return isExternalNavigationCommand(plugin, key);});
                if (op === "navigation.context") return api.getNavigationContext();
                if (op === "editor.context") return api.getEditorContext();
                if (op === "commands.run") return runPluginCommand((this.app as any)?.plugins, String(args.plugin), String(args.command));
                if (op === "doc.open") {
                    if (this.isMobile) { if (!await this.mobileOpenDoc(String(args.id))) return {ok: false, message: "open-failed"}; }
                    else await this.bridge.openTab({app: this.app, doc: {id: String(args.id)}});
                    return {ok: true};
                }
                const checkin: any = getBridgeSafely("checkin");
                if (!checkin || typeof checkin.isReady === "function" && !checkin.isReady()) return {ok: false, message: "checkin-unavailable"};
                if (op === "checkin.items") return checkin.queryItems({includeArchived: false, limit: 200});
                if (op === "checkin.summary") return checkin.getDailyProjection();
                if (op === "checkin.record" && this.externalCommandPolicy.allowWrites && typeof checkin.recordEventsBatch === "function") {
                    const results = await checkin.recordEventsBatch([{itemId: String(args.itemId || ""), value: args.value, unit: args.unit, source: "api", externalRef: `raikiri:${args.requestId}`}]);
                    return results[0]?.kind === "recorded" || results[0]?.kind === "duplicate" ? {ok: true, data: results[0]} : {ok: false, message: results[0]?.kind || "record-rejected"};
                }
                return {ok: false, message: "unsupported-operation"};
            },
        });
        this.externalCommandCleanup = mountExternalCommandTransport(receiver, () => this.externalCommandPolicy.enabled && !this.isUnloading);
        this.disposer.registerFn(() => { this.externalCommandCleanup?.(); this.externalCommandCleanup = undefined; });
    }
}
