import {getActiveTab} from "siyuan";
import {logger} from "../logger";
import {resolveFavoriteRootId} from "../util";
import {canUseTitleSearch, extractSearchRecords, normalizeTitleSearchDocuments, resolveSearchNotebookId} from "../search-model";
import {sanitizeQuickActions, getDefaultQuickActions, shouldRenderQuickAction} from "../quick-actions";
import {filterDocSearchResults, runFullTextSearchFallback} from "../doc-search-ui";
import {AGENT_CAPABILITY_SPECS, flattenOutline, MAX_SEARCH_ITEMS, buildAgentNavigationResult, buildAgentWorkspaceContext, buildAgentSearchResult, normalizeAgentLimit, normalizeAgentSearchOffset, normalizeAgentSearchMethod, normalizeAgentSearchOrder, normalizeAgentSearchType, normalizeAgentSearchSubType, normalizeAgentNotebook, normalizeAgentSearchPaths, normalizeAgentQuery, normalizeAgentFailureReason, buildAgentHomeDiagnostics, buildAgentWidgetCatalog, normalizeAgentWidgetConfig, buildAgentWidgetSnapshot, registerReadOnlyAgentCapabilities, normalizeAgentDocumentId, normalizeAgentNotebookId, normalizeAgentJournalStatus} from "../agent-capabilities";
import {createWorkspaceRuntimeDiagnostics} from "../agent-workspace-diagnostics";
import {auditAgentCapabilityDefinitions, summarizeAgentCapabilityAudit, buildAgentReadOnlyAuditSnapshot} from "../agent-readonly-audit";
import {DOCUMENT_CONTEXT_SPEC, buildDocumentContext, normalizeDocumentContextRequest} from "../agent-document-context";
import {DOC_RESULT_LIMIT, DOC_SEARCH_FETCH_LIMIT, NOTEBOOK_FETCH_TIMEOUT_MS, BLOCK_ID_RE} from "../constants";
import {type IDocSearchResult, type IDocSearchFilters, type ISpeedSwitchHost} from "./plugin-types";

export interface AgentHostRuntime extends Omit<ISpeedSwitchHost, "agentContentResult" | "registerAgentCapabilities" | "searchAgentDocuments"> {}
export class AgentHostRuntime {
    private agentContentResult<T>(content: T) {
        return {structuredContent: content, result: JSON.stringify(content)};
    }

    /**
     * Register only bounded, read-only Agent capabilities. The method is
     * deliberately runtime-gated so the plugin remains compatible with older
     * SiYuan releases whose Plugin base class predates addAgentCapability.
     */
    private registerAgentCapabilities() {
        const pluginWithAgent = this as unknown as {
            addAgentCapability?: (options: Record<string, unknown>) => string;
        };
        const readOnlyDefinitions: Array<{spec: Record<string, unknown>; handler: (args: Record<string, unknown>) => unknown}> = [
            {
                spec: AGENT_CAPABILITY_SPECS.outline,
                handler: async (args: Record<string, unknown>) => {
                    try {
                        const id = normalizeAgentDocumentId(args?.id);
                        if (!id) return {error: "invalid document id"};
                        const limit = Math.min(48, Math.max(1, Math.trunc(Number(args?.limit) || 40)));
                        const json = await this.fetchKernelJson("/api/outline/getDocOutline", {id, preview: true});
                        if (!json || json.code !== 0) return {error: "outline unavailable"};
                        const headings = flattenOutline(Array.isArray(json.data) ? json.data : [], limit);
                        const content = {id, headings};
                        return {structuredContent: content, result: JSON.stringify(content)};
                    } catch (error) {
                        logger.warn("Agent document outline unavailable", error);
                        return {error: "outline unavailable"};
                    }
                },
            },
            {
                // v0.17 阶段 2：文档上下文只读接入。仅返回元数据与有界大纲，绝不回传正文。
                spec: DOCUMENT_CONTEXT_SPEC as unknown as Record<string, unknown>,
                handler: async (args: Record<string, unknown>) => {
                    try {
                        const request = normalizeDocumentContextRequest(args || {});
                        const opened = this.currentTabs();
                        const active = this.isMobile
                            ? opened.find((tab) => tab.id === this.getMobileActiveTabId())
                            : this.getActiveTab();
                        const activeRoot = active ? this.rootIdOf(active) || active.id : "";
                        const id = request.id || activeRoot;
                        if (!id || !BLOCK_ID_RE.test(id)) return {error: "document context unavailable"};
                        const tab = opened.find((candidate) => (this.rootIdOf(candidate) || candidate.id) === id);
                        const isActiveDocument = Boolean(activeRoot && activeRoot === id);
                        const contextSource = isActiveDocument ? "active" : (tab ? "opened" : "kernel");
                        const notebookMap = new Map((this.notebookListCache || []).map((notebook) => [notebook.id, notebook.name]));
                        const tabNotebookId = tab ? resolveSearchNotebookId(tab as unknown) : "";
                        const cachedNotebookName = tab ? notebookMap.get(tabNotebookId) || "" : "";
                        const tabNotebookName = tab
                            ? cachedNotebookName
                                || (tab as unknown as {notebookName?: string; notebook?: string; boxName?: string}).notebookName
                                || (tab as unknown as {notebook?: string}).notebook
                                || (tab as unknown as {boxName?: string}).boxName || ""
                            : "";
                        const tabNotebookNameSource = cachedNotebookName ? "cache" : (tabNotebookName ? "tab" : "none");
                        let record: Record<string, unknown> = tab ? {
                            id,
                            title: this.titleOf(tab),
                            notebookId: tabNotebookId,
                            notebookName: tabNotebookName,
                            notebookNameSource: tabNotebookNameSource,
                            path: (tab as unknown as {path?: string; hPath?: string}).path
                                || (tab as unknown as {hPath?: string}).hPath || "",
                            pathSource: "tab",
                        } : {id};
                        if (!tab) {
                            let json: any;
                            try {
                                json = await this.fetchKernelJson("/api/query/sql", {
                                    stmt: `SELECT id, content, box FROM blocks WHERE id='${id}' LIMIT 1`,
                                });
                            } catch (error) {
                                logger.warn("Agent document context metadata unavailable", error);
                                return {error: "document context unavailable"};
                            }
                            const row = (json?.data || [])[0] as {id?: string; content?: string; box?: string} | undefined;
                            if (!row || !BLOCK_ID_RE.test(String(row.id || ""))) return {error: "document context unavailable"};
                            const kernelNotebookName = notebookMap.get(String(row.box || "")) || "";
                            record = {id: row.id, title: row.content, notebookId: row.box, notebookName: kernelNotebookName, notebookNameSource: kernelNotebookName ? "cache" : "none", path: "", pathSource: "none"};
                        }
                        let outlineAvailable = request.includeOutline;
                        let outlineJson: any = null;
                        if (request.includeOutline) {
                            try {
                                outlineJson = await this.fetchKernelJson("/api/outline/getDocOutline", {id, preview: true});
                                outlineAvailable = Boolean(outlineJson && outlineJson.code === 0 && Array.isArray(outlineJson.data));
                            } catch (error) {
                                outlineAvailable = false;
                                logger.warn("Agent document context outline unavailable", error);
                            }
                        }
                        const content = buildDocumentContext({
                            ...record,
                            active: isActiveDocument,
                            source: contextSource,
                            outlineAvailable,
                            outlineStatus: !request.includeOutline ? "not-requested" : (outlineAvailable
                                ? ((Array.isArray(outlineJson?.data) && outlineJson.data.length > 0) ? "available" : "empty")
                                : "unavailable"),
                            headings: outlineAvailable ? outlineJson.data : [],
                        }, request);
                        return {structuredContent: content, result: JSON.stringify(content)};
                    } catch (error) {
                        logger.warn("Agent document context unavailable", error);
                        return {error: "document context unavailable"};
                    }
                },
            },
            {
                spec: AGENT_CAPABILITY_SPECS.navigation,
                handler: async (args: Record<string, unknown>) => {
                    try {
                        const limit = normalizeAgentLimit(args?.limit, 12);
                        const opened = this.currentTabs();
                        const active = this.isMobile
                            ? opened.find((tab) => tab.id === this.getMobileActiveTabId())
                            : this.getActiveTab();
                        const activeTabId = active?.id || "";
                        const activeId = active ? (this.rootIdOf(active) || activeTabId) : null;
                        const tabs = opened.map((tab) => ({
                            id: tab.id,
                            rootId: this.rootIdOf(tab) || undefined,
                            title: this.titleOf(tab),
                            path: (tab as unknown as {path?: string; hPath?: string}).path
                                || (tab as unknown as {hPath?: string}).hPath || undefined,
                            notebookId: resolveSearchNotebookId(tab as unknown) || undefined,
                            active: activeTabId ? tab.id === activeTabId : (this.rootIdOf(tab) || tab.id) === activeId,
                        }));
                        const recent = this.getOpenHistory().map((entry) => ({
                            id: entry.key,
                            rootId: entry.rootId || undefined,
                            title: entry.title,
                            ts: entry.ts,
                            source: "recent",
                        }));
                        const closed = this.getClosedHistory().map((entry) => ({
                            id: entry.rootId,
                            rootId: entry.rootId,
                            title: entry.title,
                            ts: entry.closedAt,
                            source: "closed",
                        }));
                        const favorites = this.getFavorites().map((entry) => ({
                            id: entry.key,
                            rootId: resolveFavoriteRootId(entry) || undefined,
                            title: entry.title,
                            group: entry.group,
                            source: "favorite",
                        }));
                        const content = buildAgentNavigationResult({
                            activeId: activeId || "",
                            mobile: this.isMobile,
                            tabs,
                            recent,
                            closed,
                            favorites,
                            limit,
                        });
                        return {structuredContent: content, result: JSON.stringify(content)};
                    } catch (error) {
                        logger.warn("Agent navigation unavailable", error);
                        return {error: "navigation unavailable"};
                    }
                },
            },
            {
                spec: AGENT_CAPABILITY_SPECS.search,
                handler: async (args: Record<string, unknown>) => this.searchAgentDocuments(args),
            },
            {
                spec: AGENT_CAPABILITY_SPECS.homeWidgets,
                handler: async (args: Record<string, unknown>) => {
                    const currentDevice = this.isMobile ? "mobile" : "desktop";
                    const requestedDevice = ["desktop", "sidebar", "mobile"].includes(String(args?.device || ""))
                        ? String(args.device)
                        : currentDevice;
                    const device = requestedDevice as "desktop" | "sidebar" | "mobile";
                    const requested = String(args?.moduleId || "");
                    const limit = normalizeAgentLimit(args?.limit, 12);
                    try {
                        const queryable = this.workbench.listModules(device)
                            .filter((item: any) =>
                                this.homeBuiltinAdapterIds.has(item.moduleId) || this.homeModuleOpens.has(item.moduleId));
                        // 发现模式：省略 moduleId 时返回全部可查询组件清单
                        if (!requested) {
                            const homeState = this.getHomeState();
                            const configuredModuleIds = ((homeState.layouts[device] || []) as Array<any>).map((entry) => {
                                const instance = (homeState.instances as Array<any>).find((item) => item.instanceId === entry.instanceId);
                                return instance?.moduleId || "";
                            }).filter(Boolean);
                            const configuredState: Record<string, {enabled?: boolean; size?: string}> = {};
                            ((homeState.layouts[device] || []) as Array<any>).forEach((entry) => {
                                const instance = (homeState.instances as Array<any>).find((item) => item.instanceId === entry.instanceId);
                                if (instance?.moduleId) configuredState[instance.moduleId] = {enabled: instance.enabled !== false, size: entry.size};
                            });
                            const content = buildAgentWidgetCatalog(queryable, {
                                device,
                                readOnly: typeof args?.readOnly === "boolean" ? args.readOnly : undefined,
                                source: args?.source,
                                limit: args?.limit,
                                offset: args?.offset,
                                includeState: true,
                                configuredModuleIds,
                                configuredState,
                            });
                            return this.agentContentResult(content);
                        }
                        const def = queryable.find((item: any) => item.moduleId === requested) as {title?: string; configSchema?: unknown[]} | undefined;
                        if (!def) {
                            const content = buildAgentWidgetSnapshot(requested, "", {ok: false, reason: "unregistered"}, {device, limit, offset: args?.offset});
                            return this.agentContentResult(content);
                        }
                        const config = normalizeAgentWidgetConfig(args?.config, def.configSchema) as Record<string, unknown>;
                        const result = await this.workbench.read(requested, device, config, {cacheTtlMs: 1500, force: args?.refresh === true});
                        const content = buildAgentWidgetSnapshot(requested, def.title, result, {device, limit, offset: args?.offset, config});
                        return this.agentContentResult(content);
                    } catch (error) {
                        logger.warn("Agent home widget snapshot unavailable", error);
                        if (requested) {
                            const content = buildAgentWidgetSnapshot(requested, "", {ok: false, reason: "failed"}, {device, limit, offset: args?.offset});
                            return this.agentContentResult(content);
                        }
                        return {error: "widget snapshot unavailable"};
                    }
                },
            },
            {
                // 工作区上下文（第三层）：活动文档/页签/文档集/快捷入口/今日日记一次只读汇总
                spec: AGENT_CAPABILITY_SPECS.workspaceContext,
                handler: async (args: Record<string, unknown>) => {
                    try {
                        const limit = normalizeAgentLimit(args?.limit, 12);
                        const device = this.isMobile ? "mobile" : "desktop";
                        const opened = this.currentTabs();
                        const active = this.isMobile
                            ? opened.find((tab) => tab.id === this.getMobileActiveTabId())
                            : this.getActiveTab();
                        const settings = this.getSettings();
                        const storedActions = sanitizeQuickActions(settings.quickActions);
                        const actionItems = (storedActions.items.length > 0 ? storedActions.items : getDefaultQuickActions())
                            .filter((action) => shouldRenderQuickAction(action, device))
                            .map((action) => ({label: action.label, kind: action.kind}));
                        // 今日日记只读探测：按日期前缀查当日文档（绝不调用 createDailyNote——那会创建）
                        const journalNotebookId = normalizeAgentNotebookId(settings.journalNotebook);
                        let todayJournal: {configured: boolean; docId: string; status: string} = {
                            configured: false,
                            docId: "",
                            status: "unconfigured",
                        };
                        if (journalNotebookId) {
                            todayJournal.configured = true;
                            if (this.syncing) {
                                todayJournal.status = "syncing";
                            } else {
                                const now = new Date();
                                const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                                const journalJson = await this.fetchKernelJson("/api/query/sql", {
                                    stmt: `SELECT id FROM blocks WHERE type='d' AND box='${journalNotebookId}' AND content LIKE '${prefix}%' ORDER BY created DESC LIMIT 1`,
                                });
                                if (!journalJson) {
                                    todayJournal.status = "unavailable";
                                } else {
                                    const found = ((journalJson.data || [])[0] as {id?: string} | undefined)?.id || "";
                                    if (BLOCK_ID_RE.test(found)) {
                                        todayJournal.docId = found;
                                        todayJournal.status = "found";
                                    } else {
                                        todayJournal.status = "missing";
                                    }
                                }
                            }
                        }
                        todayJournal.status = normalizeAgentJournalStatus(todayJournal.status, todayJournal.configured, todayJournal.docId);
                        const content = buildAgentWorkspaceContext({
                            limit,
                            generatedAt: Date.now(),
                            syncing: this.syncing,
                            device,
                            // 存储演练健康（v0.20，D-386）：onload 只读快照透传给纯模型归一
                            storageHealth: this.storageMigrationReport,
                            activeDocument: {id: active ? (this.rootIdOf(active) || "") : "", title: active ? this.titleOf(active) : ""},
                            openTabs: opened.map((tab) => ({
                                id: this.rootIdOf(tab) || tab.id,
                                title: this.titleOf(tab),
                                source: "tabs",
                            })),
                            closedTabs: this.getClosedHistory().map((entry) => ({
                                id: entry.rootId,
                                rootId: entry.rootId,
                                title: entry.title,
                                ts: entry.closedAt,
                                source: "closed",
                            })),
                            documentSets: this.getDocumentSets().map((set: any) => ({
                                name: String(set?.name || ""),
                                count: Array.isArray(set?.entries) ? set.entries.length : 0,
                            })),
                            quickActions: actionItems,
                            todayJournal,
                        });
                        return this.agentContentResult(content);
                    } catch (error) {
                        logger.warn("Agent workspace context unavailable", error);
                        return {error: "workspace context unavailable"};
                    }
                },
            },
            {
                spec: AGENT_CAPABILITY_SPECS.homeDiagnostics,
                handler: async (args: Record<string, unknown>) => {
                    try {
                        const limit = normalizeAgentLimit(args?.limit, 16);
                        const diagnostics = typeof this.workbench.getDiagnostics === "function"
                            ? this.workbench.getDiagnostics()
                            : [];
                        const windowMinutes = Number.parseInt(String(args?.windowMinutes ?? ""), 10);
                        const content = buildAgentHomeDiagnostics(diagnostics, limit, windowMinutes);
                        return this.agentContentResult(content);
                    } catch (error) {
                        logger.warn("Agent home diagnostics unavailable", error);
                        return {error: "home diagnostics unavailable"};
                    }
                },
            },
        ];
        // v0.17 阶段 1（D-220）：workspace 运行时基础设施只读诊断。
        // registry/queue/coordinator 生命周期与插件一致，卸载时统一销毁。
        this.workspaceRuntimeDiagnostics = createWorkspaceRuntimeDiagnostics();
        if (this.workspaceRuntimeDiagnostics.validation.ok) {
            readOnlyDefinitions.push({
                spec: this.workspaceRuntimeDiagnostics.spec as unknown as Record<string, unknown>,
                handler: (args: Record<string, unknown>) => {
                    const runtime = this.workspaceRuntimeDiagnostics;
                    if (!runtime) return {error: "workspace diagnostics unavailable"};
                    return runtime.handler(args || {});
                },
            });
        } else {
            logger.warn("workspace runtime diagnostics definition invalid", this.workspaceRuntimeDiagnostics.validation);
            this.workspaceRuntimeDiagnostics.dispose();
            this.workspaceRuntimeDiagnostics = null;
        }
        const readonlyAudit = summarizeAgentCapabilityAudit(auditAgentCapabilityDefinitions(readOnlyDefinitions));
        if (!readonlyAudit.valid) logger.warn("Agent read-only capability audit rejected definitions", readonlyAudit);
        this.agentReadOnlyAuditHistory.record(buildAgentReadOnlyAuditSnapshot({
            audit: readonlyAudit,
            device: this.isMobile ? "mobile" : "desktop",
            status: readonlyAudit.valid ? "ready" : "failed",
            reason: readonlyAudit.valid ? "unavailable" : "failed",
            disposed: false,
        }));
        registerReadOnlyAgentCapabilities(pluginWithAgent, readOnlyDefinitions, this.onAgentCapFail);
    }

    private async searchAgentDocuments(args: Record<string, unknown> = {}) {
        const query = normalizeAgentQuery(args.query);
        if (!query) {
            return {error: "query is required"};
        }
        const filters: IDocSearchFilters = {};
        const hasNotebookArgument = args.notebook !== undefined && args.notebook !== null
            && String(args.notebook).trim() !== "";
        const notebook = normalizeAgentNotebook(args.notebook);
        if (hasNotebookArgument && !notebook) {
            return {error: "invalid notebook id"};
        }
        if (notebook) filters.notebook = notebook;
        if (args.paths !== undefined) {
            if (!Array.isArray(args.paths) || args.paths.length > 8) return {error: "invalid search path"};
            const rawPaths = args.paths.map((value) => String(value || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")).filter(Boolean);
            const paths = normalizeAgentSearchPaths(args.paths);
            if (paths.length !== rawPaths.length || new Set(rawPaths).size !== rawPaths.length) {
                return {error: "invalid search path"};
            }
            if (paths.length > 0) filters.paths = paths;
        }
        const method = normalizeAgentSearchMethod(args.method);
        const orderBy = normalizeAgentSearchOrder(args.orderBy);
        const type = normalizeAgentSearchType(args.type);
        const subType = normalizeAgentSearchSubType(args.subType);
        if ((args.method !== undefined && !method)
            || (args.orderBy !== undefined && !orderBy)
            || (args.type !== undefined && !type)
            || (args.subType !== undefined && !subType)) {
            return {error: "invalid search filter"};
        }
        if (method !== "keyword") filters.method = method as IDocSearchFilters["method"];
        if (orderBy !== "relevanceDesc") filters.orderBy = orderBy as IDocSearchFilters["orderBy"];
        if (type) filters.types = {[type]: true};
        if (subType) filters.subTypes = {[subType]: true};
        const limit = normalizeAgentLimit(args.limit, DOC_RESULT_LIMIT);
        const offset = normalizeAgentSearchOffset(args.offset);
        // AbortController is optional in older embedded WebViews. The Agent
        // request remains bounded by its local result limit and guards even
        // when native cancellation is unavailable.
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        if (controller) this.activeAgentSearchControllers.add(controller);
        const signal = controller?.signal;
        let deadlineExpired = false;
        let timer: number | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = window.setTimeout(() => {
                deadlineExpired = true;
                controller?.abort();
                reject(new Error("timeout"));
            }, NOTEBOOK_FETCH_TIMEOUT_MS);
        });
        try {
            const localTabs = this.currentTabs();
            const queryLower = query.toLocaleLowerCase();
            const localItems = canUseTitleSearch(filters) ? localTabs.map((tab) => {
                const rootId = this.rootIdOf(tab) || "";
                const title = this.titleOf(tab);
                const path = String((tab as unknown as {path?: string; hPath?: string}).path
                    || (tab as unknown as {hPath?: string}).hPath || "");
                const notebookId = resolveSearchNotebookId(tab as unknown);
                if (notebook && notebookId !== notebook) return null;
                if (filters.paths && filterDocSearchResults.call(this, [{path, hPath: path, notebookId}], filters).length === 0) return null;
                if (!`${title} ${path}`.toLocaleLowerCase().includes(queryLower)) return null;
                return {
                    id: rootId || tab.id,
                    rootId: rootId || undefined,
                    title,
                    path: path || undefined,
                    notebookId: notebookId || undefined,
                    source: "tabs",
                };
            }).filter(Boolean) as Array<Record<string, unknown>> : [];

            // A local tab match already satisfies the requested bound. Avoid
            // waking the file tree or full-text endpoint in that case.
            if (offset === 0 && localItems.length >= limit) {
                const content = buildAgentSearchResult(query, localItems, {source: "tabs", limit, offset});
                return this.agentContentResult(content);
            }

            let docs: IDocSearchResult[] = [];
            let titleSearchAvailable = true;
            try {
                if (!canUseTitleSearch(filters)) {
                    throw new Error("advanced filters require native search");
                }
                const response = await Promise.race([fetch("/api/filetree/searchDocs", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({k: query}),
                    ...(signal ? {signal} : {}),
                }), timeoutPromise]);
                if (!response.ok) throw new Error(`searchDocs HTTP ${response.status}`);
                const json = await Promise.race([response.json(), timeoutPromise]);
                const rawDocs = extractSearchRecords(json)
                    .slice(0, MAX_SEARCH_ITEMS * 2)
                    .filter((doc: unknown): doc is IDocSearchResult => Boolean(doc) && typeof doc === "object");
                // Native v3.8.x searchDocs records commonly contain only
                // {path, hPath, box, boxIcon}. Normalize the root/title
                // before applying Agent bounds, otherwise valid title hits
                // would be discarded as unidentifiable objects.
                docs = normalizeTitleSearchDocuments(rawDocs) as IDocSearchResult[];
                docs = filterDocSearchResults.call(this, docs, filters);
            } catch (error) {
                const reason = normalizeAgentFailureReason(error, deadlineExpired);
                if (reason === "cancelled" || reason === "timeout") throw error;
                titleSearchAvailable = false;
                logger.warn("Agent title search unavailable", error);
            }

            let source = localItems.length > 0 ? "tabs" : "title";
            if (docs.length === 0) {
                const fallback = await Promise.race([
                    runFullTextSearchFallback.call(this, query, signal, filters, Math.min(DOC_SEARCH_FETCH_LIMIT, offset + limit + 1)),
                    timeoutPromise,
                ]);
                if (fallback !== null) {
                    docs = fallback;
                    source = localItems.length > 0 ? "tabs+global" : "global";
                } else if (localItems.length === 0) {
                    if (!titleSearchAvailable) return {error: "search unavailable"};
                    const content = buildAgentSearchResult(query, [], {source: "title", limit, offset});
                    return this.agentContentResult(content);
                }
            } else if (localItems.length > 0) {
                source = "tabs+title";
            }
            const items = localItems.concat(docs.map((doc) => ({
                id: doc.id || doc.rootId,
                rootId: doc.rootId || doc.id,
                title: doc.title || doc.name,
                path: doc.path || doc.hPath,
                notebookId: doc.notebookId || doc.notebookID || doc.box,
                source: doc.source || (source.includes("title") ? "title" : source.includes("global") ? "global" : source),
                blockIds: doc.blockIds,
                snippets: doc.snippets?.map((snippet) => snippet?.text || "").filter(Boolean),
            })));
            const content = buildAgentSearchResult(query, items, {
                source,
                limit,
                offset,
            });
            return this.agentContentResult(content);
        } catch (error) {
            const reason = normalizeAgentFailureReason(error, deadlineExpired);
            if (reason === "timeout") return {error: "search timed out"};
            if (reason === "cancelled") return {error: "search cancelled"};
            logger.warn("Agent search fail", error);
            return {error: "search unavailable"};
        } finally {
            if (timer !== null) window.clearTimeout(timer);
            if (controller) this.activeAgentSearchControllers.delete(controller);
        }
    }
}
