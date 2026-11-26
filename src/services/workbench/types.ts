import type { IHostBridge } from "../../core/types/bridge";
import type { ITieredStorageEngine } from "../../core/types/storage";
import type { IDisposableRegistry, IDisposable } from "../../core/types/disposer";

export type DeviceType = "desktop" | "mobile" | "sidebar";

export interface IWorkbenchDeps {
    bridge: IHostBridge;
    storage: ITieredStorageEngine;
    disposer: IDisposableRegistry;
    isMobile: () => boolean;
    getI18n?: () => Record<string, string>;
    showMessage?: (msg: string, timeoutMs?: number, icon?: "info" | "error") => void;
}

export interface IWorkbenchService extends IDisposable {
    registerAdapter(raw: any): { registered: boolean; reason?: string; unregister: () => boolean };
    listModules(device?: DeviceType): any[];
    read(moduleId: string, device?: DeviceType, config?: Record<string, unknown>, options?: Record<string, unknown>): Promise<any>;
    getDiagnostics(): any;
}
