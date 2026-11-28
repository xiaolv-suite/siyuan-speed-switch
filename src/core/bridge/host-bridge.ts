import type { IHostBridge, IKernelRequestOptions } from "../types/bridge";
import { executeWithDocLock, displayNotice, dispatchEcosystemEvent, listenEcosystemEvent } from "./ecosystem-adapter";

export interface IHostBridgeOptions {
    fetchKernelJson?: (endpoint: string, payload?: any, timeoutOrOptions?: any, options?: any) => Promise<any>;
    getAllTabs?: () => any[];
    getActiveTab?: () => any | null;
    openTab?: (options: any) => Promise<any>;
    closeTab?: (tabId: string) => Promise<boolean>;
    withDocLock?: <T>(docId: string, action: () => Promise<T>) => Promise<T>;
    showNotice?: (message: string, timeoutMs?: number, icon?: "info" | "error") => void;
    emitEcosystemEvent?: (event: string, detail?: any) => void;
    subscribeEcosystemEvent?: (event: string, handler: (detail: any) => void) => () => void;
    isMobile?: boolean;
}

export class HostBridge implements IHostBridge {
    private readonly options: IHostBridgeOptions;
    public readonly callCounts = {
        fetchKernelJson: 0,
        withDocLock: 0,
        getAllTabs: 0,
        getActiveTab: 0,
        openTab: 0,
        closeTab: 0,
        showNotice: 0,
        emitEcosystemEvent: 0,
        subscribeEcosystemEvent: 0,
    };

    constructor(options: IHostBridgeOptions = {}) {
        this.options = options;
    }

    public async fetchKernelJson<T = any>(
        endpoint: string,
        payload?: any,
        timeoutOrOptions?: any,
        options?: any
    ): Promise<T> {
        this.callCounts.fetchKernelJson++;
        if (this.options.fetchKernelJson) {
            return await this.options.fetchKernelJson(endpoint, payload, timeoutOrOptions, options);
        }

        // Default native fallback
        if (typeof endpoint !== "string" || !endpoint.startsWith("/")) {
            throw new Error(`Invalid kernel endpoint: ${endpoint}`);
        }

        const requestOptions = typeof timeoutOrOptions === "number" ? options : timeoutOrOptions;
        const init: RequestInit = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload !== undefined ? JSON.stringify(payload) : "{}",
            ...(requestOptions?.signal ? { signal: requestOptions.signal } : {}),
        };

        const response = await fetch(endpoint, init);
        if (!response.ok) {
            throw Object.assign(new Error(`Kernel HTTP error: ${response.status}`), {
                status: response.status,
            });
        }
        return (await response.json()) as T;
    }

    public async withDocLock<T>(docId: string, action: () => Promise<T>): Promise<T> {
        this.callCounts.withDocLock++;
        if (this.options.withDocLock) {
            return await this.options.withDocLock(docId, action);
        }
        return await executeWithDocLock(docId, action);
    }

    public getAllTabs(): any[] {
        this.callCounts.getAllTabs++;
        if (this.options.getAllTabs) {
            return this.options.getAllTabs();
        }
        return [];
    }

    public getActiveTab(): any | null {
        this.callCounts.getActiveTab++;
        if (this.options.getActiveTab) {
            return this.options.getActiveTab();
        }
        return null;
    }

    public async openTab(tabOptions: any): Promise<any> {
        this.callCounts.openTab++;
        if (this.options.openTab) {
            return await this.options.openTab(tabOptions);
        }
        return null;
    }

    public async closeTab(tabId: string): Promise<boolean> {
        this.callCounts.closeTab++;
        if (this.options.closeTab) {
            return await this.options.closeTab(tabId);
        }
        const tabs = this.getAllTabs();
        const target = tabs.find((t: any) => t?.id === tabId);
        if (target && typeof target.close === "function") {
            target.close();
            return true;
        }
        return false;
    }

    public emitEcosystemEvent(event: string, detail?: any): void {
        this.callCounts.emitEcosystemEvent++;
        if (this.options.emitEcosystemEvent) {
            this.options.emitEcosystemEvent(event, detail);
            return;
        }
        dispatchEcosystemEvent(event, detail);
    }

    public subscribeEcosystemEvent(event: string, handler: (detail: any) => void): () => void {
        this.callCounts.subscribeEcosystemEvent++;
        if (this.options.subscribeEcosystemEvent) {
            return this.options.subscribeEcosystemEvent(event, handler);
        }
        return listenEcosystemEvent(event, handler);
    }

    public showNotice(message: string, timeoutMs: number = 5000, icon?: "info" | "error"): void {
        this.callCounts.showNotice++;
        if (this.options.showNotice) {
            this.options.showNotice(message, timeoutMs, icon);
            return;
        }
        displayNotice(message, timeoutMs, icon);
    }
}

export function createHostBridge(options: IHostBridgeOptions = {}): HostBridge {
    return new HostBridge(options);
}
