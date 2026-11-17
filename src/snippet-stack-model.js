"use strict";

// 连续切片暂存栈（Snippet Stack，借鉴 CopyQ）+ 多维分片视图（借鉴 massCode）
// + TextFold 5 阶语义树原子切片（借鉴 chenxiachan/textfold & 小驴拾遗）
// + 选区上下文特征识别与推荐动作排序（借鉴 Rubick Super Panel）。
// 纯领域模型：零 DOM、零网络、零宿主状态耦合，所有外部输入统一有界清洗。

const SNIPPET_STACK_SCHEMA_VERSION = 1;
const SNIPPET_STACK_MAX = 32;
const SNIPPET_STACK_ID_MAX = 64;
const SNIPPET_STACK_TITLE_MAX = 120;
const SNIPPET_STACK_RAW_MAX = 2400;
const SNIPPET_STACK_KEY_MAX = 1600;
const SNIPPET_STACK_ACTION_MAX = 1200;
const SNIPPET_STACK_ANCHOR_MAX = 140;
const SNIPPET_FRAGMENT_TABS = Object.freeze(["raw", "key", "action"]);
const SELECTION_KINDS = Object.freeze([
    "none",
    "long-paragraph",
    "url",
    "task-list",
    "code-block",
    "short-text",
]);
const SELECTION_LONG_PARAGRAPH_THRESHOLD = 200;

const BLOCK_ID_RE = /^\d{14}-[0-9a-z]{7}$/i;
const SAFE_ATTR_TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const URL_DETECT_RE = /https?:\/\/[^\s<>")]+/i;
const TASK_LIST_DETECT_RE = /(?:^|\n)\s*(?:[-*+]|\d+\.)\s*\[[ xX]\]\s+\S/m;
const FENCED_CODE_DETECT_RE = /(?:^|\n)\s*(?:```|~~~)[\s\S]*?(?:```|~~~)/m;

let stackIdCounter = 0;

function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanSingleLine(value, max) {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanMultiline(value, max) {
    if (typeof value !== "string") return "";
    return value
        .replace(/\r\n?/g, "\n")
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
        .trim()
        .slice(0, max);
}

function cleanSafeId(value, max = SNIPPET_STACK_ID_MAX) {
    if (typeof value !== "string" || !value.trim()) return "";
    const trimmed = value.trim();
    if (/\s/.test(trimmed)) return "";
    if (BLOCK_ID_RE.test(trimmed) || SAFE_ATTR_TOKEN_RE.test(trimmed)) return trimmed.slice(0, max);
    return "";
}

function nextStackItemId(now = Date.now()) {
    stackIdCounter = (stackIdCounter + 1) % 100000;
    const stamp = Number.isFinite(Number(now)) && Number(now) > 0 ? Math.trunc(Number(now)) : Date.now();
    return `stk-${stamp.toString(36)}-${stackIdCounter.toString(36)}`;
}

/**
 * Verbatim 保真校验：判定候选短语是否 100% 为原文的逐字子串（拒绝虚构改写）。
 * 忽略排版换行与多余空格差异，按字符序列校验逐字保真。
 */
function isVerbatimSubstring(candidate, fullText) {
    const cand = cleanSingleLine(candidate, SNIPPET_STACK_RAW_MAX);
    const source = cleanMultiline(fullText, SNIPPET_STACK_RAW_MAX * 2);
    if (!cand || !source) return false;
    if (source.includes(cand)) return true;
    const compactSource = source.replace(/\s+/g, "");
    const compactCand = cand.replace(/\s+/g, "");
    return compactCand.length > 0 && compactSource.includes(compactCand);
}

/**
 * 从段落原文中提取 100% 保真的首句逐字子串（TextFold Level 2 Brief）。
 */
function extractVerbatimBrief(fullText, maxLen = SNIPPET_STACK_ANCHOR_MAX) {
    const limit = Math.max(12, Math.min(SNIPPET_STACK_ANCHOR_MAX, Math.trunc(Number(maxLen) || SNIPPET_STACK_ANCHOR_MAX)));
    const raw = cleanMultiline(fullText, SNIPPET_STACK_RAW_MAX);
    if (!raw) return "";

    const sentenceMatch = raw.match(/^[^。！？!?\n]+[。！？!?]?/);
    const candidate = sentenceMatch ? sentenceMatch[0].trim() : raw;
    if (candidate.length <= limit && isVerbatimSubstring(candidate, raw)) {
        return cleanSingleLine(candidate, limit);
    }

    const subMatch = candidate.slice(0, limit).match(/^[^，,；;——]+[，,；;]?/);
    if (subMatch && subMatch[0].trim().length >= 8 && isVerbatimSubstring(subMatch[0].trim(), raw)) {
        return cleanSingleLine(subMatch[0].trim(), limit);
    }

    return cleanSingleLine(raw.slice(0, Math.min(raw.length, limit)), limit);
}

/**
 * 从原文提取 Level 5 Topic 概念短语。
 */
function extractTopicFromText(fullText, fallbackTitle = "") {
    const raw = cleanMultiline(fullText, SNIPPET_STACK_RAW_MAX);
    if (!raw) return cleanSingleLine(fallbackTitle, SNIPPET_STACK_TITLE_MAX) || "未命名切片";

    const headingMatch = raw.match(/^(?:#{1,6})\s+([^\n]{1,80})/);
    if (headingMatch) return cleanSingleLine(headingMatch[1], 48);

    const boldMatch = raw.match(/\*\*([^*\n]{2,36})\*\*/);
    if (boldMatch) return cleanSingleLine(boldMatch[1], 48);

    const quotedMatch = raw.match(/[「《“]([^」》”\n]{2,32})[」》”]/);
    if (quotedMatch) return cleanSingleLine(quotedMatch[1], 48);

    const brief = extractVerbatimBrief(raw, 28).replace(/[。！？!?，,；;：:]+$/, "").trim();
    return cleanSingleLine(brief || fallbackTitle, SNIPPET_STACK_TITLE_MAX) || "原子切片";
}

/**
 * 从原文提取核心提炼分片（Level 4 Takeaway + Level 3 Key 支撑要点）。
 */
function extractKeySummaryFromText(fullText) {
    const raw = cleanMultiline(fullText, SNIPPET_STACK_RAW_MAX);
    if (!raw) return "";

    const takeaway = extractVerbatimBrief(raw, 90);
    const clauses = raw
        .split(/[；;。！？!?\n]+/)
        .map((line) => line.replace(/^\s*(?:[-*+]|\d+\.)\s*(\[[ xX]\]\s*)?/, "").trim())
        .filter((line) => line.length >= 6 && line !== takeaway);

    if (clauses.length === 0) return cleanMultiline(takeaway, SNIPPET_STACK_KEY_MAX);
    const bullets = clauses.slice(0, 3).map((item) => `- ${item.slice(0, 120)}`);
    return cleanMultiline([takeaway, ...bullets].filter(Boolean).join("\n"), SNIPPET_STACK_KEY_MAX);
}

/**
 * 从原文提取行动项分片（任务列表项或待跟进事项）。
 */
function extractActionItemsFromText(fullText) {
    const raw = cleanMultiline(fullText, SNIPPET_STACK_RAW_MAX);
    if (!raw) return "";

    const chunks = raw.split(/[\n；;]+/);
    const tasks = [];
    for (const chunk of chunks) {
        const taskMatch = chunk.match(/(?:^|\s*)(?:[-*+]|\d+\.)\s*\[([ xX])\]\s*(.+)$/);
        if (taskMatch) {
            const mark = taskMatch[1].toLowerCase() === "x" ? "x" : " ";
            tasks.push(`- [${mark}] ${cleanSingleLine(taskMatch[2], 160)}`);
            continue;
        }
        const todoMatch = chunk.match(/(?:^|\s*)(?:TODO|FIXME|行动项|待办)[:：]\s*(.+)$/i);
        if (todoMatch) {
            tasks.push(`- [ ] ${cleanSingleLine(todoMatch[1], 160)}`);
        }
    }
    return cleanMultiline(tasks.slice(0, 8).join("\n"), SNIPPET_STACK_ACTION_MAX);
}

function buildLineageCustomAttrs({sourceBlockId = "", gleanId = ""} = {}) {
    const attrs = {};
    const safeBlock = cleanSafeId(sourceBlockId);
    const safeGlean = cleanSafeId(gleanId);
    if (safeBlock) attrs["custom-lv-source-block"] = safeBlock;
    if (safeGlean) attrs["custom-lv-glean-id"] = safeGlean;
    return attrs;
}

/**
 * 生成思源块引用血缘反链 `((blockId "来源锚点"))`，自动转义引号与换行。
 */
function formatBlockRefBacklink(sourceBlockId, anchorText = "") {
    const safeBlock = cleanSafeId(sourceBlockId);
    if (!safeBlock) return "";
    const safeAnchor = cleanSingleLine(anchorText, SNIPPET_STACK_ANCHOR_MAX)
        .replace(/"/g, "'")
        .replace(/\)\)/g, ") )");
    return safeAnchor ? `((${safeBlock} "${safeAnchor}"))` : `((${safeBlock}))`;
}

/**
 * 生成思源 Kramdown 块属性行 `{: custom-lv-source-block="..." custom-lv-glean-id="..."}`。
 */
function formatLineageKramdownIAL({sourceBlockId = "", gleanId = ""} = {}) {
    const attrs = buildLineageCustomAttrs({sourceBlockId, gleanId});
    const entries = Object.entries(attrs);
    if (entries.length === 0) return "";
    return `{: ${entries.map(([k, v]) => `${k}="${v}"`).join(" ")}}`;
}

/**
 * 归一化单条切片暂存项（含三态分片：rawFragment / keyFragment / actionFragment）。
 */
function normalizeSnippetStackItem(raw, index = 0) {
    if (!isRecord(raw)) return null;

    const rawTextInput = typeof raw.rawFragment === "string"
        ? raw.rawFragment
        : (typeof raw.text === "string" ? raw.text : (typeof raw.content === "string" ? raw.content : ""));
    const rawFragment = cleanMultiline(rawTextInput, SNIPPET_STACK_RAW_MAX);
    const explicitKey = typeof raw.keyFragment === "string" ? cleanMultiline(raw.keyFragment, SNIPPET_STACK_KEY_MAX) : "";
    const explicitAction = typeof raw.actionFragment === "string" ? cleanMultiline(raw.actionFragment, SNIPPET_STACK_ACTION_MAX) : "";

    const keyFragment = explicitKey || (raw.autoDeriveFragments !== false ? extractKeySummaryFromText(rawFragment) : "");
    const actionFragment = explicitAction || (raw.autoDeriveFragments !== false ? extractActionItemsFromText(rawFragment) : "");

    if (!rawFragment && !keyFragment && !actionFragment) return null;

    const createdAt = Number.isSafeInteger(raw.createdAt) && raw.createdAt > 0
        ? raw.createdAt
        : Date.now() + index;
    const id = cleanSafeId(raw.id) || nextStackItemId(createdAt);
    const sourceBlockId = cleanSafeId(raw.sourceBlockId || raw.blockId || raw.customAttrs?.["custom-lv-source-block"]);
    const sourceDocId = cleanSafeId(raw.sourceDocId || raw.rootId || raw.docId);
    const gleanId = cleanSafeId(raw.gleanId || raw.customAttrs?.["custom-lv-glean-id"]);
    const sourceTitle = cleanSingleLine(raw.sourceTitle || raw.docTitle || "", SNIPPET_STACK_TITLE_MAX);
    const title = cleanSingleLine(raw.title || raw.topic || raw.concept || "", SNIPPET_STACK_TITLE_MAX)
        || extractTopicFromText(rawFragment || keyFragment || actionFragment, sourceTitle);
    const anchorCandidate = cleanSingleLine(raw.anchorText || raw.brief || "", SNIPPET_STACK_ANCHOR_MAX);
    const anchorText = anchorCandidate
        || extractVerbatimBrief(rawFragment || keyFragment, 72)
        || sourceTitle
        || title;
    const activeTab = SNIPPET_FRAGMENT_TABS.includes(raw.activeTab) ? raw.activeTab : "raw";
    const foldLevelNum = Number(raw.foldLevel);
    const foldLevel = Number.isInteger(foldLevelNum) && foldLevelNum >= 1 && foldLevelNum <= 5 ? foldLevelNum : 0;
    const customAttrs = buildLineageCustomAttrs({sourceBlockId, gleanId});

    return {
        id,
        title,
        rawFragment,
        keyFragment,
        actionFragment,
        activeTab,
        pinned: raw.pinned === true,
        sourceBlockId,
        sourceDocId,
        sourceTitle,
        anchorText,
        gleanId,
        ...(foldLevel > 0 ? {foldLevel} : {}),
        customAttrs,
        createdAt,
    };
}

/**
 * 保持置顶锁定项（pinned=true）始终位于栈顶，组内保持既有相对顺序。
 */
function stabilizeSnippetStackOrder(items) {
    const pinned = [];
    const unpinned = [];
    for (const item of items) {
        if (!item) continue;
        if (item.pinned) pinned.push(item);
        else unpinned.push(item);
    }
    return [...pinned, ...unpinned];
}

function createEmptySnippetStack() {
    return {
        version: SNIPPET_STACK_SCHEMA_VERSION,
        items: [],
    };
}

/**
 * 归一化整个连续切片暂存栈；容量超限时优先保留置顶锁定项并淘汰尾部非置顶旧项。
 */
function normalizeSnippetStack(raw, max = SNIPPET_STACK_MAX) {
    const cap = Number.isFinite(Number(max)) && Number(max) > 0
        ? Math.min(SNIPPET_STACK_MAX, Math.trunc(Number(max)))
        : SNIPPET_STACK_MAX;
    const list = Array.isArray(raw) ? raw : (isRecord(raw) && Array.isArray(raw.items) ? raw.items : []);
    const seen = new Set();
    const parsed = [];
    for (let i = 0; i < list.length; i += 1) {
        const normalized = normalizeSnippetStackItem(list[i], i);
        if (!normalized || seen.has(normalized.id)) continue;
        seen.add(normalized.id);
        parsed.push(normalized);
    }
    const ordered = stabilizeSnippetStackOrder(parsed);
    if (ordered.length <= cap) {
        return {version: SNIPPET_STACK_SCHEMA_VERSION, items: ordered};
    }
    const pinned = ordered.filter((item) => item.pinned);
    const unpinned = ordered.filter((item) => !item.pinned);
    if (pinned.length >= cap) {
        return {version: SNIPPET_STACK_SCHEMA_VERSION, items: pinned.slice(0, cap)};
    }
    const remainingSlots = cap - pinned.length;
    // 连续追加场景下保留最新采集的 remainingSlots 条非置顶项，置顶项永不因普通采集被挤出
    return {
        version: SNIPPET_STACK_SCHEMA_VERSION,
        items: [...pinned, ...unpinned.slice(unpinned.length - remainingSlots)],
    };
}

/**
 * 向连续切片暂存栈推入一条新切片（按阅读采集顺序追加，置顶项保持锁定置顶）。
 */
function pushSnippetStackItem(stack, rawItem, options = {}) {
    const current = normalizeSnippetStack(stack);
    const cap = Number.isFinite(Number(options.max)) && Number(options.max) > 0
        ? Math.min(SNIPPET_STACK_MAX, Math.trunc(Number(options.max)))
        : SNIPPET_STACK_MAX;
    const candidateInput = typeof rawItem === "string" ? {rawFragment: rawItem} : rawItem;
    const item = normalizeSnippetStackItem(candidateInput, current.items.length);
    if (!item) return {stack: current, added: null};

    const deduped = current.items.filter((existing) => existing.id !== item.id);
    const next = normalizeSnippetStack([...deduped, item], cap);
    const added = next.items.find((entry) => entry.id === item.id) || null;
    return {stack: next, added};
}

/**
 * 将单个 TextFold 5 阶语义节点（FoldNode / FoldArticleTree 节点）转换为高保真原子切片：
 * - 标题：Level 5 Topic / Concept
 * - 核心摘要：Level 4 Takeaway / Gist
 * - 正文论证：Level 3 Key / Points
 * - 原文依据引用：Level 2 Brief（强制 Verbatim Guard 原文逐字子串保真校验）+ ((blockId "Brief"))
 * - 血缘反链：custom-lv-source-block + custom-lv-glean-id
 */
function convertFoldNodeToAtomicSlice(node, options = {}) {
    if (!isRecord(node)) return null;

    const fullText = cleanMultiline(
        typeof node.fullText === "string" ? node.fullText
            : (typeof node.raw === "string" ? node.raw : (typeof node.content === "string" ? node.content : "")),
        SNIPPET_STACK_RAW_MAX,
    );
    const rawBrief = cleanSingleLine(
        typeof node.brief === "string" ? node.brief
            : (typeof node.level2 === "string" ? node.level2 : ""),
        SNIPPET_STACK_ANCHOR_MAX,
    );
    // Verbatim Guard：若存在原文，Level 2 Brief 必须是 100% 原文逐字子串，拒绝虚构改写
    const verbatimBrief = fullText
        ? (rawBrief && isVerbatimSubstring(rawBrief, fullText) ? rawBrief : extractVerbatimBrief(fullText, SNIPPET_STACK_ANCHOR_MAX))
        : rawBrief;

    const rawPoints = Array.isArray(node.points) ? node.points
        : (Array.isArray(node.keyPoints) ? node.keyPoints
            : (Array.isArray(node.level3) ? node.level3 : []));
    const keyString = typeof node.key === "string" ? cleanMultiline(node.key, SNIPPET_STACK_KEY_MAX)
        : (typeof node.level3 === "string" ? cleanMultiline(node.level3, SNIPPET_STACK_KEY_MAX) : "");
    const normalizedPoints = rawPoints
        .map((pt) => cleanSingleLine(pt, 240))
        .filter(Boolean)
        .slice(0, 6);

    const takeaway = cleanSingleLine(
        typeof node.takeaway === "string" ? node.takeaway
            : (typeof node.gist === "string" ? node.gist
                : (typeof node.level4 === "string" ? node.level4 : "")),
        240,
    ) || extractVerbatimBrief(fullText || verbatimBrief, 90);

    const topic = cleanSingleLine(
        typeof node.topic === "string" ? node.topic
            : (typeof node.concept === "string" ? node.concept
                : (typeof node.level5 === "string" ? node.level5 : "")),
        SNIPPET_STACK_TITLE_MAX,
    ) || extractTopicFromText(fullText || takeaway || verbatimBrief, options.sourceTitle || "");

    if (!fullText && !verbatimBrief && !takeaway && !keyString && normalizedPoints.length === 0) {
        return null;
    }

    const sourceBlockId = cleanSafeId(node.blockId || node.sourceBlockId || node.id || "");
    const gleanId = cleanSafeId(options.gleanId || node.gleanId || "");
    const sourceDocId = cleanSafeId(options.sourceDocId || node.docId || node.rootId || "");
    const sourceTitle = cleanSingleLine(options.sourceTitle || node.sourceTitle || "", SNIPPET_STACK_TITLE_MAX);

    const keyLines = [];
    if (takeaway) keyLines.push(takeaway);
    if (keyString && keyString !== takeaway) keyLines.push(keyString);
    for (const pt of normalizedPoints) {
        if (pt !== takeaway) keyLines.push(`- ${pt}`);
    }
    const keyFragment = cleanMultiline(keyLines.join("\n"), SNIPPET_STACK_KEY_MAX)
        || extractKeySummaryFromText(fullText || verbatimBrief);

    const explicitActions = Array.isArray(node.actions)
        ? node.actions.map((act) => `- [ ] ${cleanSingleLine(act, 160)}`).filter((line) => line.length > 6).join("\n")
        : (typeof node.actionFragment === "string" ? node.actionFragment : "");
    const actionFragment = cleanMultiline(explicitActions, SNIPPET_STACK_ACTION_MAX)
        || extractActionItemsFromText(fullText);

    const rawFragment = fullText || verbatimBrief || takeaway;
    const verbatimBlockRef = sourceBlockId
        ? formatBlockRefBacklink(sourceBlockId, verbatimBrief || topic)
        : "";

    const slice = normalizeSnippetStackItem({
        id: options.preserveNodeId === true ? cleanSafeId(node.sliceId || "") : "",
        title: topic,
        rawFragment,
        keyFragment,
        actionFragment,
        anchorText: verbatimBrief || topic,
        sourceBlockId,
        sourceDocId,
        sourceTitle,
        gleanId,
        foldLevel: Number(node.level) >= 1 && Number(node.level) <= 5 ? Number(node.level) : 5,
        activeTab: options.defaultTab || "key",
        pinned: Boolean(node.pinned),
        createdAt: options.now,
        autoDeriveFragments: false,
    });
    if (!slice) return null;

    return {
        ...slice,
        topic,
        takeaway,
        keyPoints: normalizedPoints.length > 0 ? normalizedPoints : (keyString ? [keyString] : []),
        verbatimBrief,
        verbatimBlockRef,
    };
}

/**
 * 将整棵 FoldArticleTree（或 FoldNode 数组）批量转换为高保真原子切片数组。
 */
function convertFoldTreeToAtomicSlices(foldTree, options = {}) {
    let nodes = [];
    let gleanId = cleanSafeId(options.gleanId || "");
    let sourceDocId = cleanSafeId(options.sourceDocId || "");
    let sourceTitle = cleanSingleLine(options.sourceTitle || "", SNIPPET_STACK_TITLE_MAX);

    if (Array.isArray(foldTree)) {
        nodes = foldTree;
    } else if (isRecord(foldTree)) {
        gleanId = gleanId || cleanSafeId(foldTree.gleanId || foldTree.clipId || foldTree.id || "");
        sourceDocId = sourceDocId || cleanSafeId(foldTree.docId || foldTree.rootId || "");
        sourceTitle = sourceTitle || cleanSingleLine(foldTree.title || foldTree.docTitle || "", SNIPPET_STACK_TITLE_MAX);
        if (Array.isArray(foldTree.nodes)) nodes = foldTree.nodes;
        else if (Array.isArray(foldTree.blocks)) nodes = foldTree.blocks;
        else if (Array.isArray(foldTree.items)) nodes = foldTree.items;
    }

    const baseNow = Number.isSafeInteger(options.now) && options.now > 0 ? options.now : Date.now();
    const slices = [];
    for (let i = 0; i < nodes.length && slices.length < SNIPPET_STACK_MAX; i += 1) {
        const slice = convertFoldNodeToAtomicSlice(nodes[i], {
            ...options,
            gleanId,
            sourceDocId,
            sourceTitle,
            now: baseNow + i,
        });
        if (slice) slices.push(slice);
    }
    return slices;
}

/**
 * 将 FoldArticleTree 转换出的原子切片连续推入暂存栈。
 */
function pushFoldTreeToSnippetStack(stack, foldTree, options = {}) {
    let current = normalizeSnippetStack(stack);
    const slices = convertFoldTreeToAtomicSlices(foldTree, options);
    const added = [];
    for (const slice of slices) {
        const res = pushSnippetStackItem(current, slice, options);
        current = res.stack;
        if (res.added) added.push(res.added);
    }
    return {stack: current, added};
}

/**
 * 暂存栈内上下调序（支持 Alt+↑ / Alt+↓）：在同置顶分区内移动，不破坏置顶锁。
 */
function moveSnippetStackItem(stack, itemId, delta) {
    const current = normalizeSnippetStack(stack);
    const step = Number(delta) < 0 ? -1 : (Number(delta) > 0 ? 1 : 0);
    if (step === 0) return {stack: current, moved: false, index: -1};

    const items = current.items.slice();
    const fromIndex = items.findIndex((item) => item.id === itemId);
    if (fromIndex < 0) return {stack: current, moved: false, index: -1};

    const toIndex = fromIndex + step;
    if (toIndex < 0 || toIndex >= items.length) {
        return {stack: current, moved: false, index: fromIndex};
    }
    // 置顶项与非置顶项边界隔离：置顶锁定项始终锚定栈顶
    if (items[fromIndex].pinned !== items[toIndex].pinned) {
        return {stack: current, moved: false, index: fromIndex};
    }

    const temp = items[fromIndex];
    items[fromIndex] = items[toIndex];
    items[toIndex] = temp;
    return {
        stack: {version: SNIPPET_STACK_SCHEMA_VERSION, items},
        moved: true,
        index: toIndex,
    };
}

/**
 * 切换切片置顶锁定（Pin）：置顶后锁定在栈顶，不随普通清理或容量淘汰丢失。
 */
function toggleSnippetStackPin(stack, itemId) {
    const current = normalizeSnippetStack(stack);
    let toggled = false;
    const updated = current.items.map((item) => {
        if (item.id !== itemId) return item;
        toggled = true;
        return {...item, pinned: !item.pinned};
    });
    if (!toggled) return {stack: current, changed: false};
    return {
        stack: {
            version: SNIPPET_STACK_SCHEMA_VERSION,
            items: stabilizeSnippetStackOrder(updated),
        },
        changed: true,
    };
}

/**
 * 行内微调切片内容或元数据（支持 F2 编辑标题与当前激活分片）。
 */
function updateSnippetStackItem(stack, itemId, patch = {}) {
    const current = normalizeSnippetStack(stack);
    if (!isRecord(patch)) return {stack: current, updated: null};
    let updatedItem = null;
    const nextItems = current.items.map((item, idx) => {
        if (item.id !== itemId) return item;
        const merged = {
            ...item,
            ...(typeof patch.title === "string" ? {title: patch.title} : {}),
            ...(typeof patch.rawFragment === "string" ? {rawFragment: patch.rawFragment} : {}),
            ...(typeof patch.keyFragment === "string" ? {keyFragment: patch.keyFragment} : {}),
            ...(typeof patch.actionFragment === "string" ? {actionFragment: patch.actionFragment} : {}),
            ...(typeof patch.anchorText === "string" ? {anchorText: patch.anchorText} : {}),
            ...(typeof patch.sourceBlockId === "string" ? {sourceBlockId: patch.sourceBlockId} : {}),
            ...(typeof patch.gleanId === "string" ? {gleanId: patch.gleanId} : {}),
            ...(SNIPPET_FRAGMENT_TABS.includes(patch.activeTab) ? {activeTab: patch.activeTab} : {}),
            ...(typeof patch.pinned === "boolean" ? {pinned: patch.pinned} : {}),
            id: item.id,
            createdAt: item.createdAt,
            autoDeriveFragments: false,
        };
        const normalized = normalizeSnippetStackItem(merged, idx);
        if (!normalized) return item;
        updatedItem = normalized;
        return normalized;
    });
    if (!updatedItem) return {stack: current, updated: null};
    return {
        stack: {
            version: SNIPPET_STACK_SCHEMA_VERSION,
            items: stabilizeSnippetStackOrder(nextItems),
        },
        updated: updatedItem,
    };
}

/**
 * 切换切片的多维分片视图（raw 原文分片 / key 核心提炼分片 / action 行动项分片）。
 * itemId 传 "*" 时可一键同步切换栈内全部分片的当前视图。
 */
function switchSnippetStackFragmentTab(stack, itemId, tab) {
    const current = normalizeSnippetStack(stack);
    if (!SNIPPET_FRAGMENT_TABS.includes(tab)) return current;
    return {
        version: SNIPPET_STACK_SCHEMA_VERSION,
        items: current.items.map((item) => (itemId === "*" || item.id === itemId ? {...item, activeTab: tab} : item)),
    };
}

function removeSnippetStackItem(stack, itemId) {
    const current = normalizeSnippetStack(stack);
    const filtered = current.items.filter((item) => item.id !== itemId);
    return {
        stack: {version: SNIPPET_STACK_SCHEMA_VERSION, items: filtered},
        removed: filtered.length !== current.items.length,
    };
}

function clearSnippetStack(stack, options = {}) {
    const current = normalizeSnippetStack(stack);
    const keepPinned = options.keepPinned !== false;
    const remaining = keepPinned ? current.items.filter((item) => item.pinned) : [];
    return {
        stack: {version: SNIPPET_STACK_SCHEMA_VERSION, items: remaining},
        clearedCount: current.items.length - remaining.length,
    };
}

function resolveActiveFragmentText(item, mode = "active") {
    const tab = mode === "active" ? item.activeTab : mode;
    if (tab === "key") return item.keyFragment || item.rawFragment || item.actionFragment;
    if (tab === "action") return item.actionFragment || item.keyFragment || item.rawFragment;
    return item.rawFragment || item.keyFragment || item.actionFragment;
}

/**
 * 将暂存栈按序批量组装为带 `((sourceBlockId "来源锚点"))` 血缘反链与
 * `custom-lv-source-block` / `custom-lv-glean-id` 属性的思源结构化 Markdown。
 */
function assembleSnippetStackMarkdown(stack, options = {}) {
    const current = normalizeSnippetStack(stack);
    const filterIds = Array.isArray(options.onlyIds) && options.onlyIds.length > 0
        ? new Set(options.onlyIds)
        : null;
    const selectedItems = filterIds
        ? current.items.filter((item) => filterIds.has(item.id))
        : current.items;

    if (selectedItems.length === 0) {
        return {markdown: "", itemCount: 0, backlinkCount: 0, blockAttrCount: 0, blocks: []};
    }

    const mode = ["full", "active", "raw", "key", "action"].includes(options.mode) ? options.mode : "full";
    const includeBlockAttrs = options.includeBlockAttrs !== false;
    const headingTitle = cleanSingleLine(options.headingTitle || "", SNIPPET_STACK_TITLE_MAX);

    let backlinkCount = 0;
    let blockAttrCount = 0;
    const blocks = [];

    if (headingTitle) {
        blocks.push(`## ${headingTitle}`);
    }

    selectedItems.forEach((item, idx) => {
        const backlink = item.sourceBlockId
            ? formatBlockRefBacklink(item.sourceBlockId, item.anchorText || item.title)
            : "";
        if (backlink) backlinkCount += 1;

        const ial = includeBlockAttrs
            ? formatLineageKramdownIAL({sourceBlockId: item.sourceBlockId, gleanId: item.gleanId})
            : "";
        if (ial) blockAttrCount += 1;

        if (mode === "full") {
            const sectionLines = [`### ${idx + 1}. ${item.title}`];
            if (item.keyFragment && item.keyFragment !== item.rawFragment) {
                sectionLines.push(item.keyFragment);
            }
            if (item.rawFragment) {
                const quoteBody = item.rawFragment
                    .split("\n")
                    .map((line) => `> ${line}`)
                    .join("\n");
                sectionLines.push(backlink ? `${quoteBody}\n> — ${backlink}` : quoteBody);
            } else if (backlink) {
                sectionLines.push(`> 来源依据：${backlink}`);
            }
            if (item.actionFragment) {
                sectionLines.push(item.actionFragment);
            }
            if (ial) {
                sectionLines.push(ial);
            }
            blocks.push(sectionLines.join("\n\n"));
            return;
        }

        const body = resolveActiveFragmentText(item, mode);
        const paragraph = backlink ? `${body} ${backlink}` : body;
        blocks.push(ial ? `${paragraph}\n${ial}` : paragraph);
    });

    return {
        markdown: blocks.join("\n\n"),
        itemCount: selectedItems.length,
        backlinkCount,
        blockAttrCount,
        blocks,
    };
}

/**
 * 选区上下文特征识别（借鉴 Rubick Super Panel）：
 * 识别长段落（>200 字）、含 URL、含任务列表 `- [ ]`、代码块、短文本或空白光标，
 * 并输出对应的悬浮球与动作面板置顶推荐动作序列。
 */
function analyzeSelectionContext(input) {
    const record = typeof input === "string"
        ? {text: input}
        : (isRecord(input) ? input : {});
    const rawText = typeof record.text === "string" ? record.text : "";
    const trimmed = cleanMultiline(rawText, SNIPPET_STACK_RAW_MAX * 2);
    const charCount = Array.from(trimmed).length;
    const sourceBlockId = cleanSafeId(record.blockId || record.sourceBlockId || "");
    const sourceDocId = cleanSafeId(record.rootId || record.sourceDocId || "");
    const sourceTitle = cleanSingleLine(record.docTitle || record.sourceTitle || "", SNIPPET_STACK_TITLE_MAX);

    if (charCount === 0) {
        return {
            kind: "none",
            charCount: 0,
            hasUrl: false,
            hasTaskList: false,
            isCodeBlock: false,
            isLongParagraph: false,
            text: "",
            sourceBlockId,
            sourceDocId,
            sourceTitle,
            recommendedFloatingBallActionIds: [],
            recommendedPaletteActionIds: [],
        };
    }

    const hasTaskList = Boolean(record.hasTaskMarker) || TASK_LIST_DETECT_RE.test(trimmed);
    const urlMatch = trimmed.match(URL_DETECT_RE);
    const hasUrl = Boolean(urlMatch);
    const isCodeBlock = Boolean(record.isCodeBlock) || FENCED_CODE_DETECT_RE.test(trimmed);
    const isLongParagraph = charCount > SELECTION_LONG_PARAGRAPH_THRESHOLD;

    let kind = "short-text";
    let recommendedFloatingBallActionIds = ["stack-capture", "quick-capture", "search"];
    let recommendedPaletteActionIds = ["stack-capture", "copy-block-link", "open-active"];

    if (hasTaskList) {
        kind = "task-list";
        recommendedFloatingBallActionIds = ["stack-capture", "quick-capture", "journal"];
        recommendedPaletteActionIds = ["task-horizon-today", "stack-capture", "copy-block-link"];
    } else if (hasUrl) {
        kind = "url";
        recommendedFloatingBallActionIds = ["stack-capture", "glean-keep-roaming", "quick-capture"];
        recommendedPaletteActionIds = ["glean-keep-roaming", "stack-capture", "copy-markdown-link"];
    } else if (isCodeBlock) {
        kind = "code-block";
        recommendedFloatingBallActionIds = ["snippet-studio", "stack-capture", "clipboard"];
        recommendedPaletteActionIds = ["stack-capture", "copy-block-link", "open-preview"];
    } else if (isLongParagraph) {
        kind = "long-paragraph";
        recommendedFloatingBallActionIds = ["stack-capture", "quick-capture", "snippet-studio"];
        recommendedPaletteActionIds = ["stack-capture", "glean-keep-roaming", "copy-block-link"];
    }

    return {
        kind,
        charCount,
        hasUrl,
        extractedUrl: urlMatch ? urlMatch[0].slice(0, 512) : "",
        hasTaskList,
        isCodeBlock,
        isLongParagraph,
        text: trimmed.slice(0, SNIPPET_STACK_RAW_MAX),
        sourceBlockId,
        sourceDocId,
        sourceTitle,
        recommendedFloatingBallActionIds,
        recommendedPaletteActionIds,
    };
}

function resolveActionIdentifier(action) {
    if (!isRecord(action)) return "";
    const id = action.actionId ?? action.id ?? action.value;
    return typeof id === "string" ? id.trim() : "";
}

/**
 * 按选区上下文将最匹配的推荐动作智能置顶，其余动作保持原有顺序。
 * 无选区（kind === "none"）时原样返回副本，零副作用。
 */
function rankActionsBySelectionContext(actions, selectionInput, options = {}) {
    if (!Array.isArray(actions)) return [];
    const context = isRecord(selectionInput) && SELECTION_KINDS.includes(selectionInput.kind)
        ? selectionInput
        : analyzeSelectionContext(selectionInput);

    if (context.kind === "none") {
        return actions.slice();
    }

    const target = options.target === "palette" ? "palette" : "floating-ball";
    const recommendedIds = target === "palette"
        ? context.recommendedPaletteActionIds
        : context.recommendedFloatingBallActionIds;
    if (!Array.isArray(recommendedIds) || recommendedIds.length === 0) {
        return actions.slice();
    }

    const rankMap = new Map();
    recommendedIds.forEach((id, idx) => {
        if (id && !rankMap.has(id)) rankMap.set(id, idx);
    });

    const promoted = [];
    const rest = [];
    for (const action of actions) {
        if (!isRecord(action)) continue;
        const id = resolveActionIdentifier(action);
        const value = typeof action.value === "string" ? action.value.trim() : "";
        const rank = rankMap.has(id) ? rankMap.get(id) : (rankMap.has(value) ? rankMap.get(value) : -1);
        if (rank >= 0) {
            promoted.push({
                item: {
                    ...action,
                    recommended: true,
                    recommendReason: context.kind,
                },
                rank,
            });
        } else {
            rest.push(action);
        }
    }
    promoted.sort((a, b) => a.rank - b.rank);
    return [...promoted.map((entry) => entry.item), ...rest];
}

module.exports = {
    SNIPPET_STACK_SCHEMA_VERSION,
    SNIPPET_STACK_MAX,
    SNIPPET_STACK_TITLE_MAX,
    SNIPPET_STACK_RAW_MAX,
    SNIPPET_STACK_KEY_MAX,
    SNIPPET_STACK_ACTION_MAX,
    SNIPPET_STACK_ANCHOR_MAX,
    SNIPPET_FRAGMENT_TABS,
    SELECTION_KINDS,
    SELECTION_LONG_PARAGRAPH_THRESHOLD,
    isVerbatimSubstring,
    extractVerbatimBrief,
    extractTopicFromText,
    extractKeySummaryFromText,
    extractActionItemsFromText,
    buildLineageCustomAttrs,
    formatBlockRefBacklink,
    formatLineageKramdownIAL,
    normalizeSnippetStackItem,
    createEmptySnippetStack,
    normalizeSnippetStack,
    pushSnippetStackItem,
    convertFoldNodeToAtomicSlice,
    convertFoldTreeToAtomicSlices,
    pushFoldTreeToSnippetStack,
    moveSnippetStackItem,
    toggleSnippetStackPin,
    updateSnippetStackItem,
    switchSnippetStackFragmentTab,
    removeSnippetStackItem,
    clearSnippetStack,
    assembleSnippetStackMarkdown,
    analyzeSelectionContext,
    rankActionsBySelectionContext,
};
