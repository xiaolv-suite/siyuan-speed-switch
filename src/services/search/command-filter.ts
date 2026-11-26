import { pinyinTitleHit } from "../../search-model";

export function isCommandMode(query: string): boolean {
    return query.startsWith(">") || query.startsWith("》");
}

export function extractCommandQuery(query: string): string {
    if (query.startsWith(">") || query.startsWith("》")) {
        return query.slice(1).trim();
    }
    return query.trim();
}

export function filterCommands<T extends { id?: string; label?: string; title?: string; command?: string; pluginTitle?: string }>(
    query: string,
    commands: T[]
): T[] {
    const clean = extractCommandQuery(query).toLowerCase();
    if (!clean) return commands;
    return commands.filter((cmd) => {
        const text = (cmd.label || cmd.title || cmd.command || cmd.id || "").toLowerCase();
        if (text.includes(clean)) return true;
        if (cmd.pluginTitle && cmd.pluginTitle.toLowerCase().includes(clean)) return true;
        if (typeof pinyinTitleHit === "function" && pinyinTitleHit(text, clean)) return true;
        return false;
    });
}
