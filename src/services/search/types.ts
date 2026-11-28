import type { IHostBridge } from "../../core/types/bridge";
import type { ITieredStorageEngine } from "../../core/types/storage";
import type { IDisposableRegistry, IDisposable } from "../../core/types/disposer";

export interface IParsedQuery {
    raw?: string;
    terms: string[];
    phrases: string[];
    excludes: string[];
    [key: string]: any;
}

export interface ISearchFilterState {
    scope?: string;
    type?: string;
    notebook?: string;
    path?: string;
}

export interface ISearchDeps {
    bridge: IHostBridge;
    storage: ITieredStorageEngine;
    disposer: IDisposableRegistry;
    isMobile: () => boolean;
    getI18n?: () => Record<string, string>;
}

export interface ISearchService extends IDisposable {
    parseQuery(query: string): IParsedQuery;
    formatCleanQuery(parsed: IParsedQuery): string;
    filterCommands<T extends { id?: string; label?: string; title?: string; command?: string }>(
        query: string,
        commands: T[]
    ): T[];
    isCommandMode(query: string): boolean;
    extractCommandQuery(query: string): string;
}
