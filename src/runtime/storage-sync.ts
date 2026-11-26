import {lvActivity} from "../libs/lv-notice-kit";
import {logger} from "../logger";
import {sanitizeFavorites, sanitizeOpenHistory, sanitizeStringList, normalizeThumbCache} from "../util";
import {normalizeClosedEntries} from "../recent-closed";
import {runStorageMigration, KEY_ORDER, STORAGE_SCHEMA_VERSION} from "../storage-migration";
import {sanitizeQuickActions, migrateQuickActionDefaults, QUICK_ACTION_DEFAULTS_VERSION} from "../quick-actions";
import {normalizeDocumentSets} from "../document-sets";
import {normalizeRelatedSwrStore} from "../related-content-model";
import {normalizeSnippetGroupStore} from "../snippet-groups";
import {sanitizeHomeStateSecrets, restoreHomeStateSecrets} from "../home-model";
import {buildConfigPack, normalizeConfigPackImport} from "../config-pack-model";
import {SAVE_DEBOUNCE_MS, MESSAGE_DEFAULT_MS, THUMB_CACHE_MAX, THUMB_HTML_MAX, THUMB_CACHE_MAX_MOBILE, THUMB_HTML_MAX_MOBILE, HISTORY_MAX, FAVORITES_MAX, PINNED_MAX, FAVORITE_GROUPS_MAX, HISTORY_KEY, CLOSED_HISTORY_KEY, PINNED_KEY, FAV_KEY, FAV_GROUPS_KEY, THUMB_CACHE_KEY, RELATED_SWR_KEY, SNIPPET_GROUPS_KEY, QUICK_ACTIONS_KEY, QUICK_ACTIONS_DEFAULTS_KEY, HOME_STATE_KEY, DOCUMENT_SETS_KEY, QUICK_ACTIONS_MAX, PERSISTENT_KEYS, PERSISTENT_TIER1_KEYS, PERSISTENT_TIER2_KEYS, SCHEMA_VERSION_KEY} from "../constants";
import {type IQuickAction, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface StorageSyncRuntime extends Omit<ISpeedSwitchHost, "readTier1Keys" | "readTier2Keys" | "loadPersistentKeys" | "initPersistentData" | "loadTier2Storage" | "stampStorageSchemaVersion" | "sanitizeTier1Data" | "sanitizeTier2Data" | "sanitizePersistentData" | "captureStorageMigrationSnapshot" | "runQuickActionDefaultsMigration" | "saveDataDebounced" | "queueSave" | "flushPendingSaves" | "readDataMemo" | "syncNow"> {}
export class StorageSyncRuntime {
    // 底层纯只读槽位加载原语：纯读取、零写盘、不触发任何数据清洗与迁移
    private async readTier1Keys(): Promise<void> {
        await Promise.all(PERSISTENT_TIER1_KEYS.map((key) => this.loadData(key)));
    }

    private async readTier2Keys(): Promise<void> {
        await Promise.all(PERSISTENT_TIER2_KEYS.map((key) => this.loadData(key)));
    }

    // 只读取持久化 key、不产生任何写入：onDataChanged 显式重读路径
    // 纯读取、零写盘；若 Tier 2 已就绪则显式重读 Tier 1 与 Tier 2 全部槽位以同步外部变更，
    // 未就绪则仅重读 Tier 1，杜绝回环与漏读。
    private async loadPersistentKeys(): Promise<void> {
        await this.readTier1Keys();
        if (this.tier2Ready) {
            await this.readTier2Keys();
            if (this.data[RELATED_SWR_KEY]) {
                const relatedSwr = normalizeRelatedSwrStore(this.data[RELATED_SWR_KEY]);
                this.relatedSwrStore = new Map(relatedSwr.entries.map((entry) => [entry.rootId, entry]));
            }
        }
    }

    // 轨道 A 存储分级：启动关键路径仅读取 Tier 1（5 槽：settings/mru/pinned/quick-actions/floating-ball）
    public async loadTier1Keys(): Promise<void> {
        if (typeof performance !== "undefined" && typeof performance.mark === "function") {
            try { performance.mark("siyuan-speed-switch-tier1-start"); } catch { /* ignore */ }
        }
        await this.readTier1Keys();
        this.sanitizeTier1Data();
        this.runQuickActionDefaultsMigration();
        if (typeof performance !== "undefined" && typeof performance.mark === "function") {
            try {
                performance.mark("siyuan-speed-switch-tier1-end");
                if (typeof performance.measure === "function") {
                    performance.measure("siyuan-speed-switch-tier1-load", "siyuan-speed-switch-tier1-start", "siyuan-speed-switch-tier1-end");
                }
            } catch { /* ignore */ }
        }
    }

    // 预加载 Tier 1 持久化 key：loadData 写入 this.data，让 getMru 等能读到旧值
    private async initPersistentData() {
        await this.loadTier1Keys();
        // 加载期 sanitize：清理历史脏数据（0.16.5），仅在确实变化时回写，避免每次启动重写文件
        this.sanitizePersistentData();
        // 存储迁移演练快照（v0.20 数据连续性，D-386）：在宿主静默修复链之后运行
        // 同源演练管道，生成只读恢复报告存实例内存——不落盘、不重写数据。
        // 报告出现 cleaned/reset 即暴露宿主清洗缺口，是演练同源性的运行时验证。
        this.captureStorageMigrationSnapshot();
        this.runQuickActionDefaultsMigration();
        // 存储版本戳（D-401）：在全部加载期清洗与一次性迁移之后落戳——戳存在
        // 即代表"这份数据已经过当前版本的全部加载期处理"。仅在 onload 路径执行；
        // onDataChanged 钩子链禁写盘（写盘会再次广播形成回环），不做落戳。
        this.stampStorageSchemaVersion();
        // 收藏分组折叠状态：从持久化数据初始化（旧版本无此数据时为默认展开）
        this.initFavCollapsed();
    }

    public cancelTier2Schedule(): void {
        if (this.tier2ScheduledTimer !== undefined) {
            window.clearTimeout(this.tier2ScheduledTimer);
            this.tier2ScheduledTimer = undefined;
        }
        if (this.tier2IdleId !== undefined) {
            if (typeof window !== "undefined" && typeof (window as any).cancelIdleCallback === "function") {
                try {
                    (window as any).cancelIdleCallback(this.tier2IdleId);
                } catch { /* ignore */ }
            }
            this.tier2IdleId = undefined;
        }
    }

    public scheduleTier2Load(): void {
        if (this.tier2Ready || this.tier2LoadingPromise || this.isUnloading) return;
        this.cancelTier2Schedule();
        const executeLoad = () => {
            this.tier2ScheduledTimer = undefined;
            this.tier2IdleId = undefined;
            if (this.isUnloading || this.tier2Ready) return;
            void this.ensureTier2Loaded().then(() => {
                if (!this.isUnloading && this.notebookListCache === null && typeof this.loadNotebooks === "function" && typeof fetch === "function") {
                    void this.loadNotebooks().then((notebooks) => {
                        if (!this.isUnloading && this.notebookListCache === null && Array.isArray(notebooks) && notebooks.length > 0) {
                            this.notebookListCache = notebooks;
                        }
                    }).catch(() => {});
                }
            }).catch((err) => {
                logger.warn("[siyuan-speed-switch] Background Tier 2 load failed, retryable on-demand:", err);
            });
        };
        const scheduleIdle = () => {
            this.tier2ScheduledTimer = undefined;
            if (this.isUnloading || this.tier2Ready) return;
            if (typeof window !== "undefined" && typeof (window as any).requestIdleCallback === "function") {
                try {
                    this.tier2IdleId = (window as any).requestIdleCallback(() => executeLoad(), {timeout: 5000});
                    return;
                } catch { /* ignore and fallback */ }
            }
            executeLoad();
        };
        // 避开思源冷启动 10 秒窗口，延后至 11s + idle 错峰加载；打开切换器/工作台/实验室/设置时会由 ensureTier2Loaded() 立即按需读取
        this.tier2ScheduledTimer = window.setTimeout(scheduleIdle, 11000);
    }

    public ensureTier2Loaded(): Promise<void> {
        if (this.tier2Ready) return Promise.resolve();
        if (this.tier2LoadingPromise) return this.tier2LoadingPromise;
        this.cancelTier2Schedule();
        const generation = this.lifecycleGeneration;
        let flight: Promise<void>;
        flight = (async () => {
            try {
                await this.loadTier2Storage(generation);
            } catch (err) {
                if (this.lifecycleGeneration === generation && !this.isUnloading) {
                    this.tier2Ready = false;
                }
                throw err;
            } finally {
                if (this.tier2LoadingPromise === flight && this.lifecycleGeneration === generation) {
                    this.tier2LoadingPromise = undefined;
                }
            }
        })();
        this.tier2LoadingPromise = flight;
        return this.tier2LoadingPromise;
    }

    private async loadTier2Storage(generation: number): Promise<void> {
        if (this.isUnloading || this.lifecycleGeneration !== generation) return;
        if (typeof performance !== "undefined" && typeof performance.mark === "function") {
            try { performance.mark("siyuan-speed-switch-tier2-start"); } catch { /* ignore */ }
        }
        try {
            const pre = PERSISTENT_TIER2_KEYS.filter((k) => this.data?.[k] !== undefined).map((k) => [k, this.data[k]] as const);
            await this.readTier2Keys();
            if (this.isUnloading || this.lifecycleGeneration !== generation) return;
            for (const [k, v] of pre) this.data[k] = v;
            this.sanitizeTier2Data();
            this.tier2Ready = true;
        } catch (error) {
            if (this.lifecycleGeneration === generation && !this.isUnloading) {
                this.tier2Ready = false;
            }
            logger.warn("load Tier 2 data fail", error);
            throw error;
        } finally {
            if (typeof performance !== "undefined" && typeof performance.mark === "function") {
                try {
                    performance.mark("siyuan-speed-switch-tier2-end");
                    if (typeof performance.measure === "function") {
                        performance.measure("siyuan-speed-switch-tier2-load", "siyuan-speed-switch-tier2-start", "siyuan-speed-switch-tier2-end");
                    }
                } catch { /* ignore */ }
            }
        }
    }

    public getStartupPerformanceMetrics(): Record<string, number | undefined> {
        if (typeof performance === "undefined" || typeof performance.getEntriesByName !== "function") {
            return {};
        }
        const getMeasure = (name: string): number | undefined => {
            try {
                const entries = performance.getEntriesByName(name, "measure");
                if (entries && entries.length > 0) {
                    const duration = entries[entries.length - 1]?.duration;
                    return typeof duration === "number" && !Number.isNaN(duration) ? Math.round(duration * 100) / 100 : undefined;
                }
            } catch { /* ignore */ }
            return undefined;
        };
        return {
            onloadMs: getMeasure("siyuan-speed-switch-onload"),
            layoutReadyMs: getMeasure("siyuan-speed-switch-layoutready"),
            tier1LoadMs: getMeasure("siyuan-speed-switch-tier1-load"),
            tier2LoadMs: getMeasure("siyuan-speed-switch-tier2-load"),
        };
    }

    // 存储版本戳（D-401）：STORAGE_SCHEMA_VERSION 此前只存在于演练管道，
    // 无处持久化，因此无法识别"数据来自更新/更旧版本的插件"。
    // 语义：缺失或损坏 → 落当前版本；等于当前版本 → 幂等跳过（无写入）；
    // 小于当前版本 → 未来版本迁移入口，当前对齐后落戳；大于当前版本 →
    // 疑似降级：保留原值不覆写（抹掉会丢失证据），记录字段并告警。
    private applyStorageSchemaStamp() {
        const stored = this.data[SCHEMA_VERSION_KEY];
        if (stored === STORAGE_SCHEMA_VERSION) return;
        if (typeof stored === "number" && Number.isInteger(stored) && Number.isFinite(stored) && stored >= 1) {
            if (stored > STORAGE_SCHEMA_VERSION) {
                this.storageSchemaDowngradeFrom = stored;
                logger.warn("storage schema stamp is newer than the plugin (downgrade suspected); value preserved", {
                    stored,
                    current: STORAGE_SCHEMA_VERSION,
                });
                return;
            }
        }
        this.data[SCHEMA_VERSION_KEY] = STORAGE_SCHEMA_VERSION;
        this.saveDataDebounced(SCHEMA_VERSION_KEY);
    }

    private stampStorageSchemaVersion() {
        if (!this.tier2Ready) {
            this.pendingSchemaStamp = true;
            return;
        }
        this.pendingSchemaStamp = false;
        this.applyStorageSchemaStamp();
    }

    // 轨道 A 数据净化分级：Tier 1 数据净化（pinned、quick-actions）
    private sanitizeTier1Data() {
        const pinned = sanitizeStringList(this.data[PINNED_KEY], PINNED_MAX);
        if (pinned.changed) {
            this.data[PINNED_KEY] = pinned.items;
            this.saveDataDebounced(PINNED_KEY);
        }
        const quickActions = sanitizeQuickActions(this.data[QUICK_ACTIONS_KEY], QUICK_ACTIONS_MAX);
        if (quickActions.changed) {
            this.data[QUICK_ACTIONS_KEY] = quickActions.items;
            this.saveDataDebounced(QUICK_ACTIONS_KEY);
        }
    }

    // 轨道 A 数据净化分级：Tier 2 延迟载入后的数据净化、演练快照与版本落戳
    private sanitizeTier2Data() {
        const favorites = sanitizeFavorites(this.data[FAV_KEY], FAVORITES_MAX);
        if (favorites.changed) {
            this.data[FAV_KEY] = favorites.items;
            this.saveDataDebounced(FAV_KEY);
        }
        const groups = sanitizeStringList(this.data[FAV_GROUPS_KEY], FAVORITE_GROUPS_MAX);
        if (groups.changed) {
            this.data[FAV_GROUPS_KEY] = groups.items;
            this.saveDataDebounced(FAV_GROUPS_KEY);
        }
        const history = sanitizeOpenHistory(this.data[HISTORY_KEY], HISTORY_MAX);
        if (history.changed) {
            this.data[HISTORY_KEY] = history.items;
            this.saveDataDebounced(HISTORY_KEY);
        }
        const closedHistory = normalizeClosedEntries(this.data[CLOSED_HISTORY_KEY], HISTORY_MAX);
        if (closedHistory.changed) {
            this.data[CLOSED_HISTORY_KEY] = closedHistory.items;
            this.saveDataDebounced(CLOSED_HISTORY_KEY);
        }
        const documentSets = normalizeDocumentSets(this.data[DOCUMENT_SETS_KEY]);
        if (documentSets.changed || this.data[DOCUMENT_SETS_KEY]?.schemaVersion !== documentSets.schemaVersion) {
            this.data[DOCUMENT_SETS_KEY] = documentSets;
            this.saveDataDebounced(DOCUMENT_SETS_KEY);
        }
        const thumbCache = normalizeThumbCache(this.data[THUMB_CACHE_KEY], {
            max: this.isMobile ? THUMB_CACHE_MAX_MOBILE : THUMB_CACHE_MAX,
            htmlMax: this.isMobile ? THUMB_HTML_MAX_MOBILE : THUMB_HTML_MAX,
        });
        if (thumbCache.changed) {
            this.data[THUMB_CACHE_KEY] = thumbCache.cache;
            this.saveDataDebounced(THUMB_CACHE_KEY);
        }
        const relatedSwr = normalizeRelatedSwrStore(this.data[RELATED_SWR_KEY]);
        this.relatedSwrStore = new Map(relatedSwr.entries.map((entry) => [entry.rootId, entry]));
        if (relatedSwr.entries.length > 0 && JSON.stringify(this.data[RELATED_SWR_KEY]) !== JSON.stringify(relatedSwr)) {
            this.data[RELATED_SWR_KEY] = relatedSwr;
            this.saveDataDebounced(RELATED_SWR_KEY);
        }
        const snippetGroups = normalizeSnippetGroupStore(this.data[SNIPPET_GROUPS_KEY]);
        if (JSON.stringify(this.data[SNIPPET_GROUPS_KEY]) !== JSON.stringify(snippetGroups)) {
            this.data[SNIPPET_GROUPS_KEY] = snippetGroups;
            this.saveDataDebounced(SNIPPET_GROUPS_KEY);
        }
        this.captureStorageMigrationSnapshot();
        this.initFavCollapsed();
        if (this.pendingSchemaStamp) {
            this.pendingSchemaStamp = false;
            this.applyStorageSchemaStamp();
        }
    }

    // 加载期数据净化：收藏列表结构校验/按 key 去重，置顶与分组注册表过滤非法字符串
    private sanitizePersistentData() {
        this.sanitizeTier1Data();
        if (this.tier2Ready) {
            this.sanitizeTier2Data();
        }
    }

    // 存储迁移演练快照（D-386 第二步·保守桥接）：宿主静默修复链已执行完毕，
    // 此处用同源演练管道对 this.data 再做一次只读演练。理想情况下全部 kept；
    // 出现 cleaned/reset 即宿主清洗与演练管道存在缺口，报告即为发现机制。
    // 报告仅存实例内存（有界、无原始数据回显），不落盘、不重写 this.data。
    private captureStorageMigrationSnapshot() {
        const payloads: Record<string, unknown> = {};
        for (const key of KEY_ORDER) {
            payloads[key] = this.data[key];
        }
        const result = runStorageMigration(payloads, {
            // 端型上限必须与 sanitizePersistentData / setThumbCache 一致，否则演练会
            // 与宿主判级分叉：手机端缓存上限 30/80 KiB 比桌面 40/200 KiB 更紧，
            // 若演练恒用桌面上限，手机端宿主已清洗的 key 会在报告里显示为 kept，
            // 而 35 条缓存在手机端会显示 kept、实际宿主会 cleaned——报告就不再同源。
            limits: {
                thumbCache: this.isMobile ? THUMB_CACHE_MAX_MOBILE : THUMB_CACHE_MAX,
                thumbHtml: this.isMobile ? THUMB_HTML_MAX_MOBILE : THUMB_HTML_MAX,
            },
        });
        this.storageMigrationReport = result.report;
        const anomalies = result.report.keys.filter((entry) => entry.status === "cleaned" || entry.status === "reset" || entry.status === "migrated");
        if (anomalies.length > 0) {
            logger.warn("storage migration drill found gaps after host sanitize", {
                keys: anomalies.map((entry) => `${entry.key}:${entry.status}`).join(","),
            });
        }
    }

    // One-time migration: pre-marker quick-action bars were machine-written
    // from older default sets (auto-registered provider entries included).
    // Reset them to the current minimal defaults exactly once; from then on
    // the stored marker keeps user curation untouched.
    private runQuickActionDefaultsMigration() {
        const decision = migrateQuickActionDefaults(this.data[QUICK_ACTIONS_KEY], this.data[QUICK_ACTIONS_DEFAULTS_KEY]);
        if (!decision.migrated) return;
        this.data[QUICK_ACTIONS_KEY] = decision.items as IQuickAction[];
        this.saveDataDebounced(QUICK_ACTIONS_KEY);
        this.data[QUICK_ACTIONS_DEFAULTS_KEY] = QUICK_ACTION_DEFAULTS_VERSION;
        this.saveDataDebounced(QUICK_ACTIONS_DEFAULTS_KEY);
    }

    // T-6463 存储用量透明化：逐常量显式 loadData（存储 key 审计门禁要求首参为 *_KEY
    // 常量），测量近似 UTF-8 字节数；单 key 读取失败按 0 计，不拖垮整个报表。
    async measureStorageUsage(): Promise<Array<{key: string, bytes: number}>> {
        const encoder = new TextEncoder();
        const measure = async (key: string, value: Promise<unknown>): Promise<{key: string, bytes: number}> => {
            let bytes = 0;
            try {
                const data = await value;
                const json = data === undefined || data === null ? "" : JSON.stringify(data);
                bytes = encoder.encode(json).length;
            } catch {
                bytes = 0;
            }
            return {key, bytes};
        };
        return Promise.all(PERSISTENT_KEYS.map((key) => measure(key, this.loadData(key))));
    }

    // T-7004：存储结构健康（设置页存储标签消费）——stored=已落戳版本（缺失/损坏为
    // null），current=插件当前版本，downgradeFrom=检出「数据来自更新版本」的原始值
    // （D-401 降级保护证据，未覆写）。纯读取，不触发写入。
    getStorageSchemaHealth(): {stored: number | null; current: number; downgradeFrom: number | null} {
        const stored = this.data[SCHEMA_VERSION_KEY];
        const valid = typeof stored === "number" && Number.isInteger(stored) && Number.isFinite(stored) && stored >= 1;
        return {
            stored: valid ? stored : null,
            current: STORAGE_SCHEMA_VERSION,
            downgradeFrom: this.storageSchemaDowngradeFrom,
        };
    }

    private saveDataDebounced(key: string) {
        if (this.isUnloading) return;
        this.storage.saveDataDebounced(key, this.data[key], SAVE_DEBOUNCE_MS);
    }

    private queueSave(key: string, value: unknown): Promise<void> {
        return this.storage.queueSave(key, value);
    }

    // 立即落盘全部待写数据（卸载时调用，避免丢失最近一次去抖窗口内的改动）
    private flushPendingSaves(): Promise<void> {
        return this.storage.flush();
    }

    private readDataMemo<T>(key: string, sanitize: (raw: unknown) => T[]): T[] {
        const raw = this.data[key];
        const hit = this.dataMemos.get(key);
        if (hit && hit.raw === raw) return hit.items.slice() as T[];
        const items = sanitize(raw);
        this.dataMemos.set(key, {raw: this.data[key], items});
        return items.slice();
    }

    public async dumpData(): Promise<Record<string, unknown>> {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        const currentSettings = this.getSettings();
        const sanitizedSettings = {
            ...currentSettings,
            snippetGist: {...currentSettings.snippetGist, token: ""},
        };
        const runtimeModules = (this as unknown as {workbench?: {listModules?: () => unknown[]}}).workbench?.listModules?.() || [];
        const sanitizedHomeState = sanitizeHomeStateSecrets(this.data[HOME_STATE_KEY] ?? null, runtimeModules);
        return {
            version: this.data[SCHEMA_VERSION_KEY] ?? 1,
            exportedAt: new Date().toISOString(),
            snippetStack: this.getSnippetStack(),
            homeState: sanitizedHomeState,
            documentSets: this.data[DOCUMENT_SETS_KEY] ?? null,
            settings: sanitizedSettings,
            favorites: this.data[FAV_KEY] ?? null,
            favGroups: this.data[FAV_GROUPS_KEY] ?? null,
            pinned: this.data[PINNED_KEY] ?? null,
            quickActions: this.data[QUICK_ACTIONS_KEY] ?? null,
            snippetGroups: this.data[SNIPPET_GROUPS_KEY] ?? null,
        };
    }

    public async restoreData(data: Record<string, unknown>): Promise<boolean> {
        if (!data || typeof data !== "object") return false;
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        try {
            if (data.snippetStack) {
                this.saveSnippetStack(data.snippetStack);
            }
            if (data.settings && typeof data.settings === "object") {
                const incoming = {...(data.settings as Record<string, any>)};
                const existingToken = this.getSettings().snippetGist?.token || "";
                if (incoming.snippetGist && typeof incoming.snippetGist === "object" && !incoming.snippetGist.token && existingToken) {
                    incoming.snippetGist = {...incoming.snippetGist, token: existingToken};
                }
                this.updateSettings(incoming as any);
            }
            if (data.homeState !== undefined && data.homeState !== null) {
                const runtimeModules = (this as unknown as {workbench?: {listModules?: () => unknown[]}}).workbench?.listModules?.() || [];
                this.data[HOME_STATE_KEY] = restoreHomeStateSecrets(data.homeState, this.data[HOME_STATE_KEY], runtimeModules);
                this.saveDataDebounced(HOME_STATE_KEY);
            }
            if (data.documentSets !== undefined && data.documentSets !== null) {
                this.data[DOCUMENT_SETS_KEY] = data.documentSets;
                this.saveDataDebounced(DOCUMENT_SETS_KEY);
            }
            if (data.favorites !== undefined && data.favorites !== null) {
                this.data[FAV_KEY] = data.favorites;
                this.saveDataDebounced(FAV_KEY);
            }
            if (data.favGroups !== undefined && data.favGroups !== null) {
                this.data[FAV_GROUPS_KEY] = data.favGroups;
                this.saveDataDebounced(FAV_GROUPS_KEY);
            }
            if (data.pinned !== undefined && data.pinned !== null) {
                this.data[PINNED_KEY] = data.pinned;
                this.saveDataDebounced(PINNED_KEY);
            }
            if (data.quickActions !== undefined && data.quickActions !== null) {
                this.data[QUICK_ACTIONS_KEY] = data.quickActions;
                this.saveDataDebounced(QUICK_ACTIONS_KEY);
            }
            if (data.snippetGroups !== undefined && data.snippetGroups !== null) {
                this.data[SNIPPET_GROUPS_KEY] = data.snippetGroups;
                this.saveDataDebounced(SNIPPET_GROUPS_KEY);
            }
            if (this.storage || Object.prototype.hasOwnProperty.call(this, "flushPendingSaves")) {
                await this.flushPendingSaves();
            }
            this.scheduleSidebarRefresh();
            if (typeof lvActivity !== "undefined") {
                lvActivity.record({ source: "雷切", category: "note", title: "恢复全生态灾备切片与配置" });
            }
            return true;
        } catch (err) {
            logger.error("Failed to restore ecosystem backup", err);
            return false;
        }
    }

    public exportConfigPack(): string {
        const pack = buildConfigPack(
            {settings: this.getSettings(), documentSets: this.data[DOCUMENT_SETS_KEY]},
            {now: Date.now()},
        );
        return JSON.stringify(pack, null, 2);
    }

    /**
     * 导入配置包：整体校验通过后才落盘（校验-提交两段式）。T-6961：支持组粒度
     * 应用（groups 缺省 = 全部可迁移组）；多 key 持久化非原子事务，写入异常如实
     * 回执已应用范围，不虚报全部成功。settings 深校验走既有 normalizeSettings；
     * documentSets 深校验走既有 normalizeDocumentSets 迁移门禁。
     */
    public importConfigPack(payload: unknown, options?: {groups?: string[]}): {ok: boolean; reason?: string; applied?: string[]} {
        const result = normalizeConfigPackImport(payload);
        if (!result.ok) return {ok: false, reason: result.reason};
        const requested = Array.isArray(options?.groups) && options.groups.length > 0
            ? options.groups
            : ["settings", ...(result.documentSets ? ["documentSets"] : [])];
        const selected = new Set(requested.filter((group) => group === "settings" || group === "documentSets"));
        let dsState: unknown = null;
        if (selected.has("documentSets") && result.documentSets) {
            const normalized = normalizeDocumentSets(result.documentSets);
            dsState = {schemaVersion: normalized.schemaVersion, sets: normalized.sets};
        }
        const applied: string[] = [];
        try {
            if (selected.has("settings")) {
                this.updateSettings(result.settings);
                applied.push("settings");
            }
            if (selected.has("documentSets") && result.documentSets) {
                this.data[DOCUMENT_SETS_KEY] = dsState;
                this.saveDataDebounced(DOCUMENT_SETS_KEY);
                applied.push("documentSets");
            }
        } catch (error) {
            logger.warn("config pack apply failed", error);
            return {ok: false, reason: "apply-failed", applied};
        }
        return {ok: true, applied};
    }

    /**
     * T-6791 一键同步：直调内核 performSync（不走 globalCommand 的确认弹窗）。
     * 只读/发布模式与同步进行中的拒绝都来自内核（CheckReadonly/互斥），
     * 插件侧只区分完成与失败两种提示；大库同步放宽到 60s 超时。
     */
    private async syncNow(): Promise<void> {
        const payload = await this.fetchKernelJson("/api/sync/performSync", {}, 60000);
        if (!payload || payload.code !== 0) {
            logger.warn("sync failed", payload?.msg || "kernel unreachable");
            showMessage(this.i18n.syncNowFailed, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        showMessage(this.i18n.syncNowCompleted, MESSAGE_DEFAULT_MS);
    }
}
