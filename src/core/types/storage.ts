export interface ITieredStorageEngine {
    getTier1<T = any>(key: string, defaultValue?: T): T;
    setTier1<T = any>(key: string, value: T): void;
    getTier2<T = any>(key: string, defaultValue?: T): Promise<T>;
    setTier2<T = any>(key: string, value: T): Promise<void>;
    peekTier2?<T = any>(key: string, defaultValue?: T): T;
    isTier2Loaded?(): boolean;
    setTier2Sync?<T = any>(key: string, value: T, debounceMs?: number): void;
    ensureTier2Loaded?(): Promise<void>;
    saveDataDebounced(key: string, data: any, delayMs?: number): void;
    flush(): Promise<void>;
    readonly isFlushing: boolean;
}
