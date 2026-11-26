export interface RuntimeDomainConstructor {
    prototype: object;
}

export function bindRuntimeDomains<T extends object>(
    host: T,
    domains: readonly RuntimeDomainConstructor[],
): void {
    const target = host as Record<string, unknown>;
    for (const Domain of domains) {
        const proto = Domain.prototype as Record<string, unknown>;
        for (const key of Object.getOwnPropertyNames(proto)) {
            if (key === "constructor") continue;
            const descriptor = Object.getOwnPropertyDescriptor(proto, key);
            if (!descriptor || typeof descriptor.value !== "function") continue;
            if (typeof target[key] !== "function") {
                target[key] = (descriptor.value as (...args: unknown[]) => unknown).bind(host);
            }
        }
    }
}
