import type { ITieredStorageEngine } from "../types/storage";

export interface IStorageDriver {
    loadData: (key: string) => Promise<any>;
    saveData: (key: string, data: any) => Promise<void>;
}

export interface ITieredStorageOptions {
    driver: IStorageDriver;
    defaultDebounceMs?: number;
    tier2Loader?: () => Promise<Record<string, any>>;
    beforeSave?: (key: string) => Promise<void>;
    onSaveStatusChange?: (key: string, status: "pending" | "ok" | "failed", error?: any) => void;
    getPendingData?: (key: string) => any;
}

export class TieredStorageEngine implements ITieredStorageEngine {
    private readonly driver: IStorageDriver;
    private readonly defaultDebounceMs: number;
    private readonly tier2Loader?: () => Promise<Record<string, any>>;
    private readonly beforeSave?: (key: string) => Promise<void>;
    private readonly onSaveStatusChange?: (key: string, status: "pending" | "ok" | "failed", error?: any) => void;
    private readonly getPendingData?: (key: string) => any;

    private readonly tier1Cache = new Map<string, any>();
    private readonly tier2Cache = new Map<string, any>();
    private tier2Loaded = false;
    private tier2LoadingPromise?: Promise<void>;

    private readonly pendingData = new Map<string, any>();
    private readonly saveTimers = new Map<string, any>();
    private readonly saveChains = new Map<string, Promise<void>>();

    private _isFlushing = false;

    constructor(options: ITieredStorageOptions) {
        this.driver = options.driver;
        this.defaultDebounceMs = options.defaultDebounceMs ?? 300;
        this.tier2Loader = options.tier2Loader;
        this.beforeSave = options.beforeSave;
        this.onSaveStatusChange = options.onSaveStatusChange;
        this.getPendingData = options.getPendingData;
    }

    public get isFlushing(): boolean {
        return this._isFlushing;
    }

    public get activeTimersCount(): number {
        return this.saveTimers.size;
    }

    public get activeChainsCount(): number {
        return this.saveChains.size;
    }

    public hasPendingTimer(key: string): boolean {
        return this.saveTimers.has(key);
    }

    public hasActiveChain(key: string): boolean {
        return this.saveChains.has(key);
    }

    public getTier1<T = any>(key: string, defaultValue?: T): T {
        if (this.tier1Cache.has(key)) {
            return this.tier1Cache.get(key);
        }
        return defaultValue as T;
    }

    public setTier1<T = any>(key: string, value: T, debounceMs?: number): void {
        this.tier1Cache.set(key, value);
        this.saveDataDebounced(key, value, debounceMs);
    }

    public async ensureTier2Loaded(): Promise<void> {
        if (this.tier2Loaded) return;
        if (this.tier2LoadingPromise) return this.tier2LoadingPromise;

        this.tier2LoadingPromise = (async () => {
            if (this.tier2Loader) {
                const data = await this.tier2Loader();
                if (data && typeof data === "object") {
                    for (const [k, v] of Object.entries(data)) {
                        this.tier2Cache.set(k, v);
                    }
                }
            }
            this.tier2Loaded = true;
        })().finally(() => {
            this.tier2LoadingPromise = undefined;
        });

        return this.tier2LoadingPromise;
    }

    public isTier2Loaded(): boolean {
        return this.tier2Loaded;
    }

    public setTier2Sync<T = any>(key: string, value: T, debounceMs?: number): void {
        this.tier2Cache.set(key, value);
        this.saveDataDebounced(key, value, debounceMs);
    }

    public peekTier2<T = any>(key: string, defaultValue?: T): T {
        if (this.tier2Cache.has(key)) {
            return this.tier2Cache.get(key);
        }
        return defaultValue as T;
    }

    public async getTier2<T = any>(key: string, defaultValue?: T): Promise<T> {
        if (!this.tier2Loaded) await this.ensureTier2Loaded();
        if (this.tier2Cache.has(key)) {
            return this.tier2Cache.get(key);
        }
        return defaultValue as T;
    }

    public async setTier2<T = any>(key: string, value: T, debounceMs?: number): Promise<void> {
        if (!this.tier2Loaded) await this.ensureTier2Loaded();
        this.tier2Cache.set(key, value);
        this.saveDataDebounced(key, value, debounceMs);
    }

    public saveDataDebounced(key: string, data?: any, delayMs?: number): void {
        if (data !== undefined) {
            this.pendingData.set(key, data);
        } else if (this.getPendingData) {
            const externalData = this.getPendingData(key);
            if (externalData !== undefined) {
                this.pendingData.set(key, externalData);
            }
        } else if (this.tier1Cache.has(key)) {
            this.pendingData.set(key, this.tier1Cache.get(key));
        } else if (this.tier2Cache.has(key)) {
            this.pendingData.set(key, this.tier2Cache.get(key));
        }

        const existingTimer = this.saveTimers.get(key);
        if (existingTimer !== undefined) {
            clearTimeout(existingTimer);
        }

        const waitMs = delayMs ?? this.defaultDebounceMs;
        const timer = setTimeout(() => {
            this.saveTimers.delete(key);
            let val = this.pendingData.get(key);
            if (val === undefined && this.getPendingData) {
                val = this.getPendingData(key);
            }
            this.pendingData.delete(key);
            void this.queueSave(key, val);
        }, waitMs);

        this.saveTimers.set(key, timer);
    }

    public queueSave(key: string, value: any): Promise<void> {
        this.onSaveStatusChange?.(key, "pending");

        const previousChain = this.saveChains.get(key) || Promise.resolve();
        const guardPromise = this.beforeSave ? this.beforeSave(key) : Promise.resolve();

        const currentSave = Promise.all([previousChain.catch(() => {}), guardPromise])
            .then(() => this.driver.saveData(key, value))
            .then(() => {
                this.onSaveStatusChange?.(key, "ok");
            })
            .catch((err) => {
                this.onSaveStatusChange?.(key, "failed", err);
                throw err;
            });

        this.saveChains.set(key, currentSave);

        // Clean up completed chain without unhandled rejection
        void currentSave
            .catch(() => {})
            .finally(() => {
                if (this.saveChains.get(key) === currentSave) {
                    this.saveChains.delete(key);
                }
            });

        return currentSave;
    }

    public async flush(): Promise<void> {
        this._isFlushing = true;
        const flushErrors: any[] = [];
        try {
            let rounds = 0;
            // 循环排空保护：覆盖 flush 执行期间产生的新排队链/新去抖写竞态
            while ((this.saveTimers.size > 0 || this.saveChains.size > 0) && rounds < 50) {
                rounds++;
                // 1. 立即清空并触发所有待写定时器
                for (const [key, timer] of Array.from(this.saveTimers.entries())) {
                    clearTimeout(timer);
                    this.saveTimers.delete(key);
                    let data = this.pendingData.get(key);
                    if (data === undefined && this.getPendingData) {
                        data = this.getPendingData(key);
                    }
                    this.pendingData.delete(key);
                    void this.queueSave(key, data);
                }

                // 2. allSettled 等待当前全部在途写链全部结算，失败不中断排空、慢链不遗漏
                const activeChains = Array.from(this.saveChains.values());
                if (activeChains.length > 0) {
                    const results = await Promise.allSettled(activeChains);
                    for (const res of results) {
                        if (res.status === "rejected") {
                            flushErrors.push(res.reason);
                        }
                    }
                }
            }

            if (this.saveTimers.size > 0 || this.saveChains.size > 0) {
                const unhandledKeys = [...this.saveTimers.keys(), ...this.saveChains.keys()];
                throw new Error(`Flush failed to drain within 50 rounds: remaining keys [${unhandledKeys.join(", ")}]`);
            }

            if (flushErrors.length > 0) {
                const firstErr = flushErrors[0];
                throw Object.assign(firstErr instanceof Error ? firstErr : new Error(String(firstErr)), {
                    flushErrors,
                });
            }
        } finally {
            this._isFlushing = false;
        }
    }
}

export function createTieredStorageEngine(options: ITieredStorageOptions): TieredStorageEngine {
    return new TieredStorageEngine(options);
}
