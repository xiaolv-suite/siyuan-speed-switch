import type {
    IQuickActionService,
    IQuickActionDeps,
    IQuickActionOptions,
    QuickActionTarget,
} from "./types";
import { ActionRegistry } from "./action-registry";
import { logger } from "../../logger";

import { createFloatingBallActionExecutor } from "../../floating-ball-actions";

export class QuickActionService implements IQuickActionService {
    private readonly actionRegistry: ActionRegistry;
    private readonly isMobile: () => boolean;
    private readonly showMessage: (msg: string, timeoutMs?: number, icon?: "info" | "error") => void;
    private readonly getI18n: () => Record<string, string>;
    private isDisposed = false;

    constructor(deps: IQuickActionDeps) {
        this.actionRegistry = new ActionRegistry(deps.refreshPanels);
        this.isMobile = deps.isMobile;
        this.showMessage = deps.showMessage || (() => {});
        this.getI18n = deps.getI18n || (() => ({}));

        deps.disposer.register(this);
    }

    public registerQuickActionAdapter(
        id: string,
        handler: (value: string) => void | Promise<void>,
        targets?: QuickActionTarget[]
    ): () => void {
        return this.actionRegistry.registerAdapter(id, handler, targets);
    }

    public registerQuickAction(options: IQuickActionOptions): () => void {
        return this.actionRegistry.registerAction(options);
    }

    public getAdapters(): Map<string, (value: string) => void | Promise<void>> {
        return this.actionRegistry.adapters;
    }

    public getAdapterTargets(): Map<string, QuickActionTarget[]> {
        return this.actionRegistry.adapterTargets;
    }

    public getRegistry(): any {
        return this.actionRegistry.registry;
    }

    public get registry(): any {
        return this.actionRegistry.registry;
    }

    public get adapters(): Map<string, (value: string) => void | Promise<void>> {
        return this.actionRegistry.adapters;
    }

    public get adapterTargets(): Map<string, QuickActionTarget[]> {
        return this.actionRegistry.adapterTargets;
    }

    public get providers(): Map<string, any> {
        return this.actionRegistry.providers;
    }

    public get providerTokens(): Map<string, symbol> {
        return this.actionRegistry.providerTokens;
    }

    public clear(): void {
        this.actionRegistry.clear();
    }

    public async executeQuickAction(
        action: any,
        options: {
            surface?: QuickActionTarget;
            close?: () => void;
            getDockByType?: (type: string) => any;
            plugins?: any[];
            handlers?: Record<string, any>;
        }
    ): Promise<{ ok: boolean; reason?: string }> {
        const actionSurface = options.surface || (this.isMobile() ? "mobile" : "desktop");
        const executor = createFloatingBallActionExecutor({
            adapters: this.actionRegistry.adapters,
            registry: this.actionRegistry.registry,
            getDockByType: options.getDockByType || ((): any => null),
            plugins: options.plugins,
            context: { surface: actionSurface, source: "quick-actions" },
            close: options.close || (() => {}),
            ...(options.handlers || {}),
        });

        try {
            const result = await Promise.resolve(executor(action));
            if (result?.ok) return { ok: true };
            const reason = result?.reason === "failed" ? "failed" : "unavailable";
            logger.warn(`quick action ${reason}`, action?.value);
            const i18n = this.getI18n();
            this.showMessage(
                reason === "failed" ? (i18n.quickActionFailed || "执行快捷动作失败") : (i18n.quickActionUnavailable || "快捷动作暂不可用"),
                5000,
                "error"
            );
            return { ok: false, reason };
        } catch (error) {
            logger.warn("quick action dispatch error", error);
            const i18n = this.getI18n();
            this.showMessage(i18n.quickActionFailed || "执行快捷动作失败", 5000, "error");
            return { ok: false, reason: "failed" };
        }
    }

    public dispose(): void {
        if (this.isDisposed) return;
        this.isDisposed = true;
        this.actionRegistry.clear();
    }
}

export function createQuickActionService(deps: IQuickActionDeps): QuickActionService {
    return new QuickActionService(deps);
}
