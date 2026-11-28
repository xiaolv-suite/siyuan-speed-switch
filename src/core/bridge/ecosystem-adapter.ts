/**
 * Ecosystem Adapter
 * Provides safe bindings to lv-notice-kit and shared ecosystem utilities.
 */
import { withDocLock as lvWithDocLock, showMessage } from "../../libs/lv-notice-kit";

export async function executeWithDocLock<T>(docId: string, action: () => Promise<T>): Promise<T> {
    if (typeof lvWithDocLock === "function") {
        return await lvWithDocLock(docId, action);
    }
    return await action();
}

export function displayNotice(message: string, timeoutMs: number = 5000, icon?: "info" | "error"): void {
    if (typeof showMessage === "function") {
        showMessage(message, timeoutMs, icon);
    }
}

export function dispatchEcosystemEvent(eventName: string, detail?: any): void {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        const event = new CustomEvent(eventName, { detail, bubbles: true });
        window.dispatchEvent(event);
    }
}

export function listenEcosystemEvent(eventName: string, handler: (detail: any) => void): () => void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
        return () => {};
    }
    const listener = (event: Event) => {
        const customEvent = event as CustomEvent;
        handler(customEvent.detail);
    };
    window.addEventListener(eventName, listener);
    return () => {
        window.removeEventListener(eventName, listener);
    };
}
