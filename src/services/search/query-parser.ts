import { parseSearchQuery, formatCleanQuery } from "../../search-model";
import type { IParsedQuery } from "./types";

export function parseQuery(raw: string): IParsedQuery {
    const res = parseSearchQuery(raw);
    return {
        raw,
        ...res,
    };
}

export function formatQuery(parsed: any): string {
    return formatCleanQuery(parsed);
}
