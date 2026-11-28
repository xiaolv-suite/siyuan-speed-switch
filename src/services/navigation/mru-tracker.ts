import {
    MRU_KEY,
    MRU_MAX,
    HISTORY_KEY,
    HISTORY_MAX,
    CLOSED_HISTORY_KEY,
    PERSISTENT_TIER2_KEYS,
} from "../../constants";
import type { ITieredStorageEngine } from "../../core/types/storage";
import type { IHostBridge } from "../../core/types/bridge";
import type { IOpenHistoryItem, IClosedHistoryItem } from "./types";
import { logger } from "../../logger";
import { capMru, sanitizeOpenHistory } from "../../util";
import {
    normalizeClosedEntries,
    recordRecentOpen,
    removeRecentEntry,
    applyRecentEvent,
} from "../../recent-closed";

export interface IMruTrackerDeps {
    bridge: IHostBridge;
    storage: ITieredStorageEngine;
    isMobile: () => boolean;
    getI18n?: () => Record<string, string>;
    showMessage?: (msg: string, timeoutMs?: number, icon?: "info" | "error") => void;
    mobileOpenDoc?: (rootId: string) => Promise<boolean | void>;
    getApp?: () => any;
        getData?: (key: string) => any;
    setData?: (key: string, val: any) => void;
    saveDataDebounced?: (key: string, data?: any) => void;
    isTier2Ready?: () => boolean;
}

export class MruTracker {
    private readonly bridge: IHostBridge;
    private readonly storage: ITieredStorageEngine;
    private readonly isMobile: () => boolean;
    private readonly getI18n: () => Record<string, string>;
    private readonly showMessage: (msg: string, timeoutMs?: number, icon?: "info" | "error") => void;
    private readonly mobileOpenDoc?: (rootId: string) => Promise<boolean | void>;
    private readonly getApp: () => any;
    private readonly getData?: (key: string) => any;
    private readonly setData?: (key: string, val: any) => void;
    private readonly saveDataDebouncedHook?: (key: string, data?: any) => void;
    private readonly isTier2ReadyFn?: () => boolean;

    public recentOpenSnapshot = new Map<string, string>();

    constructor(deps: IMruTrackerDeps) {
        this.bridge = deps.bridge;
        this.storage = deps.storage;
        this.isMobile = deps.isMobile;
        this.getI18n = deps.getI18n || (() => ({}));
        this.showMessage = deps.showMessage || (() => {});
        this.mobileOpenDoc = deps.mobileOpenDoc;
        this.getApp = deps.getApp || (() => null);
        this.getData = deps.getData;
        this.setData = deps.setData;
        this.saveDataDebouncedHook = deps.saveDataDebounced;
        this.isTier2ReadyFn = deps.isTier2Ready;
    }

    private isTier2Ready(): boolean {
        return this.isTier2ReadyFn ? this.isTier2ReadyFn() : Boolean(this.storage.isTier2Loaded?.());
    }

    private async ensureTier2Loaded(): Promise<void> {
        if (this.isTier2Ready()) return;
        if (typeof this.storage.ensureTier2Loaded === "function") {
            await this.storage.ensureTier2Loaded();
        }
    }

    private loadRaw(key: string): any {
        if (typeof this.getData === "function") {
            const val = this.getData(key);
            if (val !== undefined) return val;
        }
        if (PERSISTENT_TIER2_KEYS.includes(key) && typeof this.storage.peekTier2 === "function") {
            return this.storage.peekTier2(key, []);
        }
        return this.storage.getTier1(key, []);
    }

    private saveRaw(key: string, val: any): void {
        if (typeof this.setData === "function") {
            this.setData(key, val);
        }
        this.storage.setTier1(key, val);
        if (typeof this.saveDataDebouncedHook === "function") {
            this.saveDataDebouncedHook(key);
        } else {
            this.storage.saveDataDebounced(key, val);
        }
    }

    private async saveTier2(key: string, val: any): Promise<void> {
        if (!this.isTier2Ready()) await this.ensureTier2Loaded();
        if (typeof this.setData === "function") {
            this.setData(key, val);
        }
        if (this.isTier2Ready() && typeof this.storage.setTier2Sync === "function") {
            this.storage.setTier2Sync(key, val);
        } else {
            await this.storage.setTier2(key, val);
        }
        if (typeof this.saveDataDebouncedHook === "function") {
            this.saveDataDebouncedHook(key);
        }
    }

    public getMru(): string[] {
        const data = this.loadRaw(MRU_KEY);
        return capMru(Array.isArray(data) ? data : [], MRU_MAX);
    }

    public recordMru(key: string): string[] {
        if (!key) return this.getMru();
        const mru = this.getMru();
        const list = mru.filter((id) => id !== key);
        list.unshift(key);
        const capped = capMru(list, MRU_MAX);
        this.saveRaw(MRU_KEY, capped);
        return capped;
    }

    public getOpenHistory(): IOpenHistoryItem[] {
        const raw = this.loadRaw(HISTORY_KEY);
        return sanitizeOpenHistory(raw, HISTORY_MAX).items;
    }

    public getClosedHistory(): IClosedHistoryItem[] {
        const raw = this.loadRaw(CLOSED_HISTORY_KEY);
        return normalizeClosedEntries(raw, HISTORY_MAX).items;
    }

    public async recordOpenHistory(key: string, rootId: string, title: string): Promise<void> {
        if (!key) return;
        if (!this.isTier2Ready()) await this.ensureTier2Loaded();
        const currentOpen = this.getOpenHistory();
        const currentClosed = this.getClosedHistory();
        const result = recordRecentOpen(currentOpen, currentClosed, { key, rootId, title, ts: Date.now() }, HISTORY_MAX);
        await this.saveTier2(HISTORY_KEY, result.open);
        if (result.closed.length !== currentClosed.length) await this.saveTier2(CLOSED_HISTORY_KEY, result.closed);
    }

    public async removeOpenHistoryEntry(key: string): Promise<boolean> {
        if (!key) return false;
        if (!this.isTier2Ready()) await this.ensureTier2Loaded();
        const history = this.getOpenHistory();
        const result = removeRecentEntry(history, key, "key");
        if (!result.changed) return false;
        await this.saveTier2(HISTORY_KEY, result.items);
        return true;
    }

    public async removeClosedHistoryEntry(rootId: string): Promise<boolean> {
        if (!rootId) return false;
        if (!this.isTier2Ready()) await this.ensureTier2Loaded();
        const history = this.getClosedHistory();
        const result = removeRecentEntry(history, rootId, "rootId");
        if (!result.changed) return false;
        await this.saveTier2(CLOSED_HISTORY_KEY, result.items);
        return true;
    }

    public undoLastClosedTab(closeOverlay?: () => void): boolean {
        const history = this.getClosedHistory();
        if (!history || history.length === 0) {
            const i18n = this.getI18n();
            this.showMessage(i18n.noClosedTabsToRestore || "暂无可撤销关闭的页签");
            return false;
        }
        const last = history[0];
        if (!last || !last.rootId) return false;
        void this.removeClosedHistoryEntry(last.rootId).catch((err) =>
            logger.warn("removeClosedHistoryEntry in undo fail", err)
        );
        closeOverlay?.();
        if (this.isMobile() && typeof this.mobileOpenDoc === "function") {
            void this.mobileOpenDoc(last.rootId);
        } else {
            void this.bridge.openTab({ app: this.getApp(), doc: { id: last.rootId } });
        }
        const i18n = this.getI18n();
        this.showMessage((i18n.restoredClosedTab || "已恢复页签：{x}").replace("{x}", last.title || last.rootId));
        return true;
    }

    public captureRecentOpenSnapshot(tabs: Array<{ rootId?: string; title?: string }>): void {
        const next = new Map<string, string>();
        tabs.forEach((tab) => {
            if (tab.rootId) {
                next.set(tab.rootId, tab.title || tab.rootId);
            }
        });
        this.recentOpenSnapshot = next;
    }

    public async syncRecentClosedFromSnapshot(
        tabs: Array<{ rootId?: string; title?: string }>,
        generation?: number
    ): Promise<void> {
        if (this.recentOpenSnapshot.size === 0) return;
        await this.ensureTier2Loaded();
        const current = new Set<string>();
        tabs.forEach((tab) => {
            if (tab.rootId) current.add(tab.rootId);
        });
        let state: { open: unknown[]; closed: IClosedHistoryItem[] } = {
            open: [],
            closed: this.getClosedHistory(),
        };
        this.recentOpenSnapshot.forEach((title, rootId) => {
            if (!current.has(rootId)) {
                state = applyRecentEvent(state, { type: "close", rootId, title, closedAt: Date.now() }) as typeof state;
            }
        });
        const closed = normalizeClosedEntries(state.closed, HISTORY_MAX).items;
        const previousClosed = this.getClosedHistory();
        if (
            closed.length !== previousClosed.length ||
            closed.some((item: any, index: number) => item.rootId !== previousClosed[index]?.rootId)
        ) {
            await this.saveTier2(CLOSED_HISTORY_KEY, closed);
        }
        this.recentOpenSnapshot = new Map(
            tabs.map((tab) => (tab.rootId ? [tab.rootId, tab.title || tab.rootId] as [string, string] : null))
                .filter((item): item is [string, string] => Boolean(item))
        );
    }
}
