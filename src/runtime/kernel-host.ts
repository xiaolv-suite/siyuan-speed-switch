import {logger} from "../logger";
import {sanitizeDocIds, normalizeSqlResult} from "../util";
import {buildRequestKey} from "../request-service";
import {isSemanticEmbeddingConfigured} from "../search-model";
import {normalizeMinifluxConfig, buildActivityWatchBucketsUrl, normalizeActivityWatchBuckets} from "../life-widget-model";
import {allowedLifeWidgetUrl, allowedActivityWatchUrl, allowedMinifluxUrl, allowedMinifluxCategoriesUrl, loadActivityWatchBuckets} from "../life-widget-network";
import {normalizeRssReadState} from "../rss-model";
import {UPDATED_CACHE_MS, NOTEBOOK_FETCH_TIMEOUT_MS, BLOCK_ID_RE, RSS_READ_KEY} from "../constants";
import {getSiyuan} from "../types";
import {type Tab, type KernelRequestOutcome, type ISpeedSwitchHost} from "./plugin-types";

export interface KernelHostRuntime extends Omit<ISpeedSwitchHost, "isSemanticSearchAvailable" | "fetchKernelJson" | "fetchKernelJsonOutcome" | "fetchActivityWatchViaKernel" | "fetchBangumiCalendar" | "loadNotebooks" | "loadUpdatedMap" | "loadRootNotebookMap"> {}
export class KernelHostRuntime {
    // 内核 HTTP POST 共用逻辑：端点白名单 + 5s 超时 + 非 2xx 抛错 + 失败返回 null
    private static KERNEL_ENDPOINTS = new Set([
        "/api/query/sql", "/api/tag/getTag", "/api/bookmark/getBookmark",
        "/api/filetree/getDoc", "/api/filetree/createDocWithMd", "/api/filetree/createDailyNote",
        "/api/filetree/searchDocs", "/api/search/semanticSearchBlock", "/api/search/fullTextSearchBlock",
        "/api/block/updateBlock", "/api/block/insertBlock", "/api/block/appendBlock",
        "/api/outline/getDocOutline", "/api/riff/getNotebookRiffDueCards",
        // v0.18 路径筛选（T-103）：只读列目录，用于搜索筛选选择路径前缀。
        // 真实宿主证据见 docs/path-filter-host-evidence.md（D-365）。
        "/api/filetree/listDocsByPath",
        // v3.8.x 内核数据组件群（T-6321~T-6325）：全部只读端点。
        "/api/filetree/getPinnedDocs",
        "/api/inbox/getShorthands",
        "/api/block/getRecentUpdatedBlocks",
        "/api/asset/getMissingAssets",
        // T-6814 关联内容（D3）：官方反链/提及一次性查询，只读。
        "/api/ref/getBacklink2",
        "/api/storage/getRecentDocs",
        "/api/storage/getCriteria",
        // v3.8.x 数据库只读渲染（T-6330 / ADR 0058）。
        "/api/av/renderAttributeView",
        // T-6470：数据库表格两级取数——renderAttributeView 0 行时经 getAttributeView
        // 解析真实库 ID（data.av.id）重试（嵌入/镜像库块 ID ≠ 库 ID）。
        "/api/av/getAttributeView",
        // T-6791 一键同步：写端点，CheckAdminRole+CheckReadonly（只读/发布模式）
        // 由内核侧拒绝；同步进行中的互斥也由内核处理。
        "/api/sync/performSync",
        // T-6792 插入模板：manage 列清单，render 渲染为 HTML 后经 protyle.insert
        // 写入光标处；render 的 path 校验（必须在 <data>/templates/ 内）由内核负责。
        "/api/template/manage",
        "/api/template/render",
        // T-6878 跨表面对象第一批：原生片段清单只读查询（零态工作台的片段对象投影）。
        "/api/snippet/getSnippet",
    ]);

    private static KERNEL_READ_ENDPOINTS = new Set([
        "/api/tag/getTag", "/api/bookmark/getBookmark", "/api/filetree/getDoc",
        "/api/filetree/searchDocs", "/api/search/semanticSearchBlock", "/api/search/fullTextSearchBlock",
        "/api/outline/getDocOutline", "/api/riff/getNotebookRiffDueCards",
        "/api/filetree/listDocsByPath", "/api/filetree/getPinnedDocs",
        "/api/inbox/getShorthands", "/api/block/getRecentUpdatedBlocks",
        "/api/asset/getMissingAssets", "/api/ref/getBacklink2",
        "/api/storage/getRecentDocs", "/api/storage/getCriteria",
        "/api/av/renderAttributeView", "/api/av/getAttributeView", "/api/snippet/getSnippet",
    ]);

    /**
     * 语义搜索能力判定（P3-3）：读取宿主 AI embedding 配置，与内核
     * isEmbeddingEnabled 镜像一致。实时读取不缓存——用户中途启用 AI 配置
     * 后无需重载插件即可生效；未配置时语义选项不出现且请求静默走 keyword。
     */
    private isSemanticSearchAvailable(): boolean {
        try {
            return isSemanticEmbeddingConfigured(getSiyuan()?.config);
        } catch (_) {
            return false;
        }
    }

    private async fetchKernelJson(
        url: string,
        body: Record<string, unknown>,
        timeoutOrOptions: number | {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number} = 5000,
        options?: {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number},
    ): Promise<any | null> {
        return await this.bridge.fetchKernelJson(url, body, timeoutOrOptions, options);
    }

    /** Shared transport bridge for extracted search UI modules. */
    public requestKernelJsonOutcome(
        url: string,
        body: Record<string, unknown>,
        options: {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number} = {},
    ): Promise<KernelRequestOutcome> {
        return this.fetchKernelJsonOutcome(url, body, options);
    }

    /** Structured result for flows that must distinguish failed from unknown writes. */
    private async fetchKernelJsonOutcome(
        url: string,
        body: Record<string, unknown>,
        timeoutOrOptions: number | {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number} = 5000,
        options?: {signal?: AbortSignal; dedupe?: boolean; latestKey?: string; timeoutMs?: number},
    ): Promise<KernelRequestOutcome> {
        // 安全守卫（纵深防御）：仅允许同源、硬编码的思源内核相对路径。
        // - 必须以 "/" 开头（相对路径 → 同源），拒绝任何绝对 URL 与外部 host；
        // - 必须命中端点白名单，杜绝把请求指向任意地址（SSRF）。
        if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//") || !KernelHostRuntime.KERNEL_ENDPOINTS.has(url)) {
            logger.warn("blocked non-whitelisted kernel endpoint", url);
            return {ok: false, error: {kind: "blocked"}, attempts: 0, outcome: "failed"};
        }
        // Callers in extracted UI modules pass the cancellation options as the
        // third argument, while older host-side callers pass a numeric timeout
        // followed by options.  Treating the object as `setTimeout`'s delay
        // coerces it to zero and aborts every request immediately (the preview
        // pane then only shows the incomplete-load state).  Normalize both
        // forms at the boundary so one host contract serves both paths.
        const timeoutMs = typeof timeoutOrOptions === "number" ? timeoutOrOptions
            : Number.isFinite(timeoutOrOptions.timeoutMs) ? Math.max(1, Math.min(120000, Math.trunc(timeoutOrOptions.timeoutMs!))) : 5000;
        const requestOptions = typeof timeoutOrOptions === "number" ? options : timeoutOrOptions;
        const externalSignal = requestOptions?.signal;
        const latestKey = typeof requestOptions?.latestKey === "string" ? requestOptions.latestKey : "";
        const key = buildRequestKey(url, body);
        const sqlRead = url === "/api/query/sql" && /^\s*SELECT\b/i.test(String(body?.stmt || ""));
        const retrySafe = KernelHostRuntime.KERNEL_READ_ENDPOINTS.has(url) || sqlRead;
        const result = await this.requestService.request({
            key,
            dedupe: retrySafe || requestOptions?.dedupe === true,
            latestKey,
            signal: externalSignal,
            timeoutMs,
            maxRetries: retrySafe ? 1 : 0,
            execute: async (signal: AbortSignal | undefined) => {
            // 每个端点的 fetch 都使用字面量 URL（安全扫描要求：不存在变量 URL 请求）
            const init = {
                method: "POST" as const,
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(body),
                ...(signal ? {signal} : {}),
            };
            let response: Response;
            switch (url) {
                case "/api/query/sql":
                    response = await fetch("/api/query/sql", init);
                    break;
                case "/api/tag/getTag":
                    response = await fetch("/api/tag/getTag", init);
                    break;
                case "/api/bookmark/getBookmark":
                    response = await fetch("/api/bookmark/getBookmark", init);
                    break;
                case "/api/filetree/getDoc":
                    response = await fetch("/api/filetree/getDoc", init);
                    break;
                case "/api/filetree/searchDocs":
                    response = await fetch("/api/filetree/searchDocs", init);
                    break;
                case "/api/search/semanticSearchBlock":
                    response = await fetch("/api/search/semanticSearchBlock", init);
                    break;
                case "/api/search/fullTextSearchBlock":
                    response = await fetch("/api/search/fullTextSearchBlock", init);
                    break;
                case "/api/filetree/createDocWithMd":
                    response = await fetch("/api/filetree/createDocWithMd", init);
                    break;
                case "/api/filetree/createDailyNote":
                    response = await fetch("/api/filetree/createDailyNote", init);
                    break;
                case "/api/block/updateBlock":
                    response = await fetch("/api/block/updateBlock", init);
                    break;
                case "/api/block/insertBlock":
                    response = await fetch("/api/block/insertBlock", init);
                    break;
                case "/api/block/appendBlock":
                    response = await fetch("/api/block/appendBlock", init);
                    break;
                case "/api/outline/getDocOutline":
                    response = await fetch("/api/outline/getDocOutline", init);
                    break;
                case "/api/riff/getNotebookRiffDueCards":
                    response = await fetch("/api/riff/getNotebookRiffDueCards", init);
                    break;
                case "/api/filetree/listDocsByPath":
                    response = await fetch("/api/filetree/listDocsByPath", init);
                    break;
                case "/api/filetree/getPinnedDocs":
                    response = await fetch("/api/filetree/getPinnedDocs", init);
                    break;
                case "/api/inbox/getShorthands":
                    response = await fetch("/api/inbox/getShorthands", init);
                    break;
                case "/api/block/getRecentUpdatedBlocks":
                    response = await fetch("/api/block/getRecentUpdatedBlocks", init);
                    break;
                case "/api/asset/getMissingAssets":
                    response = await fetch("/api/asset/getMissingAssets", init);
                    break;
                case "/api/ref/getBacklink2":
                    response = await fetch("/api/ref/getBacklink2", init);
                    break;
                case "/api/storage/getRecentDocs":
                    response = await fetch("/api/storage/getRecentDocs", init);
                    break;
                case "/api/storage/getCriteria":
                    response = await fetch("/api/storage/getCriteria", init);
                    break;
                case "/api/av/renderAttributeView":
                    response = await fetch("/api/av/renderAttributeView", init);
                    break;
                case "/api/av/getAttributeView":
                    response = await fetch("/api/av/getAttributeView", init);
                    break;
                case "/api/sync/performSync":
                    response = await fetch("/api/sync/performSync", init);
                    break;
                case "/api/template/manage":
                    response = await fetch("/api/template/manage", init);
                    break;
                case "/api/template/render":
                    response = await fetch("/api/template/render", init);
                    break;
                case "/api/snippet/getSnippet":
                    response = await fetch("/api/snippet/getSnippet", init);
                    break;
                default:
                    logger.warn("blocked non-whitelisted kernel endpoint", url);
                    return null;
            }
            if (!response.ok) throw Object.assign(new Error("http_error"), {status: response.status});
            return await response.json();
            },
        });
        if (!result.ok) {
            logger.warn("kernel request fail", url, result.error.kind, result.error.status || "");
            const uncertainWrite = !retrySafe && result.attempts > 0
                && ["aborted", "timeout", "network", "server", "invalid_response", "failed"].includes(result.error.kind);
            return {...result, outcome: uncertainWrite ? "unknown" : "failed"};
        }
        return {...result, outcome: "success"};
    }

    // 外部生活组件在桌面 WebView 中可能受 CORS/代理环境影响。这里复用思源公开的
    // JSON 正向代理；目标在发出前仍必须命中生活组件 HTTPS 白名单或 ActivityWatch
    // 回环地址 + 固定 query 路由，避免形成任意 SSRF 通道。
    private async fetchActivityWatchViaKernel(url: string, init: {body?: string; headers?: Record<string, string>; signal?: AbortSignal}): Promise<any> {
        // T-6466：补上 Miniflux 两条路由（entries/categories）——此前代理门禁不含
        // Miniflux，真实请求会被 blocked_endpoint 拦截（单测 mock fetchImpl 掩盖）。
        if (!allowedActivityWatchUrl(url) && !allowedLifeWidgetUrl(url)
            && !allowedMinifluxUrl(url) && !allowedMinifluxCategoriesUrl(url)) throw new Error("blocked_endpoint");
        const isPost = typeof init?.body === "string";
        const proxyBody: Record<string, unknown> = {
            url,
            method: isPost ? "POST" : "GET",
            timeout: 8000,
            contentType: "application/json",
            headers: [{Accept: "application/json"}],
            responseEncoding: "text",
        };
        // 附加请求头（如 Miniflux 的 X-Auth-Token）：逐键合并进代理头数组。
        // 值只进入发往本机内核的代理请求体；不写入任何插件日志、缓存或错误消息。
        const extraHeaders = init?.headers && typeof init.headers === "object" ? init.headers : {};
        for (const [name, value] of Object.entries(extraHeaders)) {
            if (!/^[A-Za-z0-9-]+$/.test(name) || typeof value !== "string" || !value) continue;
            proxyBody.headers = [...(proxyBody.headers as Array<Record<string, string>>), {[name]: value}];
        }
        if (isPost) {
            proxyBody.payload = init.body;
            proxyBody.payloadEncoding = "text";
        }
        const response = await fetch("/api/network/forwardProxy", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(proxyBody),
            signal: init?.signal,
        });
        if (!response.ok) throw new Error("proxy_http_error");
        const envelope = await response.json();
        const data = envelope?.code === 0 && envelope?.data && typeof envelope.data === "object" ? envelope.data : null;
        const body = typeof data?.body === "string" ? data.body : "";
        const status = Number(data?.status);
        return {
            ok: Number.isFinite(status) && status >= 200 && status < 300,
            headers: {get: (name: string) => name.toLowerCase() === "content-length" ? String(body.length) : null},
            text: async () => body,
        };
    }

    // Bangumi 的固定公开日历在浏览器直连时具备 CORS；部分环境的思源代理出口
    // 无法连接 api.bgm.tv，因此先走浏览器网络，失败再回退同一白名单代理。
    private async fetchBangumiCalendar(url: string, init: {signal?: AbortSignal; headers?: Record<string, string>}): Promise<any> {
        if (url !== "https://api.bgm.tv/calendar") throw new Error("blocked_endpoint");
        try {
            const response = await fetch(url, init);
            if (response.ok) return response;
        } catch (error) {
            if (init?.signal?.aborted) throw new Error("aborted");
        }
        if (init?.signal?.aborted) throw new Error("aborted");
        return this.fetchActivityWatchViaKernel(url, {signal: init?.signal});
    }

    // 去抖写盘：高频数据（MRU/置顶/收藏）每次操作只更新内存，合并后延迟落盘，
    // 避免连续收藏/置顶/切换页签时每个动作都触发一次内核文件写入（交互卡顿的根因）
    // T-6466 存储用量透明化配套之前：Miniflux 分类发现——设置表单的分类选择器
    // 据此渲染选项；凭据仅经 X-Auth-Token 请求头，绝不写入日志或缓存。
    // T-6689 ActivityWatch 桶发现：仅本地端点（网络层白名单放行 /api/0/buckets），
    // 只保留 aw-watcher-window 类型，供配置表单下拉选择
    async loadActivityWatchBuckets(endpoint: string): Promise<Array<{id: string; hostname: string; label: string}>> {
        const url = buildActivityWatchBucketsUrl({endpoint});
        if (!url) return [];
        const envelope = await loadActivityWatchBuckets(url);
        return normalizeActivityWatchBuckets(envelope?.payload);
    }

    async loadMinifluxCategoryOptions(endpoint: string, token: string): Promise<Array<{id: string; name: string}>> {
        const normalized = normalizeMinifluxConfig({endpoint, token});
        if (!normalized.origin || !normalized.token) return [];
        try {
            // Use the normalized token that passed validation.  The config form
            // commonly supplies leading/trailing whitespace while users paste a
            // token; sending the raw value makes discovery fail even though the
            // same normalized config is accepted by the Miniflux adapter.
            const response = await this.fetchActivityWatchViaKernel(`${normalized.origin}/v1/categories`, {headers: {"X-Auth-Token": normalized.token}});
            if (!response || response.ok !== true) return [];
            const body = await response.text();
            const rows = JSON.parse(body);
            if (!Array.isArray(rows)) return [];
            const seen = new Set<string>();
            const items: Array<{id: string; name: string}> = [];
            for (const row of rows.slice(0, 64)) {
                const id = String(row && row.id !== undefined && row.id !== null ? row.id : "");
                const name = String(row && row.title !== undefined && row.title !== null ? row.title : "")
                    .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 64);
                if (!/^\d{1,12}$/.test(id) || !name || seen.has(id)) continue;
                seen.add(id);
                items.push({id, name});
            }
            return items;
        } catch {
            return [];
        }
    }

    // 拉取已打开的笔记本列表（id + name），用于默认日记笔记本下拉
    private notebooksInFlight: Promise<{notebooks: Array<{id: string, name: string}>, failed: boolean}> | null = null;

    // T-7185：失败可区分的笔记本加载——failed=true 时调用方展示失败回执/重试，
    // 不再与「真空笔记本」同形；合并并发调用，避免弹窗打开期重复请求内核。
    async loadNotebooksDetailed(): Promise<{notebooks: Array<{id: string, name: string}>, failed: boolean}> {
        if (this.notebooksInFlight) return this.notebooksInFlight;
        const run = (async () => {
    // 内核无响应时超时中断请求，避免设置页下拉一直停在加载中
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        let timer: number | null = null;
        const timeoutPromise = new Promise<Response>((_, reject) => {
            timer = window.setTimeout(() => {
                controller?.abort();
                reject(new Error("timeout"));
            }, NOTEBOOK_FETCH_TIMEOUT_MS);
        });
        try {
            const request = fetch("/api/notebook/lsNotebooks", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: "{}",
                ...(controller ? {signal: controller.signal} : {}),
            });
            const response = await Promise.race([request, timeoutPromise]);
            if (!response.ok) {
                throw new Error(`lsNotebooks HTTP ${response.status}`);
            }
            const json = await response.json();
            const notebooks = (json?.data?.notebooks ?? []) as Array<{id: string, name: string, closed?: number}>;
            const result = notebooks
                .filter((nb) => nb && nb.id && !nb.closed)
                .map((nb) => ({id: nb.id, name: nb.name}));
            return {notebooks: result, failed: false};
        } catch (e) {
            logger.warn("load notebooks fail", e);
            return {notebooks: [], failed: true};
        } finally {
            window.clearTimeout(timer);
        }
        })();
        this.notebooksInFlight = run;
        try {
            return await run;
        } finally {
            if (this.notebooksInFlight === run) this.notebooksInFlight = null;
        }
    }

    private async loadNotebooks(): Promise<Array<{id: string, name: string}>> {
        return (await this.loadNotebooksDetailed()).notebooks;
    }

    // 查询当前打开文档的更新时间（用于「最近编辑」排序），返回 rootID → updated 映射
    private async loadUpdatedMap(tabs: Tab[]): Promise<{[rootId: string]: string}> {
        // 白名单净化：仅保留标准文档 ID（时间戳-7位）并去重，非法值不进入 SQL（防注入/阻断结构破坏）
        const ids = sanitizeDocIds(tabs.map((tab) => this.rootIdOf(tab)));
        if (ids.length === 0) {
            return {};
        }
        // 打开的文档集合没变且缓存未过期时直接复用（返回副本防外部误改）
        const key = [...ids].sort().join(",");
        if (this.updatedMapCache && this.updatedMapCache.key === key
            && Date.now() - this.updatedMapCache.ts < UPDATED_CACHE_MS) {
            return {...this.updatedMapCache.map};
        }
        try {
            // T-6478：改走统一分发（同源白名单 + 5s 超时 + 失败归一），并显式给出外层 LIMIT。
            // 缺外层 LIMIT 时内核按 search.limit（默认 64、下限 32）截断，打开页签多于该数
            // 会静默缺更新时间、令「最近编辑」排序错乱；ids 已由 sanitizeDocIds 去重净化。
            const json = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT root_id, updated, created FROM blocks WHERE type='d' AND root_id IN ('${ids.join("','")}') LIMIT ${ids.length}`,
            });
            if (!json) {
                // 失败不写缓存：下一次重渲染再取，避免把空映射固化 UPDATED_CACHE_MS。
                return {};
            }
            const map: {[rootId: string]: string} = {};
            normalizeSqlResult(json).rows.forEach((row: any) => {
                map[row.root_id] = row.updated;
                // created 顺带回填缓存（YYYYMMDDHHmmss），供按创建月份分组使用
                if (typeof row.created === "string" && row.created) {
                    this.createdByIdCache[row.root_id] = row.created;
                }
            });
            this.updatedMapCache = {key, ts: Date.now(), map};
            return map;
        } catch (e) {
            logger.warn("query updated fail", e);
            return {};
        }
    }

    // T-6475：按 rootId 批量恢复真实笔记本 ID（blocks.box），有界 32 个/请求；
    // 非法 ID 过滤，响应字段校验后落缓存。
    private async loadRootNotebookMap(rootIds: string[]) {
        const valid = rootIds.filter((id) => BLOCK_ID_RE.test(id)).slice(0, 32);
        if (valid.length === 0) return;
        const list = valid.map((id) => `'${id}'`).join(",");
        const json = await this.fetchKernelJson("/api/query/sql", {
            stmt: `SELECT id, box FROM blocks WHERE type='d' AND id IN (${list}) LIMIT 64`,
        });
        const rows = Array.isArray(json?.data) ? json.data : [];
        rows.forEach((row: {id?: unknown; box?: unknown}) => {
            const id = typeof row?.id === "string" ? row.id : "";
            const box = typeof row?.box === "string" ? row.box : "";
            if (id && BLOCK_ID_RE.test(id)) this.rootNotebookCache[id] = BLOCK_ID_RE.test(box) ? box : "";
        });
    }

    // T-6685 RSS 已读状态：宿主侧唯一读写点。读取返回归一化后的 seen 映射；
    // 标记合并进当前状态后重新有界化（最旧剪除），去抖落盘。
    public rssReadState(): Record<string, number> {
        return normalizeRssReadState(this.data[RSS_READ_KEY]).seen;
    }

    public async markRssItemsSeen(keys: string[]): Promise<void> {
        if (!Array.isArray(keys) || keys.length === 0) return;
        if (typeof this.ensureTier2Loaded === "function") {
            await this.ensureTier2Loaded();
        }
        const state = normalizeRssReadState(this.data[RSS_READ_KEY]);
        const stamp = Date.now();
        for (const key of keys) {
            if (typeof key === "string" && key.length >= 1 && key.length <= 128) state.seen[key] = stamp;
        }
        const bounded = normalizeRssReadState(state);
        this.data[RSS_READ_KEY] = bounded;
        this.saveDataDebounced(RSS_READ_KEY);
    }
}
