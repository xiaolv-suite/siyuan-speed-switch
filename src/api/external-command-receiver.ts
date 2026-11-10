/** Minimal replacement for retired QuickGate transport. No arbitrary API/JS/command execution. */
export interface ExternalCommandPolicy {enabled: boolean; allowNavigation: boolean; allowWrites: boolean}
export interface ExternalReceipt {v: 1; id: string; op: string; status: string; message?: string; data?: unknown; finishedAt: string; elapsedMs: number}
interface JournalEntry {id: string; fingerprint: string; at: number; receipt: ExternalReceipt}
export interface ExternalCommandDeps {
    policy: () => ExternalCommandPolicy;
    load: () => Promise<unknown>;
    save: (entries: JournalEntry[]) => Promise<void>;
    publish: (receipt: ExternalReceipt) => Promise<void>;
    execute: (op: string, args: Record<string, unknown>) => Promise<unknown>;
    now?: () => number;
}
const READ_OPS = new Set(["commands.list", "editor.context", "navigation.context", "checkin.items", "checkin.summary"]);
const NAV_OPS = new Set(["doc.open", "commands.run"]);
const NAV_COMMANDS: Record<string, readonly string[]> = {
    "siyuan-checkin": ["openCheckin", "openCheckinTab"],
    "siyuan-contacts": ["openWorkbench"], "siyuan-home": ["openButler"],
    "siyuan-glean": ["cmd.openPanel"], "siyuan-exam": ["command.openPractice", "command.openWrongbook", "command.openReport"],
    "siyuan-lv-cards": ["openDashboard", "openManager", "startReview"], "xiaolv-common": ["open"],
    "siyuan-speed-switch": ["switchTabs", "commandPalette", "secondPanel"],
};
export function isExternalNavigationCommand(plugin: unknown, command: unknown): boolean {
    return typeof plugin === "string" && typeof command === "string" && Boolean(NAV_COMMANDS[plugin]?.includes(command));
}
export function createExternalCommandReceiver(deps: ExternalCommandDeps) {
    let disposed = false;
    let queue = Promise.resolve();
    let pending = 0;
    let loaded: JournalEntry[] | undefined;
    const now = deps.now || Date.now;
    const process = async (raw: unknown): Promise<ExternalReceipt> => {
        const start = now();
        let command: any = typeof raw === "string" && raw.length > 32768 ? null : raw;
        try { for (let n = 0; n < 2 && typeof command === "string"; n++) command = JSON.parse(command); } catch { command = null; }
        const receipt = (status: string, message?: string, data?: unknown): ExternalReceipt => ({v: 1, id: String(command?.id || "").slice(0, 96), op: String(command?.op || "").slice(0, 40), status, ...(message ? {message} : {}), ...(data === undefined ? {} : {data}), finishedAt: new Date(now()).toISOString(), elapsedMs: now() - start});
        if (!command || command.v !== 1 || typeof command.id !== "string" || !/^[\w.-]{1,96}$/.test(command.id) || typeof command.op !== "string" || !command.args || typeof command.args !== "object" || Array.isArray(command.args) || JSON.stringify(command).length > 32768) return receipt("rejected", "invalid-envelope");
        if (disposed || !deps.policy().enabled) return receipt("rejected", "receiver-disabled");
        const created = Date.parse(command.createdAt);
        const ttl = command.ttlMs;
        if (!Number.isFinite(created) || typeof command.createdAt !== "string" || !/[Zz]|[+-]\d\d:\d\d$/.test(command.createdAt) || !Number.isInteger(ttl) || ttl < 1 || ttl > 300000 || created > start + 30000 || start - created > ttl) return receipt("expired", "invalid-or-expired-ttl");
        if (command.device) return receipt("rejected", "device-routing-not-supported");
        const policy = deps.policy();
        if (!READ_OPS.has(command.op) && !NAV_OPS.has(command.op) && command.op !== "checkin.record") return receipt("rejected", "unsupported-operation");
        if (NAV_OPS.has(command.op) && !policy.allowNavigation) return receipt("rejected", "navigation-disabled");
        if (command.op === "commands.run" && !isExternalNavigationCommand(command.args.plugin, command.args.command)) return receipt("rejected", "command-not-allowlisted");
        if (command.op === "doc.open" && !/^\d{14}-[a-z0-9]{7}$/.test(String(command.args.id || ""))) return receipt("rejected", "invalid-block-id");
        if (command.op === "checkin.record" && !policy.allowWrites) return receipt("rejected", "writes-disabled");
        const encoded = new TextEncoder().encode(JSON.stringify({op: command.op, args: command.args}));
        const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoded)), (v) => v.toString(16).padStart(2, "0")).join("");
        if (!loaded) {
            let data: any = await deps.load();
            if (data === "" || data == null) {
                data = null;
            } else if (typeof data === "string") {
                try { data = JSON.parse(data); } catch { return receipt("rejected", "journal-invalid"); }
            }
            if (data != null && (!Array.isArray(data) || data.some((x) => !x || typeof x.id !== "string" || typeof x.fingerprint !== "string" || !x.receipt || !Number.isFinite(x.at)))) return receipt("rejected", "journal-invalid");
            loaded = Array.isArray(data) ? data.filter((x) => x && typeof x.id === "string" && typeof x.fingerprint === "string" && x.receipt && Number.isFinite(x.at)).slice(-512) : [];
        }
        loaded = loaded.filter((entry) => start - entry.at < 86400000);
        const existing = loaded.find((entry) => entry.id === command.id);
        if (existing) {
            const result = existing.fingerprint === fingerprint ? existing.receipt : receipt("rejected", "request-id-conflict");
            return result;
        }
        if (loaded.length >= 512) return receipt("rejected", "journal-capacity-reached");
        const reservation: JournalEntry = {id: command.id, fingerprint, at: start, receipt: receipt("unknown", "reserved-result-not-confirmed")};
        loaded.push(reservation);
        // Durable reservation BEFORE side effects: no blind execution on storage failure.
        try {
            const saveRes: any = await deps.save(loaded);
            if (saveRes && typeof saveRes === "object" && typeof saveRes.code === "number" && saveRes.code !== 0) {
                throw new Error("reservation-save-code-" + saveRes.code);
            }
        } catch {
            loaded = undefined;
            return receipt("rejected", "reservation-persist-failed");
        }
        try {
            const currentPolicy = deps.policy();
            if (disposed || !currentPolicy.enabled || NAV_OPS.has(command.op) && !currentPolicy.allowNavigation || command.op === "checkin.record" && !currentPolicy.allowWrites) reservation.receipt = receipt("rejected", "receiver-stopped-or-permission-changed");
            else {
                const data = await deps.execute(command.op, {...command.args, requestId: command.id});
                reservation.receipt = data && typeof data === "object" && (data as any).ok === false ? receipt("failed", String((data as any).message || "operation-rejected"))
                    : JSON.stringify(data ?? null).length > 65536 ? receipt("unknown", "result-too-large") : receipt("recorded", undefined, data);
            }
        } catch { reservation.receipt = receipt("unknown", "operation-result-not-confirmed"); }
        // Retain reservation if result persistence fails; never replay the operation.
        try {
            const saveRes: any = await deps.save(loaded);
            if (saveRes && typeof saveRes === "object" && typeof saveRes.code === "number" && saveRes.code !== 0) {
                throw new Error("result-save-code-" + saveRes.code);
            }
        } catch { reservation.receipt = receipt("unknown", "result-persist-not-confirmed"); }
        return reservation.receipt;
    };
    return {
        submit(raw: unknown): Promise<ExternalReceipt> {
            if (pending >= 128) return Promise.resolve({v: 1, id: "", op: "", status: "rejected", message: "receiver-busy", finishedAt: new Date(now()).toISOString(), elapsedMs: 0});
            pending += 1;
            const execute = async () => {
                loaded = undefined;
                const result = await process(raw);
                if (result.id && deps.policy().enabled) await deps.publish(result);
                return result;
            };
            const result: Promise<ExternalReceipt> = queue.then(async () => {
                if (typeof navigator !== "undefined" && navigator.locks) return await navigator.locks.request<Promise<ExternalReceipt>>("siyuan-speed-switch-external-command", execute);
                return await execute();
            });
            queue = result.then((): void => {pending -= 1;}, (): void => {pending -= 1;});
            return result;
        },
        dispose() { disposed = true; },
    };
}

const COMMAND_PATH = "/storage/petal/siyuan-speed-switch/bridge/commands.ndjson";
const RESULT_PATH = "/storage/petal/siyuan-speed-switch/bridge/results.ndjson";
/** Auth uses current authenticated SiYuan session; external sender still needs kernel token. */
export function mountExternalCommandTransport(receiver: ReturnType<typeof createExternalCommandReceiver>, enabled: () => boolean) {
    let stopped = false, polling = false, lastText = "";
    const source = enabled() && typeof EventSource !== "undefined" ? new EventSource("/es/broadcast/subscribe?channel=qg-cmd") : undefined;
    const consume = (raw: unknown) => receiver.submit(raw);
    if (source) {
        const onMessage = (event: MessageEvent) => { if (!stopped && enabled()) void consume(event.data).catch((): void => {}); };
        source.onmessage = onMessage;
        // SiYuan uses the channel name as the SSE event name.
        source.addEventListener("qg-cmd", onMessage);
    }
    const poll = async () => {
        if (stopped || polling || !enabled()) return;
        polling = true;
        try {
            const response = await fetch("/api/file/getFile", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({path: COMMAND_PATH})});
            if (!response.ok) return;
            const text = await response.text();
            if (text.length > 262144) return;
            if (text === lastText) return;
            for (const line of text.split(/\r?\n/).filter(Boolean).slice(-200)) {
                if (stopped) break;
                await consume(line);
            }
            lastText = text;
        } catch { /* bounded retry next tick; never delete or truncate sender queue */ }
        finally { polling = false; }
    };
    let timer: any;
    const schedule = (): void => {
        if (stopped || !enabled()) return;
        timer = setTimeout(() => {
            void poll().finally(() => {
                if (!stopped && enabled()) schedule();
            });
        }, 1000);
    };
    if (enabled()) {
        void poll().finally(() => schedule());
    }
    return () => { stopped = true; source?.close(); if (timer) clearTimeout(timer); receiver.dispose(); };
}
export async function publishExternalReceipt(receipt: ExternalReceipt): Promise<void> {
    let existing = "";
    let response = await fetch("/api/file/getFile", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({path: RESULT_PATH})});
    if (!response.ok && response.status !== 404) throw Error("receipt-read-failed");
    if (response.ok) existing = (await response.text()).slice(-262144);
    const lines = existing.split(/\r?\n/).filter((line) => { try { return Boolean(JSON.parse(line)?.id); } catch { return false; } }).slice(-199);
    lines.push(JSON.stringify(receipt));
    const form = new FormData();
    form.append("path", RESULT_PATH); form.append("isDir", "false");
    form.append("file", new Blob([lines.join("\n") + "\n"], {type: "application/x-ndjson"}), "results.ndjson");
    response = await fetch("/api/file/putFile", {method: "POST", body: form});
    if (!response.ok || (await response.json())?.code !== 0) throw Error("receipt-persist-failed");
}
