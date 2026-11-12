"use strict";

const {
    SNIPPET_STACK_MAX,
    SNIPPET_FRAGMENT_TABS,
    normalizeSnippetStack,
    pushSnippetStackItem,
    pushFoldTreeToSnippetStack,
    moveSnippetStackItem,
    toggleSnippetStackPin,
    updateSnippetStackItem,
    switchSnippetStackFragmentTab,
    removeSnippetStackItem,
    clearSnippetStack,
    assembleSnippetStackMarkdown,
    formatBlockRefBacklink,
} = require("./snippet-stack-model.js");

const DEFAULT_STACK_LABELS = Object.freeze({
    title: "连续切片暂存栈",
    captureSelection: "采集选区入栈",
    foldImportToggle: "TextFold 语义切片",
    clearUnpinned: "清空未锁定",
    clearConfirmPrompt: "确定清空未锁定暂存切片（共 {count} 条）吗？",
    undoAction: "撤销",
    tabRaw: "原文分片",
    tabKey: "核心提炼",
    tabAction: "行动项",
    emptyHint: "暂无暂存切片。在文档中选中文本触发悬浮球「原子切片入栈」，或使用上方「TextFold 语义切片」按 5 阶语义树批量派生原子卡片。",
    pinLock: "置顶锁定",
    unpinLock: "取消置顶锁定",
    pinnedSuffix: "锁定",
    moveUp: "上移 (Alt+↑)",
    moveDown: "下移 (Alt+↓)",
    inlineEdit: "行内微调 (F2)",
    removeItem: "移除切片",
    saveEdit: "保存微调",
    cancelEdit: "取消",
    editTitleLabel: "切片标题（Level 5 概念）",
    editFragmentLabel: "当前分片内容",
    editBlockIdLabel: "来源块 ID（可选）",
    foldInputPlaceholder: "粘贴 FoldArticleTree JSON（含 topic/takeaway/key/brief/fullText）或多段原文，一键拆解为带血缘反链的 5 阶原子切片…",
    foldSourceBlockPlaceholder: "默认来源块 ID（如 20261031120000-abc1234，可选）",
    foldGleanIdPlaceholder: "关联拾遗 ID（custom-lv-glean-id，可选）",
    foldConvertBtn: "转换为原子切片入栈",
    foldFromGleanBtn: "从拾遗读取当前语义树",
    modeFull: "全维结构块",
    modeActive: "当前激活分片",
    modeRaw: "仅原文分片",
    modeKey: "仅核心提炼",
    modeAction: "仅行动项",
    assembleJournal: "一键组装推入日报",
    assembleCurrent: "组装插入当前文档",
    assembleNewDoc: "生成结构化新文档",
    assembleCopy: "复制组装块",
    aiRefineBtn: "AI 精炼 (提炼要点与行动项)",
    aiSynthesizeBtn: "AI 智能编织 (专题笔记)",
    shortcutHint: "Alt+↑/↓ 调序 · F2 行内微调 · 自动附带 ((blockId)) 血缘反链",
    fragmentEmpty: "当前分片暂无内容，按 F2 或点击编辑补充",
    ariaGlobalTabs: "全局分片视图切换",
    ariaAssembleMode: "批量组装输出维度",
    ariaItemFragments: "{x} 多维分片",
    openSourceBlockTitle: "点击定位来源块",
    capturedReceipt: "已收入切片「{x}」",
    clearedReceipt: "已清理 {count} 条未锁定切片（可撤销）",
    removedReceipt: "已移除切片「{x}」（可撤销）",
    undoRestoredReceipt: "已撤销删除并恢复切片",
    movedReceipt: "已移动「{x}」至第 {count} 位",
    savedEditReceipt: "已保存「{x}」微调",
    foldEmptyError: "请输入有效的 FoldArticleTree JSON 或原文段落",
    foldNoNodeError: "未识别到可切分的有效语义节点",
    foldConvertedReceipt: "已按 TextFold 5 阶语义树切出 {count} 张原子卡片",
    gleanUnavailableHint: "当前未检测到小驴拾遗活动的 FoldArticleTree，可直接粘贴 JSON 或段落",
    gleanImportedReceipt: "已从拾遗导入 {count} 张 5 阶语义切片卡片",
    gleanEmptyHint: "拾遗语义树暂无可导入节点",
    stackEmptyError: "暂存栈为空，请先采集或切分至少一条片段",
    assembledFallbackReceipt: "已组装 {count} 条片段（含 {backlinks} 处血缘反链）",
    operationFailed: "操作执行失败，请检查编辑器或笔记本状态",
});

function formatStackMessage(template, vars = {}) {
    let out = typeof template === "string" ? template : "";
    for (const [key, val] of Object.entries(vars)) {
        out = out.split(`{${key}}`).join(String(val ?? ""));
    }
    return out;
}

function createSvgIcon(doc, symbolId) {
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    const use = doc.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#${symbolId}`);
    use.setAttribute("xlink:href", `#${symbolId}`);
    svg.appendChild(use);
    return svg;
}

function parseFoldInputToTree(rawInput, defaultBlockId = "", defaultGleanId = "") {
    const trimmed = typeof rawInput === "string" ? rawInput.trim() : "";
    if (!trimmed) return null;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return {gleanId: defaultGleanId, nodes: parsed};
            }
            if (parsed && typeof parsed === "object") {
                return {
                    ...parsed,
                    gleanId: parsed.gleanId || defaultGleanId,
                };
            }
        } catch (_) {
            // 非合法 JSON 时平滑回退为多段文本语义树拆解
        }
    }
    const paragraphs = trimmed
        .split(/\n{2,}/)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
    return {
        gleanId: defaultGleanId,
        nodes: paragraphs.map((para) => ({
            blockId: defaultBlockId,
            fullText: para,
            level: 5,
        })),
    };
}

/**
 * 挂载可复用的「连续切片暂存栈（Snippet Stack）」Bento 视图。
 * 同时供切片实验室（Snippet Studio）与工作台/独立弹窗消费。
 */
function mountSnippetStackView(container, options = {}) {
    if (!container || typeof container.appendChild !== "function") {
        throw new TypeError("mountSnippetStackView: container 必须为有效 DOM 节点");
    }
    const doc = container.ownerDocument || document;
    const rawLabels = options.labels && typeof options.labels === "object" ? options.labels : {};
    const labels = {...DEFAULT_STACK_LABELS};
    for (const [key, val] of Object.entries(rawLabels)) {
        if (typeof val === "string" && val.trim()) labels[key] = val;
    }

    let disposed = false;
    let asyncBusy = false;
    let editingItemId = "";
    let foldPanelOpen = Boolean(options.initialFoldOpen);
    let assembleMode = "full";
    let globalTabFilter = "raw";
    let lastUndoSnapshot = null;

    const readStack = () => {
        try {
            return normalizeSnippetStack(typeof options.load === "function" ? options.load() : options.initialStack);
        } catch (_) {
            return normalizeSnippetStack(null);
        }
    };

    let stackState = readStack();

    const cloneStack = (state) => JSON.parse(JSON.stringify(normalizeSnippetStack(state)));

    const persistStack = (nextStack) => {
        stackState = normalizeSnippetStack(nextStack);
        if (typeof options.save === "function") {
            options.save(stackState);
        }
        if (typeof options.onChange === "function") {
            options.onChange(stackState);
        }
    };

    const setBusy = (nextBusy) => {
        asyncBusy = Boolean(nextBusy);
        root.setAttribute("aria-busy", String(asyncBusy));
        render();
    };

    const root = doc.createElement("section");
    root.className = `sw-snippet-stack${options.surface ? ` sw-snippet-stack--${options.surface}` : ""}`;
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", labels.title);
    root.setAttribute("aria-busy", "false");

    // T-7844: 支持从文档大纲/正文拖拽文本或原生块对象入栈并异步解包 AST (CAND-01)
    root.addEventListener("dragover", (event) => {
        if (asyncBusy || disposed) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        root.classList.add("is-dragover");
    });
    root.addEventListener("dragleave", (event) => {
        if (!root.contains(event.relatedTarget)) {
            root.classList.remove("is-dragover");
        }
    });
    root.addEventListener("drop", async (event) => {
        root.classList.remove("is-dragover");
        if (asyncBusy || disposed) return;
        event.preventDefault();
        event.stopPropagation();
        const plainText = event.dataTransfer?.getData("text/plain") || "";
        const blockIdMatch = plainText.match(/\b(\d{14}-[0-9a-z]{7})\b/i);
        let blockId = blockIdMatch ? blockIdMatch[1] : "";
        let content = plainText.trim();
        let title = content.split("\n")[0].slice(0, 32) || "拖拽切片";

        if (blockId && typeof options.fetchKernelJson === "function") {
            try {
                const kramdownRes = await options.fetchKernelJson("/api/block/getBlockKramdown", {id: blockId});
                if (kramdownRes?.data?.kramdown) {
                    content = kramdownRes.data.kramdown.trim();
                    title = content.split("\n")[0].slice(0, 32) || title;
                }
            } catch (_) { /* fallback to plainText */ }
        }
        if (!content && !blockId) return;
        const pushResult = pushSnippetStackItem(stackState, {
            title,
            fragments: {raw: content, key: "", action: ""},
            sourceBlockId: blockId,
            tags: ["拖拽采风"],
        });
        if (pushResult.added) {
            persistStack(pushResult.stack);
            render();
            setStatus(formatStackMessage(labels.capturedReceipt, {x: title}), "ready");
        }
    });

    // 1. 顶栏：标题 + 计数徽标 + 全局三态分片切换 + 动作按钮
    const header = doc.createElement("div");
    header.className = "sw-snippet-stack__header";

    const titleWrap = doc.createElement("div");
    titleWrap.className = "sw-snippet-stack__title-wrap";
    const titleEl = doc.createElement("strong");
    titleEl.className = "sw-snippet-stack__title";
    titleEl.textContent = labels.title;
    const countBadge = doc.createElement("span");
    countBadge.className = "sw-snippet-stack__count";
    titleWrap.append(createSvgIcon(doc, "iconCut"), titleEl, countBadge);

    const globalTabs = doc.createElement("div");
    globalTabs.className = "sw-snippet-stack__global-tabs";
    globalTabs.setAttribute("role", "group");
    globalTabs.setAttribute("aria-label", labels.ariaGlobalTabs);
    const tabMeta = [
        ["raw", labels.tabRaw],
        ["key", labels.tabKey],
        ["action", labels.tabAction],
    ];
    const globalTabButtons = new Map();
    for (const [tabKey, tabLabel] of tabMeta) {
        const btn = doc.createElement("button");
        btn.type = "button";
        btn.className = "sw-snippet-stack__tab-pill";
        btn.dataset.fragmentTab = tabKey;
        btn.textContent = tabLabel;
        btn.setAttribute("aria-pressed", String(tabKey === globalTabFilter));
        btn.addEventListener("click", () => {
            globalTabFilter = tabKey;
            persistStack(switchSnippetStackFragmentTab(stackState, "*", tabKey));
            render();
        });
        globalTabButtons.set(tabKey, btn);
        globalTabs.appendChild(btn);
    }

    const toolbar = doc.createElement("div");
    toolbar.className = "sw-snippet-stack__toolbar";

    const captureBtn = doc.createElement("button");
    captureBtn.type = "button";
    captureBtn.className = "sw-snippet-stack__btn";
    captureBtn.dataset.stackAction = "capture-selection";
    captureBtn.append(createSvgIcon(doc, "iconAdd"), doc.createTextNode(labels.captureSelection));
    captureBtn.addEventListener("click", async () => {
        if (asyncBusy || disposed) return;
        if (typeof options.onCaptureSelection === "function") {
            setBusy(true);
            try {
                const captured = await Promise.resolve(options.onCaptureSelection());
                if (disposed) return;
                if (captured && captured.added) {
                    lastUndoSnapshot = null;
                    stackState = readStack();
                    setStatus(formatStackMessage(labels.capturedReceipt, {x: captured.added.title}), "ready");
                    return;
                }
            } catch (_) {
                if (!disposed) setStatus(labels.operationFailed, "error");
                return;
            } finally {
                if (!disposed) setBusy(false);
            }
        }
        foldPanelOpen = true;
        render();
        foldTextarea.focus();
    });

    const foldToggleBtn = doc.createElement("button");
    foldToggleBtn.type = "button";
    foldToggleBtn.className = "sw-snippet-stack__btn";
    foldToggleBtn.dataset.stackAction = "toggle-fold-import";
    foldToggleBtn.setAttribute("aria-expanded", String(foldPanelOpen));
    foldToggleBtn.append(createSvgIcon(doc, "iconList"), doc.createTextNode(labels.foldImportToggle));
    foldToggleBtn.addEventListener("click", () => {
        foldPanelOpen = !foldPanelOpen;
        render();
        if (foldPanelOpen) foldTextarea.focus();
    });

    const clearBtn = doc.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "sw-snippet-stack__btn is-quiet";
    clearBtn.dataset.stackAction = "clear-unpinned";
    clearBtn.textContent = labels.clearUnpinned;
    clearBtn.addEventListener("click", () => {
        if (asyncBusy || disposed) return;
        const unpinnedCount = stackState.items.filter((item) => !item.pinned).length;
        if (unpinnedCount >= 20) {
            const promptTemplate = labels.clearConfirmPrompt || "确定清空未锁定暂存切片（共 {count} 条）吗？";
            const confirmMsg = formatStackMessage(promptTemplate, {count: unpinnedCount});
            if (typeof window !== "undefined" && typeof window.confirm === "function") {
                if (!window.confirm(confirmMsg)) return;
            }
        }
        const previousSnapshot = cloneStack(stackState);
        const res = clearSnippetStack(stackState, {keepPinned: true});
        if (res.clearedCount > 0) {
            lastUndoSnapshot = previousSnapshot;
            persistStack(res.stack);
            setStatus(formatStackMessage(labels.clearedReceipt, {count: res.clearedCount}), "ready");
            render();
        }
    });

    toolbar.append(globalTabs, captureBtn, foldToggleBtn, clearBtn);
    header.append(titleWrap, toolbar);

    // 2. TextFold 5 阶语义树导入抽屉
    const foldPanel = doc.createElement("div");
    foldPanel.className = "sw-snippet-stack__fold-panel";
    foldPanel.hidden = !foldPanelOpen;

    const foldTextarea = doc.createElement("textarea");
    foldTextarea.className = "sw-snippet-stack__fold-input";
    foldTextarea.rows = 3;
    foldTextarea.placeholder = labels.foldInputPlaceholder;
    foldTextarea.title = labels.foldInputPlaceholder;
    foldTextarea.setAttribute("aria-label", labels.foldImportToggle);

    const foldMetaRow = doc.createElement("div");
    foldMetaRow.className = "sw-snippet-stack__fold-meta";

    const foldBlockInput = doc.createElement("input");
    foldBlockInput.type = "text";
    foldBlockInput.className = "sw-snippet-stack__input";
    foldBlockInput.placeholder = labels.foldSourceBlockPlaceholder;
    foldBlockInput.title = labels.foldSourceBlockPlaceholder;
    foldBlockInput.setAttribute("aria-label", labels.foldSourceBlockPlaceholder);

    const foldGleanInput = doc.createElement("input");
    foldGleanInput.type = "text";
    foldGleanInput.className = "sw-snippet-stack__input";
    foldGleanInput.placeholder = labels.foldGleanIdPlaceholder;
    foldGleanInput.title = labels.foldGleanIdPlaceholder;
    foldGleanInput.setAttribute("aria-label", labels.foldGleanIdPlaceholder);

    const foldConvertBtn = doc.createElement("button");
    foldConvertBtn.type = "button";
    foldConvertBtn.className = "sw-snippet-stack__btn is-primary";
    foldConvertBtn.dataset.stackAction = "convert-fold-tree";
    foldConvertBtn.textContent = labels.foldConvertBtn;
    foldConvertBtn.addEventListener("click", () => {
        if (asyncBusy || disposed) return;
        const tree = parseFoldInputToTree(foldTextarea.value, foldBlockInput.value, foldGleanInput.value);
        if (!tree) {
            setStatus(labels.foldEmptyError, "error");
            return;
        }
        const res = pushFoldTreeToSnippetStack(stackState, tree);
        if (res.added.length === 0) {
            setStatus(labels.foldNoNodeError, "error");
            return;
        }
        lastUndoSnapshot = null;
        persistStack(res.stack);
        foldTextarea.value = "";
        foldPanelOpen = false;
        setStatus(formatStackMessage(labels.foldConvertedReceipt, {count: res.added.length}), "ready");
        render();
    });

    foldMetaRow.append(foldBlockInput, foldGleanInput, foldConvertBtn);

    let gleanPullBtn = null;
    if (typeof options.onFetchGleanFoldTree === "function") {
        gleanPullBtn = doc.createElement("button");
        gleanPullBtn.type = "button";
        gleanPullBtn.className = "sw-snippet-stack__btn";
        gleanPullBtn.dataset.stackAction = "pull-glean-fold";
        gleanPullBtn.textContent = labels.foldFromGleanBtn;
        gleanPullBtn.addEventListener("click", async () => {
            if (asyncBusy || disposed) return;
            setBusy(true);
            try {
                const tree = await Promise.resolve(options.onFetchGleanFoldTree());
                if (disposed) return;
                if (!tree) {
                    setStatus(labels.gleanUnavailableHint, "blocked");
                    return;
                }
                const res = pushFoldTreeToSnippetStack(stackState, tree);
                if (res.added.length > 0) {
                    lastUndoSnapshot = null;
                    persistStack(res.stack);
                    foldPanelOpen = false;
                    setStatus(formatStackMessage(labels.gleanImportedReceipt, {count: res.added.length}), "ready");
                } else {
                    setStatus(labels.gleanEmptyHint, "blocked");
                }
            } catch (_) {
                if (!disposed) setStatus(labels.operationFailed, "error");
            } finally {
                if (!disposed) setBusy(false);
            }
        });
        foldMetaRow.appendChild(gleanPullBtn);
    }

    foldPanel.append(foldTextarea, foldMetaRow);

    // 3. 切片卡片栈列表
    const listEl = doc.createElement("div");
    listEl.className = "sw-snippet-stack__list";
    listEl.setAttribute("role", "list");

    // 4. 底栏：一键批量组装与状态回执 + 删除撤销动作
    const footer = doc.createElement("div");
    footer.className = "sw-snippet-stack__footer";

    const modeSelect = doc.createElement("select");
    modeSelect.className = "sw-snippet-stack__select";
    modeSelect.setAttribute("aria-label", labels.ariaAssembleMode);
    for (const [val, text] of [
        ["full", labels.modeFull],
        ["active", labels.modeActive],
        ["raw", labels.modeRaw],
        ["key", labels.modeKey],
        ["action", labels.modeAction],
    ]) {
        const opt = doc.createElement("option");
        opt.value = val;
        opt.textContent = text;
        modeSelect.appendChild(opt);
    }
    modeSelect.addEventListener("change", () => {
        assembleMode = modeSelect.value;
    });

    const assembleActions = doc.createElement("div");
    assembleActions.className = "sw-snippet-stack__assemble-actions";

    const runAssemble = async (target) => {
        if (asyncBusy || disposed) return;
        if (stackState.items.length === 0) {
            setStatus(labels.stackEmptyError, "error");
            return;
        }
        if (target === "ai-synthesize") {
            if (typeof options.onAiSynthesize === "function") {
                setBusy(true);
                try {
                    const res = await Promise.resolve(options.onAiSynthesize(stackState.items));
                    if (disposed) return;
                    if (res && res.ok) {
                        setStatus(`AI 智能编织完成：「${res.title || "专题笔记"}」已生成`, "ready");
                    } else if (res && res.message) {
                        setStatus(res.message, "error");
                    }
                } catch (_) {
                    if (!disposed) setStatus(labels.operationFailed, "error");
                } finally {
                    if (!disposed) setBusy(false);
                }
            }
            return;
        }
        const assembleOpts = {
            mode: assembleMode,
            includeBlockAttrs: true,
        };
        const assembled = assembleSnippetStackMarkdown(stackState, assembleOpts);
        if (typeof options.onAssemble === "function") {
            setBusy(true);
            try {
                const receipt = await Promise.resolve(options.onAssemble(target, assembled, stackState, assembleOpts));
                if (disposed) return;
                if (receipt && typeof receipt.message === "string") {
                    setStatus(receipt.message, receipt.ok === false ? "error" : "ready");
                    return;
                }
            } catch (_) {
                if (!disposed) setStatus(labels.operationFailed, "error");
                return;
            } finally {
                if (!disposed) setBusy(false);
            }
        }
        setStatus(formatStackMessage(labels.assembledFallbackReceipt, {
            count: assembled.itemCount,
            backlinks: assembled.backlinkCount,
        }), "ready");
    };

    const makeAssembleBtn = (target, text, iconId, isPrimary = false) => {
        const btn = doc.createElement("button");
        btn.type = "button";
        btn.className = `sw-snippet-stack__btn${isPrimary ? " is-primary" : ""}`;
        btn.dataset.stackAssemble = target;
        btn.append(createSvgIcon(doc, iconId), doc.createTextNode(text));
        btn.addEventListener("click", () => void runAssemble(target));
        return btn;
    };

    const btnJournal = makeAssembleBtn("journal", labels.assembleJournal, "iconCalendar", true);
    const btnCurrent = makeAssembleBtn("current-doc", labels.assembleCurrent, "iconFile", false);
    const btnNewDoc = makeAssembleBtn("new-doc", labels.assembleNewDoc, "iconAdd", false);
    const btnCopy = makeAssembleBtn("copy", labels.assembleCopy, "iconCopy", false);
    const btnAiSynthesize = makeAssembleBtn("ai-synthesize", labels.aiSynthesizeBtn || "AI 智能编织", "iconSparkles", false);
    assembleActions.append(modeSelect, btnJournal, btnCurrent, btnNewDoc, btnCopy, btnAiSynthesize);

    const statusRow = doc.createElement("div");
    statusRow.className = "sw-snippet-stack__status-row";

    const statusEl = doc.createElement("div");
    statusEl.className = "sw-snippet-stack__status";
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");
    statusEl.textContent = labels.shortcutHint;

    const undoBtn = doc.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "sw-snippet-stack__btn sw-snippet-stack__undo-btn";
    undoBtn.dataset.stackAction = "undo";
    undoBtn.hidden = true;
    undoBtn.append(createSvgIcon(doc, "iconUndo"), doc.createTextNode(labels.undoAction));
    undoBtn.addEventListener("click", () => {
        if (!lastUndoSnapshot || asyncBusy || disposed) return;
        const snapshot = lastUndoSnapshot;
        lastUndoSnapshot = null;
        persistStack(snapshot);
        setStatus(labels.undoRestoredReceipt, "ready");
        render();
    });

    statusRow.append(statusEl, undoBtn);
    footer.append(assembleActions, statusRow);
    root.append(header, foldPanel, listEl, footer);

    function setStatus(text, state = "ready") {
        statusEl.textContent = text;
        statusEl.dataset.state = state;
    }

    function focusCardById(itemId) {
        const target = listEl.querySelector(`[data-stack-id="${itemId}"]`);
        if (target && typeof target.focus === "function") {
            target.focus({preventScroll: true});
        }
    }

    function buildCardElement(item, index, total) {
        const card = doc.createElement("article");
        card.className = `sw-snippet-stack__card${item.pinned ? " is-pinned" : ""}${editingItemId === item.id ? " is-editing" : ""}`;
        card.dataset.stackId = item.id;
        card.dataset.pinned = String(Boolean(item.pinned));
        card.dataset.activeTab = item.activeTab;
        card.setAttribute("role", "listitem");
        card.tabIndex = 0;

        // 卡片键盘流：Alt+↑/↓ 调序、F2 行内微调
        card.addEventListener("keydown", (event) => {
            if (editingItemId === item.id || asyncBusy) return;
            if (event.altKey && !event.ctrlKey && !event.metaKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                event.preventDefault();
                event.stopPropagation();
                const delta = event.key === "ArrowUp" ? -1 : 1;
                const moved = moveSnippetStackItem(stackState, item.id, delta);
                if (moved.moved) {
                    persistStack(moved.stack);
                    setStatus(formatStackMessage(labels.movedReceipt, {x: item.title, count: moved.index + 1}), "ready");
                    render();
                    focusCardById(item.id);
                }
                return;
            }
            if (event.key === "F2") {
                event.preventDefault();
                event.stopPropagation();
                editingItemId = item.id;
                render();
            }
        });

        // 手机端手势深化：暂存栈支持左右滑动切换上一片/下一片，滑动时触感 6ms、切换后标题短暂高亮
        let swipeStartX = 0;
        let swipeStartY = 0;
        card.addEventListener("touchstart", (ev) => {
            if (editingItemId === item.id) return;
            swipeStartX = ev.touches[0]?.clientX ?? 0;
            swipeStartY = ev.touches[0]?.clientY ?? 0;
        }, {passive: true});
        card.addEventListener("touchend", (ev) => {
            if (editingItemId === item.id) return;
            const deltaX = (ev.changedTouches[0]?.clientX ?? 0) - swipeStartX;
            const deltaY = (ev.changedTouches[0]?.clientY ?? 0) - swipeStartY;
            if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                const targetIndex = deltaX < 0 ? index + 1 : index - 1;
                if (targetIndex >= 0 && targetIndex < total) {
                    const targetItem = stackState.items[targetIndex];
                    if (targetItem) {
                        if (typeof options.haptic === "function") {
                            options.haptic(6);
                        } else if (typeof window !== "undefined" && window.__LV_LAUNCHPAD__?.haptic) {
                            window.__LV_LAUNCHPAD__.haptic(6);
                        }
                        const targetCard = listEl.querySelector(`[data-stack-id="${targetItem.id}"]`);
                        if (targetCard) {
                            targetCard.scrollIntoView({behavior: "smooth", block: "nearest"});
                            const targetTitle = targetCard.querySelector(".sw-snippet-stack__card-title");
                            if (targetTitle) {
                                targetTitle.classList.add("sw-snippet-stack__card-title--highlight");
                                setTimeout(() => {
                                    targetTitle.classList.remove("sw-snippet-stack__card-title--highlight");
                                }, 800);
                            }
                            if (typeof targetCard.focus === "function") {
                                targetCard.focus({preventScroll: true});
                            }
                        }
                    }
                }
            }
        }, {passive: true});

        // 卡片头：序号 + 标题 + 血缘徽标 + 操作组
        const cardHead = doc.createElement("div");
        cardHead.className = "sw-snippet-stack__card-head";

        const lead = doc.createElement("div");
        lead.className = "sw-snippet-stack__card-lead";

        const indexBadge = doc.createElement("span");
        indexBadge.className = "sw-snippet-stack__index";
        indexBadge.textContent = String(index + 1);

        const itemTitle = doc.createElement("strong");
        itemTitle.className = "sw-snippet-stack__card-title";
        itemTitle.textContent = item.title;

        lead.append(indexBadge, itemTitle);

        if (item.foldLevel) {
            const foldBadge = doc.createElement("span");
            foldBadge.className = "sw-snippet-stack__meta-pill is-fold";
            foldBadge.textContent = `Fold L${item.foldLevel}`;
            lead.appendChild(foldBadge);
        }

        const ops = doc.createElement("div");
        ops.className = "sw-snippet-stack__card-ops";

        const makeOpBtn = (op, label, iconId, pressed = null) => {
            const b = doc.createElement("button");
            b.type = "button";
            b.className = "sw-snippet-stack__icon-btn";
            b.dataset.stackOp = op;
            b.title = label;
            b.setAttribute("aria-label", `${label} · ${item.title}`);
            if (pressed !== null) b.setAttribute("aria-pressed", String(pressed));
            b.appendChild(createSvgIcon(doc, iconId));
            return b;
        };

        const pinBtn = makeOpBtn("pin", item.pinned ? labels.unpinLock : labels.pinLock, item.pinned ? "iconUnpin" : "iconPin", item.pinned);
        pinBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const next = toggleSnippetStackPin(stackState, item.id);
            persistStack(next.stack);
            render();
            focusCardById(item.id);
        });

        const upBtn = makeOpBtn("up", labels.moveUp, "iconUp");
        upBtn.disabled = index === 0 || (index > 0 && stackState.items[index - 1].pinned !== item.pinned);
        upBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const moved = moveSnippetStackItem(stackState, item.id, -1);
            if (moved.moved) {
                persistStack(moved.stack);
                render();
                focusCardById(item.id);
            }
        });

        const downBtn = makeOpBtn("down", labels.moveDown, "iconDown");
        downBtn.disabled = index >= total - 1 || (index < total - 1 && stackState.items[index + 1].pinned !== item.pinned);
        downBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const moved = moveSnippetStackItem(stackState, item.id, 1);
            if (moved.moved) {
                persistStack(moved.stack);
                render();
                focusCardById(item.id);
            }
        });

        const editBtn = makeOpBtn("edit", labels.inlineEdit, "iconEdit", editingItemId === item.id);
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            editingItemId = editingItemId === item.id ? "" : item.id;
            render();
        });

        const removeBtn = makeOpBtn("remove", labels.removeItem, "iconClose");
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (asyncBusy || disposed) return;
            const previousSnapshot = cloneStack(stackState);
            const removed = removeSnippetStackItem(stackState, item.id);
            if (removed.removed) {
                lastUndoSnapshot = previousSnapshot;
                persistStack(removed.stack);
                setStatus(formatStackMessage(labels.removedReceipt, {x: item.title}), "ready");
                render();
            }
        });

        const aiRefineBtn = makeOpBtn("ai-refine", labels.aiRefineBtn || "AI 精炼 (提炼要点与行动项)", "iconSparkles");
        aiRefineBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (asyncBusy || disposed) return;
            if (typeof options.onAiRefine === "function") {
                setBusy(true);
                try {
                    const result = await Promise.resolve(options.onAiRefine(item));
                    if (disposed) return;
                    if (result && typeof result === "object") {
                        if (result.key) item.keyFragment = result.key;
                        if (result.action) item.actionFragment = result.action;
                        item.activeTab = "key";
                    } else if (typeof result === "string" && result.trim()) {
                        item.keyFragment = result.trim();
                        item.activeTab = "key";
                    }
                    persistStack(stackState);
                    setStatus(`切片「${item.title}」已完成 AI 精炼`, "ready");
                    render();
                } catch (_) {
                    if (!disposed) setStatus("AI 精炼失败，请检查配置或网络", "error");
                } finally {
                    if (!disposed) setBusy(false);
                }
            }
        });

        ops.append(pinBtn, upBtn, downBtn, editBtn, aiRefineBtn, removeBtn);
        cardHead.append(lead, ops);
        card.appendChild(cardHead);

        // 单切片多维分片视图切换栏（massCode Multi-Fragment Tabs）
        const fragTabs = doc.createElement("div");
        fragTabs.className = "sw-snippet-stack__frag-tabs";
        fragTabs.setAttribute("role", "tablist");
        fragTabs.setAttribute("aria-label", formatStackMessage(labels.ariaItemFragments, {x: item.title}));

        const fragMap = {
            raw: item.rawFragment,
            key: item.keyFragment,
            action: item.actionFragment,
        };

        for (const [tabKey, tabLabel] of tabMeta) {
            const tabBtn = doc.createElement("button");
            tabBtn.type = "button";
            const isSelected = item.activeTab === tabKey;
            const hasContent = Boolean(fragMap[tabKey] && fragMap[tabKey].trim());
            tabBtn.className = `sw-snippet-stack__frag-tab${isSelected ? " is-active" : ""}${hasContent ? " has-content" : ""}`;
            tabBtn.setAttribute("role", "tab");
            tabBtn.setAttribute("aria-selected", String(isSelected));
            tabBtn.dataset.cardFragmentTab = tabKey;
            tabBtn.textContent = tabLabel;
            tabBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                persistStack(switchSnippetStackFragmentTab(stackState, item.id, tabKey));
                render();
            });
            fragTabs.appendChild(tabBtn);
        }
        card.appendChild(fragTabs);

        // 行内微调态 vs 预览态
        if (editingItemId === item.id) {
            const editorWrap = doc.createElement("div");
            editorWrap.className = "sw-snippet-stack__inline-editor";

            const titleInput = doc.createElement("input");
            titleInput.type = "text";
            titleInput.className = "sw-snippet-stack__input";
            titleInput.value = item.title;
            titleInput.title = labels.editTitleLabel;
            titleInput.setAttribute("aria-label", labels.editTitleLabel);

            const bodyInput = doc.createElement("textarea");
            bodyInput.className = "sw-snippet-stack__textarea";
            bodyInput.rows = 3;
            bodyInput.value = fragMap[item.activeTab] || "";
            bodyInput.title = labels.editFragmentLabel;
            bodyInput.setAttribute("aria-label", labels.editFragmentLabel);

            const blockInput = doc.createElement("input");
            blockInput.type = "text";
            blockInput.className = "sw-snippet-stack__input";
            blockInput.value = item.sourceBlockId || "";
            blockInput.placeholder = labels.editBlockIdLabel;
            blockInput.title = labels.editBlockIdLabel;
            blockInput.setAttribute("aria-label", labels.editBlockIdLabel);

            const commitEdit = () => {
                const fieldKey = item.activeTab === "key"
                    ? "keyFragment"
                    : (item.activeTab === "action" ? "actionFragment" : "rawFragment");
                const updated = updateSnippetStackItem(stackState, item.id, {
                    title: titleInput.value,
                    [fieldKey]: bodyInput.value,
                    sourceBlockId: blockInput.value,
                });
                editingItemId = "";
                lastUndoSnapshot = null;
                persistStack(updated.stack);
                setStatus(formatStackMessage(labels.savedEditReceipt, {x: titleInput.value || item.title}), "ready");
                render();
                focusCardById(item.id);
            };

            const cancelEdit = () => {
                editingItemId = "";
                render();
                focusCardById(item.id);
            };

            editorWrap.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    cancelEdit();
                } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    event.stopPropagation();
                    commitEdit();
                }
            });

            const editActions = doc.createElement("div");
            editActions.className = "sw-snippet-stack__edit-actions";
            const saveEditBtn = doc.createElement("button");
            saveEditBtn.type = "button";
            saveEditBtn.className = "sw-snippet-stack__btn is-primary";
            saveEditBtn.dataset.stackEditSave = item.id;
            saveEditBtn.textContent = labels.saveEdit;
            saveEditBtn.addEventListener("click", commitEdit);

            const cancelEditBtn = doc.createElement("button");
            cancelEditBtn.type = "button";
            cancelEditBtn.className = "sw-snippet-stack__btn is-quiet";
            cancelEditBtn.dataset.stackEditCancel = item.id;
            cancelEditBtn.textContent = labels.cancelEdit;
            cancelEditBtn.addEventListener("click", cancelEdit);

            editActions.append(saveEditBtn, cancelEditBtn);
            editorWrap.append(titleInput, bodyInput, blockInput, editActions);
            card.appendChild(editorWrap);
            setTimeout(() => {
                if (!disposed && bodyInput.isConnected) bodyInput.focus();
            }, 0);
        } else {
            const bodyEl = doc.createElement("div");
            const activeContent = fragMap[item.activeTab] || "";
            bodyEl.className = `sw-snippet-stack__body${activeContent ? "" : " is-empty"}`;
            bodyEl.textContent = activeContent || labels.fragmentEmpty;
            bodyEl.addEventListener("dblclick", () => {
                editingItemId = item.id;
                render();
            });
            card.appendChild(bodyEl);
        }

        // 血缘反链与属性底栏
        if (item.sourceBlockId || item.gleanId) {
            const lineageBar = doc.createElement("div");
            lineageBar.className = "sw-snippet-stack__lineage-bar";
            if (item.sourceBlockId) {
                const refBtn = doc.createElement("button");
                refBtn.type = "button";
                refBtn.className = "sw-snippet-stack__lineage-chip";
                refBtn.dataset.sourceBlockId = item.sourceBlockId;
                refBtn.textContent = formatBlockRefBacklink(item.sourceBlockId, item.anchorText || item.title);
                refBtn.title = labels.openSourceBlockTitle;
                refBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (typeof options.onOpenBlock === "function") {
                        void Promise.resolve(options.onOpenBlock(item.sourceBlockId, item)).then(
                            (ok) => {
                                if (ok === false && !disposed) {
                                    setStatus(labels.operationFailed, "error");
                                }
                            },
                            () => {
                                if (!disposed) {
                                    setStatus(labels.operationFailed, "error");
                                }
                            },
                        );
                    }
                });
                lineageBar.appendChild(refBtn);
            }
            if (item.gleanId) {
                const gleanChip = doc.createElement("span");
                gleanChip.className = "sw-snippet-stack__meta-pill";
                gleanChip.dataset.gleanId = item.gleanId;
                gleanChip.textContent = `glean:${item.gleanId.slice(0, 14)}`;
                lineageBar.appendChild(gleanChip);
            }
            card.appendChild(lineageBar);
        }

        return card;
    }

    function render() {
        if (disposed) return;
        const total = stackState.items.length;
        const pinnedCount = stackState.items.filter((i) => i.pinned).length;
        countBadge.textContent = pinnedCount > 0
            ? `${total}/${SNIPPET_STACK_MAX} · ${pinnedCount} ${labels.pinnedSuffix}`
            : `${total}/${SNIPPET_STACK_MAX}`;
        foldPanel.hidden = !foldPanelOpen;
        foldToggleBtn.setAttribute("aria-expanded", String(foldPanelOpen));
        undoBtn.hidden = !lastUndoSnapshot || asyncBusy;
        undoBtn.disabled = asyncBusy;

        for (const [tabKey, btn] of globalTabButtons.entries()) {
            btn.setAttribute("aria-pressed", String(tabKey === globalTabFilter));
            btn.classList.toggle("is-active", tabKey === globalTabFilter);
        }

        const hasItems = total > 0;
        captureBtn.disabled = asyncBusy;
        if (gleanPullBtn) gleanPullBtn.disabled = asyncBusy;
        btnJournal.disabled = !hasItems || asyncBusy;
        btnCurrent.disabled = !hasItems || asyncBusy;
        btnNewDoc.disabled = !hasItems || asyncBusy;
        btnCopy.disabled = !hasItems || asyncBusy;
        clearBtn.disabled = asyncBusy || stackState.items.every((item) => item.pinned);

        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);

        if (!hasItems) {
            const empty = doc.createElement("p");
            empty.className = "sw-snippet-stack__empty";
            empty.textContent = labels.emptyHint;
            listEl.appendChild(empty);
            return;
        }

        stackState.items.forEach((item, idx) => {
            listEl.appendChild(buildCardElement(item, idx, total));
        });
    }

    render();
    container.appendChild(root);

    return {
        root,
        getState: () => stackState,
        refresh: () => {
            stackState = readStack();
            render();
        },
        pushItem: (rawItem) => {
            const res = pushSnippetStackItem(stackState, rawItem);
            if (res.added) {
                lastUndoSnapshot = null;
                persistStack(res.stack);
                render();
            }
            return res;
        },
        pushFoldTree: (tree, treeOptions) => {
            const res = pushFoldTreeToSnippetStack(stackState, tree, treeOptions);
            if (res.added.length > 0) {
                lastUndoSnapshot = null;
                persistStack(res.stack);
                render();
            }
            return res;
        },
        dispose: () => {
            if (disposed) return;
            disposed = true;
            if (root.parentElement) root.parentElement.removeChild(root);
        },
    };
}

module.exports = {
    DEFAULT_STACK_LABELS,
    SNIPPET_FRAGMENT_TABS,
    parseFoldInputToTree,
    mountSnippetStackView,
};
