import type { IHostBridge } from "../core/types/bridge";
import type { ITieredStorageEngine } from "../core/types/storage";
import type { IDisposableRegistry } from "../core/types/disposer";
import type { INavigationService } from "../services/navigation";
import type { ISearchService } from "../services/search";
import type { IQuickActionService } from "../services/actions";
import type { IWorkbenchService } from "../services/workbench";
import type { IFloatingBallService } from "../services/ball";

export type SurfaceKind = "switcher" | "mobile" | "workbench" | "palette" | "settings" | "studio";

export interface ISurfaceContext {
    readonly bridge: IHostBridge;
    readonly storage: ITieredStorageEngine;
    readonly disposer: IDisposableRegistry;
    readonly navigation: INavigationService;
    readonly search: ISearchService;
    readonly actions: IQuickActionService;
    readonly workbench: IWorkbenchService;
    readonly ball: IFloatingBallService;
    readonly isMobile: () => boolean;
    readonly getI18n: () => Record<string, string>;
}
