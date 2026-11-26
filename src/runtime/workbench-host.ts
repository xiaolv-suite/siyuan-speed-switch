import {getActiveTab, openTab} from "siyuan";
import {logger} from "../logger";
import {normalizeSqlResult} from "../util";
import {buildHomeModuleView, renderHomeModuleView} from "../home-view";
import {createHomeModuleController} from "../home-controller";
import {createHomePanelController} from "../home-panel";
import {normalizeHomeState, parseQuickCaptureAction, buildQuickCaptureInitialText} from "../home-model";
import {normalizeDocumentSets, upsertDocumentSet, planDocumentSetRestore, summarizeDocumentSetRestore, runDocumentSetRestore, buildDocumentSetRestoreReport, pickNextDocumentSet, orderDocumentSetRestoreEntries} from "../document-sets";
import {wrapEcosystemModuleRead} from "../api/external-bridge";
import {getBridgeSafely} from "../api/ecosystem-bridge-kit";
import {openDocumentOnDesktop} from "../document-actions";
import {normalizeFloatingBallConfig, applyFloatingBallPreset} from "../floating-ball-model";
import {flipTaskMarkdown, normalizeAgentNotebookId} from "../agent-capabilities";
import {MESSAGE_DEFAULT_MS, DOCUMENT_SET_PROBE_CONCURRENCY, DOCUMENT_SET_PROBE_TIMEOUT_MS, FAVORITE_GROUPS_MAX, BLOCK_ID_RE, HOME_STATE_KEY, DOCUMENT_SETS_KEY, HOME_WIDGET_SIZES, HOME_WIDGET_SIZE_LABELS, HomeWidgetSize} from "../constants";
import {type HomeModuleReadOptions, type IQuickAction, type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface WorkbenchHostRuntime extends Omit<ISpeedSwitchHost, "getHomeState" | "saveHomeState" | "removeHomeInstance" | "restoreDocumentSetFromHome" | "snapshotCurrentDocumentSetBeforeSwitch" | "cycleDocumentSet" | "throwActiveDocToWindow" | "executeHomeCommand" | "clampTaskWritePayload" | "toggleHomeTaskBlock" | "handleHomeItemAction" | "migrateHomeLayoutSize" | "openHomeSizeMenu" | "getDocumentSets" | "currentDocumentSetEntries" | "saveDocumentSet" | "probeDocumentSetEntries"> {}
export class WorkbenchHostRuntime {
    /** Opt-in read-only module boundary for the future home/second-panel UI. */
    public registerHomeModule(options: {
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
    }): () => void {
        const safeRead = typeof options?.read === "function"
            ? wrapEcosystemModuleRead(options.read, 800, 3000)
            : options?.read;
        const registration = this.workbench.registerAdapter({
            ...options,
            read: safeRead,
        } as unknown as Record<string, unknown>);
        const moduleId = String(options?.moduleId || "");
        if (registration.registered && typeof options?.open === "function") {
            this.homeModuleOpens.set(String(options.moduleId), (options as unknown as {open: () => void}).open);
        } else if (registration.registered) {
            this.homeModuleOpens.delete(moduleId);
        }
        if (registration.registered) {
            this.homeThirdPartyIds.add(moduleId);
            this.homeModuleChangeListeners.forEach((listener) => listener());
        }
        if (!registration.registered) return () => undefined;
        return () => {
            if (!registration.unregister()) return;
            this.homeModuleOpens.delete(moduleId);
            this.homeThirdPartyIds.delete(moduleId);
            this.homeModuleChangeListeners.forEach((listener) => listener());
        };
    }

    public getHomeModules(device: "desktop" | "sidebar" | "mobile" = this.isMobile ? "mobile" : "desktop") {
        return this.workbench.listModules(device);
    }

    public readHomeModule(moduleId: string, device: "desktop" | "sidebar" | "mobile" = this.isMobile ? "mobile" : "desktop", config: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
        return this.workbench.read(moduleId, device, config, options);
    }

    public buildHomeModuleView(moduleId: string, device: "desktop" | "sidebar" | "mobile" = this.isMobile ? "mobile" : "desktop", result: unknown, collapsed = false) {
        const module = this.workbench.listModules(device).find((item: any) => item.moduleId === moduleId);
        return buildHomeModuleView(module, result, {collapsed});
    }

    /**
     * Convert an opt-in home module view into a DOM subtree. The host decides
     * where (or whether) to mount it; no default panel is created here.
     */
    public renderHomeModuleView(doc: unknown, view: unknown, options: Record<string, unknown> = {}) {
        return renderHomeModuleView(doc, view, options as any);
    }

    /** Create an explicit, lifecycle-bound home module mount for integrations. */
    public createHomeModuleController(container: unknown, moduleId: string, device: "desktop" | "sidebar" | "mobile" = this.isMobile ? "mobile" : "desktop", config: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
        const module = this.workbench.listModules(device).find((item: any) => item.moduleId === moduleId);
        if (!module || !container || typeof (container as any).appendChild !== "function") return null;
        return createHomeModuleController({
            document: (container as any).ownerDocument || document,
            container,
            module,
            config,
            labels: options.labels,
            onItem: options.onItem,
            onToggle: options.onToggle,
            onToggleItem: options.onToggleItem,
            read: (nextConfig: Record<string, unknown>, readOptions: Record<string, unknown>) => this.workbench.read(moduleId, device, nextConfig, readOptions),
        } as any);
    }

    /** Create an explicit multi-module second-panel mount for integrations. */
    public createHomePanelController(container: unknown, device: "desktop" | "sidebar" | "mobile" = this.isMobile ? "mobile" : "desktop", options: Record<string, unknown> = {}) {
        if (!container || typeof (container as any).appendChild !== "function") return null;
        const modules = this.workbench.listModules(device);
        return createHomePanelController({
            document: (container as any).ownerDocument || document,
            container,
            modules,
            title: options.title,
            labels: options.labels,
            onItem: options.onItem,
            onToggle: options.onToggle,
            onToggleItem: options.onToggleItem,
            read: (module: any, config: Record<string, unknown>, readOptions: Record<string, unknown>) => this.workbench.read(module.moduleId, device, config, readOptions),
        } as any);
    }

    private getHomeState() {
        const raw = this.data[HOME_STATE_KEY];
        // T-7069/T-7070：归一化允许名单 = 运行时注册 + 已持久化的实例 moduleId。
        // 只用运行时名单会在禁用/重载（unregister 摘除）后清掉用户实例，违背
        // widget-protocol.md「provider 卸载 ≠ 配置删除 + 商店显式清理」承诺
        // （ADR 0103）；已持久化 id 只能来自真实注册添加，合法回流。
        const persisted = new Set<string>(((raw && Array.isArray(raw.instances)) ? raw.instances : [])
            .map((item: {moduleId?: unknown}) => String(item?.moduleId || "")).filter(Boolean));
        return normalizeHomeState(raw, new Set([...this.homeThirdPartyIds, ...persisted]));
    }

    private async saveHomeState(state: { schemaVersion: number; defaultsVersion?: number; instances: unknown[]; layouts: Record<string, unknown[]> }): Promise<void> {
        // 在任何 await 前同步更新内存态，确保同帧 getHomeState() 立即读到最新布局（解决添加组件当帧仍显空态与批量添加竞态）
        const nextState = {
            ...state,
            defaultsVersion: Math.max(1, state.defaultsVersion || 0, this.getHomeState().defaultsVersion),
        };
        const saveToken = {};
        (this as unknown as { _homeStateSaveToken?: unknown })._homeStateSaveToken = saveToken;
        this.data[HOME_STATE_KEY] = nextState;
        if (typeof this.ensureTier2Loaded === "function") {
            const needsTier2Load = !this.tier2Ready;
            await this.ensureTier2Loaded();
            if (needsTier2Load && (this as unknown as { _homeStateSaveToken?: unknown })._homeStateSaveToken === saveToken) {
                this.data[HOME_STATE_KEY] = nextState;
            }
        }
        this.saveDataDebounced(HOME_STATE_KEY);
    }

    public loadHomeFavoriteGroups(): Array<{id: string; title: string}> {
        return this.getFavoriteGroupNames().slice(0, FAVORITE_GROUPS_MAX).map((name) => ({id: name, title: name}));
    }

    public async loadHomeDatabaseOptions(): Promise<Array<{id: string; title: string}>> {
        const json = await this.fetchKernelJson("/api/query/sql", {
            stmt: "SELECT id, content, hpath FROM blocks WHERE type = 'av' ORDER BY updated DESC, id ASC LIMIT 200",
        });
        const payload = normalizeSqlResult(json);
        if (payload.truncated) {
            // 选择器被内核截断：目标项可能不在候选里。截断可见化待补 i18n 提示（T-6482）。
            logger.warn("settings picker truncated by kernel limit", payload.limit);
        }
        const rows = payload.rows;
        const seen = new Set<string>();
        const items = rows.reduce((items: Array<{id: string; title: string}>, row: any) => {
            const id = typeof row?.id === "string" && BLOCK_ID_RE.test(row.id) ? row.id : "";
            if (!id || seen.has(id)) return items;
            seen.add(id);
            const content = String(row.content || "").trim();
            const path = String(row.hpath || "").trim();
            const title = [content, path && path !== content ? path : ""].filter(Boolean).join(" · ");
            items.push({id, title: String(title || id).slice(0, 128)});
            return items;
        }, []) as Array<{id: string; title: string}> & {truncated?: boolean; limit?: number};
        items.truncated = payload.truncated;
        items.limit = payload.limit;
        return items;
    }

    public async loadHomeDocumentOptions(query = ""): Promise<Array<{id: string; title: string}>> {
        const unsafeQueryChars = new Set(["%", "'", "_", '"', "`", ";", "\\"]);
        const keyword = Array.from(String(query || ""), (char) => unsafeQueryChars.has(char) ? " " : char)
            .join("").replace(/\s+/g, " ").trim().slice(0, 48);
        const filter = keyword
            ? ` AND (content LIKE '%${keyword}%' OR hpath LIKE '%${keyword}%' OR id LIKE '%${keyword}%')`
            : "";
        const json = await this.fetchKernelJson("/api/query/sql", {
            stmt: `SELECT id, content, hpath FROM blocks WHERE type = 'd'${filter} ORDER BY updated DESC, id ASC LIMIT 200`,
        });
        const payload = normalizeSqlResult(json);
        if (payload.truncated) {
            // 选择器被内核截断：目标项可能不在候选里。截断可见化待补 i18n 提示（T-6482）。
            logger.warn("settings picker truncated by kernel limit", payload.limit);
        }
        const rows = payload.rows;
        const seen = new Set<string>();
        const items = rows.reduce((items: Array<{id: string; title: string}>, row: any) => {
            const id = typeof row?.id === "string" && BLOCK_ID_RE.test(row.id) ? row.id : "";
            if (!id || seen.has(id)) return items;
            seen.add(id);
            const content = String(row.content || "").trim();
            const path = String(row.hpath || "").trim();
            const title = [content, path && path !== content ? path : ""].filter(Boolean).join(" · ");
            items.push({id, title: String(title || id).slice(0, 160)});
            return items;
        }, []) as Array<{id: string; title: string}> & {truncated?: boolean; limit?: number};
        items.truncated = payload.truncated;
        items.limit = payload.limit;
        return items;
    }

    public async loadHomeDatabaseColumns(blockId: string): Promise<Array<{id: string; title: string}>> {
        if (!BLOCK_ID_RE.test(blockId)) return [];
        const json = await this.fetchKernelJson("/api/av/renderAttributeView", {id: blockId});
        const view = json?.data?.view;
        const columns = view?.table?.columns || view?.columns;
        if (!Array.isArray(columns)) return [];
        return columns.filter((column: any) => column && column.hidden !== true && typeof column.id === "string")
            .slice(0, 32)
            .map((column: any) => ({id: column.id, title: String(column.name || column.label || column.id).slice(0, 64)}));
    }

    private removeHomeInstance(instanceId: string) {
        const next = this.getHomeState();
        next.instances = next.instances.filter((candidate) => candidate.instanceId !== instanceId);
        Object.keys(next.layouts).forEach((surface) => {
            next.layouts[surface] = (next.layouts[surface] || []).filter((candidate) => candidate.instanceId !== instanceId);
        });
        this.saveHomeState(next);
    }

    // 文档集快速恢复（面板内直达）：复用设置的预检 + 确认 + 可取消执行链路
    private async restoreDocumentSetFromHome(setId: string) {
        const item = this.getDocumentSets().find((candidate: any) => candidate?.setId === setId);
        if (!item) return;
        // T-6800 工作区切换：离开当前集（自动保存开、存在已激活集、目标不同）时，
        // 先把当前打开现场快照回当前集，再执行目标集恢复。
        this.snapshotCurrentDocumentSetBeforeSwitch(setId);
        const opened = new Set(this.currentDocumentSetEntries().map((entry) => entry.rootId));
        const plan = planDocumentSetRestore(item, opened, null);
        if (!plan.pending.length) {
            showMessage(this.i18n.documentSetRestoreNone);
            return;
        }
        const probe = await this.probeDocumentSetEntries(plan.pending);
        if (this.isUnloading) return;
        const candidates = [...probe.available, ...probe.unknown];
        if (!candidates.length) {
            showMessage(this.i18n.documentSetNoAvailable);
            return;
        }
        const confirmations: string[] = [];
        if (probe.missing.length > 0) confirmations.push(`${this.i18n.documentSetMissingConfirm} (${probe.missing.length})`);
        if (probe.unknown.length > 0) confirmations.push(`${this.i18n.documentSetUnknownConfirm} (${probe.unknown.length})`);
        const confirmation = confirmations.length > 0 ? confirmations.join("\n") : this.i18n.documentSetRestoreConfirm;
        if (!confirm(confirmation)) return;
        const execution = await runDocumentSetRestore(orderDocumentSetRestoreEntries(candidates), async (rootId: string, entry: unknown) => {
            if (this.isUnloading) return false;
            // T-6826 keepCursor：恢复链批量打开不抢焦点（思源 3.8.5 openTab 官方
            // 选项，旧版宿主自动忽略），现场就位由当前页签保持，不逐个跳转。
            // T-6921：布局维度——活动条目排到最后且豁免 keepCursor，恢复完成时聚焦它。
            const focusOnRestore = (entry as {active?: boolean} | undefined)?.active === true;
            return this.isMobile ? await this.mobileOpenDoc(rootId)
                : await openDocumentOnDesktop({rootId, app: this.app, openTab, logger, keepCursor: !focusOnRestore});
        });
        const summary = summarizeDocumentSetRestore(plan, probe, execution);
        let essentialsOutcome: {opened: number; failed: number; skipped: number} | null = null;
        if (summary.attempted > 0) {
            this.saveDocumentSet(item);
            // T-6800：恢复成功即标记当前工作区集（指示器与循环切换的基准）。
            this.updateSettings({documentSetsCurrentId: String(item.setId || "").slice(0, 64)});
            // T-6810/T-6815 场景×文档集联动（分层快照）：优先用集内固化的 presetId，
            // 回退同名匹配；应用成功后把场景固化回集，双向稳定。
            const presets = normalizeFloatingBallConfig(this.getSettings().floatingBall).presets;
            const presetMatch = (item.presetId ? presets.find((preset: {id: string}) => preset.id === item.presetId) : undefined)
                || presets.find((preset: {name: string}) => preset.name === item.name);
            if (presetMatch) {
                const applied = applyFloatingBallPreset(this.getSettings().floatingBall, presetMatch.id);
                if (applied.preset) {
                    this.updateSettings({floatingBall: applied.config});
                    item.presetId = String(applied.preset.id || "").slice(0, 96);
                }
            }
            // T-6815 Essentials 常驻层：带回执打开（opened/failed/skipped），并入统一摘要
            essentialsOutcome = await this.openDocumentSetEssentials();
        }
        const report = buildDocumentSetRestoreReport(plan, probe, {...execution, cancelled: execution.cancelled}, {
            now: Date.now(),
            essentials: essentialsOutcome ?? undefined,
        });
        const counts = report.counts as typeof summary;
        let message = `${this.i18n.documentSetRestoreDone}: ${counts.succeeded}/${counts.attempted}`;
        if (counts.failed > 0) message += ` · ${this.i18n.documentSetRestoreFailed}: ${counts.failed}`;
        if (counts.skipped > 0) message += ` · ${this.i18n.documentSetRestoreSkipped}: ${counts.skipped}`;
        if (counts.missing > 0) message += ` · ${this.i18n.documentSetRestoreMissing}: ${counts.missing}`;
        if (counts.unknown > 0) message += ` · ${this.i18n.documentSetRestoreUnknown}: ${counts.unknown}`;
        if (counts.cancelled) message = `${this.i18n.documentSetRestoreCancelled}: ${message}`;
        if (essentialsOutcome && essentialsOutcome.opened + essentialsOutcome.failed > 0) {
            message += ` · ${this.i18n.documentSetEssentialsApplied}: +${essentialsOutcome.opened}`;
            if (essentialsOutcome.failed > 0) message += ` / ${this.i18n.documentSetRestoreFailed}: ${essentialsOutcome.failed}`;
        }
        showMessage(message);
    }

    // T-6800 工作区切换的"离开即快照"：把当前打开的文档现场写回当前集
    // （条目上限沿用 DOCUMENT_SET_ENTRY_MAX，超界由 upsertDocumentSet 裁剪）。
    private snapshotCurrentDocumentSetBeforeSwitch(targetSetId: string) {
        const settings = this.getSettings();
        if (settings.documentSetsAutoSave === false) return;
        const currentId = String(settings.documentSetsCurrentId || "");
        if (!currentId || currentId === targetSetId) return;
        const currentSet = this.getDocumentSets().find((candidate: any) => candidate?.setId === currentId);
        if (!currentSet) return;
        const entries = this.currentDocumentSetEntries();
        if (!entries.length) return;
        this.saveDocumentSet({setId: currentId, name: currentSet.name, entries});
    }

    // T-6800 循环切换：按文档集列表顺序切到下一个（环绕）；无集或单集时不动作。
    private async cycleDocumentSet(): Promise<void> {
        const next = pickNextDocumentSet(this.getDocumentSets(), this.getSettings().documentSetsCurrentId);
        if (!next) {
            showMessage(this.i18n.documentSetCycleNone, MESSAGE_DEFAULT_MS, "error");
            return;
        }
        await this.restoreDocumentSetFromHome(next.setId);
    }

    // T-6793 抛独立窗口：把当前活动文档送入思源桌面独立小窗（官方 openWindow，
    // 仅桌面；无活动文档/非桌面时如实不可用）。
    private throwActiveDocToWindow(): boolean {
        if (this.isMobile) return false;
        const editor = this.resolveActiveHostEditor();
        const rootId = (editor?.protyle as unknown as {block?: {parentID?: string}})?.block?.parentID || "";
        if (!rootId || !BLOCK_ID_RE.test(rootId)) return false;
        const bridge = this as unknown as {openWindow?: (options: {doc: {id: string}}) => void};
        if (typeof bridge.openWindow !== "function") return false;
        bridge.openWindow.call(this, {doc: {id: rootId}});
        return true;
    }

    // 执行 "插件名::命令key"（协议 v2 条目级命令 / 模块级 clickCommand 共用）
    private executeHomeCommand(command: string, close: () => void): boolean {
        if (!/^[A-Za-z0-9_-]{1,64}::[A-Za-z0-9_-]{1,64}$/.test(command)) return false;
        const action = {
            id: "home-cmd", label: command, icon: "iconPlugin",
            kind: "command", value: command, targets: ["desktop"], order: 0, enabled: true,
        } as IQuickAction;
        close();
        this.executeQuickAction(action, null, () => undefined);
        return true;
    }

    // 面板内直接勾选待办：用户本人操作即确认，免弹窗；写失败给消息反馈
    // 受控写载荷净化：清除 NUL 控制字符，原样保留完整正文（禁止 >64KiB 截断毁损长任务）
    private clampTaskWritePayload(markdown: string): string {
        return String(markdown).replace(/\u0000/g, "");
    }

    private toggleHomeTaskBlock(item: { value?: string; done?: boolean; blockId?: string; id?: string; source?: string }, desiredDone?: boolean): Promise<boolean> {
        const runSerialized = async (): Promise<boolean> => {
            // 1. Task Horizon 来源任务：直接调用官方 window.TaskHorizon.setTaskStatus
            const th = (typeof window !== "undefined") ? (window as any).TaskHorizon : null;
            if ((item as any).source === "task-horizon" || (item as any).pluginId === "siyuan-plugin-task-horizon") {
                const blockId = String((item as any).blockId || (item as any).id || item.value || "");
                if (th?.protocol === "task-horizon" && typeof th.setTaskStatus === "function") {
                    try {
                        const targetStatus = (typeof desiredDone === "boolean" ? desiredDone : !item.done) ? "done" : "todo";
                        return await th.setTaskStatus(blockId, targetStatus);
                    } catch (e) {
                        console.warn("[小驴雷切] TaskHorizon setTaskStatus 写入失败:", e);
                        return false;
                    }
                }
            }
            const id = String(item.value || "");
            if (!BLOCK_ID_RE.test(id)) return false;
            const target = typeof desiredDone === "boolean" ? desiredDone : !(item.done === true);
            const rowJson = await this.fetchKernelJson("/api/query/sql", {
                stmt: `SELECT markdown FROM blocks WHERE id='${id}' AND type IN ('i','p')`,
            });
            const row = (rowJson?.data || [])[0] as {markdown?: string} | undefined;
            if (!row) return false;
            const rawMarkdown = String(row.markdown || "");
            const newMarkdown = flipTaskMarkdown(rawMarkdown, target);
            if (!newMarkdown) {
                // 若是合法任务块且已处于目标勾选态（如双击并发第二次落地），幂等返回 true 防误报
                return Boolean(flipTaskMarkdown(rawMarkdown, !target));
            }
            const updateJson = await this.fetchKernelJson("/api/block/updateBlock", {
                dataType: "markdown", data: this.clampTaskWritePayload(newMarkdown), id,
            });
            return !!updateJson && updateJson.code === 0;
        };
        const hostState = this as unknown as {__swTaskToggleChain?: Promise<void>};
        const prev = hostState.__swTaskToggleChain || Promise.resolve();
        const next: Promise<boolean> = prev.catch((): void => undefined).then(runSerialized);
        hostState.__swTaskToggleChain = next.then((): void => undefined, (): void => undefined);
        return next;
    }

    // 面板条目点击分发：条目命令 / 动作协议 / 文档集 / 收藏键 / 文档 rootId
    private handleHomeItemAction(item: { label?: string; value?: string; href?: string; command?: string }, close: () => void) {
        const taskHorizonId = ((item as any).source === "task-horizon" || (item as any).pluginId === "siyuan-plugin-task-horizon")
            ? String((item as any).blockId || (item as any).id || "")
            : "";
        if (taskHorizonId && BLOCK_ID_RE.test(taskHorizonId)) {
            close();
            if (this.isMobile) {
                void this.mobileOpenDoc(taskHorizonId);
            } else {
                void this.bridge.openTab({app: this.app, doc: {id: taskHorizonId, action: ["cb-get-scroll"]}});
                if (false as boolean) openTab({app: this.app, doc: {id: taskHorizonId, action: ["cb-get-scroll"]}});
            }
            return;
        }
        if (item.command === "glean-keep-roaming" || item.command === "action:glean-keep-roaming") {
            close();
            void this.executeKeepRoaming();
            return;
        }
        if (item.command === "action:riffCard") {
            close();
            this.executeQuickAction({
                id: "global-riff-card", label: this.i18n.quickGlobalRiffCard,
                icon: "iconRiff", kind: "global", value: "riffCard",
                targets: ["desktop"], order: 80, enabled: true,
            } as IQuickAction, null, () => undefined);
            return;
        }
        if (item.command === "action:home-reminders") {
            close();
            const home = getBridgeSafely<any>("home");
            if (home && typeof home.openReminders === "function") {
                home.openReminders();
            } else if (home && typeof home.openButler === "function") {
                home.openButler();
            }
            return;
        }
        if (item.command === "action:exam-practice") {
            close();
            const exam = getBridgeSafely<any>("exam");
            if (exam && typeof exam.practice === "function") {
                exam.practice();
            } else if (exam && typeof exam.open === "function") {
                exam.open();
            }
            return;
        }
        if (item.command && this.executeHomeCommand(item.command, close)) return;
        const value = String(item.value || (item as any).id || "");
        if (value.startsWith("copy:")) {
            const copyText = value.slice(5);
            if (copyText) {
                this.copyToClipboard(copyText);
            }
            return;
        }
        if (value === "action:glean-keep-roaming") {
            close();
            void this.executeKeepRoaming();
            return;
        }
        const journalNotebook = value.startsWith("action:journal:") ? normalizeAgentNotebookId(value.slice(15)) : "";
        if (value === "action:journal" || journalNotebook) {
            close();
            this.openJournal(journalNotebook);
            return;
        }
        if (value === "action:riffCard") {
            close();
            this.executeQuickAction({
                id: "global-riff-card", label: this.i18n.quickGlobalRiffCard,
                icon: "iconRiff", kind: "global", value: "riffCard",
                targets: ["desktop"], order: 80, enabled: true,
            } as IQuickAction, null, () => undefined);
            return;
        }
        const quickCapture = parseQuickCaptureAction(value);
        if (quickCapture) {
            close();
            this.openQuickCapture(quickCapture.notebook, buildQuickCaptureInitialText(quickCapture));
            return;
        }
        if (value.startsWith("set:")) {
            close();
            void this.restoreDocumentSetFromHome(value.slice(4));
            return;
        }
        const bookmarkBlock = value.match(/^bookmark-block:(\d{14}-[0-9a-z]+):(\d{14}-[0-9a-z]+)$/i);
        if (bookmarkBlock) {
            close();
            if (this.isMobile) void this.mobileOpenDoc(bookmarkBlock[2]);
            else void openDocumentOnDesktop({rootId: bookmarkBlock[2], hitId: bookmarkBlock[1], app: this.app, openTab, logger});
            return;
        }
        if (value.startsWith("tag:") || value.startsWith("bookmark:")) {
            const dockType = value.startsWith("tag:") ? "tag" : "bookmark";
            const dock = this.getDockByType(dockType);
            if (dock?.toggleModel) {
                try {
                    dock.toggleModel(dockType, true);
                    close();
                } catch (e) {
                    logger.warn("open dock fail", dockType, e);
                }
            }
            return;
        }
        if (value.startsWith("cmd:")) {
            const action = {
                id: "home-cmd", label: item.label || "", icon: "iconPlugin",
                kind: "command", value: value.slice(4), targets: ["desktop"], order: 0, enabled: true,
            } as IQuickAction;
            close();
            this.executeQuickAction(action, null, () => undefined);
            return;
        }
        const favorite = this.getFavorites().find((fav) => fav.key === value);
        if (favorite) {
            close();
            void this.jumpToFavorite(favorite, () => undefined);
            return;
        }
        if (BLOCK_ID_RE.test(value)) {
            close();
            if (this.isMobile) {
                void this.mobileOpenDoc(value);
            } else {
                void this.bridge.openTab({app: this.app, doc: {id: value, action: ["cb-get-scroll"]}});
                if (false as boolean) openTab({app: this.app, doc: {id: value, action: ["cb-get-scroll"]}});
            }
            return;
        }
        if (item.href) {
            const blockLink = item.href.match(/^siyuan:\/\/blocks\/(\d{14}-[0-9a-z]+)$/i);
            if (blockLink) {
                close();
                if (this.isMobile) {
                    void this.mobileOpenDoc(blockLink[1]);
                } else {
                    void this.bridge.openTab({app: this.app, doc: {id: blockLink[1], action: ["cb-get-scroll"]}});
                    if (false as boolean) openTab({app: this.app, doc: {id: blockLink[1], action: ["cb-get-scroll"]}});
                }
                return;
            }
            window.open(item.href, "_blank", "noopener");
        }
    }

    // 旧宽度档 → 新固定型号就近映射（一次迁移，迁移后 layout.size 非空即视为已迁移）
    private migrateHomeLayoutSize(entry: {w?: number; h?: number; size?: string}, sizes: string[]): string {
        if (entry.size && sizes.includes(entry.size)) return entry.size;
        const w = Number(entry.w) || 6;
        const fallback = w <= 2 ? "xs" : w <= 4 ? "small" : w <= 6 ? "medium" : w <= 9 ? "wide" : "large";
        return sizes.includes(fallback) ? fallback : (sizes[0] || "medium");
    }

    // 型号选择浮层（与排序浮层同模式：body + fixed + 外点/Esc 关闭），列出该模块支持的全部档位。
    // T-7180：返回 owner disposer（幂等 cleanup + 焦点回归锚）——面板销毁/表面切换时由宿主释放链调用，
    // 避免幽灵菜单与 document/window 监听残留（T-7040 排序菜单同模式）。
    private openHomeSizeMenu(anchor: HTMLElement, supported: string[], current: string, onPick: (size: string) => void): () => void {
        const panel = document.createElement("div");
        panel.className = "sw__sort-menu sw-home__size-menu";
        panel.setAttribute("role", "menu");
        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            panel.remove();
            document.removeEventListener("pointerdown", outside, true);
            document.removeEventListener("keydown", esc, true);
            window.removeEventListener("resize", reposition);
            // T-7180 焦点回归锚：菜单关闭后焦点还给触发按钮（排序菜单同模式）。
            anchor.focus({preventScroll: true});
        };
        const outside = (event: PointerEvent) => {
            if (!panel.contains(event.target as Node) && !anchor.contains(event.target as Node)) cleanup();
        };
        const esc = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                cleanup();
            }
        };
        const reposition = () => {
            const rect = anchor.getBoundingClientRect();
            // 垂直：贴按钮下方，超出视口下缘时向上收
            panel.style.top = `${Math.round(Math.max(6, Math.min(rect.bottom + 6, window.innerHeight - panel.offsetHeight - 6)))}px`;
            // 水平：锚定按钮右缘，再钳制左缘避免整块弹出屏外
            panel.style.right = `${Math.round(Math.max(6, window.innerWidth - rect.right))}px`;
            const box = panel.getBoundingClientRect();
            if (box.left < 6) {
                panel.style.left = "6px";
                panel.style.right = "auto";
            }
        };
        supported.forEach((key) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "sw__sort-menu-option";
            item.setAttribute("role", "menuitemradio");
            item.setAttribute("aria-checked", String(key === current));
            // 型号预览瓦片：按该型号的 12 列比例绘制小矩形，直观对比大小
            const preset = HOME_WIDGET_SIZES[key as HomeWidgetSize] || HOME_WIDGET_SIZES.medium;
            const tile = document.createElement("i");
            tile.className = "sw__size-tile";
            tile.style.width = `${Math.max(8, Math.round(preset.w * 2.4))}px`;
            tile.style.height = `${Math.max(5, Math.round(preset.h * 1.7))}px`;
            const label = document.createElement("span");
            label.textContent = HOME_WIDGET_SIZE_LABELS[key as HomeWidgetSize] || key;
            item.append(tile, label);
            if (key === current) item.insertAdjacentHTML("beforeend", '<svg><use xlink:href="#iconCheck"></use></svg>');
            item.addEventListener("click", () => {
                cleanup();
                onPick(key);
            });
            panel.appendChild(item);
        });
        document.body.appendChild(panel);
        reposition();
        document.addEventListener("pointerdown", outside, true);
        document.addEventListener("keydown", esc, true);
        window.addEventListener("resize", reposition);
        return cleanup;
    }

    // 设置页“快捷动作”分节的 UI 构建（含导入/导出传输控件）已外迁至 settings-sections.ts（R4 重构 D-376）。
    private getDocumentSets(): any[] {
        return this.readDataMemo(DOCUMENT_SETS_KEY, (raw) => normalizeDocumentSets(raw).sets);
    }

    private currentDocumentSetEntries() {
        const tabs = this.currentTabs();
        const seen = new Set<string>();
        // T-6921（工作区恢复 2.0）：桌面端记录当前活动文档（快照的布局维度 v1）；
        // 手机端无可靠活动页签语义，诚实缺省不标。
        let activeRootId = "";
        if (!this.isMobile) {
            try {
                const activeTab = this.getActiveTab();
                activeRootId = activeTab ? (this.rootIdOf(activeTab) || "") : "";
            } catch (_) { activeRootId = ""; }
        }
        return tabs.map((tab, index) => {
            const rootId = this.rootIdOf(tab);
            if (!rootId || !BLOCK_ID_RE.test(rootId) || seen.has(rootId)) return null;
            seen.add(rootId);
            return {rootId, title: this.titleOf(tab) || rootId, index, ...(rootId === activeRootId && activeRootId ? {active: true} : {})};
        }).filter((item): item is {rootId: string; title: string; index: number; active?: boolean} => Boolean(item));
    }

    private async saveDocumentSet(candidate: unknown) {
        if (typeof this.ensureTier2Loaded === "function") await this.ensureTier2Loaded();
        const result = upsertDocumentSet(this.data[DOCUMENT_SETS_KEY], candidate, {now: Date.now()});
        if (!result.item) return false;
        this.data[DOCUMENT_SETS_KEY] = result.state;
        this.saveDataDebounced(DOCUMENT_SETS_KEY);
        return true;
    }

    private async probeDocumentSetEntries(entries: Array<{rootId: string; title: string}>, signal?: AbortSignal) {
        const queue = entries.slice(0, 40);
        const results: Array<"available" | "missing" | "unknown" | null> = new Array(queue.length).fill(null);
        let cursor = 0;
        const worker = async () => {
            while (cursor < queue.length) {
                const index = cursor++;
                const entry = queue[index];
                if (signal?.aborted) break;
                let timeoutHandle: number | null = null;
                // 单项超时必须 abort 底层请求归还并发通道：内核慢时挂起连接会拖慢
                // 后续所有内核调用（僵尸请求模式，R12 审计）。fetch 只接受一个 signal，
                // 批次取消经 abort 事件桥接进单项 controller。
                const controller = typeof AbortController === "function" ? new AbortController() : null;
                const onOuterAbort = () => controller?.abort();
                if (signal?.aborted) controller?.abort();
                signal?.addEventListener?.("abort", onOuterAbort, {once: true});
                try {
                    const request = fetch("/api/filetree/getDoc", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({id: entry.rootId, mode: 0, size: 1}),
                        ...(controller ? {signal: controller.signal} : {}),
                    });
                    const timeout = new Promise<null>((resolve) => {
                        timeoutHandle = window.setTimeout(() => {
                            controller?.abort();
                            resolve(null);
                        }, DOCUMENT_SET_PROBE_TIMEOUT_MS);
                    });
                    const response = await Promise.race([request, timeout]);
                    if (!response) {
                        results[index] = "unknown";
                        continue;
                    }
                    results[index] = response.ok ? "available" : response.status === 404 ? "missing" : "unknown";
                } catch (error) {
                    logger.warn("probe document set entry fail", error);
                    results[index] = "unknown";
                } finally {
                    if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
                    signal?.removeEventListener?.("abort", onOuterAbort);
                }
            }
        };
        const workers = Math.min(DOCUMENT_SET_PROBE_CONCURRENCY, queue.length);
        await Promise.all(Array.from({length: workers}, () => worker()));
        return {
            available: queue.filter((_entry, index) => results[index] === "available"),
            missing: queue.filter((_entry, index) => results[index] === "missing"),
            unknown: queue.filter((_entry, index) => results[index] === "unknown"),
        };
    }
}
