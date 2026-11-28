import {Menu, openTab} from "siyuan";
import {logger} from "../logger";
import {capMru, sanitizeOpenHistory} from "../util";
import {normalizeClosedEntries, buildRecentHistorySections, normalizeOfficialRecentHistory, formatChangedWindowStart, entryChangedWithin} from "../recent-closed";
import {createDocumentSet, upsertDocumentSet} from "../document-sets";
import {openDocumentOnDesktop} from "../document-actions";
import {MESSAGE_DEFAULT_MS, TAB_SETTLE_MS, MRU_MAX, HISTORY_MAX, BLOCK_ID_RE, MRU_KEY, HISTORY_KEY, CLOSED_HISTORY_KEY, DOCUMENT_SETS_KEY} from "../constants";
import {type Tab, type IOverlayClose, type IOpenHistoryEntry, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface HistoryHostRuntime extends Omit<ISpeedSwitchHost, "getMru" | "setupOpenHistoryDropdown" | "fetchDocUpdatedMap" | "syncOfficialRecentHistory" | "positionOpenHistoryPanel" | "renderOpenHistoryPanel" | "bindHistoryItemActions" | "openHistoryEntry" | "refreshOpenHistoryDropdowns" | "closeHistoryMenu" | "refreshOpenHistoryDropdown" | "getOpenHistory" | "removeOpenHistoryEntry" | "removeClosedHistoryEntry" | "undoLastClosedTab" | "saveCurrentTabsAsDocSet" | "exportTabsAsMindmap" | "recordOpenHistory" | "getClosedHistory" | "captureRecentOpenSnapshot" | "scheduleRecentClosedSync" | "syncRecentClosedFromSnapshot"> {}
export class HistoryHostRuntime {
    // 读取 MRU 记录；防御性收敛（过滤非字符串/去重/截断），兼容历史已膨胀的存量数据
    private getMru(): string[] {
        if (this.navigation) return this.navigation.getMru();
        const data = this.data[MRU_KEY];
        return capMru(Array.isArray(data) ? data : [], MRU_MAX);
    }

    // 桌面端顶部的最近打开记录。历史与 MRU 分离，保留关闭页签后仍可重开的文档。
    private setupOpenHistoryDropdown(container: HTMLElement | null, onClose: IOverlayClose): () => void {
        if (!container) return () => undefined;
        const previous = this.historyDropdownClosers.get(container);
        previous?.dispose();
        container.innerHTML = `<button type="button" class="sw__history-trigger b3-tooltips b3-tooltips__s" aria-label="${this.i18n.openHistory} · 最近打开与撤销关闭">
    <svg width="13" height="13"><use xlink:href="#iconClock"></use></svg><span class="sw__history-trigger-text">${this.i18n.openHistory}</span><span class="sw__history-badge"></span>
</button><div class="sw__history-panel fn__none" role="menu"></div>`;
        const trigger = container.querySelector<HTMLButtonElement>(".sw__history-trigger");
        const panel = container.querySelector<HTMLElement>(".sw__history-panel");
        if (!trigger || !panel) return () => undefined;
        trigger.setAttribute("aria-haspopup", "menu");
        trigger.setAttribute("aria-expanded", "false");
        let outsideHandler: ((event: PointerEvent) => void) | null = null;
        let resizeHandler: (() => void) | null = null;
        const close = () => {
            const focusInside = panel.contains(document.activeElement);
            panel.classList.add("fn__none");
            trigger.setAttribute("aria-expanded", "false");
            if (outsideHandler) document.removeEventListener("pointerdown", outsideHandler, true);
            if (resizeHandler) window.removeEventListener("resize", resizeHandler);
            outsideHandler = null;
            resizeHandler = null;
            if (focusInside && trigger.isConnected) trigger.focus({preventScroll: true});
        };
        trigger.addEventListener("keydown", (event) => {
            if (panel.classList.contains("fn__none")) return;
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
                return;
            }
            if (event.key === "ArrowDown") {
                const firstBtn = panel.querySelector<HTMLButtonElement>("button:not(:disabled)");
                if (firstBtn) {
                    event.preventDefault();
                    event.stopPropagation();
                    firstBtn.focus({preventScroll: true});
                }
            }
        });
        panel.addEventListener("keydown", (event) => {
            if (panel.classList.contains("fn__none")) return;
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                close();
                return;
            }
            const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
            if (buttons.length === 0) return;
            const currentIdx = buttons.indexOf(document.activeElement as HTMLButtonElement);

            if (event.key === "Home") {
                event.preventDefault();
                event.stopPropagation();
                buttons[0]?.focus({preventScroll: true});
                return;
            }
            if (event.key === "End") {
                event.preventDefault();
                event.stopPropagation();
                buttons[buttons.length - 1]?.focus({preventScroll: true});
                return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                event.preventDefault();
                event.stopPropagation();
                const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % buttons.length;
                buttons[nextIdx]?.focus({preventScroll: true});
                return;
            }
            if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                event.preventDefault();
                event.stopPropagation();
                const prevIdx = currentIdx < 0 ? buttons.length - 1 : (currentIdx - 1 + buttons.length) % buttons.length;
                buttons[prevIdx]?.focus({preventScroll: true});
                return;
            }
            if (event.key === "Delete" || event.key === "Backspace") {
                const active = document.activeElement as HTMLElement;
                const activeItem = active?.closest<HTMLButtonElement>(".sw__history-item");
                if (activeItem && panel.contains(activeItem)) {
                    event.preventDefault();
                    event.stopPropagation();
                    const key = activeItem.dataset.historyKey;
                    const src = activeItem.dataset.historySource;
                    const rootId = activeItem.dataset.rootId;
                    if (src === "closed") {
                        void this.removeClosedHistoryEntry(rootId || key || "").catch((err) => {
                            logger.warn("removeClosedHistoryEntry fail", err);
                        });
                    } else if (key) {
                        void this.removeOpenHistoryEntry(key).catch((err) => {
                            logger.warn("removeOpenHistoryEntry fail", err);
                        });
                    }
                    this.refreshOpenHistoryDropdowns();
                    const nextButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>(".sw__history-item"));
                    if (nextButtons.length > 0) {
                        const targetIdx = Math.min(Math.max(0, currentIdx), nextButtons.length - 1);
                        nextButtons[targetIdx]?.focus({preventScroll: true});
                    } else if (trigger.isConnected) {
                        trigger.focus({preventScroll: true});
                    }
                }
            }
        });
        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            close();
            if (this.historyDropdownClosers.get(container)?.dispose === dispose) this.historyDropdownClosers.delete(container);
            this.historyDropdownCloseSet.delete(dispose);
        };
        this.historyDropdownClosers.set(container, {close, dispose});
        this.historyDropdownCloseSet.add(dispose);
        let historySyncState: "idle" | "loading" | "success" | "empty" | "failed" = "idle";
        const renderSyncFailure = () => {
            const failure = document.createElement("div");
            failure.className = "sw__history-sync-error";
            failure.setAttribute("role", "alert");
            failure.textContent = this.i18n.historySyncFailed;
            const retry = document.createElement("button");
            retry.type = "button";
            retry.className = "b3-button b3-button--text sw__history-sync-retry";
            retry.textContent = this.i18n.homeRetry;
            retry.setAttribute("aria-label", this.i18n.historySyncRetry);
            retry.addEventListener("click", (event) => {
                event.stopPropagation();
                close();
                trigger.click();
            });
            failure.appendChild(retry);
            panel.prepend(failure);
        };
        trigger.addEventListener("click", async () => {
            if (!panel.classList.contains("fn__none")) { close(); return; }
            if (trigger.disabled) return;
            trigger.disabled = true;
            trigger.setAttribute("aria-busy", "true");
            historySyncState = "loading";
            let syncResult: "success" | "empty" | "failed" = "failed";
            try {
                syncResult = await this.syncOfficialRecentHistory();
            } catch (error) {
                logger.warn("sync recent history fail", error);
                syncResult = "failed";
            } finally {
                trigger.removeAttribute("aria-busy");
                if (trigger.isConnected) trigger.disabled = false;
            }
            historySyncState = syncResult;
        if (disposed || !panel.isConnected) return;
        // T-6799b "只看有改动"：开关状态与内核更新时间缓存在下拉生命周期内保持；
        // 过滤真值 = 内核 blocks.updated 落在窗口期（默认 7 天）内。
        let changedOnly = false;
        let changedUpdatedMap: Map<string, string> | null = null;
        let changedOnlyLoadFailed = false;
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "b3-button b3-button--text sw__history-changed-toggle";
        toggle.textContent = this.i18n.historyChangedOnly;
        const renderPanel = () => {
            const windowStart = changedOnly && changedUpdatedMap ? formatChangedWindowStart(Date.now()) : "";
            const filter = changedOnly && changedUpdatedMap
                ? (entry: IOpenHistoryEntry) => entryChangedWithin(entry, changedUpdatedMap!, windowStart)
                : undefined;
            this.renderOpenHistoryPanel(panel, (entry) => {
                close();
                onClose();
                void this.openHistoryEntry(entry);
            }, filter, changedOnly ? () => {
                changedOnly = false;
                changedOnlyLoadFailed = false;
                renderPanel();
            } : undefined);
            panel.prepend(toggle);
            toggle.setAttribute("aria-pressed", String(changedOnly));
            if (changedOnlyLoadFailed) {
                const failure = document.createElement("div");
                failure.className = "sw__history-sync-error";
                failure.setAttribute("role", "alert");
                failure.textContent = this.i18n.historyChangedLoadFailed;
                const retry = document.createElement("button");
                retry.type = "button";
                retry.className = "b3-button b3-button--text sw__history-sync-retry";
                retry.textContent = this.i18n.homeRetry;
                retry.setAttribute("aria-label", this.i18n.historyChangedRetry);
                retry.addEventListener("click", (event) => {
                    event.stopPropagation();
                    changedOnlyLoadFailed = false;
                    toggle.click();
                });
                failure.appendChild(retry);
                panel.insertBefore(failure, toggle.nextSibling);
            }
        };
        toggle.addEventListener("click", async () => {
            if (toggle.disabled) return;
            changedOnly = !changedOnly;
            toggle.setAttribute("aria-pressed", String(changedOnly));
            if (changedOnly && !changedUpdatedMap) {
                toggle.disabled = true;
                toggle.setAttribute("aria-busy", "true");
                const ids = [
                    ...this.getOpenHistory().map((entry) => entry.rootId || ""),
                    ...this.getClosedHistory().map((entry) => entry.rootId || ""),
                ].filter((id) => BLOCK_ID_RE.test(id));
                try {
                    changedUpdatedMap = await this.fetchDocUpdatedMap(ids);
                    changedOnlyLoadFailed = false;
                } catch (error) {
                    logger.warn("load changed history fail", error);
                    changedOnly = false;
                    changedOnlyLoadFailed = true;
                } finally {
                    toggle.removeAttribute("aria-busy");
                    if (toggle.isConnected) toggle.disabled = false;
                }
            }
            if (disposed || !panel.isConnected) return;
            renderPanel();
        });
        renderPanel();
            if (historySyncState === "failed") renderSyncFailure();
            panel.classList.remove("fn__none");
            trigger.setAttribute("aria-expanded", "true");
            this.positionOpenHistoryPanel(trigger, panel);
            if (trigger.isConnected && !panel.contains(document.activeElement)) {
                trigger.focus({preventScroll: true});
            }
            outsideHandler = (event) => { if (!container.contains(event.target as Node)) close(); };
            document.addEventListener("pointerdown", outsideHandler, true);
            resizeHandler = () => {
                if (!panel.classList.contains("fn__none")) this.positionOpenHistoryPanel(trigger, panel);
            };
            window.addEventListener("resize", resizeHandler);
        });
        this.refreshOpenHistoryDropdown(container);
        return dispose;
    }

    // T-6799b：批量取文档根块的 updated（内核 14 位时间戳），32 条/块的有界分批。
    private async fetchDocUpdatedMap(rootIds: string[]): Promise<Map<string, string>> {
        const result = new Map<string, string>();
        const valid = Array.from(new Set(rootIds.filter((id) => BLOCK_ID_RE.test(id))));
        for (let index = 0; index < valid.length; index += 32) {
            const chunk = valid.slice(index, index + 32);
            const list = chunk.map((id) => `'${id}'`).join(",");
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT id, updated FROM blocks WHERE id IN (${list})`,
            });
            if (json === null || json === undefined || !Array.isArray(json?.data)) {
                throw new Error("history-updated-query-unavailable");
            }
            json.data.forEach((row: {id?: string; updated?: string}) => {
                if (typeof row?.id !== "string" || !BLOCK_ID_RE.test(row.id) || typeof row.updated !== "string") {
                    throw new Error("history-updated-row-invalid");
                }
                result.set(row.id, row.updated);
            });
        }
        return result;
    }

    private async syncOfficialRecentHistory(): Promise<"success" | "empty" | "failed"> {
        const json = await this.fetchKernelJson("/api/storage/getRecentDocs", {});
        const result = normalizeOfficialRecentHistory(json, (id) => BLOCK_ID_RE.test(id), Date.now(), HISTORY_MAX);
        if (result.status === "success") {
            this.data[HISTORY_KEY] = result.items;
            this.saveDataDebounced(HISTORY_KEY);
        }
        return result.status;
    }

    private positionOpenHistoryPanel(trigger: HTMLElement, panel: HTMLElement) {
        const rect = trigger.getBoundingClientRect();
        const margin = 6;
        const width = Math.min(300, Math.max(220, window.innerWidth - margin * 2));
        const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
        const top = rect.bottom + margin;
        panel.style.width = `${Math.round(width)}px`;
        panel.style.left = `${Math.round(left)}px`;
        panel.style.top = `${Math.round(Math.min(top, window.innerHeight - 180))}px`;
        panel.style.maxHeight = `${Math.max(140, window.innerHeight - top - margin)}px`;
    }

    private renderOpenHistoryPanel(panel: HTMLElement, onPick: (entry: IOpenHistoryEntry) => void, entryFilter?: (entry: IOpenHistoryEntry) => boolean, onShowAll?: () => void) {
        panel.innerHTML = "";
        const opened = this.currentTabs();
        const openedKeys = new Set(opened.map((tab) => this.pinKeyOf(tab)));
        const openedRoots = new Set(opened.map((tab) => this.rootIdOf(tab)).filter(Boolean));
        const sections = buildRecentHistorySections(this.getOpenHistory(), this.getClosedHistory(), openedRoots);
        const appendEmptyHistoryState = (emptyText: string) => {
            const empty = document.createElement("div");
            empty.className = "sw__history-empty";
            empty.textContent = emptyText;
            panel.appendChild(empty);
            if (entryFilter && onShowAll) {
                const showAll = document.createElement("button");
                showAll.type = "button";
                showAll.className = "b3-button b3-button--text sw__history-show-all";
                showAll.textContent = this.i18n.historyChangedShowAll;
                showAll.addEventListener("click", onShowAll);
                panel.appendChild(showAll);
            }
        };
        if (sections.count === 0) {
            appendEmptyHistoryState(entryFilter ? this.i18n.historyChangedEmpty : this.i18n.noOpenHistory);
            return;
        }
        let shown = 0;

        // P7：每区默认展示前 8 条，保证两个分区首屏均可达
        const HISTORY_CAP = 8;
        const appendSection = (title: string, entries: IOpenHistoryEntry[], clearLabel: string, clearAction: () => void) => {
            const visible = typeof entryFilter === "function" ? entries.filter(entryFilter) : entries;
            if (visible.length === 0) return;
            shown += visible.length;
            const heading = document.createElement("div");
            heading.className = "sw__history-section-title";
            heading.textContent = `${title} (${visible.length})`;
            panel.appendChild(heading);
            const clear = document.createElement("button");
            clear.type = "button";
            clear.className = "sw__history-clear";
            clear.textContent = clearLabel;
            clear.addEventListener("click", (event) => {
                event.stopPropagation();
                clearAction();
            });
            panel.appendChild(clear);
            const renderItem = (entry: IOpenHistoryEntry) => {
                const item = document.createElement("button");
                item.type = "button";
                item.className = `sw__history-item${entry.source === "closed" ? " sw__history-item--closed" : ""}`;
                item.setAttribute("role", "menuitem");
                item.dataset.historyKey = entry.key;
                item.dataset.historySource = entry.source || "open";
                if (entry.rootId) item.dataset.rootId = entry.rootId;
                item.innerHTML = `<svg><use xlink:href="#iconFile"></use></svg><span class="sw__history-copy"><span class="sw__history-title"></span><span class="sw__history-meta"></span></span>`;
                item.querySelector<HTMLElement>(".sw__history-title")!.textContent = entry.title;
                item.querySelector<HTMLElement>(".sw__history-meta")!.textContent = entry.source === "closed"
                    ? this.i18n.historyClosed
                    : openedKeys.has(entry.key) ? this.i18n.historyOpen : this.i18n.historyClosed;
                item.title = entry.title;
                this.bindHistoryItemActions(item, entry, onPick);
                panel.appendChild(item);
            };
            // P7：每区默认前 8 条，超出显示展开按钮
            const cap = Math.min(visible.length, 8);
            for (let i = 0; i < cap; i++) renderItem(visible[i]);
            if (visible.length > cap) {
                const expand = document.createElement("button");
                expand.type = "button";
                expand.className = "sw__history-expand";
                expand.textContent = `${this.i18n.historyExpand} (${visible.length - cap})`;
                expand.addEventListener("click", () => {
                    expand.remove();
                    for (let i = cap; i < visible.length; i++) renderItem(visible[i]);
                });
                panel.appendChild(expand);
            }
        };
        appendSection(this.i18n.historyOpenSection, sections.open as IOpenHistoryEntry[], this.i18n.clearOpenHistory, () => {
            if (!confirm(this.i18n.clearOpenHistoryConfirm)) return;
            this.data[HISTORY_KEY] = [];
            this.saveDataDebounced(HISTORY_KEY);
            this.refreshOpenHistoryDropdowns();
        });
        appendSection(this.i18n.historyClosedSection, sections.closed as IOpenHistoryEntry[], this.i18n.clearClosedHistory, () => {
            if (!confirm(this.i18n.clearClosedHistoryConfirm)) return;
            this.data[CLOSED_HISTORY_KEY] = [];
            this.saveDataDebounced(CLOSED_HISTORY_KEY);
            this.refreshOpenHistoryDropdowns();
        });
        if (shown === 0) {
            appendEmptyHistoryState(this.i18n.historyChangedEmpty);
        }
    }

    private bindHistoryItemActions(item: HTMLButtonElement, entry: IOpenHistoryEntry, onPick: (entry: IOpenHistoryEntry) => void) {
        let timer: number | null = null;
        let longPressed = false;
        let x = 0;
        let y = 0;
        const clearTimer = () => {
            if (timer !== null) window.clearTimeout(timer);
            timer = null;
        };
        const openMenu = (clientX: number, clientY: number) => {
            this.closeHistoryMenu();
            const menu = new Menu("swHistoryItemMenu");
            this.activeHistoryMenu = menu;
            menu.addItem({label: this.i18n.historyOpenAction, icon: "iconOpen", click: () => onPick(entry)});
            menu.addItem({label: this.i18n.historyRemove, icon: "iconTrashcan", click: () => {
                if (entry.source === "closed") void this.removeClosedHistoryEntry(entry.rootId || entry.key).catch((err) => logger.warn("removeClosedHistoryEntry fail", err));
                else void this.removeOpenHistoryEntry(entry.key).catch((err) => logger.warn("removeOpenHistoryEntry fail", err));
                this.refreshOpenHistoryDropdowns();
            }});
            menu.open({x: clientX, y: clientY});
        };
        item.addEventListener("click", (event) => {
            if (longPressed) {
                longPressed = false;
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }
            onPick(entry);
        });
        item.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openMenu(event.clientX, event.clientY);
        });
        let startX = 0;
        let startY = 0;
        item.addEventListener("touchstart", (event) => {
            const touch = event.touches[0];
            x = touch?.clientX || 0;
            y = touch?.clientY || 0;
            startX = x;
            startY = y;
            longPressed = false;
            clearTimer();
            timer = window.setTimeout(() => {
                timer = null;
                longPressed = true;
                openMenu(x, y);
            }, 500);
        }, {passive: true});
        item.addEventListener("touchmove", (event) => {
            const touch = event.touches[0];
            if (!touch) {
                clearTimer();
                return;
            }
            const dx = Math.abs(touch.clientX - startX);
            const dy = Math.abs(touch.clientY - startY);
            if (dx > 10 || dy > 10) {
                clearTimer();
            }
        }, {passive: true});
        item.addEventListener("touchcancel", clearTimer);
        item.addEventListener("touchend", (event) => {
            clearTimer();
            if (longPressed) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, {passive: false});
    }

    private async openHistoryEntry(entry: IOpenHistoryEntry) {
        const opened = this.currentTabs();
        const current = opened.find((tab) => this.pinKeyOf(tab) === entry.key);
        if (current) { this.activateTab(current); return; }
        // T-6801：切换离开前记录当前活动文档的滚动现场（若活动编辑器可读）
        this.captureActiveDocScroll();
        // T-6806：切换离开前记录跳转原点（后退栈）
        this.captureJumpOrigin();
        if (!entry.rootId || !BLOCK_ID_RE.test(entry.rootId)) {
            if (entry.source === "closed") void this.removeClosedHistoryEntry(entry.rootId || entry.key).catch((err) => logger.warn("removeClosedHistoryEntry fail", err));
            else void this.removeOpenHistoryEntry(entry.key).catch((err) => logger.warn("removeOpenHistoryEntry fail", err));
            showMessage(this.i18n.historyInvalid);
            return;
        }
        if (this.isMobile) {
            const opened = await this.mobileOpenDoc(entry.rootId);
            if (!opened) {
                if (entry.source === "closed") void this.removeClosedHistoryEntry(entry.rootId).catch((err) => logger.warn("removeClosedHistoryEntry fail", err));
                showMessage(this.i18n.openDocFailed);
            }
        } else {
            const opened = await openDocumentOnDesktop({
                rootId: entry.rootId,
                app: this.app,
                openTab,
                logger,
            });
            if (!opened) {
                if (entry.source === "closed") void this.removeClosedHistoryEntry(entry.rootId || entry.key).catch((err) => logger.warn("removeClosedHistoryEntry fail", err));
                else void this.removeOpenHistoryEntry(entry.key).catch((err) => logger.warn("removeOpenHistoryEntry fail", err));
                showMessage(this.i18n.openDocFailed);
            } else {
                // T-6801 重开现场：会话内有过离开记录的文档按比例回卷滚动位置
                this.applyDocScrollAfterOpen(entry.rootId);
            }
        }
    }

    private refreshOpenHistoryDropdowns() {
        this.closeHistoryMenu();
        document.querySelectorAll<HTMLElement>(".sw__history-dd").forEach((container) => this.refreshOpenHistoryDropdown(container));
    }

    private closeHistoryMenu() {
        if (!this.activeHistoryMenu) return;
        try {
            this.activeHistoryMenu.close();
        } catch (error) {
            logger.warn("close history menu fail", error);
        }
        this.activeHistoryMenu = null;
    }

    private refreshOpenHistoryDropdown(container: HTMLElement) {
        this.historyDropdownClosers.get(container)?.close();
        const badge = container.querySelector<HTMLElement>(".sw__history-badge");
        if (badge) {
            const openedRoots = new Set((this.currentTabs())
                .map((tab) => this.rootIdOf(tab)).filter(Boolean));
            const count = buildRecentHistorySections(this.getOpenHistory(), this.getClosedHistory(), openedRoots).count;
            badge.textContent = String(count);
            badge.classList.toggle("fn__none", count === 0);
        }
        container.querySelector<HTMLElement>(".sw__history-panel")?.classList.add("fn__none");
    }

    private getOpenHistory(): IOpenHistoryEntry[] {
        const diskItems = this.readDataMemo(HISTORY_KEY, (raw) => sanitizeOpenHistory(raw, HISTORY_MAX).items);
        const navItems = this.navigation?.getOpenHistory() as unknown as IOpenHistoryEntry[] | undefined;
        return navItems?.length ? navItems : diskItems;
    }

    private async removeOpenHistoryEntry(key: string): Promise<void> {
        if (typeof key !== "string" || !key) return;
        if (!this.tier2Ready && typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        if (await this.navigation?.removeOpenHistoryEntry(key)) {
            this.data[HISTORY_KEY] = this.navigation!.getOpenHistory();
            this.refreshOpenHistoryDropdowns();
        }
    }

    private async removeClosedHistoryEntry(rootId: string): Promise<void> {
        if (!this.tier2Ready && typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        if (await this.navigation?.removeClosedHistoryEntry(rootId)) {
            this.data[CLOSED_HISTORY_KEY] = this.navigation!.getClosedHistory();
            this.refreshOpenHistoryDropdowns();
        }
    }

    // T-7356: 撤销最后一次关闭的页签并打开恢复
    private undoLastClosedTab(closeOverlay?: IOverlayClose): boolean {
        const history = this.getClosedHistory();
        if (!history || history.length === 0) {
            showMessage(this.i18n.noClosedTabsToRestore || "暂无可撤销关闭的页签");
            return false;
        }
        const last = history[0];
        if (!last || !last.rootId) return false;
        void this.removeClosedHistoryEntry(last.rootId).catch((err) => logger.warn("removeClosedHistoryEntry in undo fail", err));
        if (closeOverlay) closeOverlay();
        else if (this.isMobile && this.mobileSwitcherDialog) {
            this.mobileSwitcherDialog.destroy();
            this.mobileSwitcherDialog = null;
        } else if (this.platformSwitcherDialog) {
            this.platformSwitcherDialog.destroy();
            this.platformSwitcherDialog = null;
        }
        if (this.isMobile) void this.mobileOpenDoc(last.rootId);
        else {
            void Promise.resolve(this.bridge.openTab({app: this.app, doc: {id: last.rootId}})).then(() => {
                this.applyDocScrollAfterOpen(last.rootId);
            }).catch((err: unknown) => logger.warn("undoLastClosedTab openTab fail", err));
        }
        showMessage((this.i18n.restoredClosedTab || "已恢复页签：{x}").replace("{x}", last.title || last.rootId));
        return true;
    }

    // T-7357: 将当前所有打开页签一键保存为文档集（工作区会话保护）
    private saveCurrentTabsAsDocSet(): boolean {
        const tabs = this.currentTabs();
        const entries: Array<{rootId: string; title: string; index: number; active?: boolean}> = [];
        const seen = new Set<string>();
        tabs.forEach((tab) => {
            const rootId = this.rootIdOf(tab);
            if (rootId && BLOCK_ID_RE.test(rootId) && !seen.has(rootId)) {
                seen.add(rootId);
                const title = this.titleOf(tab) || rootId;
                entries.push({rootId, title, index: entries.length});
            }
        });
        if (entries.length === 0) {
            showMessage(this.i18n.emptyDocSetWarning || "当前无有效页签可保存");
            return false;
        }
        const now = Date.now();
        const d = new Date(now);
        const pad = (n: number) => String(n).padStart(2, "0");
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        const setName = `工作区 ${dateStr}`;
        const newSet = createDocumentSet(setName, entries, {now});
        if (!newSet) return false;
        const commitSave = () => {
            const result = upsertDocumentSet(this.data[DOCUMENT_SETS_KEY], newSet, {now});
            this.data[DOCUMENT_SETS_KEY] = result.state;
            this.saveDataDebounced(DOCUMENT_SETS_KEY);
            showMessage((this.i18n.docSetSavedReceipt).replace("{x}", setName));
        };
        if (this.tier2Ready || typeof this.ensureTier2Loaded !== "function") commitSave();
        else void this.ensureTier2Loaded().then(() => { if (!this.isUnloading) commitSave(); });
        return true;
    }

    // T-7437: 将当前所有打开页签一键导出为思维导图/大纲 Markdown 结构并复制
    private exportTabsAsMindmap(): boolean {
        const tabs = this.currentTabs();
        const lines: string[] = [];
        const seen = new Set<string>();
        tabs.forEach((tab) => {
            const rootId = this.rootIdOf(tab);
            if (rootId && BLOCK_ID_RE.test(rootId) && !seen.has(rootId)) {
                seen.add(rootId);
                const title = this.titleOf(tab) || rootId;
                lines.push(`- [${title}](siyuan://blocks/${rootId})`);
            }
        });
        if (lines.length === 0) {
            showMessage(this.i18n.noOpenedTabs || "当前没有打开的页签");
            return false;
        }
        const markdown = `# 工作区任务大纲\n${lines.join("\n")}`;
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(markdown).then(() => {
                const msg = (this.i18n.tabsExportedToClipboard).replace("{count}", String(lines.length));
                showMessage(msg);
            }).catch((err) => {
                logger.warn("exportTabsAsMindmap clipboard write fail", err);
                showMessage(this.i18n.copyFailed, MESSAGE_DEFAULT_MS, "error");
            });
            return true;
        }
        showMessage(this.i18n.copyFailed, MESSAGE_DEFAULT_MS, "error");
        return false;
    }

    private async recordOpenHistory(tab: Tab): Promise<void> {
        const key = this.pinKeyOf(tab);
        if (!key) return;
        if (typeof this.ensureTier2Loaded === "function") {
            await this.ensureTier2Loaded();
        }
        const rootId = this.rootIdOf(tab);
        const title = this.titleOf(tab) || key;
        if (this.navigation) {
            await this.navigation.recordOpenHistory({ key, rootId, title });
            this.data[HISTORY_KEY] = this.navigation.getOpenHistory();
            this.data[CLOSED_HISTORY_KEY] = this.navigation.getClosedHistory();
        }
        this.refreshOpenHistoryDropdowns();
    }

    private getClosedHistory(): Array<{rootId: string; title: string; closedAt: number}> {
        const diskItems = this.readDataMemo(CLOSED_HISTORY_KEY, (raw) => normalizeClosedEntries(raw, HISTORY_MAX).items);
        const navItems = this.navigation?.getClosedHistory();
        return navItems?.length ? navItems : diskItems;
    }

    private captureRecentOpenSnapshot() {
        const tabs = this.currentTabs();
        if (this.navigation) {
            this.navigation.captureRecentOpenSnapshot(tabs.map((tab) => ({
                rootId: this.rootIdOf(tab),
                title: this.titleOf(tab),
            })));
        }
        const next = new Map<string, string>();
        tabs.forEach((tab) => {
            const rootId = this.rootIdOf(tab);
            if (rootId && BLOCK_ID_RE.test(rootId)) {
                next.set(rootId, this.titleOf(tab) || rootId);
            }
        });
        this.recentOpenSnapshot = next;
    }

    private scheduleRecentClosedSync() {
        if (this.recentClosedSyncTimer !== null) {
            window.clearTimeout(this.recentClosedSyncTimer);
        }
        const generation = this.lifecycleGeneration;
        this.recentClosedSyncTimer = window.setTimeout(() => {
            this.recentClosedSyncTimer = null;
            if (generation !== this.lifecycleGeneration) return;
            this.syncRecentClosedFromSnapshot(generation);
        }, Math.max(TAB_SETTLE_MS, 30));
    }

    private async syncRecentClosedFromSnapshot(generation = this.lifecycleGeneration): Promise<void> {
        if (generation !== this.lifecycleGeneration) return;
        if (this.recentOpenSnapshot.size === 0) return;
        if (typeof this.ensureTier2Loaded === "function") {
            await this.ensureTier2Loaded();
        }
        if (generation !== this.lifecycleGeneration || this.isUnloading) return;
        if (this.navigation) {
            const prevClosed = this.navigation.getClosedHistory();
            await this.navigation.syncRecentClosedFromSnapshot(this.currentTabs().map((tab) => ({
                rootId: this.rootIdOf(tab),
                title: this.titleOf(tab),
            })), generation);
            const closed = this.navigation.getClosedHistory();
            this.data[CLOSED_HISTORY_KEY] = closed;
            if (closed.length !== prevClosed.length
                || closed.some((item, index) => item.rootId !== prevClosed[index]?.rootId)) {
                this.refreshOpenHistoryDropdowns();
            }
        }
    }
}
