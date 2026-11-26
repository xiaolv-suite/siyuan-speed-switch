import type { IHostBridge } from "./bridge";
import type { ITieredStorageEngine } from "./storage";
import type { IDisposableRegistry } from "./disposer";

export interface IPluginContext {
    readonly appId: string;
    readonly bridge: IHostBridge;
    readonly storage: ITieredStorageEngine;
    readonly disposer: IDisposableRegistry;
}
