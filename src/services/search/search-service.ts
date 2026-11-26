import type { ISearchService, ISearchDeps, IParsedQuery } from "./types";
import { parseQuery, formatQuery } from "./query-parser";
import { isCommandMode, extractCommandQuery, filterCommands } from "./command-filter";

export class SearchService implements ISearchService {
    private isDisposed = false;

    constructor(deps: ISearchDeps) {
        deps.disposer.register(this);
    }

    public parseQuery(query: string): IParsedQuery {
        return parseQuery(query);
    }

    public formatCleanQuery(parsed: IParsedQuery): string {
        return formatQuery(parsed);
    }

    public filterCommands<T extends { id?: string; label?: string; title?: string; command?: string }>(
        query: string,
        commands: T[]
    ): T[] {
        return filterCommands(query, commands);
    }

    public isCommandMode(query: string): boolean {
        return isCommandMode(query);
    }

    public extractCommandQuery(query: string): string {
        return extractCommandQuery(query);
    }

    public dispose(): void {
        if (this.isDisposed) return;
        this.isDisposed = true;
    }
}

export function createSearchService(deps: ISearchDeps): SearchService {
    return new SearchService(deps);
}
