import {Dialog, openTab} from "siyuan";
import {lvNotify, lvSurfaceStack, withDocLock, lvActivity, lvLaunchpad, lvAi, withLvAiWait, ensureXiaolvDiaryZone, buildXiaolvLifeLogAttrs} from "../libs/lv-notice-kit";
import {attachXiaolvLifeLogIal} from "../journal-actions";
import {logger} from "../logger";
import {mountPlatformDialogCloseHint, mountPlatformDialogTitleWrap, mountPlatformDialogMobileClose} from "../platform-dom";
import {getBridgeSafely} from "../api/ecosystem-bridge-kit";
import {openDocumentOnDesktop} from "../document-actions";
import {normalizeSnippetStack, pushSnippetStackItem, assembleSnippetStackMarkdown, packageSnippetStackForDiaryZone, analyzeSelectionContext} from "../snippet-stack-model";
import {MESSAGE_DEFAULT_MS, BLOCK_ID_RE} from "../constants";
import {type ISpeedSwitchHost} from "./plugin-types";
import {showMessage} from "./runtime-notice";

export interface SnippetStackRuntime extends Omit<ISpeedSwitchHost, "bindEditorSelectionObserver" | "fetchGleanActiveFoldTree" | "executeKeepRoaming" | "executeTaskHorizonToday"> {}
export class SnippetStackRuntime {
    public getSnippetStack(): any {
        return normalizeSnippetStack(this.getSettings().snippetStack);
    }

    public saveSnippetStack(stack: any): void {
        const normalized = normalizeSnippetStack(stack);
        this.updateSettings({snippetStack: normalized});
        if (typeof lvActivity !== "undefined" && Array.isArray(normalized?.items) && normalized.items.length > 0) {
            const firstTitle = normalized.items[0]?.title || "原子切片";
            lvActivity.record({ source: "雷切", category: "note", title: `保存切片集合「${firstTitle}」` });
        }
    }

    public async refineSnippetWithAi(item: any): Promise<{key: string; action: string} | string> {
        return this.runRefineSnippetWithAi(item);
    }

    public async runRefineSnippetWithAi(item: any, externalSignal?: AbortSignal, inlineWait = false): Promise<{key: string; action: string} | string> {
        const text = item?.rawFragment || item?.title || "";
        if (!text.trim()) {
            showMessage("切片内容为空，无法进行 AI 精炼", 2500, "info");
            return "";
        }
        try {
            const invokeChat = (signal: AbortSignal) => lvAi.chat({
                source: "雷切",
                signal,
                messages: [
                    {
                        role: "system",
                        content: "你是一个深度知识提炼专家。请将用户给出的笔记分片精炼为两部分：1. 核心要点；2. 行动建议。请以清晰凝练的 Markdown 格式输出。",
                    },
                    {
                        role: "user",
                        content: `请精炼以下切片：\n\n${text}`,
                    },
                ],
            });
            const res = inlineWait && externalSignal
                ? await invokeChat(externalSignal)
                : await withLvAiWait({
                    scenario: "transform",
                    title: `AI 精炼 · ${item?.title || "原子切片"}`,
                    subtitle: "正在提炼核心要点与行动建议",
                    cancelLabel: "⏹ 取消精炼",
                    signal: externalSignal,
                }, invokeChat);
            const content = typeof res?.content === "string" ? res.content.trim() : "";
            if (!content) {
                showMessage("AI 未返回有效精炼结果，请检查 AI 配置", 3000, "error");
                return "";
            }
            showMessage("AI 精炼完成！", 2500, "info");
            if (typeof lvActivity !== "undefined") {
                lvActivity.record({ source: "雷切", category: "note", title: `AI 精炼切片「${item?.title || "原子切片"}」` });
            }
            return content;
        } catch (error: any) {
            if (externalSignal?.aborted || error?.name === "AbortError") {
                showMessage("已取消 AI 精炼", 2000, "info");
                return "";
            }
            const errMsg = error?.message || "AI 精炼请求失败";
            logger.warn("refineSnippetWithAi failed", error);
            showMessage(errMsg, 3500, "error");
            return "";
        }
    }

    public async synthesizeSnippetsWithAi(items: any[]): Promise<{ok: boolean; message: string; title: string; markdown: string}> {
        return this.runSynthesizeSnippetsWithAi(items);
    }

    public async runSynthesizeSnippetsWithAi(items: any[], externalSignal?: AbortSignal, inlineWait = false): Promise<{ok: boolean; message: string; title: string; markdown: string}> {
        if (!Array.isArray(items) || items.length === 0) {
            showMessage("暂存栈为空，无法编织", 2500, "info");
            return {ok: false, message: "暂存栈为空", title: "", markdown: ""};
        }
        try {
            const joined = items.map((it, idx) => `### 切片 ${idx + 1}：${it.title || "无标题"}\n${it.rawFragment || it.keyFragment || ""}`).join("\n\n");
            const invokeChat = (signal: AbortSignal) => lvAi.chat({
                source: "雷切",
                signal,
                messages: [
                    {
                        role: "system",
                        content: "你是一个严谨的研究员与知识架构师。请将用户提供的多段零散切片笔记融会贯通，整合成一篇逻辑严整、行文流畅、具备深刻洞见的专题笔记。结构包含：引言背景、核心论述、知识互联、行动建议与结论。",
                    },
                    {
                        role: "user",
                        content: `请将以下切片笔记进行智能编织与综合论述：\n\n${joined}`,
                    },
                ],
            });
            const res = inlineWait && externalSignal
                ? await invokeChat(externalSignal)
                : await withLvAiWait({
                    scenario: "general",
                    title: "AI 智能编织专题笔记",
                    subtitle: `正在融合 ${items.length} 段原子切片并提炼洞察`,
                    cancelLabel: "⏹ 取消编织",
                    signal: externalSignal,
                }, invokeChat);
            const synthesizedMarkdown = res.content || "";
            // 本地日历日键：toISOString 在 UTC+8 的 00:00~08:00 会回退到昨天，专题标题挂错日期
            const weaveNow = new Date();
            const weaveDayKey = `${weaveNow.getFullYear()}-${String(weaveNow.getMonth() + 1).padStart(2, "0")}-${String(weaveNow.getDate()).padStart(2, "0")}`;
            const title = `AI编织专题-${weaveDayKey}`;
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                try {
                    await navigator.clipboard.writeText(synthesizedMarkdown);
                } catch (_) {}
            }
            showMessage("AI 专题笔记编织完成并已复制到剪贴板！", 3000, "info");
            if (typeof lvActivity !== "undefined") {
                lvActivity.record({ source: "雷切", category: "note", title: `AI 智能编织专题笔记「${title}」` });
            }
            return {ok: true, message: `已成功编织「${title}」并复制`, title, markdown: synthesizedMarkdown};
        } catch (error: any) {
            if (externalSignal?.aborted || error?.name === "AbortError") {
                showMessage("已取消 AI 智能编织", 2000, "info");
                return {ok: false, message: "已取消 AI 智能编织", title: "", markdown: ""};
            }
            const errMsg = error?.message || "AI 编织请求失败";
            logger.warn("synthesizeSnippetsWithAi failed", error);
            showMessage(errMsg, 3500, "error");
            return {ok: false, message: errMsg, title: "", markdown: ""};
        }
    }

    public searchOmniSlices(keyword: string): any[] {
        const kw = (keyword || "").trim().toLowerCase();
        if (!kw) return [];
        const results: any[] = [];

        // 1. 切片暂存实体
        const stack = this.getSnippetStack();
        const items = stack?.items || [];
        const matched = items.filter((it: any) => {
            const title = (it.title || "").toLowerCase();
            const raw = (it.rawFragment || "").toLowerCase();
            const key = (it.keyFragment || "").toLowerCase();
            const action = (it.actionFragment || "").toLowerCase();
            return title.includes(kw) || raw.includes(kw) || key.includes(kw) || action.includes(kw);
        });

        matched.forEach((it: any) => {
            results.push({
                id: `slice-${it.id}`,
                source: "雷切",
                category: "切片暂存",
                title: it.title || "原子切片",
                snippet: (it.keyFragment || it.rawFragment || "").slice(0, 100),
                badge: it.pinned ? "已锁定" : "暂存",
                linkBlockId: it.sourceBlockId || undefined,
                onClick: async () => {
                    if (this.isMobile) {
                        this.openSnippetStackDialog();
                    } else {
                        this.updateSettings({columns: 2});
                        this.openSnippetStackDialog();
                    }
                    lvLaunchpad.haptic(10);
                    showMessage(`已定位切片「${it.title || "原子切片"}」`, 2000, "info");
                },
            });
        });

        // 2. 手机端高频实体：收藏文档
        const favorites = this.getFavorites() || [];
        favorites.filter((fav) => (fav.title || "").toLowerCase().includes(kw)).slice(0, 8).forEach((fav) => {
            results.push({
                id: `fav-${fav.key}`,
                source: "雷切",
                category: "收藏文档",
                title: fav.title || "收藏文档",
                snippet: fav.group ? `分组: ${fav.group}` : "未分组收藏",
                badge: "收藏",
                linkBlockId: fav.rootId,
                onClick: async () => {
                    if (this.isMobile) {
                        void this.mobileOpenDoc(fav.rootId);
                    } else {
                        void this.jumpToFavorite(fav, () => undefined);
                    }
                    lvLaunchpad.haptic(10);
                },
            });
        });

        return results;
    }

    private bindEditorSelectionObserver(): void {
        if (typeof document === "undefined" || this.disposeSelectionObserver) return;
        let timer = 0;
        const onSelectionChange = () => {
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                timer = 0;
                if (this.isUnloading || typeof window === "undefined") return;
                const selection = window.getSelection ? window.getSelection() : null;
                const anchor = selection?.anchorNode || null;
                const anchorEl = anchor
                    ? (anchor instanceof HTMLElement ? anchor : anchor.parentElement)
                    : null;
                const inPluginUi = Boolean(anchorEl?.closest(".sw-platform-dialog, .sw__floating-ball-portal, .speed-switch, .sw-home"));
                if (inPluginUi) return;
                const wysiwyg = anchorEl?.closest(".protyle-wysiwyg") as HTMLElement | null;
                const text = selection ? selection.toString().trim() : "";
                if (wysiwyg && text) {
                    const blockEl = anchorEl?.closest("[data-node-id]") as HTMLElement | null;
                    const protyleRoot = wysiwyg.closest(".protyle") as HTMLElement | null;
                    const titleEl = protyleRoot?.querySelector(".protyle-title") || document.querySelector(".layout__wnd--active .protyle-title");
                    const editor = this.resolveActiveHostEditor() as any;
                    const rootId = String(
                        protyleRoot?.querySelector<HTMLElement>(".protyle-title[data-node-id]")?.dataset.nodeId
                        || editor?.protyle?.block?.rootID
                        || editor?.protyle?.block?.parentID
                        || "",
                    );
                    const blockId = String(blockEl?.dataset.nodeId || editor?.protyle?.block?.id || "");
                    this.lastEditorSelection = {
                        text,
                        blockId,
                        rootId,
                        docTitle: titleEl?.textContent?.trim() || "",
                        capturedAt: Date.now(),
                    };
                } else if (wysiwyg && !text) {
                    this.lastEditorSelection = null;
                }
            }, 60);
        };
        document.addEventListener("selectionchange", onSelectionChange);
        this.disposeSelectionObserver = () => {
            if (timer) window.clearTimeout(timer);
            document.removeEventListener("selectionchange", onSelectionChange);
        };
        this.disposer.registerFn(() => {
            if (this.disposeSelectionObserver) {
                this.disposeSelectionObserver();
                this.disposeSelectionObserver = null;
            }
        });
    }

    public resolveActiveSelectionContext(): any {
        let text = "";
        let blockId = "";
        let rootId = "";
        let docTitle = "";

        if (typeof window !== "undefined") {
            const selection = window.getSelection ? window.getSelection() : null;
            const anchor = selection?.anchorNode || null;
            const anchorEl = anchor
                ? (anchor instanceof HTMLElement ? anchor : anchor.parentElement)
                : null;
            const inPluginUi = Boolean(anchorEl?.closest(".sw-platform-dialog, .sw__floating-ball-portal, .speed-switch, .sw-home"));
            if (!inPluginUi && selection && selection.toString) {
                text = selection.toString().trim();
                if (text && anchorEl) {
                    const nodeBlock = anchorEl.closest("[data-node-id]") as HTMLElement | null;
                    if (nodeBlock?.dataset.nodeId) blockId = nodeBlock.dataset.nodeId;
                }
            }
            if (typeof document !== "undefined") {
                const activeWnd = document.querySelector(".layout__wnd--active");
                const selectedBlock = activeWnd?.querySelector(".protyle-wysiwyg--select") || document.querySelector(".protyle-wysiwyg--select");
                if (selectedBlock instanceof HTMLElement) {
                    if (!blockId) {
                        blockId = selectedBlock.dataset.nodeId || selectedBlock.dataset.blockId || "";
                    }
                    if (!text) {
                        text = selectedBlock.textContent?.trim() || "";
                    }
                }
                const titleEl = activeWnd?.querySelector(".protyle-title") || document.querySelector(".protyle-title");
                docTitle = titleEl?.textContent?.trim() || "";
            }
        }

        const editor = this.resolveActiveHostEditor() as any;
        if (editor?.protyle?.block) {
            rootId = String(editor.protyle.block.rootID || editor.protyle.block.parentID || "");
            if (!blockId && editor.protyle.block.id) {
                blockId = String(editor.protyle.block.id);
            }
        }

        // 若焦点已切入悬浮球或切换器弹窗导致实时选区为空，回退使用 60s 内捕获的思源编辑区选区快照
        if (!text && this.lastEditorSelection && Date.now() - this.lastEditorSelection.capturedAt <= 60000) {
            text = this.lastEditorSelection.text;
            blockId = blockId || this.lastEditorSelection.blockId;
            rootId = rootId || this.lastEditorSelection.rootId;
            docTitle = docTitle || this.lastEditorSelection.docTitle;
        }

        return analyzeSelectionContext({
            text,
            blockId,
            rootId,
            docTitle,
        });
    }

    private fetchGleanActiveFoldTree(): unknown {
        if (typeof window === "undefined") return null;
        const gleanApi = (window as any).siyuanGlean || (window as any).lvGlean;
        if (gleanApi && typeof gleanApi.getActiveFoldTree === "function") {
            try {
                return gleanApi.getActiveFoldTree();
            } catch (_) {
                return null;
            }
        }
        return null;
    }

    public captureSelectionToStack(fallback?: {text?: string; blockId?: string; rootId?: string; title?: string}): {added: any; stack: any} | null {
        const selectionCtx = this.resolveActiveSelectionContext();
        const rawText = (selectionCtx && selectionCtx.kind !== "none" && selectionCtx.text)
            ? selectionCtx.text
            : (typeof fallback?.text === "string" ? fallback.text.trim() : "");
        if (!rawText) return null;
        const currentStack = this.getSnippetStack();
        const res = pushSnippetStackItem(currentStack, {
            rawFragment: rawText,
            sourceBlockId: selectionCtx?.sourceBlockId || fallback?.blockId || fallback?.rootId || "",
            sourceDocId: selectionCtx?.sourceDocId || fallback?.rootId || "",
            sourceTitle: selectionCtx?.sourceTitle || fallback?.title || "",
        });
        if (res.added) {
            this.saveSnippetStack(res.stack);
        }
        return res;
    }

    public async executeStackCapture(): Promise<void> {
        const res = this.captureSelectionToStack();
        if (!res || !res.added) {
            showMessage(this.i18n.snippetStackCaptureEmpty);
            return;
        }
        showMessage((this.i18n.snippetStackCaptured).replace("{x}", res.added.title));
    }

    public async executeStackCaptureFromContext(fallback?: {text?: string; blockId?: string; rootId?: string; title?: string}): Promise<void> {
        const res = this.captureSelectionToStack(fallback);
        if (!res || !res.added) {
            showMessage(this.i18n.snippetStackCaptureEmpty);
            return;
        }
        showMessage((this.i18n.snippetStackCaptured).replace("{x}", res.added.title));
    }

    public async openSnippetStackBlock(blockId: string, item?: Record<string, unknown>, closeBeforeOpen?: () => void): Promise<boolean> {
        const safeBlock = typeof blockId === "string" ? blockId.trim() : "";
        const rootId = typeof item?.sourceDocId === "string" && item.sourceDocId.trim()
            ? item.sourceDocId.trim()
            : safeBlock;
        if (!rootId) return false;
        if (typeof closeBeforeOpen === "function") closeBeforeOpen();
        if (this.isMobile) {
            return Boolean(await this.mobileOpenDoc(rootId));
        }
        return openDocumentOnDesktop({
            rootId,
            hitId: safeBlock && safeBlock !== rootId ? safeBlock : null,
            app: this.app,
            openTab,
            logger,
        });
    }

    public openSnippetStackDialog(): void {
        if (this.isUnloading) return;
        this.snippetStackDialog?.destroy();
        this.snippetStackDialog = null;
        const releaseFab = this.suspendFABForDialog();
        const holder: {dialog: Dialog | null; disposeView: (() => void) | null} = {dialog: null, disposeView: null};
        let unpopStack: (() => void) | null = null;
        const dialog = new Dialog({
            title: this.i18n.snippetStackTitle || "连续切片暂存栈",
            content: '<div class="b3-dialog__content"><div class="sw-snippet-stack-dialog-host"></div></div>',
            width: this.isMobile ? "94vw" : "min(620px, 92vw)",
            height: this.isMobile ? "78vh" : "min(640px, 84vh)",
            destroyCallback: () => {
                unpopStack?.();
                unpopStack = null;
                holder.disposeView?.();
                holder.disposeView = null;
                if (holder.dialog) this.activeDialogs.delete(holder.dialog);
                if (this.snippetStackDialog === holder.dialog) this.snippetStackDialog = null;
                releaseFab();
            },
        });
        unpopStack = lvSurfaceStack.push({
            id: "raikiri-snippet-stack",
            type: "drawer",
            dismiss: () => {
                dialog.destroy();
                return true;
            },
        });
        holder.dialog = dialog;
        this.snippetStackDialog = dialog;
        this.activeDialogs.add(dialog);
        dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("sw-dialog--snippet-stack", "sw-platform-dialog");
        mountPlatformDialogTitleWrap(dialog.element, this.i18n.snippetStackTitle || "连续切片暂存栈", "", "iconCut");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "to close");
        mountPlatformDialogMobileClose(dialog.element, () => dialog.destroy());

        // 手机端切片手势深化：切片详情/暂存栈弹层顶栏下滑 80px 关闭（对齐全生态手势约定，防输入误关）
        let stackTouchStartY = 0;
        let stackTouchStartX = 0;
        let validStackTouch = false;
        dialog.element.addEventListener("touchstart", (ev: TouchEvent) => {
            const target = ev.target as HTMLElement | null;
            if (target?.closest("input, textarea, select, [contenteditable='true'], .b3-text-field")) {
                validStackTouch = false;
                return;
            }
            stackTouchStartY = ev.touches[0]?.clientY ?? 0;
            stackTouchStartX = ev.touches[0]?.clientX ?? 0;
            validStackTouch = stackTouchStartY < 120 || Boolean(target?.closest(".b3-dialog__header, .lv-dialog-title-wrap"));
        }, {passive: true});
        dialog.element.addEventListener("touchend", (ev: TouchEvent) => {
            if (!validStackTouch) return;
            const diffY = (ev.changedTouches[0]?.clientY ?? 0) - stackTouchStartY;
            const diffX = (ev.changedTouches[0]?.clientX ?? 0) - stackTouchStartX;
            if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX) * 2) {
                lvLaunchpad.haptic(10);
                dialog.destroy();
            }
            validStackTouch = false;
        }, {passive: true});

        const host = dialog.element.querySelector<HTMLElement>(".sw-snippet-stack-dialog-host");
        if (!host) {
            dialog.destroy();
            return;
        }
        this.loadSnippetStudioModule(({mountSnippetStackView}) => {
            if (!dialog.element.isConnected || this.snippetStackDialog !== dialog) return;
            const handle = mountSnippetStackView(host, {
                surface: "dialog",
                labels: {
                    title: this.i18n.snippetStackTitle,
                    captureSelection: this.i18n.snippetStackCaptureSelection,
                    foldImportToggle: this.i18n.snippetStackFoldToggle,
                    clearUnpinned: this.i18n.snippetStackClearUnpinned,
                    clearConfirmPrompt: this.i18n.snippetStackClearConfirm || "确定清空未锁定暂存切片（共 {count} 条）吗？",
                    undoAction: this.i18n.snippetStackUndo,
                    undoRestoredReceipt: this.i18n.snippetStackUndoRestored,
                    pinnedSuffix: this.i18n.snippetStackPinnedSuffix,
                    tabRaw: this.i18n.snippetStackTabRaw,
                    tabKey: this.i18n.snippetStackTabKey,
                    tabAction: this.i18n.snippetStackTabAction,
                    emptyHint: this.i18n.snippetStackEmptyHint,
                    assembleJournal: this.i18n.snippetStackAssembleJournal,
                    assembleCurrent: this.i18n.snippetStackAssembleCurrent,
                    assembleNewDoc: this.i18n.snippetStackAssembleNewDoc,
                    assembleCopy: this.i18n.snippetStackAssembleCopy,
                    operationFailed: this.i18n.snippetStackAssembleFailed,
                },
                load: () => this.getSnippetStack(),
                save: (next: unknown) => this.saveSnippetStack(next),
                onCaptureSelection: () => this.captureSelectionToStack(),
                onAssemble: (target: "journal" | "current-doc" | "new-doc" | "copy", _assembled: unknown, _state: unknown, assembleOpts?: Record<string, unknown>) =>
                    this.assembleSnippetStackToDoc(target, assembleOpts),
                onOpenBlock: (blockId: string, item?: Record<string, unknown>) =>
                    this.openSnippetStackBlock(blockId, item, () => dialog.destroy()),
                onFetchGleanFoldTree: () => this.fetchGleanActiveFoldTree(),
                onAiRefine: (item: any, ctx?: {signal?: AbortSignal; inlineWait?: boolean}) =>
                    this.runRefineSnippetWithAi(item, ctx?.signal, Boolean(ctx?.inlineWait)),
                onAiSynthesize: (items: any[], ctx?: {signal?: AbortSignal; inlineWait?: boolean}) =>
                    this.runSynthesizeSnippetsWithAi(items, ctx?.signal, Boolean(ctx?.inlineWait)),
                haptic: (ms: number) => lvLaunchpad.haptic(ms),
            });
            holder.disposeView = () => handle.dispose();
        }).catch((error) => {
            logger.warn("load snippet stack dialog chunk fail", error);
            if (dialog.element.isConnected) dialog.destroy();
            showMessage(this.i18n.snippetUnavailable || "组件加载失败", MESSAGE_DEFAULT_MS, "error");
        });
    }

    public async assembleSnippetStackToDoc(target: "journal" | "current-doc" | "new-doc" | "copy", options: any = {}): Promise<{ok: boolean; message: string}> {
        try {
            const stack = this.getSnippetStack();
            if (!stack.items || stack.items.length === 0) {
                return {ok: false, message: this.i18n.snippetStackEmpty};
            }
            const assembleOpts = {
                ...(options && typeof options === "object" ? options : {}),
                ...(target === "journal" ? { diaryZone: true } : {}),
            };
            const assembled = assembleSnippetStackMarkdown(stack, assembleOpts);
            if (!assembled.markdown) {
                return {ok: false, message: this.i18n.snippetStackEmpty || "暂存栈为空"};
            }

            if (target === "copy") {
                if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
                    try {
                        await navigator.clipboard.writeText(assembled.markdown);
                        return {ok: true, message: (this.i18n.snippetStackAssembledCopy).replace("{count}", String(assembled.itemCount))};
                    } catch (_) {
                        return {ok: false, message: this.i18n.copyFailed};
                    }
                }
                return {ok: false, message: this.i18n.copyFailed};
            }

            if (target === "current-doc") {
                const capture = this.resolveActiveCaptureRoot();
                const fallbackRootId = capture?.rootId || this.lastEditorSelection?.rootId || "";
                if (fallbackRootId && BLOCK_ID_RE.test(fallbackRootId)) {
                    return await this.bridge.withDocLock(fallbackRootId, async () => {
                        const appendJson = await this.fetchKernelJson("/api/block/appendBlock", {
                            parentID: fallbackRootId,
                            data: assembled.markdown,
                            dataType: "markdown",
                        });
                        if (appendJson?.code === 0) {
                            const title = capture?.title || "当前文档";
                            if (typeof lvActivity !== "undefined") {
                                lvActivity.record({ source: "雷切", category: "note", title: `保存切片集合「${title}」`, linkBlockId: fallbackRootId });
                            }
                            return {ok: true, message: (this.i18n.snippetStackAssembledInsert).replace("{count}", String(assembled.itemCount))};
                        }
                        return {ok: false, message: this.i18n.snippetStackAssembleFailed || "追加写入失败"};
                    });
                }
                const editor = this.resolveActiveHostEditor();
                if (editor && typeof editor.protyle?.insert === "function") {
                    editor.protyle.insert(assembled.markdown, true, true);
                    const title = capture?.title || "当前文档";
                    if (typeof lvActivity !== "undefined") {
                        lvActivity.record({ source: "雷切", category: "note", title: `保存切片集合「${title}」`, linkBlockId: fallbackRootId });
                    }
                    return {ok: true, message: (this.i18n.snippetStackAssembledInsert).replace("{count}", String(assembled.itemCount))};
                }
                return {ok: false, message: this.i18n.snippetStackNoEditor || "未找到活跃编辑器"};
            }

            if (target === "journal") {
                const openNbs = await this.loadNotebooks();
                const isExcluded = (name: string) => /管家|人脉|题库|闪卡|exam|contacts|home|checkin/i.test(name || "");
                const preferredNb =
                    openNbs.find((n: any) => /^(日记|Daily|Journal|我的笔记|默认)/i.test(n.name || "")) ||
                    openNbs.find((n: any) => /日记|daily\s*note|journal/i.test(n.name || "") && !isExcluded(n.name)) ||
                    openNbs.find((n: any) => !isExcluded(n.name)) ||
                    openNbs[0];
                const notebook = this.getSettings().journalNotebook || preferredNb?.id;
                if (!notebook) {
                    return {ok: false, message: this.i18n.journalNotConfigured || "未配置默认日记本"};
                }
                const docId = await this.ensureTodayJournal(notebook);
                if (!docId) {
                    return {ok: false, message: this.i18n.quickCaptureFailed || "未能定位今日日记"};
                }
                return await this.bridge.withDocLock(docId, async () => {
                    const zone = await ensureXiaolvDiaryZone(docId);
                    const lifeLogAttrs = buildXiaolvLifeLogAttrs({
                        type: "切片汇编",
                        source: "雷切",
                        module: "snippet-stack",
                        body: assembled.markdown.slice(0, 120),
                    });
                    const packagedDiaryBody = packageSnippetStackForDiaryZone(assembled);
                    const packagedDiaryMd = attachXiaolvLifeLogIal(packagedDiaryBody, lifeLogAttrs);
                    const appendJson = await this.fetchKernelJson("/api/block/insertBlock", {
                        previousID: zone.anchorBlockId,
                        parentID: docId,
                        dataType: "markdown",
                        data: packagedDiaryMd,
                    });
                    const ok = appendJson?.code === 0;
                    if (ok && typeof lvActivity !== "undefined") {
                        lvActivity.record({ source: "雷切", category: "note", title: `保存切片集合「今日日记」`, linkBlockId: docId });
                    }
                    return ok
                        ? {ok: true, message: (this.i18n.snippetStackAssembledJournal).replace("{count}", String(assembled.itemCount))}
                        : {ok: false, message: this.i18n.quickCaptureFailed || "写入今日日记失败"};
                });
            }

            if (target === "new-doc") {
                const openNbs = await this.loadNotebooks();
                const hubNb = openNbs.find(
                    (n: any) => /^(🐴\s*)?小驴(生态|空间|笔记本)/.test(n.name?.trim() || "")
                );
                const notebook = this.getSettings().journalNotebook || hubNb?.id || openNbs[0]?.id;
                if (!notebook) {
                    return {ok: false, message: this.i18n.snippetStackAssembleFailed || "未找到可用笔记本"};
                }
                const now = new Date();
                const pad = (n: number) => String(n).padStart(2, "0");
                const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                const title = options?.title || `${this.i18n.snippetStackTitle || "切片组装"}-${stamp}`;
                const targetPath = notebook === hubNb?.id ? `/08-小驴雷切/切片组装室/${title}` : `/${title}`;
                const res = await this.fetchKernelJson("/api/filetree/createDocWithMd", {
                    notebook,
                    path: targetPath,
                    markdown: assembled.markdown,
                });
                if (res && res.code === 0 && res.data) {
                    const docId = String(res.data);
                    if (typeof lvActivity !== "undefined") {
                        lvActivity.record({ source: "雷切", category: "note", title: `保存切片集合「${title}」`, linkBlockId: docId });
                    }
                    if (this.isMobile) {
                        void this.mobileOpenDoc(docId);
                    } else {
                        void openDocumentOnDesktop({rootId: docId, app: this.app, openTab, logger});
                    }
                    return {ok: true, message: (this.i18n.snippetStackAssembledNewDoc).replace("{title}", title)};
                }
                return {ok: false, message: this.i18n.snippetStackAssembleFailed || "创建新文档失败"};
            }

            return {ok: false, message: this.i18n.snippetStackAssembleFailed || "未知组装目标"};
        } catch (error) {
            logger.warn("assembleSnippetStackToDoc fail", error);
            return {ok: false, message: this.i18n.snippetStackAssembleFailed};
        }
    }

    public openActivityStreamDialog(): void {
        const records = typeof lvActivity !== "undefined" ? lvActivity.getTodayRecords() : [];
        const markdown = typeof lvActivity !== "undefined" ? lvActivity.formatAsMarkdown() : "";
        let handleEscape: ((event: KeyboardEvent) => void) | null = null;
        const releaseFab = this.suspendFABForDialog();
        const esc = (v: unknown) => this.escapeAttr(String(v ?? ""));
        const title = this.i18n.homeActivityStreamTitle || "全生态今日知识沉淀流";
        const titleText = esc(title);
        const copyLabel = esc(this.i18n.snippetStackAssembleCopy || "复制今日汇编");
        const dialog = new Dialog({
            title,
            content: `
                <div class="sw-activity-stream-dialog b3-dialog__content">
                    <div class="sw-activity-stream-meta">
                        <span class="sw-activity-stream-count">今日共沉淀 <strong>${records.length}</strong> 条生态记录</span>
                        <button type="button" class="b3-button b3-button--primary sw-activity-stream-copy-btn">
                            ${copyLabel}
                        </button>
                    </div>
                    <div class="sw-activity-stream-list">
                        ${records.length === 0 ? `<div class="sw-activity-stream-empty">今日暂无生态沉淀</div>` : records.map((r: any) => {
                            const safeTime = esc(r?.timeStr);
                            const safeSource = esc(r?.source);
                            const safeTitle = esc(r?.title);
                            const rawLinkId = typeof r?.linkBlockId === "string" ? r.linkBlockId.trim() : "";
                            const safeLinkId = BLOCK_ID_RE.test(rawLinkId) ? esc(rawLinkId) : "";
                            return `
                            <div class="sw-activity-stream-item">
                                <span class="sw-activity-stream-time">${safeTime}</span>
                                <span class="sw-activity-stream-source">${safeSource}</span>
                                <span class="sw-activity-stream-title">${safeTitle}</span>
                                ${safeLinkId ? `<a href="siyuan://blocks/${safeLinkId}" class="b3-link sw-activity-stream-link">定位</a>` : ""}
                            </div>
                        `;
                        }).join("")}
                    </div>
                </div>
            `,
            width: this.isMobile ? "92vw" : "min(540px, 90vw)",
            destroyCallback: () => {
                this.activeDialogs.delete(dialog);
                releaseFab();
                if (handleEscape) {
                    window.removeEventListener("keydown", handleEscape, true);
                    handleEscape = null;
                }
            },
        });
        this.activeDialogs.add(dialog);
        dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("sw-platform-dialog");
        mountPlatformDialogTitleWrap(dialog.element, titleText, "", "iconSparkles");
        mountPlatformDialogCloseHint(dialog.element, this.i18n.platformCloseHint || "退出");
        mountPlatformDialogMobileClose(dialog.element, () => dialog.destroy());

        handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            dialog.destroy();
        };
        window.addEventListener("keydown", handleEscape, true);

        dialog.element.querySelector(".sw-activity-stream-copy-btn")?.addEventListener("click", async (e) => {
            try {
                await navigator.clipboard.writeText(markdown);
                lvNotify.inline(e.currentTarget as HTMLElement, "已复制汇编");
                showMessage("今日生态汇编 Markdown 已复制到剪贴板");
            } catch (_) {
                showMessage(this.i18n.copyFailed || "复制失败，请检查剪贴板权限", 3000, "error");
            }
        });
    }

    // T-7394: 小驴拾遗「继续漫游 (Keep Roaming)」生态极速切入动作（ADR 0291）
    private async executeKeepRoaming(onDestroy?: () => void): Promise<boolean> {
        try {
            const bridge = (getBridgeSafely("glean") || (window as any).siyuanGlean || (window as any).lvGlean) as any;
            if (!bridge) {
                showMessage(this.i18n.keepRoamingNoPlugin);
                return false;
            }
            let targetClip: any = null;
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 800));
            const fetchPromise = (async () => {
                if (typeof bridge.getNextRoamingClip === "function") {
                    try { return await bridge.getNextRoamingClip(); } catch (_) { return null; }
                }
                if (typeof bridge.listClips === "function") {
                    try {
                        const reading = await bridge.listClips({status: "reading", limit: 1});
                        if (Array.isArray(reading) && reading.length > 0) return reading[0];
                        const later = await bridge.listClips({status: "later", limit: 1});
                        if (Array.isArray(later) && later.length > 0) return later[0];
                    } catch (_) { return null; }
                }
                return null;
            })();
            targetClip = await Promise.race([fetchPromise, timeoutPromise]);
            if (!targetClip || !targetClip.id) {
                showMessage(this.i18n.keepRoamingNoClips);
                return false;
            }
            if (typeof onDestroy === "function") onDestroy();
            if (this.isMobile) {
                void this.mobileOpenDoc(targetClip.id);
            } else {
                void this.bridge.openTab({app: this.app, doc: {id: targetClip.id}});
            }
            const title = targetClip.title || targetClip.id;
            const tpl = this.i18n.keepRoamingSuccess || "已切入漫游阅读：{title}";
            showMessage(tpl.replace("{title}", title));
            return true;
        } catch (err) {
            logger.warn("executeKeepRoaming failed", err);
            return false;
        }
    }

    private async executeTaskHorizonToday(onDestroy?: () => void): Promise<boolean> {
        try {
            const bridge: any = getBridgeSafely("taskHorizon") || (typeof window !== "undefined" ? (window as any).TaskHorizon : null);
            if (!bridge) {
                showMessage(this.i18n.taskHorizonNoPlugin);
                return false;
            }
            if (typeof bridge.openView === "function") {
                if (typeof onDestroy === "function") onDestroy();
                await bridge.openView("checklist");
                return true;
            }
            if (typeof bridge.getTodayTasks === "function") {
                const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 800));
                const tasks = await Promise.race([bridge.getTodayTasks().catch((): any[] => []), timeoutPromise]);
                if (Array.isArray(tasks) && tasks.length > 0) {
                    const firstTask = tasks[0];
                    const blockId = String(firstTask.blockId || firstTask.id || "");
                    const taskRootId = String(firstTask.rootId || firstTask.docId || "");
                    if (blockId && BLOCK_ID_RE.test(blockId)) {
                        if (typeof onDestroy === "function") onDestroy();
                        if (this.isMobile) {
                            void this.mobileOpenDoc(taskRootId || blockId);
                        } else {
                            void this.bridge.openTab({app: this.app, doc: {id: blockId, action: ["cb-get-scroll"]}});
                        }
                        showMessage((this.i18n.taskHorizonOpened).replace("{title}", firstTask.title || "任务"));
                        return true;
                    }
                }
                showMessage(this.i18n.taskHorizonNoTasks || "今日待办清单已全部完成");
                return true;
            }
            return false;
        } catch (err) {
            logger.warn("executeTaskHorizonToday failed", err);
            return false;
        }
    }

    /**
     * 选区上下文智能置顶生态动作执行器：
     * url -> 🔖 收录拾遗；code -> 🔤 存入常用；concept -> 🎴 生成闪卡；general -> ✂️ 切入暂存栈。
     * 若目标插件未安装或调用失败，自动静默降级为复制选区到剪贴板 + 微胶囊提示，绝不抛错。
     */
    public async executeContextPromotionAction(actionId: string, textOverride?: string): Promise<boolean> {
        const selectionContext = this.resolveActiveSelectionContext();
        const text = (textOverride || selectionContext?.text || this.lastEditorSelection?.text || "").trim();
        const copyFallback = async (reasonNote: string) => {
            if (text && typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
                try {
                    await navigator.clipboard.writeText(text);
                } catch (_) {}
            }
            lvLaunchpad.haptic(8);
            showMessage(reasonNote ? `${reasonNote}，已复制选区到剪贴板` : "已复制选区到剪贴板", 3000, "info");
            return true;
        };

        if (!text) {
            showMessage("未检测到有效划选文本", 2000, "info");
            return false;
        }

        try {
            if (actionId === "glean-clip") {
                const bridge = (getBridgeSafely("glean") || (window as any).siyuanGlean || (window as any).lvGlean) as any;
                if (bridge && (typeof bridge.addClip === "function" || typeof bridge.createClip === "function" || typeof bridge.saveClip === "function")) {
                    const fn = bridge.addClip || bridge.createClip || bridge.saveClip;
                    await Promise.resolve(fn.call(bridge, { url: text, title: text.slice(0, 60), source: "雷切划选" }));
                    lvLaunchpad.haptic(8);
                    showMessage("已收录至小驴拾遗 🔖", 2000, "info");
                    return true;
                }
                return await copyFallback("未检测到小驴拾遗插件");
            }

            if (actionId === "common-snippet") {
                const bridge = (getBridgeSafely("common") || (window as any).xiaolvCommon || (window as any).lvCommon) as any;
                if (bridge && (typeof bridge.addSnippet === "function" || typeof bridge.create === "function" || typeof bridge.save === "function")) {
                    const fn = bridge.addSnippet || bridge.create || bridge.save;
                    await Promise.resolve(fn.call(bridge, { title: text.split("\n")[0].slice(0, 40) || "常用代码", content: text, category: "代码" }));
                    lvLaunchpad.haptic(8);
                    showMessage("已存入小驴常用 🔤", 2000, "info");
                    return true;
                }
                return await copyFallback("未检测到小驴常用插件");
            }

            if (actionId === "cards-create") {
                const bridge = (getBridgeSafely("cards") || (window as any).xiaolvCards || (window as any).lvCards) as any;
                if (bridge && (typeof bridge.createCard === "function" || typeof bridge.addCard === "function" || typeof bridge.openReview === "function")) {
                    const fn = bridge.createCard || bridge.addCard;
                    if (fn) {
                        await Promise.resolve(fn.call(bridge, { content: text, type: "concept" }));
                    } else if (typeof bridge.openReview === "function") {
                        await Promise.resolve(bridge.openReview({ text }));
                    }
                    lvLaunchpad.haptic(8);
                    showMessage("已生成记忆闪卡 🎴", 2000, "info");
                    return true;
                }
                return await copyFallback("未检测到小驴闪卡插件");
            }

            if (actionId === "stack-capture") {
                await this.executeStackCapture();
                lvLaunchpad.haptic(8);
                return true;
            }
        } catch (error) {
            logger.warn("executeContextPromotionAction bridge call failed, falling back to copy", error);
            return await copyFallback("跨插件协同异常");
        }

        return await copyFallback("");
    }
}
