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
    const tokens = clean.split(/\s+/).filter(Boolean);
    return commands.filter((cmd) => {
        const text = (cmd.label || cmd.title || cmd.command || cmd.id || "").toLowerCase();
        const pluginTitle = (cmd.pluginTitle || "").toLowerCase();
        const combined = pluginTitle ? `${text} ${pluginTitle}` : text;
        if (tokens.length <= 1) {
            if (text.includes(clean)) return true;
            if (pluginTitle && pluginTitle.includes(clean)) return true;
            if (typeof pinyinTitleHit === "function" && (pinyinTitleHit(text, clean) || (pluginTitle && pinyinTitleHit(pluginTitle, clean)))) return true;
            return false;
        }
        return tokens.every((token) =>
            combined.includes(token)
            || (typeof pinyinTitleHit === "function" && (pinyinTitleHit(text, token) || (pluginTitle && pinyinTitleHit(pluginTitle, token))))
        );
    });
}
