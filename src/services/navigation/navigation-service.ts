import type {
    INavigationService,
    INavigationDeps,
    IOpenHistoryItem,
    IClosedHistoryItem,
} from "./types";
import { ThumbnailEngine } from "./thumbnail-engine";
import { MruTracker } from "./mru-tracker";

export class NavigationService implements INavigationService {
    private readonly thumbnailEngine: ThumbnailEngine;
    private readonly mruTracker: MruTracker;
    private isDisposed = false;

    constructor(deps: INavigationDeps) {
        this.thumbnailEngine = new ThumbnailEngine({
            isMobile: deps.isMobile,
            scheduleAnimationFrame: deps.scheduleAnimationFrame,
        });
        this.mruTracker = new MruTracker({
            bridge: deps.bridge,
            storage: deps.storage,
            isMobile: deps.isMobile,
            getI18n: deps.getI18n,
            showMessage: deps.showMessage,
            getApp: deps.getApp,
            getData: deps.getData,
            setData: deps.setData,
            saveDataDebounced: deps.saveDataDebounced,
            isTier2Ready: deps.isTier2Ready,
        });

        deps.disposer.register(this);
    }

    public getMru(): string[] {
        return this.mruTracker.getMru();
    }

    public recordMru(pinKey: string): string[] {
        return this.mruTracker.recordMru(pinKey);
    }

    public getOpenHistory(): IOpenHistoryItem[] {
        return this.mruTracker.getOpenHistory();
    }

    public getClosedHistory(): IClosedHistoryItem[] {
        return this.mruTracker.getClosedHistory();
    }

    public async recordOpenHistory(entryOrTab: any): Promise<void> {
        const key = entryOrTab?.key || entryOrTab?.pinKey || entryOrTab?.id || "";
        const rootId = entryOrTab?.rootId || entryOrTab?.rootID || "";
        const title = entryOrTab?.title || key;
        return this.mruTracker.recordOpenHistory(key, rootId, title);
    }

    public async removeOpenHistoryEntry(key: string): Promise<boolean> {
        return this.mruTracker.removeOpenHistoryEntry(key);
    }

    public async removeClosedHistoryEntry(rootId: string): Promise<boolean> {
        return this.mruTracker.removeClosedHistoryEntry(rootId);
    }

    public undoLastClosedTab(closeOverlay?: () => void): boolean {
        return this.mruTracker.undoLastClosedTab(closeOverlay);
    }

    public captureRecentOpenSnapshot(tabs: any[]): void {
        this.mruTracker.captureRecentOpenSnapshot(tabs);
    }

    public async syncRecentClosedFromSnapshot(tabs: any[], generation?: number): Promise<void> {
        return this.mruTracker.syncRecentClosedFromSnapshot(tabs, generation);
    }

    public sanitizeThumbHtml(html: string): DocumentFragment | null {
        return this.thumbnailEngine.sanitizeThumbHtml(html);
    }

    public cloneLimitedContent(source: HTMLElement, max: number): HTMLElement {
        return this.thumbnailEngine.cloneLimitedContent(source, max);
    }

    public getThumbSource(tab: any): HTMLElement | null {
        return this.thumbnailEngine.getThumbSource(tab);
    }

    public applyThumbContent(thumb: HTMLElement, source: HTMLElement, title: string): boolean {
        return this.thumbnailEngine.applyThumbContent(thumb, source, title);
    }

    public flushPendingThumbScales(): void {
        this.thumbnailEngine.flushPendingThumbScales();
    }

    public rescaleThumbs(container: HTMLElement): void {
        this.thumbnailEngine.rescaleThumbs(container);
    }

    public cancelThumbFetches(): void {
        this.thumbnailEngine.cancelThumbFetches();
    }

    public dispose(): void {
        if (this.isDisposed) return;
        this.isDisposed = true;
        this.thumbnailEngine.cancelThumbFetches();
        this.thumbnailEngine.pendingThumbScales = [];
    }
}

export function createNavigationService(deps: INavigationDeps): NavigationService {
    return new NavigationService(deps);
}
