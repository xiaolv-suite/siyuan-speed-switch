import type { IHostBridge } from "../../core/types/bridge";
import type { ITieredStorageEngine } from "../../core/types/storage";
import type { IDisposableRegistry, IDisposable } from "../../core/types/disposer";

export type QuickActionTarget = "desktop" | "sidebar" | "mobile";

export interface IQuickActionOptions {
    id: string;
    label: string;
    icon?: string;
    value?: string;
    targets?: QuickActionTarget[];
    handler: (value: string) => void | Promise<void>;
}

export interface IQuickActionDeps {
    bridge: IHostBridge;
    storage: ITieredStorageEngine;
    disposer: IDisposableRegistry;
    isMobile: () => boolean;
    getI18n?: () => Record<string, string>;
    showMessage?: (msg: string, timeoutMs?: number, icon?: "info" | "error") => void;
    refreshPanels?: () => void;
}

export interface IQuickActionService extends IDisposable {
    registerQuickActionAdapter(
        id: string,
        handler: (value: string) => void | Promise<void>,
        targets?: QuickActionTarget[]
    ): () => void;
    registerQuickAction(options: IQuickActionOptions): () => void;
    getAdapters(): Map<string, (value: string) => void | Promise<void>>;
    getAdapterTargets(): Map<string, QuickActionTarget[]>;
    getRegistry(): any;
    executeQuickAction(
        action: any,
        options: {
            surface?: QuickActionTarget;
            close?: () => void;
            getDockByType?: (type: string) => any;
            plugins?: any[];
            handlers?: Record<string, any>;
        }
    ): Promise<{ ok: boolean; reason?: string }>;
}
