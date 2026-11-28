export interface IKernelRequestOptions {
    timeoutMs?: number;
    signal?: AbortSignal;
}

export interface IHostBridge {
    fetchKernelJson<T = any>(endpoint: string, payload?: any, options?: IKernelRequestOptions): Promise<T>;
    withDocLock<T>(docId: string, action: () => Promise<T>): Promise<T>;
    getAllTabs(): any[];
    getActiveTab(): any | null;
    openTab(options: any): Promise<any>;
    closeTab(tabId: string): Promise<boolean>;
    emitEcosystemEvent(event: string, detail?: any): void;
    subscribeEcosystemEvent(event: string, handler: (detail: any) => void): () => void;
    showNotice(message: string, timeoutMs?: number, icon?: "info" | "error"): void;
}
