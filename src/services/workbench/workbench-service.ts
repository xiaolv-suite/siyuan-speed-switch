import type { IWorkbenchService, IWorkbenchDeps, DeviceType } from "./types";
import { createHomeRuntime } from "../../home-runtime";

export class HomeWorkbenchService implements IWorkbenchService {
    private readonly runtime: any;
    private isDisposed = false;

    constructor(deps: IWorkbenchDeps) {
        this.runtime = createHomeRuntime();
        deps.disposer.register(this);
    }

    public get homeRuntime(): any {
        return this.runtime;
    }

    public registerAdapter(raw: any): { registered: boolean; reason?: string; unregister: () => boolean } {
        return this.runtime.registerAdapter(raw);
    }

    public listModules(device?: DeviceType): any[] {
        return this.runtime.listModules(device);
    }

    public async read(
        moduleId: string,
        device?: DeviceType,
        config?: Record<string, unknown>,
        options?: Record<string, unknown>
    ): Promise<any> {
        return this.runtime.read(moduleId, device, config, options);
    }

    public getDiagnostics(): any {
        if (typeof this.runtime.diagnostics === "function") {
            return this.runtime.diagnostics();
        }
        return null;
    }

    public dispose(): void {
        if (this.isDisposed) return;
        this.isDisposed = true;
        if (typeof this.runtime.dispose === "function") {
            this.runtime.dispose();
        }
    }
}

export function createHomeWorkbenchService(deps: IWorkbenchDeps): HomeWorkbenchService {
    return new HomeWorkbenchService(deps);
}
