import type { IHostBridge } from "../../core/types/bridge";
import type { ITieredStorageEngine } from "../../core/types/storage";
import type { IDisposableRegistry, IDisposable } from "../../core/types/disposer";

export type FloatingBallSurface = "desktop" | "mobile" | "sidebar";

export interface FloatingBallPosition {
    edge: "left" | "right";
    yRatio: number;
}

export interface IFloatingBallDeps {
    bridge: IHostBridge;
    storage: ITieredStorageEngine;
    disposer: IDisposableRegistry;
    isMobile: () => boolean;
    getSettings: () => any;
    updateSettings: (patch: Record<string, unknown>) => void;
    getQuickActions: () => any[];
    getI18n?: () => Record<string, string>;
}

export interface IFloatingBallService extends IDisposable {
    persistPosition(surface: FloatingBallSurface, position: FloatingBallPosition): void;
    clampPosition(position: Partial<FloatingBallPosition>): FloatingBallPosition;
    buildHubPayload(surface: FloatingBallSurface, catalogActions: any[], options?: Record<string, any>): Record<string, unknown>;
    cycleTab(offset: number, activeId?: string, allTabs?: any[]): { tab: any; index: number } | null;
}
