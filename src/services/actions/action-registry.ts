import type { IQuickActionOptions, QuickActionTarget } from "./types";
import { normalizeQuickActionText } from "../../util";

import { createQuickActionRegistry } from "../../quick-actions";

export class ActionRegistry {
    public readonly adapters = new Map<string, (value: string) => void | Promise<void>>();
    public readonly adapterTargets = new Map<string, QuickActionTarget[]>();
    public readonly providers = new Map<string, any>();
    public readonly providerTokens = new Map<string, symbol>();
    public readonly registry = createQuickActionRegistry();
    private readonly onRefresh?: () => void;

    constructor(onRefresh?: () => void) {
        this.onRefresh = onRefresh;
    }

    public registerAdapter(
        id: string,
        handler: (value: string) => void | Promise<void>,
        targets?: QuickActionTarget[]
    ): () => void {
        if (!/^[A-Za-z0-9._:-]+$/.test(id) || typeof handler !== "function") {
            return () => undefined;
        }
        this.adapters.set(id, handler);
        if (Array.isArray(targets)) {
            this.adapterTargets.set(
                id,
                targets.filter((target, index, list) =>
                    ["desktop", "sidebar", "mobile"].includes(target) && list.indexOf(target) === index
                )
            );
        } else {
            this.adapterTargets.delete(id);
        }
        this.onRefresh?.();
        return () => {
            if (this.adapters.get(id) === handler) {
                this.adapters.delete(id);
                this.adapterTargets.delete(id);
                this.onRefresh?.();
            }
        };
    }

    public registerAction(options: IQuickActionOptions): () => void {
        if (!options || !/^[A-Za-z0-9._:-]+$/.test(options.id) || typeof options.handler !== "function") {
            return () => undefined;
        }
        const adapterId = options.id;
        const actionValue = options.value ? `${adapterId}/${options.value}` : adapterId;
        const registrationToken = Symbol(actionValue);
        this.providerTokens.set(actionValue, registrationToken);
        const declaredTargets = Array.isArray(options.targets) ? options.targets : undefined;
        this.registry.register(
            {
                id: adapterId,
                name: options.label,
                targets: declaredTargets,
                actions: [
                    {
                        value: options.value || "action",
                        label: options.label,
                        icon: options.icon || "iconPlugin",
                        kind: "adapter",
                    },
                ],
            },
            (action: { value?: string }) => options.handler(String(action?.value || "").replace(`${adapterId}/`, ""))
        );
        const unregisterAdapter = this.registerAdapter(adapterId, options.handler, declaredTargets);
        this.providers.set(actionValue, {
            id: adapterId,
            label: normalizeQuickActionText(options.label, 80),
            icon: options.icon || "iconPlugin",
            value: actionValue,
            targets: declaredTargets,
        });

        return () => {
            if (this.providerTokens.get(actionValue) !== registrationToken) return;
            this.providerTokens.delete(actionValue);
            this.providers.delete(actionValue);
            this.registry.unregister(adapterId);
            unregisterAdapter();
        };
    }

    public clear(): void {
        this.adapters.clear();
        this.adapterTargets.clear();
        this.providers.clear();
        this.providerTokens.clear();
    }
}
