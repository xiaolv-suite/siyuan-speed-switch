import type { IHostBridge } from "../../core/types/bridge";
import type { ITieredStorageEngine } from "../../core/types/storage";
import type { IDisposableRegistry, IDisposable } from "../../core/types/disposer";

export interface ITabSummary {
    id: string;
    title: string;
    rootId?: string;
    notebookId?: string;
    path?: string;
    icon?: string;
}

export interface IOpenHistoryItem {
    key: string;
    rootId?: string;
    title?: string;
    ts: number;
}

export interface IClosedHistoryItem {
    rootId: string;
    title: string;
    closedAt: number;
}

export interface INavigationDeps {
    bridge: IHostBridge;
    storage: ITieredStorageEngine;
    disposer: IDisposableRegistry;
    isMobile: () => boolean;
    getApp?: () => any;
    getI18n?: () => Record<string, string>;
    showMessage?: (message: string, timeoutMs?: number, icon?: "info" | "error") => void;
    scheduleAnimationFrame?: (cb: () => void) => void;
    getData?: (key: string) => any;
    setData?: (key: string, val: any) => void;
    saveDataDebounced?: (key: string, data?: any) => void;
    isTier2Ready?: () => boolean;
}

export interface INavigationService extends IDisposable {
    getMru(): string[];
    recordMru(pinKey: string): string[];
    getOpenHistory(): IOpenHistoryItem[];
    getClosedHistory(): IClosedHistoryItem[];
    recordOpenHistory(tab: any): Promise<void>;
    removeOpenHistoryEntry(key: string): Promise<boolean>;
    removeClosedHistoryEntry(rootId: string): Promise<boolean>;
    undoLastClosedTab(closeOverlay?: () => void): boolean;
    captureRecentOpenSnapshot(tabs: any[]): void;
    syncRecentClosedFromSnapshot(tabs: any[], generation?: number): Promise<void>;

    // Thumbnail Engine capabilities
    sanitizeThumbHtml(html: string): DocumentFragment | null;
    cloneLimitedContent(source: HTMLElement, max: number): HTMLElement;
    getThumbSource(tab: any): HTMLElement | null;
    applyThumbContent(thumb: HTMLElement, source: HTMLElement, title: string): boolean;
    flushPendingThumbScales(): void;
    rescaleThumbs(container: HTMLElement): void;
    cancelThumbFetches(): void;
}
