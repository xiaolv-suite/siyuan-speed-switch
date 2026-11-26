import type {
    IFloatingBallService,
    IFloatingBallDeps,
    FloatingBallSurface,
    FloatingBallPosition,
} from "./types";
import { clampPosition } from "./ball-gesture-engine";

export class FloatingBallService implements IFloatingBallService {
    private readonly deps: IFloatingBallDeps;
    private isDisposed = false;

    constructor(deps: IFloatingBallDeps) {
        this.deps = deps;
        deps.disposer.register(this);
    }

    public clampPosition(position: Partial<FloatingBallPosition>): FloatingBallPosition {
        return clampPosition(position);
    }

    public persistPosition(surface: FloatingBallSurface, position: FloatingBallPosition): void {
        const settings = this.deps.getSettings() || {};
        const floatingBall = { ...(settings.floatingBall || {}) };
        const positionMap = { ...(floatingBall.position || {}) };
        positionMap[surface] = this.clampPosition(position);
        floatingBall.position = positionMap;
        this.deps.updateSettings({ floatingBall });
    }

    public cycleTab(offset: number, activeId?: string, allTabs?: any[]): { tab: any; index: number } | null {
        const tabs = Array.isArray(allTabs) ? allTabs : [];
        if (tabs.length === 0) return null;
        let currentIndex = activeId ? tabs.findIndex((t) => t.id === activeId) : 0;
        if (currentIndex === -1) currentIndex = 0;
        const targetIndex = (currentIndex + offset + tabs.length) % tabs.length;
        return { tab: tabs[targetIndex], index: targetIndex };
    }

    public buildHubPayload(
        surface: FloatingBallSurface,
        catalogActions: any[],
        options: Record<string, any> = {}
    ): Record<string, unknown> {
        return {
            surface,
            actions: catalogActions,
            tabs: options.tabs || [],
            favorites: options.favorites || [],
            recent: options.recent || [],
            docSets: options.docSets || [],
        };
    }

    public dispose(): void {
        if (this.isDisposed) return;
        this.isDisposed = true;
    }
}

export function createFloatingBallService(deps: IFloatingBallDeps): FloatingBallService {
    return new FloatingBallService(deps);
}
