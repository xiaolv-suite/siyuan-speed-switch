import {Menu, getAllTabs, getActiveTab, openTab} from "siyuan";
import {showDocTreeNativeMenu, toggleNativeDock} from "../libs/lv-notice-kit";
import {logger} from "../logger";
import {extractActionContext, getAvailableActions} from "../search-model";
import {mountActionPalette} from "../action-palette-ui";
import {getBridgeSafely} from "../api/ecosystem-bridge-kit";
import {MESSAGE_DEFAULT_MS} from "../constants";
import {type Tab, type CardMenuHandlers, type IActionPaletteHandle, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface PaletteHostRuntime extends Omit<ISpeedSwitchHost, "openCardActionPalette" | "openCardMenu"> {}
export class PaletteHostRuntime {
    private mountPaletteBackdrop(opts: {
        actions: any[];
        title: string;
        context: any;
        returnFocusElement?: HTMLElement;
        onRestoreFocus: () => void;
        onExecute: (action: {id: string}, ctx: any) => void;
    }): IActionPaletteHandle {
        const backdrop = document.createElement("div");
        backdrop.className = "sw__palette-backdrop";
        backdrop.setAttribute("role", "presentation");
        document.body.appendChild(backdrop);

        const releaseFab = this.suspendFABForDialog();
        let handle: IActionPaletteHandle | null = null;
        let closed = false;
        let unregisterDisposer: () => void = () => {};
        const closeOverlay = () => {
            if (closed) return;
            closed = true;
            unregisterDisposer();
            releaseFab();
            if (handle && !handle.isDisposed()) handle.dispose();
            if (backdrop.parentElement) backdrop.parentElement.removeChild(backdrop);
            opts.onRestoreFocus();
        };
        unregisterDisposer = this.disposer.registerFn(closeOverlay);

        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) {
                e.preventDefault();
                e.stopPropagation();
                closeOverlay();
            }
        });

        const {actions} = opts;
        handle = mountActionPalette(backdrop, actions, {
            platform: this.isMobile ? "mobile" : "desktop",
            title: opts.title,
            targetContext: opts.context,
            recentActionIds: this.recentPaletteActions,
            selectionContext: this.resolveActiveSelectionContext(),
            isPluginInstalled: (pluginId: string) => Boolean(getBridgeSafely(pluginId as any)),
            returnFocusElement: opts.returnFocusElement,
            onClose: closeOverlay,
            onExecute: (action: {id: string}, ctx: any) => {
                closeOverlay();
                opts.onExecute(action, ctx);
            },
        }) as unknown as IActionPaletteHandle;

        return handle;
    }

    // T-7344：文档搜索结果行次级动作画板（⌘K 唤出）
    openActionPaletteForDoc(doc: any, item?: HTMLElement): IActionPaletteHandle | null {
        if (!doc) return null;
        const rootId = String(doc.rootId || doc.id || "");
        const blockId = String(doc.blockId || doc.hitId || "");
        const title = String(doc.title || doc.name || doc.subTitle || rootId || "未命名文档");
        const context = extractActionContext({
            kind: doc.kind || "doc",
            rootId,
            blockId,
            title,
            path: doc.path || "",
            hPath: doc.hPath || "",
            notebookId: doc.notebookId || "",
        });

        const actions = getAvailableActions(context, {
            platform: this.isMobile ? "mobile" : "desktop",
            i18n: this.i18n,
        });

        if (!actions || actions.length === 0) return null;
        return this.mountPaletteBackdrop({
            actions,
            title,
            context,
            returnFocusElement: item,
            onRestoreFocus: () => {
                if (item && item.isConnected) {
                    try { item.focus({preventScroll: true}); } catch (_) { item.focus(); }
                }
            },
            onExecute: (action, ctx) => {
                this.executePaletteAction(action.id, null, item, undefined, ctx || context);
            },
        });
    }

    // T-7344：卡片次级动作画板（Tab / ⌘K / 右键菜单"更多动作"唤出）
    private openCardActionPalette(tab: Tab, card?: HTMLElement, handlers?: CardMenuHandlers): IActionPaletteHandle | null {
        if (!tab) return null;
        const rootId = this.rootIdOf(tab);
        const title = this.titleOf(tab) || rootId || "未命名文档";
        const isPinned = card ? card.classList.contains("sw__pinned") : false;
        const isFaved = card ? (card.classList.contains("sw__faved") || card.classList.contains("sw__fav")) : false;

        const context = extractActionContext({
            tab,
            card,
            rootId,
            title,
            isPinned,
            isFaved,
        });

        const actions = getAvailableActions(context, {
            platform: this.isMobile ? "mobile" : "desktop",
            i18n: this.i18n,
        });

        if (!actions || actions.length === 0) {
            return null;
        }
        return this.mountPaletteBackdrop({
            actions,
            title,
            context,
            returnFocusElement: card,
            onRestoreFocus: () => {
                if (card && card.isConnected) {
                    try { card.focus({preventScroll: true}); } catch (_) { card.focus(); }
                }
            },
            onExecute: (action, ctx) => {
                this.executePaletteAction(action.id, tab, card, handlers, ctx);
            },
        });
    }

    executePaletteAction(
        actionId: string,
        tab?: Tab | null,
        card?: HTMLElement,
        handlers?: CardMenuHandlers,
        _ctx?: any
    ): void {
        const rootId = (tab ? this.rootIdOf(tab) : _ctx?.rootId) || _ctx?.rootId || "";
        const blockId = _ctx?.blockId || "";
        const title = (tab ? this.titleOf(tab) : _ctx?.title) || _ctx?.title || rootId;
        const effectiveHandlers = handlers || (card ? this.cardMenuHandlers.get(card) : undefined);
        const destroySwitcher = () => {
            if (this.platformSwitcherDialog) {
                this.platformSwitcherDialog.destroy();
                this.platformSwitcherDialog = null;
            }
            if (this.mobileSwitcherDialog) {
                this.mobileSwitcherDialog.destroy();
                this.mobileSwitcherDialog = null;
            }
        };
        const batchCloseTabsWithReport = async (targets: Tab[], receiptTemplate: string) => {
            if (!Array.isArray(targets) || targets.length === 0) return;
            let closedCount = 0;
            for (const target of targets) {
                try {
                    if (await this.closeTabQuietly(target)) {
                        closedCount++;
                    }
                } catch (error) {
                    logger.warn("batch close tab item failed", error);
                }
            }
            if (closedCount > 0) {
                showMessage(receiptTemplate.replace("{x}", String(closedCount)));
                if (this.platformSwitcherDialog?.element.isConnected) {
                    const scrollElement = this.platformSwitcherDialog.element.querySelector<HTMLElement>(".sw__scroll");
                    const searchInput = this.platformSwitcherDialog.element.querySelector<HTMLInputElement>(".sw__search");
                    if (scrollElement) {
                        this.renderList(scrollElement, this.bridge.getAllTabs(), this.bridge.getActiveTab(), {
                            onOverlayClose: () => this.platformSwitcherDialog?.destroy(),
                            onTabsChanged: () => undefined,
                        }, this.getSettings().sortBy, {});
                        if (searchInput && searchInput.value.trim()) {
                            this.applySearch(scrollElement, searchInput, () => this.platformSwitcherDialog?.destroy());
                        }
                        const focusTarget = scrollElement.querySelector<HTMLElement>(".sw__card:not(.fn__none)");
                        if (focusTarget) {
                            try {
                                focusTarget.focus({preventScroll: true});
                            } catch (_) {
                                focusTarget.focus();
                            }
                        } else if (searchInput) {
                            searchInput.focus({preventScroll: true});
                        }
                    }
                } else if (this.mobileSwitcherDialog?.element.isConnected) {
                    this.mobileSwitcherDialog.destroy();
                    this.showMobileSwitcher();
                } else if (this.sidebarElement?.isConnected) {
                    this.refreshSidebar();
                    const focusTarget = this.sidebarElement.querySelector<HTMLElement>(".sw__card:not(.fn__none)");
                    focusTarget?.focus({preventScroll: true});
                }
            }
        };
        const copyToClipboard = (text: string) => {
            if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    showMessage(this.i18n.snippetCopied || "已复制到剪贴板");
                }).catch((err) => {
                    logger.warn("clipboard write fail", err);
                    showMessage(this.i18n.copyFailed, MESSAGE_DEFAULT_MS, "error");
                });
            } else {
                showMessage(this.i18n.copyFailed, MESSAGE_DEFAULT_MS, "error");
            }
        };

        if (actionId) {
            this.recentPaletteActions = [actionId, ...this.recentPaletteActions.filter((id) => id !== actionId)].slice(0, 5);
        }

        switch (actionId) {
            case "open-active":
                if (effectiveHandlers?.onActivate && tab) {
                    effectiveHandlers.onActivate(tab);
                } else if (rootId) {
                    destroySwitcher();
                    if (this.isMobile) {
                        void this.mobileOpenDoc(rootId);
                    } else {
                        void this.bridge.openTab({app: this.app, doc: {id: blockId || rootId}});
                    }
                }
                break;
            case "open-right":
                if (rootId) {
                    destroySwitcher();
                    if (this.isMobile) {
                        void this.mobileOpenDoc(rootId);
                    } else {
                        void this.bridge.openTab({app: this.app, doc: {id: blockId || rootId}, position: "right"});
                    }
                }
                break;
            case "open-bottom":
                if (rootId) {
                    destroySwitcher();
                    if (this.isMobile) {
                        void this.mobileOpenDoc(rootId);
                    } else {
                        void this.bridge.openTab({app: this.app, doc: {id: blockId || rootId}, position: "bottom"});
                    }
                }
                break;
            case "open-preview":
                if (rootId) {
                    destroySwitcher();
                    if (this.isMobile) {
                        void this.mobileOpenDoc(rootId);
                    } else {
                        void this.bridge.openTab({app: this.app, doc: {id: blockId || rootId, mode: "preview"}});
                    }
                }
                break;
            case "toggle-pin":
                if (card && effectiveHandlers?.onTogglePin && tab) {
                    effectiveHandlers.onTogglePin(tab, card);
                }
                break;
            case "toggle-fav":
                if (card && effectiveHandlers?.onToggleFav && tab) {
                    effectiveHandlers.onToggleFav(tab, card);
                }
                break;
            case "close-tab":
                if (card && effectiveHandlers?.onCloseTab && tab) {
                    effectiveHandlers.onCloseTab(tab, card);
                }
                break;
            case "close-other-tabs":
                if (tab) {
                    const allTabs = this.currentTabs();
                    const targets = allTabs.filter((t) => t.id !== tab.id);
                    if (targets.length === 0) {
                        showMessage(this.i18n.noOtherTabsToClose || "没有其他可关闭的页签");
                        break;
                    }
                    void batchCloseTabsWithReport(targets, this.i18n.closedOtherTabsReceipt);
                }
                break;
            case "close-tabs-after":
                if (tab) {
                    const allTabs = this.currentTabs();
                    const currentIndex = allTabs.findIndex((t) => t.id === tab.id);
                    if (currentIndex === -1 || currentIndex === allTabs.length - 1) {
                        showMessage(this.i18n.noTabsAfterToClose || "后面没有可关闭的页签");
                        break;
                    }
                    const targets = allTabs.slice(currentIndex + 1);
                    void batchCloseTabsWithReport(targets, this.i18n.closedTabsAfterReceipt);
                }
                break;
            case "close-unpinned-tabs":
                {
                    const allTabs = this.currentTabs();
                    const pinned = new Set(this.getPinned());
                    const targets = allTabs.filter((t) => !pinned.has(this.pinKeyOf(t)));
                    if (targets.length === 0) {
                        showMessage(this.i18n.noUnpinnedTabsToClose || "没有未置顶的页签");
                        break;
                    }
                    void batchCloseTabsWithReport(targets, this.i18n.closedUnpinnedTabsReceipt);
                }
                break;
            case "copy-block-link":
                if (rootId) copyToClipboard(`siyuan://blocks/${blockId || rootId}`);
                break;
            case "copy-markdown-link":
                if (rootId) {
                    const safeTitle = (title || "文档").replace(/[\r\n]+/g, " ").replace(/([\\\[\]])/g, "\\$1");
                    copyToClipboard(`[${safeTitle}](siyuan://blocks/${blockId || rootId})`);
                }
                break;
            case "copy-id":
                if (rootId) copyToClipboard(blockId || rootId);
                break;
            case "copy-path":
                {
                    const docPath = _ctx?.path || _ctx?.hPath || (tab as any)?.doc?.path || (tab as any)?.path || rootId;
                    if (docPath) copyToClipboard(String(docPath));
                }
                break;
            case "open-in-reader":
                if (rootId) {
                    destroySwitcher();
                    const sireader = (getBridgeSafely("sireader") || (window as any).sireader) as any;
                    const isReaderActive = !!(sireader && typeof sireader.openDoc === "function");
                    if (isReaderActive) {
                        try {
                            sireader.openDoc(rootId);
                            showMessage((this.i18n.openedInReaderReceipt || "已在思阅中打开：{x}").replace("{x}", title));
                        } catch {
                            if (this.isMobile) void this.mobileOpenDoc(rootId);
                            else void this.bridge.openTab({app: this.app, doc: {id: rootId}});
                            showMessage((this.i18n.openedInDefaultEditorReceipt || "在默认编辑器中打开：{x}").replace("{x}", title));
                        }
                    } else {
                        if (this.isMobile) void this.mobileOpenDoc(rootId);
                        else void this.bridge.openTab({app: this.app, doc: {id: rootId}});
                        showMessage((this.i18n.openedInDefaultEditorReceipt).replace("{x}", title));
                    }
                }
                break;
            case "open-in-media":
                if (rootId) {
                    destroySwitcher();
                    const player = (getBridgeSafely("simedia") || (window as any).siyuanMediaPlayer) as any;
                    const isMediaActive = !!(player?.controller && typeof player.controller.play === "function");
                    if (isMediaActive) {
                        try {
                            player.controller.play(rootId);
                            showMessage((this.i18n.openedInMediaReceipt || "已在思播中打开：{x}").replace("{x}", title));
                        } catch {
                            if (this.isMobile) void this.mobileOpenDoc(rootId);
                            else void this.bridge.openTab({app: this.app, doc: {id: rootId}});
                            showMessage((this.i18n.openedInDefaultEditorReceipt || "在默认编辑器中打开：{x}").replace("{x}", title));
                        }
                    } else {
                        if (this.isMobile) void this.mobileOpenDoc(rootId);
                        else void this.bridge.openTab({app: this.app, doc: {id: rootId}});
                        showMessage((this.i18n.openedInDefaultEditorReceipt).replace("{x}", title));
                    }
                }
                break;
            case "save-as-doc-set":
                this.saveCurrentTabsAsDocSet();
                break;
            case "export-tabs-mindmap":
                this.exportTabsAsMindmap();
                break;
            case "undo-closed-tab":
                this.undoLastClosedTab(destroySwitcher);
                break;
            case "glean-keep-roaming":
                void this.executeKeepRoaming(destroySwitcher);
                break;
            case "task-horizon-today":
                void this.executeTaskHorizonToday(destroySwitcher);
                break;
            case "xlc-checkin-quick":
                {
                    destroySwitcher();
                    const checkin = (getBridgeSafely("checkin") || (window as any).siyuanCheckin) as any;
                    if (checkin && (typeof checkin.openDefaultEntry === "function" || typeof checkin.open === "function")) {
                        const fn = checkin.openDefaultEntry || checkin.open;
                        try {
                            fn.call(checkin);
                            showMessage("已打开小驴打卡 ✓", 2000, "info");
                            break;
                        } catch (_) {}
                    }
                    void this.openJournal();
                    showMessage("未安装小驴打卡插件，已打开今日日记", 3000, "info");
                }
                break;
            case "xlc-contacts-interaction":
                {
                    destroySwitcher();
                    const contacts = (getBridgeSafely("contacts") || (window as any).LvContacts || (window as any).siyuanContacts) as any;
                    if (contacts && (typeof contacts.openQuickInteraction === "function" || typeof contacts.open === "function")) {
                        const fn = contacts.openQuickInteraction || contacts.open;
                        try {
                            fn.call(contacts);
                            showMessage("已打开小驴人脉 👥", 2000, "info");
                            break;
                        } catch (_) {}
                    }
                    const template = `> 🤝 **与联系人的会面交往备忘 · ${new Date().toLocaleDateString()}**\n` +
                        `> 圈层: **核心圈** · 关系温度: **🟢 密切**\n` +
                        `>\n` +
                        `> - 💬 **谈资/要点**: \n` +
                        `> - ❤️ **喜好习惯**: \n` +
                        `> - ⚠️ **敏感雷区**: \n` +
                        `> - 📌 **后续跟进**: \n` +
                        `{: custom-type="meeting-brief" custom-person="联系人" }\n`;
                    copyToClipboard(template);
                    showMessage("未安装小驴人脉插件，已复制交往记录模板到剪贴板", 3000, "info");
                }
                break;
            case "xlc-cards-review":
                {
                    destroySwitcher();
                    const cards = (getBridgeSafely("cards") || (window as any).xiaolvCards || (window as any).lvCards) as any;
                    if (cards && (typeof cards.openReview === "function" || typeof cards.openHub === "function")) {
                        const fn = cards.openReview || cards.openHub;
                        try {
                            void fn.call(cards);
                            showMessage("已开启小驴闪卡复习 🎴", 2000, "info");
                            break;
                        } catch (_) {}
                    }
                    try {
                        const globalCommand = (window as any).siyuan?.globalCommand;
                        if (globalCommand?.riffCard) {
                            globalCommand.riffCard();
                            showMessage("未安装小驴闪卡插件，已唤起思源原生闪卡复习", 3000, "info");
                            break;
                        }
                    } catch (_) {}
                    showMessage("未安装小驴闪卡插件，可打开闪卡面板制卡复习", 3000, "info");
                }
                break;
            case "xlc-home-expiry":
                {
                    destroySwitcher();
                    const home = (getBridgeSafely("home") || (window as any).LvHome || (window as any).siyuanHome) as any;
                    if (home && (typeof home.openHub === "function" || typeof home.openOverview === "function")) {
                        const fn = home.openHub || home.openOverview;
                        try {
                            fn.call(home);
                            showMessage("已打开小驴管家 🏠", 2000, "info");
                            break;
                        } catch (_) {}
                    }
                    void this.executeTaskHorizonToday(destroySwitcher);
                    showMessage("未安装小驴管家插件，已为您展示今日任务", 3000, "info");
                }
                break;
            case "xlc-exam-wrongbook":
                {
                    destroySwitcher();
                    const exam = (getBridgeSafely("exam") || (window as any).LvExam || (window as any).siyuanExam) as any;
                    if (exam && (typeof exam.wrongbook === "function" || typeof exam.practice === "function")) {
                        const fn = exam.wrongbook || exam.practice;
                        try {
                            fn.call(exam);
                            showMessage("已进入小驴考试错题攻坚 📝", 2000, "info");
                            break;
                        } catch (_) {}
                    }
                    const template = `> 📝 **错题复盘与攻坚练习 · ${new Date().toLocaleDateString()}**\n` +
                        `> 待订正题目数: **0** 项 · 记忆周期: **加权复练**\n` +
                        `>\n` +
                        `> - [ ] 错题 1 —— 考点: \`核心概念\` | 易错陷阱: \`混淆概念\`\n` +
                        `{: custom-type="exam-wrongbook" }\n`;
                    copyToClipboard(template);
                    showMessage("未安装小驴考试插件，已复制错题复盘卡模板到剪贴板", 3000, "info");
                }
                break;
            case "glean-clip":
            case "common-snippet":
            case "cards-create":
                void this.executeContextPromotionAction(actionId);
                break;
            case "stack-capture":
                void this.executeStackCaptureFromContext({
                    text: title || "",
                    blockId: blockId || "",
                    rootId: rootId || "",
                    title: title || "",
                });
                break;
            case "native-doctree-menu":
                {
                    destroySwitcher();
                    void (async () => {
                        let nbId = _ctx?.notebookId || (tab as any)?.doc?.box || (tab as any)?.box || "";
                        if (!nbId && rootId) {
                            try {
                                const res = await this.fetchKernelJson("/api/query/sql", {
                                    stmt: `SELECT box FROM blocks WHERE id = '${rootId.replace(/'/g, "''")}' LIMIT 1`
                                });
                                const rows = res?.data || res;
                                if (Array.isArray(rows) && rows[0]?.box) {
                                    nbId = rows[0].box;
                                }
                            } catch {}
                        }
                        if (nbId && rootId) {
                            void showDocTreeNativeMenu({ notebookId: nbId, docId: rootId });
                        } else {
                            showMessage("未检测到有效的文档笔记本关联", 2000, "info");
                        }
                    })();
                }
                break;
            case "toggle-left-dock":
                destroySwitcher();
                toggleNativeDock("Left");
                break;
            case "toggle-right-dock":
                destroySwitcher();
                toggleNativeDock("Right");
                break;
            case "toggle-bottom-dock":
                destroySwitcher();
                toggleNativeDock("Bottom");
                break;
            default:
                break;
        }
    }

    // 卡片操作菜单（桌面右键 / 手机长按共用）：置顶 / 收藏 / 分组 / 关闭
    private openCardMenu(tab: Tab, card: HTMLElement,
                         handlers: {
                             onActivate: (tab: Tab) => void,
                             onTogglePin: (tab: Tab, card: HTMLElement) => void,
                             onToggleFav: (tab: Tab, card: HTMLElement) => void,
                             onCloseTab: (tab: Tab, card: HTMLElement) => void,
                         }, x: number, y: number) {
        const menu = new Menu("swCardMenu");
        const nowPinned = card.classList.contains("sw__pinned");
        const nowFaved = card.classList.contains("sw__faved");
        menu.addItem({
            label: nowPinned ? this.i18n.unpinTab : this.i18n.pinTab,
            icon: nowPinned ? "iconUnpin" : "iconPin",
            click: () => handlers.onTogglePin(tab, card),
        });
        menu.addItem({
            label: nowFaved ? this.i18n.unfavoriteTab : this.i18n.favoriteTab,
            icon: "iconStar",
            click: () => handlers.onToggleFav(tab, card),
        });
        // 分组管理：已收藏时快速移动至分组（子菜单，当前分组勾选）+ 新建分组并移动；
        // 未收藏时收进收藏并选择分组
        if (nowFaved) {
            const key = this.pinKeyOf(tab);
            const favorite = this.getFavorites().find((item) => item.key === key);
            const moveSub = [{checked: !favorite?.group, label: this.escapeAttr(this.i18n.ungrouped),
                click: () => { this.setFavoriteGroup(key, ""); this.refreshCardFavState(tab, card); }}];
            this.getFavoriteGroupNames().forEach((name) => {
                moveSub.push({checked: favorite?.group === name, label: this.escapeAttr(name),
                    click: () => { this.setFavoriteGroup(key, name); this.refreshCardFavState(tab, card); }});
            });
            menu.addItem({type: "submenu", label: this.i18n.moveToGroup, icon: "iconFolder", submenu: moveSub});
            menu.addItem({
                label: this.i18n.newGroupFav,
                icon: "iconAdd",
                click: () => this.openGroupDialog(tab, card),
            });
        } else {
            menu.addItem({
                label: this.i18n.newGroupFav,
                icon: "iconFolder",
                click: () => this.openGroupDialog(tab, card),
            });
        }
        // T-7344：次级动作画板（Tab / ⌘K 统一动作入口，提供分屏、复制链接、关闭等聚合操作）
        menu.addItem({
            label: `${this.i18n.actionPaletteTitle || "动作画板"} (⌘K)`,
            icon: "iconSparkles",
            click: () => {
                this.openCardActionPalette(tab, card, handlers);
            },
        });
        menu.addItem({
            label: this.i18n.close,
            icon: "iconClose",
            click: () => handlers.onCloseTab(tab, card),
        });
        menu.addItem({
            label: this.i18n.actionPaletteCloseOtherTabs || "关闭其他页签",
            icon: "iconClose",
            click: () => this.executePaletteAction("close-other-tabs", tab, card, handlers),
        });
        menu.addItem({
            label: this.i18n.actionPaletteCloseTabsAfter || "关闭其后页签",
            icon: "iconClose",
            click: () => this.executePaletteAction("close-tabs-after", tab, card, handlers),
        });
        menu.addItem({
            label: this.i18n.actionPaletteCloseUnpinnedTabs || "关闭未置顶页签",
            icon: "iconClose",
            click: () => this.executePaletteAction("close-unpinned-tabs", tab, card, handlers),
        });
        menu.open({x, y});
    }
}
