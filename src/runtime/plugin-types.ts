import type {Plugin, Dialog, Menu, getAllTabs, TPluginDataChangeReason} from "siyuan";
import type {LvVaultPluginAdapter} from "../libs/lv-notice-kit";
import type {HostBridge} from "../core/bridge";
import type {TieredStorageEngine} from "../core/storage";
import type {DisposerRegistry} from "../core/disposer";
import type {NavigationService} from "../services/navigation";
import type {SearchService} from "../services/search";
import type {QuickActionService} from "../services/actions";
import type {HomeWorkbenchService} from "../services/workbench";
import type {FloatingBallService} from "../services/ball";
import type {ExternalCommandPolicy} from "../api/external-command-receiver";
import type {createDurableJsonIO} from "../api/durable-json";
import type {createRequestService} from "../request-service";
import type {runStorageMigration} from "../storage-migration";
import type {createDocSearchState} from "../doc-search-state";
import type {FloatingBallUiController, FloatingBallSurface, FloatingBallPosition} from "../floating-ball-ui";
import type {createFloatingBallPanelController} from "../floating-ball-panel";
import type {createWorkspaceRuntimeDiagnostics} from "../agent-workspace-diagnostics";
import type {createAgentReadOnlyAuditHistory} from "../agent-readonly-audit";
import {getDefaultQuickActions} from "../quick-actions";
import {createDefaultFloatingBallConfig} from "../floating-ball-model";
import {PANEL_SCALE_DEFAULT, MOBILE_COLUMNS_AUTO, TAB_GROUP_MODE_DEFAULT, PanelSizeMode, HomeSizeMode, StudioSizeMode, TabGroupMode} from "../constants";
import type {IProtyleTabModel, ISiyuanLayoutDock} from "../types";

declare module "../util" {
    // 使 TS 仍能从 ./util.js 拿到函数签名；运行时 import.js 走 Node CJS
    export function clampNum(value: unknown, min: number, max: number, fallback: number): number;
    export function stableSortBy<T>(arr: T[], keyFn: (item: T) => string | number): T[];
    export function normalizeSortBy(value: unknown, allowed: readonly string[], fallback: string): string;
    export function sortItems<T>(items: T[], sortBy: string, mru?: string[], options?: {
        titleOf?: (item: T) => string;
        rootIdOf?: (item: T) => string;
        pinKeyOf?: (item: T) => string;
        updatedMap?: {[rootId: string]: string};
    }): T[];
    export function sortGroupItems<T>(group: T[], sortBy: string, mru?: string[], pinned?: Set<string> | Iterable<string>, updatedMap?: {[rootId: string]: string}, callbacks?: {
        titleOf?: (item: T) => string;
        rootIdOf?: (item: T) => string;
        pinKeyOf?: (item: T) => string;
    }): T[];
    export function resolveQuickActionSurfaceState(surface: string, settings?: Record<string, unknown>, selector?: string): {
        surface: "desktop" | "sidebar" | "mobile";
        display: "full" | "icons" | "hidden";
        isRightRail: boolean;
        collapsed: boolean;
    };
    export function groupFavoritesByGroup<T extends {group?: string}>(favorites: T[], groupNames: string[]): Map<string, T[]>;
    export function resolveIconFallback(raw: string): {type: "svg", value: string} | {type: "emoji", value: string};
    export function normalizeCustomIcon(value: unknown): string | undefined;
    export function isImageIconReference(value: unknown): boolean;
    export function resolveIconReference(raw: unknown, availableSymbols: Iterable<string> | null | undefined, fallback?: string | string[]): {type: "svg", value: string} | {type: "emoji", value: string} | {type: "image", value: string};
    export function normalizeQuickActionText(value: unknown, max?: number): string;
    export function buildTabGroupsByParent<T extends {parent?: {element?: HTMLElement, headersElement?: HTMLElement}}>(
        tabs: T[], fallbackKey: HTMLElement,
    ): Map<HTMLElement, Array<{tab: T}>>;
    export function resolveTabRootId(tab: {model?: IProtyleTabModel, headElement?: HTMLElement}): string | null;
    export function planGroupOpenFavorites<T extends {key: string}>(
        favorites: T[], openedKeys: Set<string>, resolveRootId: (favorite: T) => string,
    ): {targets: Array<{favorite: T, rootId: string}>, invalid: number};
    export function sanitizeFavorites(values: unknown, max?: number): {items: IFavoriteItem[], changed: boolean};
    export function sanitizeOpenHistory(values: unknown, max?: number): {items: IOpenHistoryEntry[], changed: boolean};
    export function sanitizeStringList(values: unknown, max?: number): {items: string[], changed: boolean};
    export function isSuccessfulMobileTabsResult(result: unknown): boolean;
    export function sanitizeQuickActions(values: unknown, max?: number): {items: IQuickAction[], changed: boolean};
    export function getDefaultQuickActions(): IQuickAction[];
    export function getBuiltinQuickActions(): IQuickAction[];
    export function normalizeThumbCache(values: unknown, options?: {max?: number, htmlMax?: number}):
        {cache: IThumbCache, kept: number, removed: number, changed: boolean};
}

declare module "../quick-actions" {
    // T-6856：目录原始条目形状（JS 侧字面量推断为宽化的 string，与
    // IQuickAction 的 union 字段天然不兼容——TS2394 CI 实录；重载按真话声明，
    // 消费侧需要强类型时经 sanitizeQuickActions→IQuickAction 走归一化管线）
    export type IQuickActionRaw = {
        id: string;
        label: string;
        langKey?: string;
        mobileSafe?: boolean;
        icon: string;
        kind: string;
        value: string;
        targets: string[];
        order: number;
        enabled: boolean;
    };
    export function sanitizeQuickActions(values: unknown, max?: number): {items: IQuickAction[], changed: boolean};
    export function getDefaultQuickActions(): IQuickActionRaw[];
    export function getBuiltinQuickActions(): IQuickActionRaw[];
    export function getDefaultQuickActionTargets(kind: string, value: string, declaredTargets?: string[]): string[];
    export function resolveQuickActionSupport(kind: string, value: string, target: string, declaredTargets?: string[]): "supported" | "unsupported" | "unknown";
    export function shouldRenderQuickAction(action: IQuickAction, surface: string, context?: string, declaredTargets?: string[]): boolean;
    export function appendQuickAction(actions: IQuickAction[], candidate: Partial<IQuickAction> & {declaredTargets?: string[]}, max?: number): {items: IQuickAction[], added: boolean, reason: string};
    export function createQuickActionRegistry(): any;
}

declare module "../floating-ball-panel" {
    export function createFloatingBallPanelController(options: Record<string, unknown>): {
        mount: () => HTMLElement | null;
        update: (patch?: Record<string, unknown>) => void;
        openMore: () => void;
        closeMore: (options?: {restoreFocus?: boolean}) => void;
        destroy: () => void;
        getElement: () => HTMLElement | null;
        isMoreOpen: () => boolean;
    } | null;
}

declare module "../floating-ball-actions" {
    export function createFloatingBallActionExecutor(options: Record<string, unknown>): (action: unknown) => Promise<{ok: boolean; reason?: string; result?: unknown}>;
}

declare module "../quick-actions-ui" {
    export function mountQuickActionPicker(options: {
        trigger: HTMLElement;
        host: HTMLElement;
        candidates: Array<{id: string, label: string, icon: string, group?: string, secondary?: string, searchText?: string, fallbackIcon?: string | string[]}>;
        searchPlaceholder?: string;
        emptyText?: string;
        onSelect: (candidate: any) => void;
    }): HTMLElement | null;
}

declare module "../home-runtime" {
    export function createHomeRuntime(): {
        registerAdapter(options: Record<string, unknown>): {registered: boolean; unregister: () => boolean | void};
        listModules(device?: string): unknown[];
        read(moduleId: string, device?: string, config?: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
        diagnostics(): Array<{type: string; moduleId: string; device: string; at: number}>;
        resourceStats(): {snapshotCacheEntries: number; failureBackoffEntries: number; inFlightReads: number; readGenerationEntries: number; invalidatedReadGenerationEntries: number; diagnosticEntries: number};
        dispose(): void;
    };
}

declare module "../home-view" {
    export function buildHomeModuleView(module: unknown, result: unknown, options?: {collapsed?: boolean}): unknown;
    export function renderHomeModuleView(doc: unknown, view: unknown, options?: {labels?: Record<string, string>; onToggle?: (view: unknown) => void; onItem?: (item: unknown, view: unknown) => void; onToggleItem?: (item: unknown, view: unknown, done: boolean) => boolean | Promise<boolean> | void; onCalendarNavigate?: (direction: number, view: unknown) => void; onCalendarJump?: (step: number, view: unknown) => void; onCalendarPeriod?: (offset: number, view: unknown) => void; calendarPeriodOptions?: Array<{offset: number; label: string}>; onRetry?: (view: unknown) => void}): unknown;
}
declare module "../home-controller" {
    export function createHomeModuleController(options: Record<string, unknown>): {
        mount: () => unknown;
        refresh: (config?: Record<string, unknown>, readOptions?: Record<string, unknown>) => Promise<{ok: boolean; reason: string; view: unknown}>;
        toggle: () => unknown;
        showError: (reason?: string) => unknown;
        dispose: () => void;
        getView: () => unknown;
    } | null;
    export function refreshHomeModules(entries: unknown[], options?: {concurrency?: number}): Promise<unknown[]>;
    export function countHomeRefreshFailures(results: unknown): number;
    export function summarizeHomeRefreshFailures(results: unknown): {timeout: number; failed: number; other: number};
    export function selectHomeRefreshRetryEntries(entries: unknown[], results: unknown): unknown[];
}
declare module "../home-panel" {
    export function createHomePanelController(options: Record<string, unknown>): {
        mount: () => unknown;
        refresh: (config?: unknown, readOptions?: Record<string, unknown>) => Promise<{ok: boolean; reason: string; results: Array<{ok: boolean; reason: string; view: unknown}>}>;
        toggle: (moduleId: string) => unknown;
        dispose: () => void;
        listModules: () => unknown[];
        getViews: () => unknown[];
    } | null;
}
declare module "../recent-closed" {
    export function removeRecentEntry<T extends Record<string, unknown>>(entries: T[], key: string, field?: "key" | "rootId"): {items: T[]; changed: boolean};
    export function recordRecentOpen<T extends Record<string, unknown>>(openEntries: T[], closedEntries: T[], entry: {key: string; rootId?: string | null; title?: string; ts?: number}, max?: number): {open: T[]; closed: T[]; changed: boolean};
    export function normalizeOfficialRecentHistory(payload: unknown, isValidRootId: (id: string) => boolean, now?: number, max?: number): {status: "success" | "empty" | "failed"; items: IOpenHistoryEntry[]};
}
declare module "../favorite-actions" {
    export function removeFavoriteEntry<T extends {key?: string}>(entries: T[], key: string): {items: T[]; changed: boolean};
    export function setFavoriteEntryGroup<T extends {key?: string; group?: string}>(entries: T[], key: string, group: string): {items: T[]; changed: boolean};
    export function migrateFavoriteEntry<T extends {key?: string; rootId?: string}>(entries: T[], legacyKey: string, rootId: string): {items: T[]; changed: boolean; migrated: boolean; duplicate?: boolean};
}
declare module "../home-model" {
    export function normalizeHomeState(value: unknown, allowedModuleIds?: Set<string> | null): {schemaVersion: number; defaultsVersion: number; instances: Array<{instanceId: string; moduleId: string; enabled: boolean; config: Record<string, unknown>}>; layouts: Record<string, Array<{instanceId: string; x: number; y: number; w: number; h: number; collapsed: boolean}>>};
    export function resolveMobileHomeSize(value: unknown): string;
    export function buildQuickCaptureAction(value: unknown): string;
    export function parseQuickCaptureAction(value: unknown): {notebook: string; initialText: string; includeTime: boolean} | null;
    export function buildQuickCaptureInitialText(value: unknown, now?: Date): string;
    export function buildPluginCommandsSnapshot(commands: unknown, config: unknown, labels?: Record<string, string>): any;
    export function sanitizeHomeStateSecrets(homeState: unknown, definitions?: unknown[]): any;
    export function restoreHomeStateSecrets(incomingHomeState: unknown, existingHomeState: unknown, definitions?: unknown[]): any;
}
declare module "../settings-model" {
    export function normalizeSettings(saved: unknown, options?: Record<string, unknown>): any;
    export function resolvePanelSize(settings: {panelSizeMode?: string; panelScale?: number; dialogWidth?: number; dialogHeight?: number} | null | undefined, viewport: {width: number; height: number; minWidth?: number; minHeight?: number}): {width: number; height: number};
}
declare module "../document-sets" {
    export function normalizeDocumentSets(value: unknown, max?: number): {schemaVersion: number; sets: unknown[]; changed: boolean};
    export function createDocumentSet(name: string, entries: unknown[], options?: Record<string, unknown>): any;
    export function orderDocumentSetRestoreEntries(value: unknown): Array<{rootId: string; title?: string; index?: number; active?: boolean}>;
    export function upsertDocumentSet(value: unknown, candidate: unknown, options?: Record<string, unknown>): any;
    export function removeDocumentSet(value: unknown, setId: string, options?: Record<string, unknown>): any;
    export function mergeDocumentSets(value: unknown, incoming: unknown, options?: Record<string, unknown>): any;
    export function planDocumentSetRestore(value: unknown, openedRootIds?: unknown, availableRootIds?: unknown, max?: number): any;
    export function summarizeDocumentSetRestore(plan: unknown, probe: unknown, execution?: {succeeded?: number; failed?: number; cancelled?: boolean}): {succeeded: number; failed: number; skipped: number; missing: number; unknown: number; available: number; cancelled: boolean; attempted: number};
}
// 卡片三按钮所需图标 symbol（与官方 litheness sprite 同名同形）：
// 手机端模板不含内联 symbol，官方 sprite 由 loadAssets 异步注入且依赖 App 版本，
// 首帧 <use> 引用到空 symbol 时按钮渲染为空白（三按钮"隐形"根因），插件须自带兜底
export const CARD_ICON_SPRITE =
    '<symbol id="iconUnpin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89"/><path d="m2 2 20 20"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"/></symbol>' +
    '<symbol id="iconPin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></symbol>' +
    '<symbol id="iconStar" viewBox="0 0 24 24" fill="var(--b3-icon-star-fill, none)" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></symbol>' +
    '<symbol id="iconClose" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></symbol>' +
    // 第二面板专属图标：与 iconLayout（2×2 均等网格）同族，但为 dashboard 变体
    // （一格宽 + 三格小），暗示"聚合面板"，外框/描边风格保持一致以示同源
    '<symbol id="iconLayoutHome" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="10" rx="1.2"/><rect x="13.5" y="3" width="7.5" height="6" rx="1.2"/><rect x="13.5" y="12" width="7.5" height="9" rx="1.2"/><rect x="3" y="16" width="7.5" height="5" rx="1.2"/></symbol>' +
    // 小驴雷切单色矢量图标（对齐思源本体 litheness 24x24 1.7px 线性规范；双 ID 保障与 lvLaunchpad 逐字契约一致）
    '<symbol id="iconLvSpeedSwitch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" fill="none"/><path d="M9 3v18" fill="none"/><path d="m15.5 8-3 4.5h3l-2.5 4.5" fill="none"/></symbol>' +
    '<symbol id="icon-lv-raikiri" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" fill="none"/><path d="M9 3v18" fill="none"/><path d="m15.5 8-3 4.5h3l-2.5 4.5" fill="none"/></symbol>' +
    '<symbol id="iconTrash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" fill="none"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" fill="none"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" fill="none"/></symbol>' +
    '<symbol id="iconBook" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" fill="none"/><path d="M6.5 17H20" fill="none"/></symbol>' +
    '<symbol id="iconUser" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" fill="none"/><circle cx="12" cy="7" r="4" fill="none"/></symbol>' +
    '<symbol id="iconRiff" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" fill="none"/></symbol>' +
    '<symbol id="iconHTML" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6" fill="none"/><polyline points="8 6 2 12 8 18" fill="none"/></symbol>' +
    '<symbol id="iconHeading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h12" fill="none"/><path d="M6 20V4" fill="none"/><path d="M18 20V4" fill="none"/></symbol>' +
    '<symbol id="iconRss" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9" fill="none"/><path d="M4 4a16 16 0 0 1 16 16" fill="none"/><circle cx="5" cy="19" r="1" fill="none"/></symbol>' +
    '<symbol id="iconDashboard" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" fill="none"/><rect width="7" height="5" x="14" y="3" rx="1" fill="none"/><rect width="7" height="9" x="14" y="12" rx="1" fill="none"/><rect width="7" height="5" x="3" y="16" rx="1" fill="none"/></symbol>' +
    '<symbol id="iconChart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18" fill="none"/><path d="m19 9-5 5-4-4-3 3" fill="none"/></symbol>' +
    '<symbol id="iconCommand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m7 11 2-2-2-2" fill="none"/><path d="M11 13h4" fill="none"/><rect width="18" height="18" x="3" y="3" rx="2" fill="none"/></symbol>' +
    '<symbol id="iconDice" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="none"/><path d="M16 8h.01" fill="none"/><path d="M12 12h.01" fill="none"/><path d="M8 16h.01" fill="none"/></symbol>' +
    '<symbol id="iconTask" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" fill="none"/><path d="m9 12 2 2 4-4" fill="none"/></symbol>' +
    '<symbol id="iconBacklink" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" fill="none"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none"/></symbol>' +
    '<symbol id="iconSync" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" fill="none"/><path d="M21 3v5h-5" fill="none"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" fill="none"/><path d="M8 16H3v5" fill="none"/></symbol>' +
    '<symbol id="iconComposition" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" fill="none"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" fill="none"/></symbol>' +
    '<symbol id="iconHandbook" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14" fill="none"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" fill="none"/></symbol>' +
    '<symbol id="iconQuote" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" fill="none"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" fill="none"/></symbol>' +
    '<symbol id="iconSparkles" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" fill="none"/></symbol>' +
    '<symbol id="iconRiffCard" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" fill="none"/><path d="M7 9h10" fill="none"/><path d="M7 14h6" fill="none"/></symbol>';

// 单分组渲染上下文：避免 renderTabGroup 形参列表爆炸，所有共享字段打包到一个对象
export interface ITabGroupRenderCtx {
    reusable: Map<string, HTMLElement>;
    activeTabId: string | undefined;
    activeRootId?: string | undefined;
    pinned: Set<string>;
    favorites: Set<string>;
    mru: string[];
    settings: ISwSettings;
    // T-6883：最近编辑映射（rootId → 14 位时间串），供卡片更新时间徽标消费
    updatedMap: {[rootId: string]: string};
    opts: {onOverlayClose: IOverlayClose, onTabsChanged: IOverlayClose};
}

// siyuan 包未将 Tab 作为顶层命名导出，这里从 getAllTabs 返回类型推导
export type Tab = ReturnType<typeof getAllTabs>[number];
export type CardMenuHandlers = {
    onActivate?: (tab: Tab) => void;
    onTogglePin?: (tab: Tab, card: HTMLElement) => void;
    onToggleFav?: (tab: Tab, card: HTMLElement) => void;
    onCloseTab?: (tab: Tab, card: HTMLElement) => void;
};

export interface IActionPaletteHandle {
    root: HTMLElement;
    element?: HTMLElement;
    searchInput: HTMLInputElement;
    searchEl?: HTMLInputElement;
    listElement: HTMLElement;
    listEl?: HTMLElement;
    getState: () => any;
    updateQuery: (newQuery: string) => void;
    selectIndex: (index: number) => void;
    dispose: () => void;
    isDisposed: () => boolean;
}
export type KernelRequestOutcome =
    | {ok: true; value: any; attempts: number; outcome: "success"}
    | {ok: false; error: {kind: string; status?: number}; attempts: number; outcome: "failed" | "unknown"};
export type JournalActionOutcome =
    | {ok: true; id: string; empty?: false}
    | {ok: true; id: null; empty: true}
    | {ok: false; error: {kind: string; status?: number}; attempts?: number; outcome: "failed" | "unknown"};

export interface IDocSearchResult {
    id?: string;
    rootId?: string;
    blockId?: string;
    name?: string;
    title?: string;
    subTitle?: string;
    path?: string;
    hPath?: string;
    notebookId?: string;
    notebookID?: string;
    box?: string;
    blockIds?: string[];
    snippets?: Array<{text?: string; blockId?: string | null}>;
    source?: string;
    kind?: "document" | "heading" | "block" | string;
    icon?: string;
    depth?: number;
    subType?: string;
}

export interface IPenetrationSearchPlan {
    isPenetration: boolean;
    mode: string;
    endpoint?: string;
    body?: Record<string, unknown>;
    method?: string;
    query?: string;
    empty?: boolean;
    error?: string;
    hint?: string;
    isCurrentDoc?: boolean;
    activeDocId?: string;
    activeDocTitle?: string;
    blockNeedle?: string;
    docNeedle?: string;
    headingNeedle?: string;
}

export interface IDocSearchFilters {
    notebook?: string;
    paths?: string[];
    types?: Record<string, boolean>;
    subTypes?: Record<string, boolean>;
    method?: "keyword" | "query" | "regexp" | "semantic";
    orderBy?: "relevanceDesc" | "updatedDesc" | "createdDesc" | "content";
}

export interface ISearchSession<T> {
    version: number;
    cache: Map<string, T>;
    controller: AbortController | null;
    timer: number | null;
    flush?: (() => void) | null;
    cacheLimit: number;
}

declare module "../search-session" {
    export function createSearchSession<T>(cacheLimit: number): ISearchSession<T>;
    export function beginSearch<T>(session: ISearchSession<T>): number;
    export function cacheSearchResult<T>(session: ISearchSession<T>, key: string, value: T): void;
    export function disposeSearchSession<T>(session: ISearchSession<T>): void;
}

declare module "../search-model" {
    export function aggregateSearchResults(results: unknown[], options?: {
        documents?: number;
        snippets?: number;
        blockIds?: number;
        source?: string;
    }): {cards: Array<{
         rootId: string;
         title: string;
         path: string;
         notebookId?: string;
         blockIds?: string[];
        snippets: Array<{text: string; blockId?: string | null}>;
    }>};
    export function buildFullTextSearchRequest(input?: Record<string, unknown>): {
        endpoint: string;
        body: Record<string, unknown>;
    } | null;
    export function buildNativeSearchTabConfig(input?: Record<string, unknown>): {instance: string; config: Record<string, unknown>} | null;
    export function buildSearchCacheKey(input?: Record<string, unknown>): string;
    export function canUseTitleSearch(filters?: Record<string, unknown>): boolean;
    export function extractSearchRecords(payload: unknown): unknown[];
    export function normalizeSearchResult(value: unknown, source?: string): {
        rootId: string;
        blockId?: string;
        title?: string;
        path?: string;
        notebookId?: string;
    } | null;
    export function buildSearchScoreBreakdown(value: unknown, options?: Record<string, unknown>): {
        source: string;
        sourceWeight: number;
        titleScore: number;
        total: number;
        kernelScore: number | null;
        titleMatch: boolean;
        pathMatch: boolean;
        pinyinMatch: boolean;
        filterMatch: boolean;
        lastPicked: boolean;
        updated: string;
        matchedFields: string[];
    };
    export function buildSearchHealthSnapshot(options?: Record<string, unknown>): {
        query: string;
        state: string;
        remote: boolean;
        cacheHit: boolean;
        fallbackUsed: boolean;
        fallbackReason: string;
        counts: Record<string, number>;
        sources: Array<{key: string; status: string; count: number; latencyMs: number}>;
        totalLatencyMs: number;
        slowThresholdMs: number;
        slow: boolean;
        truncated: boolean;
        degraded: boolean;
        reasons: string[];
    };
    export function pickDocViewportAnchor(entries: Array<{key: string; top: number}>, viewportHeight: number): {key: string; offset: number} | null;
    export function planDocViewportRestore(anchor: {key: string; offset: number} | null, entries: Array<{key: string; top: number}>, scrollTop: number): number | null;
    export function filterSearchDocuments(value: unknown[], filters?: Record<string, unknown>): unknown[];
    export function matchesSearchDocumentFilters(value: unknown, filters?: {
        notebook?: string;
        paths?: string[];
    }): boolean;
    export function normalizeSearchDocumentFilters(filters?: Record<string, unknown>): {
        notebook: string;
        paths: string[];
    };
    export function buildSearchDocumentFilterMatcher(filters?: Record<string, unknown>): (value: unknown) => boolean;
    export function normalizeTitleSearchDocuments(value: unknown[]): unknown[];
    export function resolveSearchNotebookId(value: unknown, current?: unknown, model?: unknown, initData?: unknown): string;
    export function buildOpenedDocumentScope(value: unknown): {rootId: string; notebook: string; path: string} | null;
    export function buildOpenedDocumentSearchRequests(tabs: unknown[], query: string, options?: Record<string, unknown>): Array<{
        endpoint: string;
        body: Record<string, unknown>;
        scope: {rootId: string; notebook: string; path: string};
    }>;
    export function isSemanticEmbeddingConfigured(config: unknown): boolean;
    // T-7334 路径首字母缩写：只重排既有结果，不改变集合内容与长度。
    export function scorePathAcronym(path: unknown, query: string): number;
    export function rankDocumentsByPathAcronym<T>(documents: T[], query: string, options?: Record<string, unknown>): T[];
}

// T-6867/T-6868: keep the shared surface chrome in the main entry. The lazy
// snippet chunk receives this adapter as a callback, so it does not create a
// second webpack shared chunk while the three surfaces use one DOM contract.
export type PlatformSurface = "switcher" | "workbench" | "studio";
// T-6869：一次跨表面打开的上下文（entry/objectId/query 有界，见 platform-surface-model）。
// T-7012：focusSource 是关闭/返回后恢复焦点的描述符（object:<id> / search-input）。
export type PlatformSurfaceContext = {entry: string; objectKind?: string; objectId?: string; query?: string; focusSource?: string};
/** Optional context supplied to a registered home-module reader. */
export interface HomeModuleReadOptions {
    size?: "xs" | "small" | "medium" | "tall" | "wide" | "large" | "full" | string;
    signal?: AbortSignal | null;
}
export interface PlatformSurfaceLabels {
    platformName: string;
    platformSubtitle: string;
    contextLabel: string;
    surfaces: Record<PlatformSurface, string>;
    hints: Record<PlatformSurface, string>;
}
export interface PlatformSurfaceChromeOptions {
    surface: PlatformSurface;
    labels: PlatformSurfaceLabels;
    available?: readonly PlatformSurface[];
    context?: PlatformSurfaceContext | null;
    // T-6871（RZ-1）：键位提示芯片组（如 Tab/1-9/Enter），渲染在上下文栏尾部。
    kbdHints?: readonly string[];
    status?: {state?: string; label: string};
    onNavigate?: (surface: PlatformSurface) => void;
    onHelp?: () => void;
    onSettings?: () => void;
    onClose?: () => void;
    settingsLabel?: string;
    helpLabel?: string;
    closeHint?: string;
    closeLabel?: string;
}

declare module "../snippet-studio-ui" {
    export function mountSnippetStudio(root: HTMLElement, options?: {
        i18n?: Record<string, string>;
        getConfig?: () => unknown;
        store?: {read: () => Promise<unknown>; readSettings?: () => unknown; setMaster?: (type: "css" | "js", enabled: boolean) => Promise<unknown>; mutate: (baseline: unknown, action: string, draft?: unknown) => Promise<unknown>; dispose: () => void};
        groups?: {load: () => unknown; save: (value: unknown) => void};
        gist?: {load: () => unknown; save: (value: unknown) => void};
        ai?: {generate: (options?: Record<string, unknown>) => Promise<unknown>; cancel: () => void; dispose: () => void};
        session?: {draft: Record<string, unknown> | null; baseline: Record<string, unknown> | null; recentIds?: string[]};
        objectId?: string;
        onBack?: (guarded?: boolean) => void;
        platform?: {
            labels: PlatformSurfaceLabels;
            available?: readonly PlatformSurface[];
            context?: PlatformSurfaceContext | null;
            status?: {state?: string; label: string};
            mount: (root: HTMLElement, options: {
                surface: PlatformSurface;
                labels: PlatformSurfaceLabels;
                available?: readonly PlatformSurface[];
                context?: PlatformSurfaceContext | null;
                status?: {state?: string; label: string};
                onNavigate?: (surface: PlatformSurface) => void;
                onHelp?: () => void;
                onSettings?: () => void;
                onClose?: (guarded?: boolean) => void;
                settingsLabel?: string;
                helpLabel?: string;
                closeHint?: string;
                closeLabel?: string;
            }) => HTMLElement;
            onNavigate?: (surface: PlatformSurface) => void;
            onHelp?: () => void;
            onSettings?: () => void;
            settingsLabel?: string;
            helpLabel?: string;
            closeHint?: string;
            onClose?: (guarded?: boolean) => void;
        };
    }): {ready: Promise<unknown>; canClose: () => boolean; dispose: () => void};
}

export type SnippetStudioController = {ready: Promise<unknown>; canClose: () => boolean; dispose: () => void};

export type DocSearchRenderState = "results" | "loading" | "error";

// IMobileTabEntry / IMobileTabsState 已迁移至 ./types.ts（思源全局对象的相关结构）
// 页签排序方式：mru=最近使用 layout=打开顺序 layoutDesc=打开倒序 titleAsc/titleDesc=标题升降序 updatedDesc=最近编辑

// addDock 回调里的 this 类型（思源把面板元素挂到回调自身的 .element 上）
export interface IDockHandlerSelf {
    element?: HTMLElement;
}
export type SortBy = "mru" | "layout" | "layoutDesc" | "titleAsc" | "titleDesc" | "updatedDesc";
export type QuickActionDisplay = "full" | "icons" | "hidden";
export type HomePalette = "auto" | "soft" | "mono";
export const SORT_BY_LIST: SortBy[] = ["mru", "layout", "layoutDesc", "titleAsc", "titleDesc", "updatedDesc"];
// 页签卡片操作完成后的收尾动作（弹窗模式销毁弹窗，侧边栏模式刷新列表）
export type IOverlayClose = () => void;

// 存储 key / dock type / 快捷键等注册常量已集中到 ./constants.ts（ADR-0002 遗留闭环，v0.16.5）

// 默认设置（可被用户设置覆盖）
export const DEFAULT_SETTINGS: ISwSettings = {
    // T-7026（ADR 0099）：模块可见性——「启用=可见且可进入」单一语义；切换器为平台根
    // 恒启用不设开关；缺省全开，旧配置零迁移。
    moduleVisibility: {workbench: true, studio: true, floatingBall: true},
    dialogWidth: 880,      // 固定尺寸模式的宽度 px
    dialogHeight: 600,     // 固定尺寸模式的高度 px
    panelSizeMode: "fullscreen", // 面板尺寸模式：fullscreen=全屏（ADR 0080 默认，三表面内容优先）/ adaptive=屏幕比例自适应 / custom=固定尺寸
    panelScale: PANEL_SCALE_DEFAULT, // 自适应比例（百分比，相对当前可视区宽高）
    groupBy: TAB_GROUP_MODE_DEFAULT, // 列表分组：默认按笔记本
    // 工作台尺寸模式：默认全屏（大屏完整呈现多组件网格与工具项，不再以紧凑小窗开启）
    homeSizeMode: "fullscreen",
    homePalette: "soft",    // 组件卡片强调色：自动多彩 / 柔和 / 单色
    homeWidth: 1120,        // 固定宽度（仅在切换为 custom 时生效）
    homeHeight: 760,        // 固定高度（仅在切换为 custom 时生效）
    studioSizeMode: "fullscreen", // 片段实验室尺寸模式：全屏（ADR 0080 默认）/ 自适应 / 固定（T-6986）
    studioWidth: 1120,       // 片段实验室固定宽度（编辑/预览/AI 三栏需要更宽）
    studioHeight: 800,       // 片段实验室固定高度
    columns: 0,            // 缩略图列数，0=自动
    thumbHeight: 128,      // 缂╃暐鍥鹃珮搴?px
    sortBy: "mru",         // 页签排序方式
    excludedDocks: [],     // 不显示在左侧列表的面板类型
    dockDisplay: "collapsed",   // Default to the compact icon rail; users can expand it when labels are needed.
    fullscreen: false,     // 全屏模式：切换器铺满整个窗口，按 Esc 退出（由 panelSizeMode 派生）
    showCardUpdatedBadge: false, // T-6848 页签卡更新时间与近 7 天改动标记（默认关）
    showSearchModeChips: false, // 20261122-01 搜索模式筛选胶囊默认关闭，极致清爽高挑，节省约 40px 纵向高度
    sidebarLayout: "enlarge", // 侧边栏缩略图布局：enlarge 放大填满栏宽（默认）/ columns 按宽度自动加列
    fabEnabled: false,     // 手机端悬浮按钮默认关闭，需要的用户在设置中打开
    floatingBall: createDefaultFloatingBallConfig(), // T-6757 版本化悬浮球配置（旧 fabEnabled 仍兼容）
    mobileColumns: MOBILE_COLUMNS_AUTO, // 默认自动（竖屏单列，横屏双列）
    mobileThumbHeight: 80, // 手机端缩略图高度
    journalNotebook: "",   // 默认日记笔记本 id，空=未设置（首次点击日记按钮时弹出选择）
    journalAutoCreate: true, // 日记不存在时自动创建
    rememberScrollPosition: true, // 会话级文档滚动位置记忆
    lastSettingsTab: "appearance", // 设置面板上次所在标签页（打开时直接跳转，提升反复进入设置的操作效率）
    quickActions: getDefaultQuickActions() as IQuickAction[],
    quickActionsRightRail: false,
    quickActionsDisplayDesktop: "full",
    quickActionsDisplaySidebar: "full",
    quickActionsDisplayMobile: "full",
    quickActionsCollapsedDesktopBottom: false,
    quickActionsCollapsedDesktopRight: false,
    quickActionsCollapsedSidebar: false,
    quickActionsCollapsedMobile: false,
    agentActionsEnabled: true, // T-6692b 灰度开关：Agent 受控动作总开关（默认开）
    documentSetsAutoSave: true, // T-6800 工作区切换：离开当前集时自动快照（默认开）
    documentSetsCurrentId: "", // T-6800 当前工作区集 id（空=尚未激活任何集）
    favoriteSmartGroups: [], // T-6804 标签智能分组
    savedSearches: [], // T-6827 保存的搜索
    skin: "fusion", // T-6796 默认融合思源主题
    pinyinMatch: true, // T-6805 拼音辅助匹配默认开
    density: "comfortable", // T-6823 密度默认舒适
    reuseOpenTabs: false, // T-6830 打开策略默认总是新开
    documentSetEssentials: [], // T-6810 Essentials 常驻文档
    homeStore: {rememberState: true, defaultViewMode: "grid", retryFailed: true}, // T-6851/T-7001 工作台偏好与现场记忆
    snippetGist: {token: "", links: {}},
    snippetStack: {version: 1, items: []}, // TASK-20261031 连续切片暂存栈
};

// 左侧面板显示方式
export type DockDisplay = "hidden" | "collapsed" | "full";
export const DOCK_DISPLAY_LIST: DockDisplay[] = ["hidden", "collapsed", "full"];
// 侧边栏缩略图布局：enlarge 放大填满栏宽（默认） / columns 按宽度自动增加列数
export type SidebarLayout = "enlarge" | "columns";
export const SIDEBAR_LAYOUT_LIST: SidebarLayout[] = ["enlarge", "columns"];

export interface ISwSettings {
    // T-7026（ADR 0099）：模块可见性——「启用=可见且可进入」单一语义；切换器恒启用。
    moduleVisibility: {workbench: boolean; studio: boolean; floatingBall: boolean};
    dialogWidth: number;
    dialogHeight: number;
    panelSizeMode: PanelSizeMode; // 面板尺寸模式
    panelScale: number;           // 自适应比例（百分比）
    homeSizeMode: HomeSizeMode;   // 组件面板尺寸模式
    homePalette: HomePalette;
    homeWidth: number;            // 组件面板固定宽度
    homeHeight: number;           // 组件面板固定高度
    studioSizeMode: StudioSizeMode; // 片段实验室尺寸模式（T-6986）
    studioWidth: number;          // 片段实验室固定宽度
    studioHeight: number;         // 片段实验室固定高度
    groupBy: TabGroupMode;        // 列表分组方式（默认按笔记本）
    columns: number;
    thumbHeight: number;
    sortBy: SortBy;
    excludedDocks: string[];
    dockDisplay: DockDisplay;
    fullscreen: boolean;       // 全屏模式：切换器铺满整个窗口，Esc 退出
    sidebarLayout: SidebarLayout; // 侧边栏缩略图布局：enlarge 放大 / columns 自动加列
    // 鎵嬫満绔?
    fabEnabled: boolean;       // 是否启用悬浮按钮
    floatingBall: any;         // 版本化悬浮球配置；由 floating-ball-model 负责净化
    mobileColumns: number;     // 0=单列 1=双列 2=自动
    mobileThumbHeight: number; // 手机端缩略图高度
    journalNotebook: string;   // 默认日记笔记本 id，空=未设置
    lastSettingsTab: string;   // 设置面板上次所在标签页（appearance/behavior/panels/favorites/journal/mobile）
    quickActions: IQuickAction[];
    quickActionsRightRail: boolean;
    quickActionsDisplayDesktop: QuickActionDisplay;
    quickActionsDisplaySidebar: QuickActionDisplay;
    quickActionsDisplayMobile: QuickActionDisplay;
    quickActionsCollapsedDesktopBottom: boolean;
    quickActionsCollapsedDesktopRight: boolean;
    quickActionsCollapsedSidebar: boolean;
    quickActionsCollapsedMobile: boolean;
    agentActionsEnabled: boolean; // T-6692b 受控动作总开关
    documentSetsAutoSave: boolean; // T-6800 切换文档集时自动把现场快照回当前集（默认开）
    documentSetsCurrentId: string; // T-6800 当前工作区语义：最近一次恢复/激活的文档集 id
    favoriteSmartGroups: Array<{name: string; tag: string}>; // T-6804 标签智能分组（最多 4 组）
    savedSearches: Array<{id: string; name: string; query: string; notebook?: string}>; // T-6827 保存的搜索（最多 16 条）
    skin: PanelSkin; // T-6796 界面皮肤：fusion=跟随思源主题（默认）
    pinyinMatch: boolean; // T-6805 拼音辅助匹配（全拼/首字母），默认开
    showSearchModeChips: boolean; // 20261122-01 搜索模式筛选胶囊显隐（默认关）
    density: "comfortable" | "compact"; // T-6823 密度档位（默认 comfortable）
    /** T-6851 组件商店视图状态（密度/视图模式/排序/折叠分组，normalize 有界清洗） */
    homeStore: {rememberState?: boolean; defaultViewMode?: "grid" | "list"; retryFailed?: boolean; density?: string; viewMode?: string; sort?: string; collapsedGroups?: string[]};
    rememberScrollPosition: boolean;
    journalAutoCreate: boolean;
    reuseOpenTabs: boolean; // T-6830 打开策略：命中已开页签时聚焦复用（默认关=总是新开）
    showCardUpdatedBadge: boolean; // T-6848 页签卡更新时间与改动标记（默认关）
    documentSetEssentials: string[]; // T-6810 Essentials：每次文档集恢复后自动打开的必需文档
    snippetGist: {token: string; links: Record<string, string>};
    snippetStack?: any; // TASK-20261031 连续切片暂存栈
}

export interface IGroupedTab {
    tab: Tab;
    card?: HTMLElement;
}

export interface IDockPanel {
    type: string;
    title: string;
    icon: string;
}

export type QuickActionTarget = "desktop" | "sidebar" | "mobile";
export type PanelSkin = "fusion" | "apple" | "midnight" | "paper";
export type QuickActionKind = "builtin" | "dock" | "adapter" | "command" | "global";
export type QuickActionSupport = "supported" | "unsupported" | "unknown";
export interface IQuickAction {
    id: string;
    label: string;
    /** T-6845：i18n 标签键（sanitize 受控保留；展示经 resolveQuickActionLabel 解析） */
    langKey?: string;
    /** 移动端安全标记（目录声明；桌面端无意义） */
    mobileSafe?: boolean;
    icon: string;
    kind: QuickActionKind;
    value: string;
    targets: QuickActionTarget[];
    order: number;
    enabled: boolean;
}

export interface IQuickActionProvider {
    id: string;
    label: string;
    icon: string;
    value: string;
    targets: QuickActionTarget[];
    declaredTargets?: QuickActionTarget[];
}

export interface IQuickActionPickerCandidate {
    id: string;
    label: string;
    icon: string;
    group: string;
    secondary: string;
    searchText: string;
    fallbackIcon?: string | string[];
    action: IQuickAction;
}

export interface IQuickActionPluginCommand {
    id: string;
    value: string;
    label: string;
    icon: string;
    pluginName: string;
    pluginTitle: string;
    commandKey: string;
    declaredTargets?: QuickActionTarget[];
}

export interface IQuickActionPluginLike {
    name?: string;
    displayName?: string;
    i18n?: Record<string, string>;
    getQuickActionCapabilities?: () => unknown;
    commands?: Array<{
        langKey?: string;
        langText?: string;
        icon?: string;
        callback?: () => void;
        globalCallback?: () => void;
    }>;
}

// 缩略图缓存条目：文档 rootID → 内容快照
export interface IThumbCache {
    [rootId: string]: { title: string, html: string, ts: number };
}

// 模块级 WeakMap：滚动容器 → 已挂的 IntersectionObserver，避免在 HTMLElement 上自挂私有属性
export const thumbObserverCache = new WeakMap<HTMLElement, IntersectionObserver>();

// 收藏条目：文档页签存 rootId（关闭后仍可重开）；非文档页签仅存页签 id。
// 收藏项永久留存直到用户主动删除；rootId 缺失时跳转/批量打开用 key 兜底（见 jumpToFavorite）
export interface IFavoriteItem {
    key: string;       // pinKeyOf: rootId || tab.id
    title: string;
    rootId: string | null;
    group: string;     // 分组名，空字符串表示未分组（旧数据无此字段按未分组处理）
}

export interface IOpenHistoryEntry {
    key: string;
    rootId: string | null;
    title: string;
    ts: number;
    source?: "open" | "closed";
    closedAt?: number;
}

export const HOME_ACCENTS = ["#7c6cf2", "#4f8ef7", "#35b8a8", "#f2a03d", "#e8637c", "#59b96f", "#e05fd0", "#8a93a6"];

declare module "../document-widget-model" {
    export function favoriteDocumentIdsForProbe(value: unknown, config: unknown): string[];
    export function buildFavoritesWidgetSnapshot(value: unknown, documents: unknown, openedKeys: unknown, config: unknown, labels?: Record<string, string>): any;
    export function buildDocumentSetsWidgetSnapshot(value: unknown, config: unknown, labels?: Record<string, string>): any;
    export function normalizeFixedDocumentConfig(value: unknown): {docId: string; title: string; showPath: boolean};
    export function buildFixedDocumentSnapshot(documents: unknown, config: unknown, labels?: Record<string, string>): any;
}


export interface ISpeedSwitchHost extends Plugin {
    i18n: Record<string, string>;
    isMobile: boolean;
    bridge: HostBridge;
    readonly hostBridge: HostBridge;
    showNotice(message: string, timeoutMs?: number, icon?: "info" | "error"): void;
    storage: TieredStorageEngine;
    disposer: DisposerRegistry;
    navigation: NavigationService;
    search: SearchService;
    actions: QuickActionService;
    workbench: HomeWorkbenchService;
    readonly homeRuntime: any;
    ball: FloatingBallService;
    requestService: ReturnType<typeof createRequestService>;
    snippetStudioDialog: Dialog | null;
    snippetStackDialog: Dialog | null;
    lastEditorSelection: {text: string; blockId: string; rootId: string; docTitle: string; capturedAt: number} | null;
    disposeSelectionObserver: (() => void) | null;
    disposeRaikiriBridge: (() => void) | null;
    noticeHubCleaner?: () => void;
    backupCleaner?: () => void;
    vaultCleaner?: () => void;
    vaultSuppressAutoBackup?: boolean;
    lastVaultScheduleAt?: number;
    launchpadCleaner?: () => void;
    omnisearchCleaner?: () => void;
    dateCrossCleaner?: () => void;
    mobileEntryCleaner?: () => void;
    launchpadBallMovedCleaner?: () => void;
    scrimClickCleaner?: () => void;
    snippetStudioSession: {draft: Record<string, unknown> | null; baseline: Record<string, unknown> | null; recentIds?: string[]};
    lastPlatformSurface: PlatformSurface;
    lastPlatformContext: PlatformSurfaceContext | null;
    switcherScene: {query: string; filters: Record<string, unknown>; scrollTop: number} | null;
    platformSwitcherDialog: Dialog | null;
    mobileSwitcherDialog: Dialog | null;
    workbenchDialog: Dialog | null;
    platformGuideDialog: Dialog | null;
    settingsDialog: Dialog | null;
    activeDialogs: Set<Dialog>;
    workbenchResumeEditing: boolean;
    snippetObjectsCache: {items: Array<{id: string; name: string; type: string; enabled: boolean; lines: number}>; at: number} | null;
    snippetObjectsGeneration: number;
    snippetObjectsInFlight: Promise<Array<{id: string; name: string; type: string; enabled: boolean; lines: number}>> | null;
    docSearchState: ReturnType<typeof createDocSearchState>;
    workspaceRuntimeDiagnostics: ReturnType<typeof createWorkspaceRuntimeDiagnostics> | null;
    agentReadOnlyAuditHistory: ReturnType<typeof createAgentReadOnlyAuditHistory>;
    storageMigrationReport: ReturnType<typeof runStorageMigration>["report"] | null;
    storageSchemaDowngradeFrom: number | null;
    dataChangeReloadInFlight: boolean;
    dataChangeReloadQueued: boolean;
    activeAgentSearchControllers: Set<AbortController>;
    activeDocumentSetRestoreControllers: Set<AbortController>;
    recentPaletteActions: string[];
    recentSearchQueries: string[];
    switcherRefreshers: Set<() => void>;
    homeModuleChangeListeners: Set<() => void>;
    switcherRefreshFrame: number | null;
    switcherRefreshFrameCancel: (() => void) | null;
    sidebarElement: HTMLElement | null;
    sidebarHistoryDropdownDispose: (() => void) | null;
    sidebarSearchFilterDispose: (() => void) | null;
    sidebarResizeObserver: ResizeObserver | null;
    sidebarIconObserver: MutationObserver | null;
    sidebarIconFrameCancel: (() => void) | null;
    recentOpenSnapshot: Map<string, string>;
    recentClosedSyncTimer: number | null;
    lifecycleGeneration: number;
    isUnloading: boolean;
    syncing: boolean;
    syncDepth: number;
    syncRefreshPending: boolean;
    syncWatchdogTimer: number | null;
    globalEventHandlers: {
        switchProtyle: () => void;
        loadedProtyle: () => void;
        destroyProtyle: () => void;
        syncStart: () => void;
        syncEnd: () => void;
        syncFail: () => void;
        openSiyuanUrlPlugin?: (event: CustomEvent<{url: string}>) => void;
    } | null;
    favCollapsed: Set<string>;
    fabElement: HTMLElement | null;
    floatingBallUi: FloatingBallUiController | null;
    floatingBallUis: Map<FloatingBallSurface, FloatingBallUiController>;
    floatingBallPanels: Map<FloatingBallSurface, ReturnType<typeof createFloatingBallPanelController>>;
    fabModalDepth: number;
    cardTabs: WeakMap<HTMLElement, Tab>;
    cardMenuHandlers: WeakMap<HTMLElement, {
        onActivate: (tab: Tab) => void,
        onTogglePin: (tab: Tab, card: HTMLElement) => void,
        onToggleFav: (tab: Tab, card: HTMLElement) => void,
        onCloseTab: (tab: Tab, card: HTMLElement) => void,
    }>;
    activeHistoryMenu: Menu | null;
    historyDropdownClosers: WeakMap<HTMLElement, {close: () => void; dispose: () => void}>;
    historyDropdownCloseSet: Set<() => void>;
    externalCommandPolicy: ExternalCommandPolicy;
    externalCommandCleanup?: () => void;
    externalPolicyDialog?: Dialog;
    externalJsonIO: ReturnType<typeof createDurableJsonIO>;
    configureExternalCommands(): Promise<any>;
    mountExternalCommands(): any;
    groupOperationBusy: boolean;
    tier2Ready: boolean;
    pendingSchemaStamp?: boolean;
    tier2LoadingPromise?: Promise<void>;
    tier2ScheduledTimer?: number;
    tier2IdleId?: number;
    onload(): Promise<any>;
    onAgentCapFail: (error: unknown, spec: {name?: string}) => void;
    agentContentResult<T>(content: T): any;
    registerWorkspacePlanCapabilities(pluginWithAgent: {addAgentCapability?: (options: Record<string, unknown>) => string}): any;
    rssReadState(): Record<string, number>;
    markRssItemsSeen(keys: string[]): Promise<void>;
    readTier1Keys(): Promise<void>;
    readTier2Keys(): Promise<void>;
    loadPersistentKeys(): Promise<void>;
    loadTier1Keys(): Promise<void>;
    initPersistentData(): Promise<any>;
    cancelTier2Schedule(): void;
    scheduleTier2Load(): void;
    ensureTier2Loaded(): Promise<void>;
    loadTier2Storage(generation: number): Promise<void>;
    getStartupPerformanceMetrics(): Record<string, number | undefined>;
    stampStorageSchemaVersion(): any;
    sanitizeTier1Data(): any;
    sanitizeTier2Data(): any;
    sanitizePersistentData(): any;
    captureStorageMigrationSnapshot(): any;
    runQuickActionDefaultsMigration(): any;
    registerDesktopDock(): any;
    registerMobileEntries(): any;
    bindGlobalEvents(): any;
    ecosystemDisposer: DisposerRegistry | null;
    ecosystemUnsubscribers: Array<() => void>;
    bindEcosystemEventSubscriptions(): any;
    unbindEcosystemEventSubscriptions(): any;
    setSyncPresentation(syncing: boolean): any;
    clearSyncWatchdog(): any;
    armSyncWatchdog(): any;
    registerSwitcherRefresh(callback: () => void): () => void;
    refreshOpenSwitchers(): any;
    scheduleOpenSwitchersRefresh(): any;
    scheduleAnimationFrame(callback: FrameRequestCallback): number;
    onLayoutReady(): any;
    breadcrumbButtonId: string;
    setupBreadcrumbEntry(): any;
    teardownBreadcrumbEntry(): any;
    exposePublicApi(): any;
    onDataChanged(reason?: TPluginDataChangeReason): Promise<void> | void;
    onunload(): Promise<any>;
    uninstall(): Promise<void> | void;
    loadActivityWatchBuckets(endpoint: string): Promise<Array<{id: string; hostname: string; label: string}>>;
    loadMinifluxCategoryOptions(endpoint: string, token: string): Promise<Array<{id: string; name: string}>>;
    measureStorageUsage(): Promise<Array<{key: string, bytes: number}>>;
    getStorageSchemaHealth(): {stored: number | null; current: number; downgradeFrom: number | null};
    clearThumbCache(): any;
    saveDataDebounced(key: string): any;
    queueSave(key: string, value: unknown): Promise<void>;
    notifySettingsSaveState(): any;
    retrySettingsSave(): any;
    resetSettingsToDefaults(keys: string[]): boolean;
    flushPendingSaves(): Promise<void>;
    fixLegacyHotkey(): any;
    settingsCache: ISwSettings | null;
    settingsUndoRecorder: ((inverse: Record<string, unknown>) => void) | null;
    settingsUndoSuppress: boolean;
    lastSaveOutcome: Partial<Record<string, "pending" | "ok" | "failed">>;
    settingsSceneReloader: (() => void) | null;
    dataMemos: Map<string, {raw: unknown; items: any[]}>;
    cardSearchIndex: WeakMap<HTMLElement, {rawTitle: string; rawPath: string; rawPlugin?: string; title: string; path: string; plugin?: string}>;
    readDataMemo<T>(key: string, sanitize: (raw: unknown) => T[]): T[];
    getSettings(): ISwSettings;
    computeSettings(): ISwSettings;
    updateSettings(patch: Partial<ISwSettings>): any;
    applySkin(): void;
    applyDensity(): void;
    clampNum(value: any, min: number, max: number, fallback: number): number;
    openPanelPreview(surface: "switcher" | "workbench" | "studio"): any;
    num(value: number, min: number, max: number, step: number, unit: string, onChange: (v: number) => void, label?: string): HTMLElement;
    rangeNumber(value: number, min: number, max: number, step: number, unit: string, onChange: (v: number) => void, label?: string): HTMLElement;
    select(options: Array<{value: string, label: string}>, value: string, onChange: (v: string) => void): HTMLElement;
    switcher(checked: boolean, onChange: (v: boolean) => void): HTMLElement;
    settingGroupTitle(text: string): HTMLElement;
    settingGroupCard(...children: HTMLElement[]): HTMLElement;
    settingSegmented(title: string, description: string | undefined, items: Array<{value: string, label: string}>, current: string, onChange: (value: string) => void): HTMLElement;
    settingTitleSeq: number;
    settingItem(title: string, description: string | undefined, action: HTMLElement, column?: boolean): HTMLElement;
    loadNotebooksDetailed(): Promise<{notebooks: Array<{id: string, name: string}>, failed: boolean}>;
    loadNotebooks(): Promise<Array<{id: string, name: string}>>;
    notebookSelect(current: string, onPick: (id: string) => void): HTMLElement;
    openHomeWidgetGuide(): any;
    openPlatformGuide(surface?: PlatformSurface): any;
    openQuickCapture(preferredNotebook?: string, initialText?: string): any;
    resolveActiveCaptureRoot(): {rootId: string; title: string} | null;
    openJournal(preferredNotebook?: string): Promise<any>;
    ensureTodayJournal(notebook: string): Promise<string | null>;
    findTodayJournal(notebook: string): Promise<string | null>;
    ensureTodayJournalOutcome(notebook: string): Promise<JournalActionOutcome>;
    findTodayJournalOutcome(notebook: string): Promise<JournalActionOutcome>;
    promptJournalNotebook(): Promise<string>;
    buildJournalPromptHtml(): string;
    createJournalSelect(dialog: Dialog): HTMLSelectElement;
    populateJournalNotebookSelect(sel: HTMLSelectElement, confirmBtn: HTMLButtonElement | null, notebooks: Array<{id: string, name: string}>): any;
    bindJournalPromptEvents(dialog: Dialog, sel: HTMLSelectElement, confirmBtn: HTMLButtonElement | null, resolve: (id: string) => void): any;
    openSetting(initialPanel?: string, returnTo?: PlatformSurface | null, returnContext?: PlatformSurfaceContext | null): any;
    reorderFavoriteGroups(source: string, target: string): any;
    reorderFavoritesInGroup(group: string, sourceKey: string, targetKey: string): any;
    openPlatformSurface(surface: PlatformSurface, returnTo?: PlatformSurface, context?: PlatformSurfaceContext | null): any;
    notePlatformSurface(surface: PlatformSurface, context?: PlatformSurfaceContext | null): any;
    notePlatformSurfaceOpened(surface: PlatformSurface, context?: PlatformSurfaceContext | null): any;
    getAvailablePlatformSurfaces(): PlatformSurface[];
    platformSurfaceDisplayName(surface: PlatformSurface): string;
    openPlatformFromBall(): any;
    getPlatformSurfaceLabels(): PlatformSurfaceLabels;
    getPlatformShortcutBindings(): {switcher: string; workbench: string};
    mountPlatformChrome(root: HTMLElement, options: PlatformSurfaceChromeOptions): HTMLElement;
    showSwitcher(focusSearch?: boolean, returnTo?: PlatformSurface, context?: PlatformSurfaceContext | null): any;
    createSwitcherDialog(settings: ISwSettings, fullscreen: boolean, release: {fn: () => void}, returnTo?: PlatformSurface, context?: PlatformSurfaceContext | null): Dialog;
    openSnippetStudio(returnTo?: PlatformSurface, context?: PlatformSurfaceContext | null): any;
    resolvePanelDialogSize(settings: ISwSettings, fullscreen: boolean): any;
    assembleSwitcherParts(dialog: Dialog, settings: ISwSettings, fullscreen: boolean, tabs: Tab[], activeTab: Tab | undefined, release: {fn: () => void}, focusSearch?: boolean, returnTo?: PlatformSurface, context?: PlatformSurfaceContext | null): any;
    prepareSwitcherChrome(dialog: Dialog, fullscreen: boolean): any;
    bindSwitcherListArea(dialog: Dialog, scrollElement: HTMLDivElement, tabs: Tab[], activeTab: Tab | undefined, listOpts: {onOverlayClose: IOverlayClose, onTabsChanged: IOverlayClose}, settings: ISwSettings, searchInput: HTMLInputElement | null, sortSelect: HTMLSelectElement | null, closeOverlay: IOverlayClose, updatedMap: {[rootId: string]: string}): any;
    bindSearchInputComposition(input: HTMLInputElement, onTrigger: () => void): () => void;
    bindSearchInputComposition(input: HTMLInputElement, onTrigger: () => void, scrollElement?: HTMLElement, onClose?: IOverlayClose): () => void;
    bindSearchInputComposition(input: HTMLInputElement, onTrigger: () => void, scrollElement?: HTMLElement, onClose?: IOverlayClose): () => void;
    bindSwitcherBackTop(dialog: Dialog, scrollElement: HTMLElement): () => void;
    bindSwitcherFullscreenToggle(dialog: Dialog, settings: ISwSettings, initialFullscreen: boolean): any;
    bindSwitcherToolbarActions(dialog: Dialog, searchInput: HTMLInputElement | null, sortSelect: HTMLSelectElement | null, listOpts: {onOverlayClose: () => void, onTabsChanged: () => void}, closeOverlay: () => void, updatedMap: {[rootId: string]: string}, returnTo?: PlatformSurface, context?: PlatformSurfaceContext | null): () => void;
    updateSortTriggerLabel(scope: HTMLElement): any;
    bindSortTriggerMenu(scope: HTMLElement, applySortChange: (nextSort: SortBy) => void, applyGroupChange: (nextGroup: TabGroupMode) => void): () => void;
    applySearch(scrollElement: HTMLElement, searchInput: HTMLInputElement, onClose: IOverlayClose): any;
    applySearchChips(scrollElement: HTMLElement, keyword: string): any;
    setupSearchModeChips(container: HTMLElement | null, searchInput: HTMLInputElement | null, onTrigger: () => void): () => void;
    commandCollapsedGroups: Set<string>;
    renderCommandList(scrollElement: HTMLElement, query: string, onClose: IOverlayClose): any;
    renderUnifiedSections(scrollElement: HTMLElement, keyword: string, onClose: IOverlayClose, parsedQuery?: {phrases: string[]; excludes: string[]; terms: string[]}): any;
    activateUnifiedItem(item: {kind: string; key?: string; rootId?: string; setId?: string}, onClose: IOverlayClose): any;
    getQuickActions(): IQuickAction[];
    saveQuickActions(actions: IQuickAction[]): any;
    refreshFloatingBallPanels(): any;
    getSnippetStack(): any;
    saveSnippetStack(stack: any): void;
    dumpData(): Promise<Record<string, unknown>>;
    restoreData(data: Record<string, unknown>): Promise<boolean>;
    openMainView(): void;
    handleQuickAction(action: string): Promise<void>;
    refineSnippetWithAi(item: any): Promise<{key: string; action: string} | string>;
    runRefineSnippetWithAi(item: any, externalSignal?: AbortSignal, inlineWait?: boolean): Promise<{key: string; action: string} | string>;
    synthesizeSnippetsWithAi(items: any[]): Promise<{ok: boolean; message: string; title: string; markdown: string}>;
    runSynthesizeSnippetsWithAi(items: any[], externalSignal?: AbortSignal, inlineWait?: boolean): Promise<{ok: boolean; message: string; title: string; markdown: string}>;
    searchOmniSlices(keyword: string): any[];
    bindEditorSelectionObserver(): void;
    resolveActiveSelectionContext(): any;
    fetchGleanActiveFoldTree(): unknown;
    captureSelectionToStack(fallback?: {text?: string; blockId?: string; rootId?: string; title?: string}): {added: any; stack: any} | null;
    executeStackCapture(): Promise<void>;
    executeStackCaptureFromContext(fallback?: {text?: string; blockId?: string; rootId?: string; title?: string}): Promise<void>;
    openSnippetStackBlock(blockId: string, item?: Record<string, unknown>, closeBeforeOpen?: () => void): Promise<boolean>;
    loadSnippetStudioModule<T>(onFulfilled: (mod: any) => T): Promise<T>;
    openSnippetStackDialog(): void;
    assembleSnippetStackToDoc(target: "journal" | "current-doc" | "new-doc" | "copy", options?: any): Promise<{ok: boolean; message: string}>;
    openActivityStreamDialog(): void;
    registerQuickActionAdapter(id: string, handler: (value: string) => void | Promise<void>, targets?: QuickActionTarget[]): () => void;
    registerQuickAction(options: {
        id: string;
        label: string;
        icon?: string;
        value?: string;
        targets?: QuickActionTarget[];
        handler: (value: string) => void | Promise<void>;
    }): () => void;
    registerHomeModule(options: {
        moduleId: string;
        title?: string;
        icon?: string;
        category?: string;
        supportedDevices?: Array<"desktop" | "sidebar" | "mobile">;
        sizes?: Array<"xs" | "small" | "medium" | "tall" | "wide" | "large" | "full">;
        description?: string;
        protocolVersion?: number;
        author?: string;
        homepage?: string;
        source?: {pluginId?: string; name?: string; icon?: string; version?: string; homepage?: string; collection?: string; order?: number};
        clickCommand?: string;
        configSchema?: Array<Record<string, unknown>>;
        refreshOn?: Array<"switch-protyle" | "loaded-protyle" | "destroy-protyle">;
        read: (config: Record<string, unknown>, device: "desktop" | "sidebar" | "mobile", options?: HomeModuleReadOptions) => unknown | Promise<unknown>;
        readOnly?: boolean;
        open?: () => void;
    }): () => void;
    getHomeModules(device?: "desktop" | "sidebar" | "mobile"): any;
    readHomeModule(moduleId: string, device?: "desktop" | "sidebar" | "mobile", config?: Record<string, unknown>, options?: Record<string, unknown>): any;
    buildHomeModuleView(moduleId: string, device?: "desktop" | "sidebar" | "mobile", result?: unknown, collapsed?: boolean): any;
    renderHomeModuleView(doc: unknown, view: unknown, options?: Record<string, unknown>): any;
    createHomeModuleController(container: unknown, moduleId: string, device?: "desktop" | "sidebar" | "mobile", config?: Record<string, unknown>, options?: Record<string, unknown>): any;
    createHomePanelController(container: unknown, device?: "desktop" | "sidebar" | "mobile", options?: Record<string, unknown>): any;
    getPluginCommands(): IQuickActionPluginCommand[];
    getQuickActionDeclaredTargets(action: IQuickAction): QuickActionTarget[] | undefined;
    getQuickActionSupport(action: IQuickAction, target: QuickActionTarget): QuickActionSupport;
    hostCommandsAvailable(): boolean;
    runHostCommand(value: string): boolean;
    openTemplatePicker(): Promise<void>;
    resolveActiveHostEditor(): {protyle: {block?: {parentID?: string; rootID?: string}; insert: (html: string, isBlock?: boolean, useProtyleRange?: boolean) => void}} | null;
    insertHostTemplate(editor: {protyle: {block?: {parentID?: string}; insert: (html: string, isBlock?: boolean, useProtyleRange?: boolean) => void}}, path: string): Promise<boolean>;
    syncNow(): Promise<void>;
    getAvailableIconSymbols(): Set<string>;
    renderQuickActionIcon(host: HTMLElement, raw: string, fallback?: string | string[]): any;
    moduleActionEnabled(value: string): boolean;
    renderQuickActions(container: HTMLElement, surface: "desktop" | "sidebar" | "mobile", searchInput: HTMLInputElement | null, close: () => void, selector?: string): any;
    cycleFloatingBallTab(offset: number): boolean;
    scrollFloatingBallSurface(surface: QuickActionTarget, edge: "top" | "bottom"): any;
    executeQuickAction(action: IQuickAction, searchInput: HTMLInputElement | null, close: () => void, surface?: QuickActionTarget): any;
    renderWorkbench(scrollElement: HTMLElement, keyword: string, onClose: IOverlayClose): any;
    ensureSnippetObjects(): Promise<Array<{id: string; name: string; type: string; enabled: boolean; lines: number}>>;
    renderSnippetSearchSection(scrollElement: HTMLElement, keyword: string): any;
    openClipboardEntry(): Promise<any>;
    exportConfigPack(): string;
    importConfigPack(payload: unknown, options?: {groups?: string[]}): {ok: boolean; reason?: string; applied?: string[]};
    exportSnapshot(): Promise<Record<string, unknown>>;
    countSnapshotRecords(snapshot: Record<string, unknown>): number;
    previewSnapshotDiff(incoming: Record<string, unknown>): Promise<{currentCount: number; incomingCount: number; summary: string}>;
    importSnapshotMerge(incoming: Record<string, unknown>): Promise<boolean>;
    createSnapshotVaultAdapter(): LvVaultPluginAdapter;
    getSavedSearches(): Array<{id: string; name: string; query: string; notebook?: string}>;
    saveCurrentSearch(query: string, filters?: IDocSearchFilters): any;
    updateSavedSearch(id: string, patch: {name?: string; query?: string; notebook?: string}): boolean;
    applySavedSearch(scrollElement: HTMLElement, saved: {id?: string; name?: string; query: string; notebook?: string}, onClose: IOverlayClose): any;
    executeFloatingBallSavedSearch(surface: FloatingBallSurface, reference: unknown): {ok: boolean; reason?: string};
    findOpenTabByRootId(rootId: string): Tab | null;
    reuseOpenTabsEnabled(): boolean;
    activateTabForReuse(rootId: string, onClose?: IOverlayClose): boolean;
    sessionMarks: Map<string, number>;
    activeScrollElement(): HTMLElement | null;
    setSessionMark(): void;
    jumpToSessionMark(): Promise<void>;
    relatedContentCache: Map<string, {rootId: string; at: number; projection: {items: Array<{id: string; source: string; title: string; hPath: string}>; counts: {backlinks: number; mentions: number; shown: number}; truncated: boolean}}>;
    relatedContentRequestGenerations: Map<string, number>;
    relatedSwrStore: Map<string, {rootId: string; at: number; projection: {items: Array<{id: string; source: string; title: string; hPath: string}>; counts: {backlinks: number; mentions: number; shown: number}; truncated: boolean}}>;
    persistRelatedSwr(): void;
    fillRelatedContent(box: HTMLElement, rootId: string, onClose: IOverlayClose): Promise<void>;
    renderRelatedRow(box: HTMLElement, projection: {items: Array<{id: string; source: string; title: string; hPath: string}>; counts: {backlinks: number; mentions: number; shown: number}; truncated: boolean}, onClose: IOverlayClose, options?: {cached?: boolean}): void;
    openTagSmartGroupEntries(group: {name: string; tag: string}): any;
    openHostListDialog(title: string, content: HTMLElement): any;
    homeModuleOpens: Map<string, () => void>;
    homeThirdPartyIds: Set<string>;
    homePanelSnapshots: Map<string, {snapshot: any; at: number}>;
    homeBuiltinAdapterIds: Set<string>;
    homeAccents: string[];
    taskWindowStart(days: number): string;
    isSemanticSearchAvailable(): boolean;
    fetchKernelJson(url: string, body: Record<string, unknown>, timeoutOrOptions?: number | {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number}, options?: {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number}): Promise<any | null>;
    requestKernelJsonOutcome(url: string, body: Record<string, unknown>, options?: {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number}): Promise<KernelRequestOutcome>;
    fetchKernelJsonOutcome(url: string, body: Record<string, unknown>, timeoutOrOptions?: number | {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number}, options?: {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number}): Promise<KernelRequestOutcome>;
    fetchActivityWatchViaKernel(url: string, init: {body?: string; headers?: Record<string, string>; signal?: AbortSignal}): Promise<any>;
    fetchBangumiCalendar(url: string, init: {signal?: AbortSignal; headers?: Record<string, string>}): Promise<any>;
    registerBuiltinHomeAdapters(): any;
    getHomeState(): any;
    saveHomeState(state: { schemaVersion: number; defaultsVersion?: number; instances: unknown[]; layouts: Record<string, unknown[]> }): Promise<any>;
    loadHomeFavoriteGroups(): Array<{id: string; title: string}>;
    loadHomeDatabaseOptions(): Promise<Array<{id: string; title: string}>>;
    loadHomeDocumentOptions(query?: string): Promise<Array<{id: string; title: string}>>;
    loadHomeDatabaseColumns(blockId: string): Promise<Array<{id: string; title: string}>>;
    removeHomeInstance(instanceId: string): any;
    restoreDocumentSetFromHome(setId: string): Promise<any>;
    snapshotCurrentDocumentSetBeforeSwitch(targetSetId: string): any;
    cycleDocumentSet(): Promise<void>;
    cycleBallPreset(): void;
    throwActiveDocToWindow(): boolean;
    hideMobileKeyboard(): boolean;
    captureJumpOrigin(): void;
    jumpBack(): Promise<boolean>;
    jumpForward(): Promise<boolean>;
    executeHomeCommand(command: string, close: () => void): boolean;
    clampTaskWritePayload(markdown: string): string;
    toggleHomeTaskBlock(item: { value?: string; done?: boolean; blockId?: string; id?: string; source?: string }, desiredDone?: boolean): Promise<boolean>;
    handleHomeItemAction(item: { label?: string; value?: string; href?: string; command?: string }, close: () => void): any;
    migrateHomeLayoutSize(entry: {w?: number; h?: number; size?: string}, sizes: string[]): string;
    openHomeSizeMenu(anchor: HTMLElement, supported: string[], current: string, onPick: (size: string) => void): () => void;
    getQuickActionPickerCandidates(actions: IQuickAction[]): IQuickActionPickerCandidate[];
    renderQuickActionIconButton(button: HTMLButtonElement, icon: string): any;
    getAvailableQuickActionIcons(current: string): string[];
    activeIconPickerCleanup: (() => void) | null;
    openQuickActionIconPicker(action: IQuickAction, onPick: (icon: string) => void): any;
    getDocumentSets(): any[];
    currentDocumentSetEntries(): Array<{rootId: string; title: string; index?: number; active?: boolean}>;
    saveDocumentSet(candidate: unknown): Promise<any>;
    probeDocumentSetEntries(entries: Array<{rootId: string; title: string}>, signal?: AbortSignal): Promise<any>;
    updatedMapCache: {key: string, ts: number, map: {[rootId: string]: string}} | null;
    loadUpdatedMap(tabs: Tab[]): Promise<{[rootId: string]: string}>;
    getActiveTab(): Tab | undefined;
    registerAgentCapabilities(): any;
    searchAgentDocuments(args?: Record<string, unknown>): Promise<any>;
    filterCards(scrollElement: HTMLElement, keyword: string, contentRoots?: Set<string>, filters?: IDocSearchFilters, parsedQuery?: {phrases: string[]; excludes: string[]; terms: string[]}): number;
    renderDockList(dockElement: HTMLElement | null, dialog: Dialog, excludedDocks: string[], mode: DockDisplay): any;
    createDockItem(panel: IDockPanel, dialog: Dialog, activeDockType?: string | null): HTMLElement;
    activateDock(type: string, dialog: Dialog): any;
    getDockPanels(): IDockPanel[];
    getDockByType(type: string): ISiyuanLayoutDock | undefined;
    titleOf(tab: Tab): string;
    rootIdOf(tab: Tab): string | null;
    pinKeyOf(tab: Tab): string;
    getPinned(): string[];
    togglePinned(tab: Tab): boolean;
    getFavorites(): IFavoriteItem[];
    saveFavorites(list: IFavoriteItem[]): Promise<void>;
    addFavorite(item: IFavoriteItem): Promise<void>;
    toggleFavorite(tab: Tab): Promise<boolean>;
    migrateFavoriteKey(list: IFavoriteItem[], tab: Tab, rootId: string): Promise<boolean>;
    removeFavorite(key: string): Promise<void>;
    initFavCollapsed(): any;
    saveFavCollapsed(): Promise<void>;
    setupOpenHistoryDropdown(container: HTMLElement | null, onClose: IOverlayClose): () => void;
    fetchDocUpdatedMap(rootIds: string[]): Promise<Map<string, string>>;
    syncOfficialRecentHistory(): Promise<"success" | "empty" | "failed">;
    positionOpenHistoryPanel(trigger: HTMLElement, panel: HTMLElement): any;
    renderOpenHistoryPanel(panel: HTMLElement, onPick: (entry: IOpenHistoryEntry) => void, entryFilter?: (entry: IOpenHistoryEntry) => boolean, onShowAll?: () => void): any;
    bindHistoryItemActions(item: HTMLButtonElement, entry: IOpenHistoryEntry, onPick: (entry: IOpenHistoryEntry) => void): any;
    openHistoryEntry(entry: IOpenHistoryEntry): Promise<any>;
    docScrollMemory: Map<string, number>;
    lastPickedByQuery: Map<string, string>;
    jumpBackStack: Array<{rootId: string}>;
    jumpForwardStack: Array<{rootId: string}>;
    suppressJumpCapture: boolean;
    captureDocScrollFromElement(rootId: string, element: HTMLElement): any;
    captureActiveDocScroll(): any;
    applyDocScrollAfterOpen(rootId: string): any;
    refreshOpenHistoryDropdowns(): any;
    closeHistoryMenu(): any;
    refreshOpenHistoryDropdown(container: HTMLElement): any;
    setupFavDropdown(container: HTMLElement, onClose: IOverlayClose, onChanged?: IOverlayClose): any;
    positionFavPanel(trigger: HTMLElement, panel: HTMLElement): any;
    renderFavPanel(panel: HTMLElement, onPick: () => void, onChanged?: IOverlayClose): any;
    appendFavSmartGroup(panel: HTMLElement, group: {name: string; tag: string}, onPick: () => void, onChanged?: IOverlayClose): any;
    getFavoriteSmartGroups(): Array<{name: string; tag: string; notebook?: string; updatedWithinDays?: number}>;
    addFavoriteSmartGroup(name: string, tag: string, notebook?: string, updatedWithinDays?: number): boolean;
    removeFavoriteSmartGroup(name: string): void;
    getDocumentSetEssentials(): string[];
    addDocumentSetEssentialsFromCurrentTabs(): number;
    removeDocumentSetEssential(rootId: string): void;
    openDocumentSetEssentials(): Promise<{opened: number; failed: number; skipped: number; results: Array<{rootId: string; status: "restored" | "failed" | "skipped"; error?: string}>}>;
    buildDocumentSetEssentialsManager(): HTMLElement;
    getFavoriteTagOptions(): Promise<Array<{name: string; count: number}>>;
    getFavoriteNotebookOptions(): Promise<Array<{id: string; name: string}>>;
    appendFavGroup(panel: HTMLElement, name: string, items: IFavoriteItem[], onPick: () => void, onChanged?: IOverlayClose): any;
    appendFavFlatList(panel: HTMLElement, items: IFavoriteItem[], onPick: () => void, onChanged?: IOverlayClose): any;
    makeFavItem(panel: HTMLElement, fav: IFavoriteItem, onPick: () => void, onChanged?: IOverlayClose): HTMLButtonElement;
    refreshFavDropdown(container: HTMLElement): any;
    refreshFavSelects(): any;
    setFavoriteGroup(key: string, group: string): Promise<void>;
    addFavoriteToGroup(tab: Tab, group: string): Promise<void>;
    getFavGroupRegistry(): string[];
    saveFavGroupRegistry(names: string[]): Promise<void>;
    getFavoriteGroupNames(): string[];
    createFavoriteGroup(name: string): boolean;
    deleteFavoriteGroup(name: string): any;
    renameFavoriteGroup(from: string, to: string): any;
    refreshCardFavState(tab: Tab, card: HTMLElement): any;
    openFavMenu(tab: Tab, card: HTMLElement, event: MouseEvent): any;
    buildFavMenuUnfavorited(menu: Menu, tab: Tab, card: HTMLElement, groupNames: string[]): any;
    buildFavMenuFavorited(menu: Menu, tab: Tab, card: HTMLElement, key: string, favorite: IFavoriteItem, groupNames: string[]): any;
    openFavGroupMenu(items: IFavoriteItem[], event: MouseEvent, onChanged?: IOverlayClose): any;
    openFavItemMenu(panel: HTMLElement, fav: IFavoriteItem, onPick: () => void, event: MouseEvent, onChanged?: IOverlayClose): any;
    applyFavItemChange(mutate: () => void | Promise<void>, panel: HTMLElement, onPick: () => void, onChanged?: IOverlayClose): Promise<void>;
    escapeAttr(text: string): string;
    openGroupDialog(tab: Tab, card?: HTMLElement): any;
    openFavoriteGroupDialog(panel: HTMLElement, fav: IFavoriteItem, onPick: () => void, onChanged?: IOverlayClose): any;
    jumpToFavorite(favorite: IFavoriteItem, onClose: IOverlayClose): Promise<any>;
    openGroupTabs(items: IFavoriteItem[]): Promise<number>;
    openGroupTabsInternal(items: IFavoriteItem[]): Promise<number>;
    closeGroupTabs(items: IFavoriteItem[]): Promise<number>;
    closeGroupTabsInternal(items: IFavoriteItem[]): Promise<number>;
    sortItems(items: IGroupedTab[], sortBy: SortBy, mru: string[], updatedMap: {[rootId: string]: string}): any;
    renderList(scrollElement: HTMLElement, tabs: Tab[], activeTab: Tab | undefined, opts: {onOverlayClose: IOverlayClose, onTabsChanged: IOverlayClose}, sortBy: SortBy, updatedMap?: {[rootId: string]: string}): any;
    updateDigitBadges(scrollElement: HTMLElement): any;
    sortGroupItems(group: IGroupedTab[], sortBy: SortBy, mru: string[], pinned: Set<string>, updatedMap: {[rootId: string]: string}): IGroupedTab[];
    renderTabGroup(scrollElement: HTMLElement, ordered: IGroupedTab[], ctx: ITabGroupRenderCtx, all: IGroupedTab[], focusState: {defaultFocusIndex: number; matchedActive?: boolean; matchedMru?: boolean}): any;
    groupCollapseState: Set<string>;
    createdByIdCache: {[rootId: string]: string};
    notebookListCache: Array<{id: string; name: string}> | null;
    rootNotebookCache: {[rootId: string]: string};
    groupFlowObserver: ResizeObserver | null;
    homeRefreshTimer: number;
    sidebarRefreshTimer: number;
    renderGroupedList(scrollElement: HTMLElement, tabs: Tab[], activeTab: Tab | undefined, groupMode: TabGroupMode, ctx: ITabGroupRenderCtx, all: IGroupedTab[], focusState: {defaultFocusIndex: number; matchedActive?: boolean; matchedMru?: boolean}, listOpts: {onOverlayClose: IOverlayClose, onTabsChanged: IOverlayClose}, sortBy: SortBy, updatedMap: {[rootId: string]: string}): any;
    loadRootNotebookMap(rootIds: string[]): Promise<any>;
    renderNamedTabGroup(scrollElement: HTMLElement, def: {key: string; label: string; icon: string; items: Tab[]}, ordered: IGroupedTab[], ctx: ITabGroupRenderCtx, all: IGroupedTab[], focusState: {defaultFocusIndex: number; matchedActive?: boolean; matchedMru?: boolean}, span?: number, cellWidth?: number): any;
    acquireGroupCard(item: IGroupedTab, ctx: ITabGroupRenderCtx, mobile: boolean): HTMLElement;
    buildTabGroupGrid(scrollElement: HTMLElement, count: number, settings: ISwSettings): HTMLElement;
    syncCardState(card: HTMLElement, tab: Tab, isActive: boolean, isPinned: boolean, isFaved: boolean, ctx: ITabGroupRenderCtx): any;
    resolveLvMascotHtml(): string;
    buildEmptyState(surfaceRoot?: Element | null): HTMLElement;
    handleTogglePin(tab: Tab, card: HTMLElement): any;
    recordRecentSearchQuery(query: string): any;
    copyToClipboard(text: string): any;
    handleToggleFav(tab: Tab, card: HTMLElement): Promise<void>;
    closeActiveTabForAction(): Promise<boolean>;
    closeTabQuietly(tab: Tab): Promise<boolean>;
    waitForTabStates(ids: string[], shouldBeOpen: boolean, matchTabId?: boolean): Promise<Set<string>>;
    sleep(ms: number): Promise<void>;
    restoreMobileSwitcherAboveHostPanels(): any;
    handleCloseTab(tab: Tab, card: HTMLElement, onTabsChanged: IOverlayClose): Promise<any>;
    createCard(item: IGroupedTab, isActive: boolean, isPinned: boolean, isFaved: boolean, ctx: ITabGroupRenderCtx, handlers: {
                           onActivate: (tab: Tab) => void,
                           onTogglePin: (tab: Tab, card: HTMLElement) => void,
                           onToggleFav: (tab: Tab, card: HTMLElement) => void,
                           onCloseTab: (tab: Tab, card: HTMLElement) => void,
                       }): HTMLElement;
    buildCardThumb(tab?: Tab): HTMLElement;
    buildCardMeta(tab: Tab, ctx?: Pick<ITabGroupRenderCtx, "settings" | "updatedMap">): HTMLElement;
    refreshCardUpdatedBadges(scrollElement: HTMLElement, updatedMap: {[rootId: string]: string}): any;
    buildCardIcon(tab: Tab): HTMLElement;
    buildCardActions(tab: Tab, card: HTMLElement, isPinned: boolean, isFaved: boolean, handlers: {
            onTogglePin: (tab: Tab, card: HTMLElement) => void,
            onToggleFav: (tab: Tab, card: HTMLElement) => void,
            onCloseTab: (tab: Tab, card: HTMLElement) => void,
        }): DocumentFragment;
    bindCardLongPress(card: HTMLElement, tab: Tab, handlers: {
            onActivate: (tab: Tab) => void,
            onTogglePin: (tab: Tab, card: HTMLElement) => void,
            onToggleFav: (tab: Tab, card: HTMLElement) => void,
            onCloseTab: (tab: Tab, card: HTMLElement) => void,
        }): any;
    openActionPaletteForDoc(doc: any, item?: HTMLElement): IActionPaletteHandle | null;
    openCardActionPalette(tab: Tab, card?: HTMLElement, handlers?: CardMenuHandlers): IActionPaletteHandle | null;
    executePaletteAction(actionId: string, tab?: Tab | null, card?: HTMLElement, handlers?: CardMenuHandlers, _ctx?: any): void;
    openCardMenu(tab: Tab, card: HTMLElement, handlers: {
                             onActivate: (tab: Tab) => void,
                             onTogglePin: (tab: Tab, card: HTMLElement) => void,
                             onToggleFav: (tab: Tab, card: HTMLElement) => void,
                             onCloseTab: (tab: Tab, card: HTMLElement) => void,
                         }, x: number, y: number): any;
    getThumbCache(): IThumbCache;
    saveThumbCache(cache: IThumbCache): Promise<any>;
    setThumbCache(cache: IThumbCache, rootId: string, title: string, html: string): any;
    pruneThumbCache(tabs: Tab[]): any;
    renderThumbItem(item: IGroupedTab): any;
    renderThumbnails(list: IGroupedTab[], scrollElement: HTMLElement, batch: number): any;
    renderThumbBatch(list: IGroupedTab[], batch: number): any;
    sanitizeThumbHtml(html: string): DocumentFragment | null;
    applyThumbContent(thumb: HTMLElement, source: HTMLElement, title: string): boolean;
    flushPendingThumbScales(): void;
    pendingThumbScales: Array<{thumb: HTMLElement; content: HTMLElement; tries?: number}>;
    thumbScaleFramePending: boolean;
    thumbApiActive: number;
    thumbApiQueue: Array<() => void>;
    thumbApiControllers: Map<HTMLElement, AbortController>;
    cancelThumbFetches(): any;
    acquireThumbApi(): Promise<void>;
    releaseThumbApi(): any;
    fillThumbByApi(tab: Tab, thumb: HTMLElement): Promise<any>;
    cloneLimitedContent(source: HTMLElement, max: number): HTMLElement;
    getThumbSource(tab: Tab): HTMLElement | null;
    bindKeydown(scrollElement: HTMLElement, closeOverlay: IOverlayClose): any;
    activateDocItemByDigit(scrollElement: HTMLElement, key: string, closeOverlay: IOverlayClose): boolean;
    moveDocItemFocus(scrollElement: HTMLElement, current: HTMLElement, delta: number): boolean;
    activateCardByElement(card: HTMLElement | undefined, closeOverlay: IOverlayClose): any;
    cycleSearchChip(scrollElement: HTMLElement, delta: number): any;
    pickCardByPosition(cards: HTMLElement[], current: HTMLElement, key: string): HTMLElement | null;
    focusCard(card: HTMLElement | undefined | null, domFocus?: boolean): any;
    scrollIntoView(card: HTMLElement, container: HTMLElement): any;
    centerCardInView(card: HTMLElement, container: HTMLElement): any;
    activateTab(tab: Tab, onClose?: IOverlayClose): any;
    currentTabs(): Tab[];
    getMobileTabs(): Tab[];
    getMobileActiveTabId(): string | undefined;
    mobileOpenDoc(rootId: string): Promise<boolean>;
    showMobileSwitcher(focusSearch?: boolean, returnTo?: PlatformSurface, context?: PlatformSurfaceContext | null): any;
    createMobileSwitcherDialog(release: {fn: () => void}): Dialog;
    renderMobileSwitcherList(dialog: Dialog, scrollElement: HTMLDivElement, sortSelect: HTMLSelectElement, settings: ISwSettings): any;
    buildMobileGroupGrid(settings: ISwSettings): HTMLElement;
    renderMobileCardsInGroup(grid: HTMLElement, ordered: IGroupedTab[], ctx: ITabGroupRenderCtx): IGroupedTab[];
    showMobileFavSheet(dialog: Dialog, closeOverlay: IOverlayClose, onTabsChanged?: () => void, returnFocus?: HTMLElement | null): any;
    buildMobileFavSheetHtml(): string;
    renderMobileFavSheetBody(body: HTMLElement, favorites: IFavoriteItem[], groupNames: string[], closeOverlay: IOverlayClose, onTabsChanged: (() => void) | undefined, overlay: HTMLElement, closeSheet: () => void): any;
    appendMobileFavSheetSection(body: HTMLElement, name: string, items: IFavoriteItem[], isUngrouped: boolean, overlay: HTMLElement, closeOverlay: IOverlayClose, onTabsChanged: (() => void) | undefined, closeSheet: () => void): any;
    buildMobileFavSheetList(favorites: IFavoriteItem[], overlay: HTMLElement, closeOverlay: IOverlayClose, closeSheet?: () => void): HTMLElement;
    closeMobileFavSheetOverlay(overlay: HTMLElement, sheet: HTMLElement, returnFocus?: HTMLElement | null): any;
    bindMobileFavSheetBackdropClose(overlay: HTMLElement, sheet: HTMLElement, returnFocus?: HTMLElement | null): any;
    getFloatingBallActions(): IQuickAction[];
    executeFloatingBallBoundAction(surface: FloatingBallSurface, reference: unknown): any;
    executeFloatingBallBoundGesture(surface: FloatingBallSurface, bound: unknown): void;
    executeFloatingBallSurfaceAction(surface: FloatingBallSurface, action: unknown): any;
    createFloatingBallSurface(surface: FloatingBallSurface): FloatingBallUiController;
    buildFloatingBallHubPayload(surface: FloatingBallSurface, catalogActions: IQuickAction[]): any;
    executeFloatingBallHubItem(item: Record<string, unknown>): any;
    toggleFloatingBallFirstLayerPin(action: Record<string, unknown>, nextPinned: boolean, surface: FloatingBallSurface): any;
    destroyFloatingBallSurface(surface: FloatingBallSurface): any;
    persistFloatingBallPosition(surface: FloatingBallSurface, position: FloatingBallPosition): any;
    suspendFABForDialog(onDestroy?: () => void): () => void;
    updateFABVisibility(): any;
    updateFloatingBallVisibility(): any;
    renderSidebarPanel(element: HTMLElement): any;
    buildSidebarHtml(): string;
    observeSidebarResize(element: HTMLElement): any;
    collectDirtyIconRoots(host: HTMLElement, dirty: Set<Element>, records?: MutationRecord[]): any;
    flushDirtyIconRoots(host: HTMLElement, dirty: Set<Element>): any;
    observeSidebarIcons(element: HTMLElement): any;
    bindSidebarToolbarEvents(element: HTMLElement, scrollElement: HTMLDivElement, refresh: IOverlayClose): () => void;
    scheduleSidebarRefresh(): any;
    rescaleThumbs(container: HTMLElement): any;
    refreshSidebar(): any;
    refreshSidebarActive(): any;
    toggleSidebar(): any;
    getMru(): string[];
    getOpenHistory(): IOpenHistoryEntry[];
    removeOpenHistoryEntry(key: string): Promise<void>;
    removeClosedHistoryEntry(rootId: string): Promise<void>;
    undoLastClosedTab(closeOverlay?: IOverlayClose): boolean;
    executeKeepRoaming(onDestroy?: () => void): Promise<boolean>;
    executeTaskHorizonToday(onDestroy?: () => void): Promise<boolean>;
    executeContextPromotionAction(actionId: string, textOverride?: string): Promise<boolean>;
    saveCurrentTabsAsDocSet(): boolean;
    exportTabsAsMindmap(): boolean;
    recordOpenHistory(tab: Tab): Promise<void>;
    getClosedHistory(): Array<{rootId: string; title: string; closedAt: number}>;
    captureRecentOpenSnapshot(): any;
    scheduleRecentClosedSync(): any;
    syncRecentClosedFromSnapshot(generation?: number): Promise<void>;
    runPluginOnload(): Promise<void>;
    runPluginOnLayoutReady(): void;
    cleanupRuntimeOnUnload(): Promise<void>;
}
