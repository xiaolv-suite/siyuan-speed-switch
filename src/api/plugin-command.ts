/** Commands are owned by plugin instance, never by the first matching global key. */
export async function runPluginCommand(plugins: unknown, pluginName: string, key: string): Promise<{ok: boolean; message?: string}> {
    if (!pluginName || !key || !Array.isArray(plugins)) return {ok: false, message: "command-not-found"};
    const plugin = plugins.find((entry: any) => entry?.name === pluginName);
    const command = plugin?.commands?.find((entry: any) => entry?.langKey === key || entry?.command === key);
    const callback = command?.callback || command?.globalCallback;
    if (typeof callback !== "function") return {ok: false, message: "command-not-found"};
    try {
        await callback.call(plugin);
        return {ok: true};
    } catch (error) {
        return {ok: false, message: String(error)};
    }
}
