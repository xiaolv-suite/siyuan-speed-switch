import {showMessage as lvShowMessage} from "../libs/lv-notice-kit";
import type {HostBridge} from "../core/bridge";

export interface INoticeHost {
    bridge?: HostBridge;
}

let activePluginInstance: INoticeHost | null = null;

export function setActivePluginInstance(instance: INoticeHost | null): void {
    activePluginInstance = instance;
}

export function getActivePluginInstance(): INoticeHost | null {
    return activePluginInstance;
}

export function showMessage(message: string, timeoutMs: number = 5000, icon?: "info" | "error"): void {
    if (activePluginInstance?.bridge) {
        activePluginInstance.bridge.showNotice(message, timeoutMs, icon);
    } else {
        lvShowMessage(message, timeoutMs, icon);
    }
}
