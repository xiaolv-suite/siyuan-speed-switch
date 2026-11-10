// The preview owns an opaque-origin iframe. No host DOM, cookies, native APIs,
// downloads or network; CSS preview has no script permission at all.
function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char]));
}

// T-6960：预览场景目录——固定白名单样例（阅读文档 / 表格与代码 / 界面控件），
// 不拉取个人文档或实际主题资源；宽度档位为有限枚举，容器不足即回退单视图。
const SNIPPET_PREVIEW_SCENES = [
    {id: "reading"},
    {id: "table"},
    {id: "controls"},
];

const SNIPPET_PREVIEW_WIDTHS = [
    {id: "auto", width: 0},
    {id: "narrow", width: 420},
    {id: "medium", width: 768},
    {id: "wide", width: 1024},
];

function normalizePreviewScene(scene) {
    return SNIPPET_PREVIEW_SCENES.some((item) => item.id === scene) ? scene : "reading";
}

// 容器宽度容不下所选档位时返回 0 = 100% 单视图（T-6960 宽度不足回退）。
function resolvePreviewWidth(widthId, containerWidth) {
    const tier = SNIPPET_PREVIEW_WIDTHS.find((item) => item.id === widthId) || null;
    if (!tier || !tier.width) return 0;
    const available = Number(containerWidth);
    if (!Number.isFinite(available) || available < tier.width) return 0;
    return tier.width;
}

// ==================== T-6987：预览契约 v2（能力回执纯模型） ====================
// SceneId/ViewportId/ThemeProfile 全部白名单化；固定可用组合；每次预览输出一条
// 冻结的能力回执（场景/宽度/主题/探针/脚本/网络/语义边界），UI 只渲染不计算。
// 主题档位：light / dark / baseline（基线对照=原始样例、关探针、强制亮色语义）。
const SNIPPET_PREVIEW_THEMES = ["light", "dark", "baseline"];

function normalizePreviewTheme(theme) {
    return SNIPPET_PREVIEW_THEMES.includes(theme) ? theme : "light";
}

function resolvePreviewCapability({type = "css", scene = "reading", width = "auto", dark = false, baseline = false, probeHits = [], containerWidth = 0} = {}) {
    const normalizedScene = normalizePreviewScene(scene);
    const theme = baseline ? "baseline" : normalizePreviewTheme(dark ? "dark" : "light");
    const tier = SNIPPET_PREVIEW_WIDTHS.find((item) => item.id === width) || null;
    const viewportId = tier ? tier.id : "auto";
    const appliedWidth = resolvePreviewWidth(viewportId, containerWidth);
    const probeOn = type !== "js" && !baseline;
    const hits = probeOn && Array.isArray(probeHits)
        ? Object.freeze(probeHits.filter((id) => typeof id === "string").slice(0, 24))
        : Object.freeze([]);
    return Object.freeze({
        type: type === "js" ? "js" : "css",
        scene: normalizedScene,
        viewport: Object.freeze({id: viewportId, appliedWidth}),
        theme,
        probe: Object.freeze({on: probeOn, hits, count: hits.length}),
        // T-7022：两类片段的脚本边界统一为 blocked——js 片段不再注入错误引导
        // bootstrap（该通道随 JS 执行能力一并封死），预览文档零脚本元素。
        script: "blocked",
        network: "none",
        semantics: "approximation",
        // T-6990：主题 token 只读内置快照（基线对照沿用亮色快照，不注入宿主 CSS）。
        tokenSource: theme === "baseline" ? "none" : `builtin-${theme}`,
    });
}

// 能力回执的人读格式：names = {scene, width, theme}（调用方从选择器选项文本取，
// 天然跟随 i18n）；boundary = 固定边界文案（探针/脚本/网络/语义/单视图回退）。
function formatPreviewCapability(capability, names = {}, boundary = {}) {
    const text = (key, fallback) => String(boundary[key] || fallback);
    const widthLabel = capability.viewport.appliedWidth > 0
        ? `${names.width || capability.viewport.id} · ${capability.viewport.appliedWidth}px`
        : `${names.width || capability.viewport.id}（${text("singleView", "容器不足，单视图")}）`;
    const probeLabel = capability.probe.on
        ? text("probeOn", "探针：命中 {n} 项").replace("{n}", String(capability.probe.count))
        : text("probeOff", "探针：关（基线对照）");
    // T-7022：脚本边界恒为 blocked，标签统一走 scriptCss 通道（不再区分 js 分支）
    const scriptLabel = text("scriptCss", "脚本：禁用");
    const tokenLabel = capability.tokenSource === "none"
        ? text("tokenBaseline", "主题 token：基线（无覆盖）")
        : text("tokenProfile", "主题 token：内置快照（只读）");
    return [
        `${text("sceneLabel", "场景")} ${names.scene || capability.scene}`,
        `${text("widthLabel", "宽度")} ${widthLabel}`,
        `${text("themeLabel", "主题")} ${names.theme || capability.theme}`,
        probeLabel,
        scriptLabel,
        text("network", "网络：无"),
        tokenLabel,
        text("semantics", "语义近似预览，不代表当前笔记"),
    ].join(" · ");
}

// ==================== T-6978：CSS 覆盖探针（预览内容跟随片段选择器） ====================
// 用户片段通常只针对部分元素（如只调 h1-h6、只调列表）；固定样例覆盖不到的元素
// 看不到效果。剥离注释/字符串后按词边界检测选择器特征，命中的元素类型以「探针区块」
// 追加进预览。检测方向是保守的（宁可多探一段，不可漏报）。
// 只剥注释；字符串值保留——属性选择器 `[data-type="tag"]` 的引号值是选择器本体，
// 剥掉会漏报（宁可接受 content:"a" 一类罕见误报，方向是探针多一段而非漏命中）。
function stripCssNoise(content) {
    return String(content || "").replace(/\/\*[\s\S]*?\*\//g, " ");
}

const CSS_PROBE_PATTERNS = {
    links: /(^|[^a-zA-Z0-9_-])a(?![a-zA-Z0-9_-])(?=[\s,{[:.+~]|$)|\[data-type="a"\]|\bhref\b/,
    lists: /(^|[^a-zA-Z0-9_-])(ul|ol|li)(?![a-zA-Z0-9_-])|NodeList|NodeListItem/,
    tasks: /NodeTaskListItem|checkbox/,
    images: /(^|[^a-zA-Z0-9_-])img(?![a-zA-Z0-9_-])/,
    tags: /\[data-type="tag"\]|(^|[^a-zA-Z0-9_-])tag(?![a-zA-Z0-9_-])[\s,{[:>+~]/,
    marks: /(^|[^a-zA-Z0-9_-])(strong|em|mark|del|ins|kbd|sub|sup)(?![a-zA-Z0-9_-])|(^|[^a-zA-Z0-9_-])(b|i|s|u)(?=[\s,{[:.+~>]|$)/,
    h3: /(^|[^a-zA-Z0-9_-])h3(?![a-zA-Z0-9_-])|data-subtype="h3"/,
    h4: /(^|[^a-zA-Z0-9_-])h4(?![a-zA-Z0-9_-])|data-subtype="h4"/,
    h5: /(^|[^a-zA-Z0-9_-])h5(?![a-zA-Z0-9_-])|data-subtype="h5"/,
    h6: /(^|[^a-zA-Z0-9_-])h6(?![a-zA-Z0-9_-])|data-subtype="h6"/,
    // T-6989：内容扩展特征——按社区片段真实选择器采样（Callout/列/公式/块属性/
    // 数据库/媒体占位/文档标题）；静态样例，不读取个人文档、不加载任何远程资源。
    callouts: /b3-callout|data-subtype="callout"|NodeBlockquote/,
    columns: /layout-column|NodeLayout(?![a-zA-Z0-9_-])/,
    formula: /katex|mathjax|data-subtype="math"/,
    attrs: /protyle-attr|b3-attr/,
    database: /NodeAttributeView|(^|[^a-zA-Z0-9_-])av(?![a-zA-Z0-9_-])(?=[\s,{[:.+~]|$)/,
    media: /(video|audio|iframe|embed)(?![a-zA-Z0-9_-])|NodeVideo|NodeAudio|NodeIFrame/,
    title: /ProtyleTitle|protyle-title/,
    outline: /protyle-outline|b3-list-item/,
    codeblock: /NodeCodeBlock|code-block|hljs/,
    fold: /fold|protyle-action--fold/,
    table: /(^|[^a-zA-Z0-9_-])(table|tbody|zebra|thead|th|td)(?![a-zA-Z0-9_-])/,
    focus: /NodeParagraph.*focus|focus-within/,
    divider: /(^|[^a-zA-Z0-9_-])hr(?![a-zA-Z0-9_-])|\.hr\b|divider/,
};

// 返回命中的特征 id 有序集合（顺序即探针区块内的呈现顺序）。
function analyzeCssCoverage(content) {
    const stripped = stripCssNoise(content);
    const hits = [];
    for (const [id, pattern] of Object.entries(CSS_PROBE_PATTERNS)) {
        if (pattern.test(stripped)) hits.push(id);
    }
    return hits;
}

// ==================== T-6988：CSS 覆盖诊断（有界 selector 分层分析） ====================
// 从 T-6978 的正则特征探针升级为按规则的结构化诊断：把片段文本按花括号切分出
// 选择器前缀（字符串安全、记录行号、@media/@supports 归属），逐选择器输出
// 命中 / 可能未命中 / 未知 三态与错误行列。有界：规则数/选择器长度/文本长度/
// 错误数/行数全部封顶；不做完整 CSS 解析，不引入 stylelint。
const SELECTOR_DIAGNOSTICS_LIMITS = Object.freeze({
    maxContentLength: 65536,
    maxRules: 200,
    maxSelectorLength: 200,
    maxErrors: 3,
    maxRows: 24,
});

// 静态样例中始终可见的「基础特征」——选择器命中它们即视为命中（无需探针区块）。
const CSS_BASE_FEATURES = /(^|[^a-zA-Z0-9_-])(h1|h2|p|table|blockquote)(?![a-zA-Z0-9_-])|\.bq(?![a-zA-Z0-9_-])|data-type="code"|\.code-block|button|input|select(?![a-zA-Z0-9_-])/;

// 可识别但样例可能没有的 SiYuan 惯用前缀/属性——命中即「可能未命中」而非「未知」。
const CSS_KNOWN_PREFIXES = /(?:^|[^a-zA-Z0-9_-])(?:\.protyle-|\.b3-|\.list--|\.li\b|data-type="|data-subtype=")/;

function analyzeSelectorDiagnostics(content) {
    const limits = SELECTOR_DIAGNOSTICS_LIMITS;
    const source = String(content || "");
    const text = source.length > limits.maxContentLength ? source.slice(0, limits.maxContentLength) : source;
    const rows = [];
    const errors = [];
    const counts = {hit: 0, miss: 0, unknown: 0, selectors: 0, rules: 0};
    let truncated = false;
    let depth = 0;
    let selectorBuffer = "";
    let selectorLine = 1;
    let line = 1;
    let column = 0;
    let atRule = "";
    let inString = "";
    let inComment = false;
    let rulesCapped = false;
    const pushError = (message) => {
        if (errors.length >= limits.maxErrors) return;
        errors.push({line, column: column + 1, message});
    };
    const classifySelector = (rawSelector) => {
        const selector = rawSelector.trim().slice(0, limits.maxSelectorLength);
        if (!selector) return;
        if (counts.selectors >= limits.maxRules) {
            truncated = true;
            return;
        }
        counts.selectors += 1;
        const features = [];
        for (const [id, pattern] of Object.entries(CSS_PROBE_PATTERNS)) {
            if (pattern.test(selector)) features.push(id);
        }
        const baseHit = CSS_BASE_FEATURES.test(selector);
        const hasAttribute = /\[[^\]]+\]/.test(selector);
        const hasPseudo = /::?[a-zA-Z-]+/.test(selector);
        const isComplex = /[>+~]|\s/.test(selector.replace(/\[[^\]]*\]/g, " "));
        const recognizableUnknown = !features.length && !baseHit && CSS_KNOWN_PREFIXES.test(selector);
        const verdict = features.length || baseHit ? "hit" : recognizableUnknown ? "miss" : "unknown";
        counts[verdict] += 1;
        if (rows.length < limits.maxRows) {
            rows.push({selector, line: selectorLine, atRule, verdict, features, attribute: hasAttribute, pseudo: hasPseudo, complex: isComplex});
        }
    };
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index];
        if (char === "\n") {
            line += 1;
            column = 0;
        } else {
            column += 1;
        }
        if (inString) {
            if (char === "\\") index += 1;
            else if (char === inString) inString = "";
            selectorBuffer += char;
            continue;
        }
        // 注释状态机：注释内的 { } 引号一律不参与结构（换行计数已在上方处理）；
        // 字符串分支在前——字符串里的 /* 是内容不是注释起点。
        if (inComment) {
            if (char === "*" && text[index + 1] === "/") {
                inComment = false;
                index += 1;
            }
            continue;
        }
        if (char === "/" && text[index + 1] === "*") {
            inComment = true;
            index += 1;
            continue;
        }
        if (char === '"' || char === "'") {
            inString = char;
            selectorBuffer += char;
            continue;
        }
        if (char === "{") {
            const header = selectorBuffer.trim();
            if (header.startsWith("@")) {
                atRule = /^@media\b/.test(header) ? "media" : /^@supports\b/.test(header) ? "supports" : "other";
            } else {
                if (!rulesCapped) {
                    counts.rules += 1;
                    if (counts.rules >= limits.maxRules) rulesCapped = true;
                }
                header.split(",").forEach((part) => classifySelector(part));
            }
            selectorBuffer = "";
            depth += 1;
            continue;
        }
        if (char === "}") {
            if (depth <= 0) pushError("多余的右花括号");
            else depth -= 1;
            if (depth === 0) atRule = "";
            selectorBuffer = "";
            continue;
        }
        if (char === ";" && depth === 0) {
            // 顶层散落声明（如孤立的 `color:red;`）按无规则选择器处理，不进诊断
            selectorBuffer = "";
            continue;
        }
        if (!selectorBuffer.trim() && !/\s/.test(char)) selectorLine = line;
        selectorBuffer += char;
    }
    if (depth > 0) pushError("缺少右花括号");
    return {rows, counts, errors, truncated, limits};
}

// 假块 ID：格式对齐思源（14 位时间戳 + 7 位随机）；仅用于让
// `.protyle-wysiwyg [data-node-id].h1` 这类社区惯用选择器命中，语义即「块」。
const PROBE_NODE_IDS = [
    "20240101120000-1a2b3c4", "20240101120001-2b3c4d5", "20240101120002-3c4d5e6",
    "20240101120003-4d5e6f7", "20240101120004-5e6f7a8", "20240101120005-6f7a8b9",
    "20240101120006-7a8b9c0", "20240101120007-8b9c0d1", "20240101120008-9c0d1e2",
    "20240101120009-0d1e2f3", "20240101120010-a1b2c3d", "20240101120011-b2c3d4e",
    "20240101120012-c3d4e5f", "20240101120013-d4e5f6a", "20240101120014-e5f6a7b",
    "20240101120015-f6a7b8c", "20240101120016-a7b8c9d", "20240101120017-b8c9d0e",
];

function probeNodeId(index) {
    return PROBE_NODE_IDS[index % PROBE_NODE_IDS.length];
}

// 与真实思源文档结构对齐的最小块集合（data-node-id + data-type + data-subtype）。
// 容器同时挂 protyle-wysiwyg 与 b3-typography 两个类：社区片段对阅读区
// （.protyle-wysiwyg [data-node-id].h1）与导出/闪卡视图（.b3-typography h1）
// 两种惯用写法都必须命中——沙箱内合并是务实的近似，忠实性让位于可用性。
function buildSceneBody(scene, text, features = [], category = "") {
    const nid = (i) => ` data-node-id="${probeNodeId(i)}"`;
    const heading = `<div class="h1"${nid(0)} data-type="NodeHeading" data-subtype="h1"><div contenteditable="true">${text("title", "让灵感有自己的样子")}</div></div>`;
    const paragraph = `<div class="p"${nid(1)} data-type="NodeParagraph"><div contenteditable="true">${text("paragraph", "中文与 English 混排，1234567890。预览标题、正文与代码，观察你的样式如何改变阅读体验。")}</div></div>`;
    const quote = `<div class="bq"${nid(2)} data-type="NodeBlockquote"><div contenteditable="true">${text("quote", "先看效果，再决定是否启用。每一次调整都从可恢复的草稿开始。")}</div></div>`;
    const section = `<div class="h2"${nid(3)} data-type="NodeHeading" data-subtype="h2"><div contenteditable="true">${text("section", "一份清晰的工作记录")}</div></div>`;
    const inlineCode = `<div class="p"${nid(4)} data-type="NodeParagraph"><div contenteditable="true">${text("codeLabel", "行内代码")} <span data-type="code">const idea = "hello";</span></div></div>`;
    const table = `<div class="table"${nid(5)} data-type="NodeTable"><table><thead><tr><th>${text("item", "项目")}</th><th>${text("state", "状态")}</th><th>${text("progress", "进度")}</th></tr></thead><tbody><tr><td>${text("reading", "阅读")}</td><td>${text("ready", "就绪")}</td><td>80%</td></tr><tr><td>${text("writing", "写作")}</td><td>${text("draft", "草稿")}</td><td>40%</td></tr></tbody></table></div>`;
    const codeBlock = `<div class="code-block"${nid(6)} data-type="NodeCodeBlock"><div class="hljs">function greet(name) {\n  return 'Hello, ' + name;\n}</div></div>`;
    const demoButton = `<div class="p"${nid(7)} data-type="NodeParagraph"><button id="demo-button" type="button">${text("button", "交互测试按钮")}</button> <span id="demo-output"></span></div>`;
    const base = scene === "table"
        ? `${heading}${section}${table}${inlineCode}${codeBlock}`
        : scene === "controls"
            ? `<div class="h2"${nid(8)} data-type="NodeHeading" data-subtype="h2"><div contenteditable="true">${text("section", "界面控件")}</div></div>`
                + `<div class="p"${nid(9)} data-type="NodeParagraph"><button type="button">主要按钮</button> <button type="button" class="is-ghost">次要按钮</button> <button type="button" disabled>禁用按钮</button></div>`
                + `<div class="p"><label><input type="checkbox" checked> 启用</label> <label><input type="radio" name="demo" checked> 选项一</label> <label><input type="radio" name="demo"> 选项二</label></div>`
                + `<div class="p"><input type="text" placeholder="文本输入框"> <select><option>下拉选项</option></select></div>`
                + `<div class="p"><span class="demo-chip">标签</span> <span class="demo-chip is-accent">强调标签</span> <span class="demo-count">3</span></div>`
                + table + quote
            : `${heading}${paragraph}${quote}${section}${inlineCode}${table}${codeBlock}${demoButton}`;

    const activeFeatures = [...features];
    if (category) {
        if (/code/.test(category) && !activeFeatures.includes("codeblock")) activeFeatures.push("codeblock");
        if (/outline/.test(category) && !activeFeatures.includes("outline")) activeFeatures.push("outline");
        if (/quote|callout/.test(category) && !activeFeatures.includes("callouts")) activeFeatures.push("callouts");
        if (/heading|fold/.test(category) && !activeFeatures.includes("fold")) activeFeatures.push("fold");
        if (/table/.test(category) && !activeFeatures.includes("table")) activeFeatures.push("table");
        if (/focus/.test(category) && !activeFeatures.includes("focus")) activeFeatures.push("focus");
        if (/tag/.test(category) && !activeFeatures.includes("tags")) activeFeatures.push("tags");
        if (/image/.test(category) && !activeFeatures.includes("images")) activeFeatures.push("images");
        if (/divider/.test(category) && !activeFeatures.includes("divider")) activeFeatures.push("divider");
        if (/list|task/.test(category) && !activeFeatures.includes("tasks")) activeFeatures.push("tasks");
        if (/link/.test(category) && !activeFeatures.includes("links")) activeFeatures.push("links");
    }

    const probeSection = buildProbeSection(activeFeatures, text);
    if (!probeSection) return base;
    // 智能内容感知优先置顶：当前代码定制了特定元素时，优先将对应样式元素展示在预览区最上方
    return `${probeSection}<div class="p" style="margin:20px 0 16px;border-top:1px dashed var(--b3-border-color);opacity:0.6;"></div>${base}`;
}

// 探针区块：只包含当前 CSS 命中的元素类型；无命中则整块省略（基础样例照旧）。
function buildProbeSection(features, text) {
    if (!features.length) return "";
    const nid = (i) => ` data-node-id="${probeNodeId(i + 8)}"`;
    const parts = [];
    let cursor = 0;
    const hasHeadings = features.some((f) => ["h3", "h4", "h5", "h6", "title"].includes(f));
    if (hasHeadings) {
        parts.push(`<div class="h1"${nid(cursor++)} data-type="NodeHeading" data-subtype="h1"><div contenteditable="true">${text("probeH1", "一级标题探针 · 特征置顶")}</div></div>`);
        parts.push(`<div class="h2"${nid(cursor++)} data-type="NodeHeading" data-subtype="h2"><div contenteditable="true">${text("probeH2", "二级标题探针 · 特征置顶")}</div></div>`);
    }
    if (features.includes("h3")) {
        parts.push(`<div class="h3"${nid(cursor++)} data-type="NodeHeading" data-subtype="h3"><div contenteditable="true">${text("probeH3", "三级标题探针")}</div></div>`);
    }
    if (features.includes("h4")) {
        parts.push(`<div class="h4"${nid(cursor++)} data-type="NodeHeading" data-subtype="h4"><div contenteditable="true">${text("probeH4", "四级标题探针")}</div></div>`);
    }
    if (features.includes("h5")) {
        parts.push(`<div class="h5"${nid(cursor++)} data-type="NodeHeading" data-subtype="h5"><div contenteditable="true">${text("probeH5", "五级标题探针")}</div></div>`);
    }
    if (features.includes("h6")) {
        parts.push(`<div class="h6"${nid(cursor++)} data-type="NodeHeading" data-subtype="h6"><div contenteditable="true">${text("probeH6", "六级标题探针")}</div></div>`);
    }
    if (features.includes("links")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">🔗 外部链接与超链接效果演示（观察斜角图标 ↗ 与悬浮发光边条）：</div>`
            + `<div class="p"${nid(cursor++)} data-type="NodeParagraph"><div contenteditable="true">${text("probeLinksLead", "链接探针：")}<span data-type="a" class="a" style="cursor:pointer;"><a href="#probe">${text("probeLinksAnchor", "访问思源笔记官网")}</a></span> · <span data-type="a" class="a" style="cursor:pointer;"><a href="#probe">链滴社区前沿分享</a></span></div></div>`);
    }
    if (features.includes("lists")) {
        parts.push(`<div class="list"${nid(cursor++)} data-type="NodeList" data-subtype="o"><div class="li"${nid(cursor++)} data-type="NodeListItem" data-subtype="o"><div class="p" contenteditable="true">${text("probeListItem", "列表项探针")}</div></div><div class="li"${nid(cursor++)} data-type="NodeListItem" data-subtype="o"><div class="p" contenteditable="true">${text("probeListItem2", "第二项，观察列表样式")}</div></div></div>`);
    }
    if (features.includes("tasks")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">☑️ 待办任务复选框弹性微跳跃演示（观察弹性动效与完成删除线）：</div>`
            + `<div class="list"${nid(cursor++)} data-type="NodeList" data-subtype="t"><div class="li"${nid(cursor++)} data-type="NodeTaskListItem" data-subtype="t" data-done="false"><input type="checkbox" style="cursor:pointer;"> <div class="p" contenteditable="true" style="display:inline;">${text("probeTaskTodo", "待办任务探针（点击观察复选框微弹跳跃）")}</div></div><div class="li"${nid(cursor++)} data-type="NodeTaskListItem" data-subtype="t" data-done="true"><input type="checkbox" checked disabled> <div class="p" contenteditable="true" style="display:inline;">${text("probeTaskDone", "已完成任务探针（观察半透文字淡出与删除线）")}</div></div></div>`);
    }
    if (features.includes("images")) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c68d5"/><stop offset="1" stop-color="#4c8bd5"/></linearGradient></defs><rect width="340" height="120" rx="10" fill="url(#g)"/><circle cx="280" cy="40" r="22" fill="#ffffff" opacity="0.65"/><text x="24" y="66" fill="#ffffff" font-size="15" font-family="sans-serif" font-weight="600">思源笔记卡片相框演示</text></svg>`;
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">🖼️ 浮起卡片相框与微阴影图片演示（观察圆角相框与悬浮放大）：</div>`
            + `<div class="p"${nid(cursor++)} data-type="NodeParagraph"><img src="data:image/svg+xml,${encodeURIComponent(svg)}" alt="${text("probeImageAlt", "图片探针")}" width="340" height="120"></div>`);
    }
    if (features.includes("marks")) {
        parts.push(`<div class="p"${nid(cursor++)} data-type="NodeParagraph"><div contenteditable="true"><strong>${text("probeStrong", "粗体")}</strong> <em>${text("probeEm", "斜体")}</em> <mark>${text("probeMark", "高亮")}</mark> <del>${text("probeDel", "删除线")}</del> <u>${text("probeU", "下划线")}</u> <kbd>${text("probeKbd", "Ctrl")}</kbd></div></div>`);
    }
    if (features.includes("tags")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">🏷️ 莫兰迪彩虹胶囊标签演示（观察圆角双层微底与悬浮位移）：</div>`
            + `<div class="p"${nid(cursor++)} data-type="NodeParagraph"><div contenteditable="true"><span class="tag" data-type="tag">#${text("probeTagA", "写作")}</span> <span class="tag" data-type="tag">#${text("probeTagB", "阅读")}</span> <span class="tag" data-type="tag">#${text("probeTagC", "灵感")}</span> <span class="tag" data-type="tag">#链滴分享</span> <span class="demo-chip is-accent">强调徽标</span> <span class="demo-count">7</span></div></div>`);
    }
    if (features.includes("divider")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">✦ 渐变羽化星芒装饰分隔线演示（观察两端淡化与中心星号）：</div>`
            + `<div${nid(cursor++)} data-type="NodeThematicBreak"><hr></div>`);
    }
    // T-6989：内容扩展探针——全部为静态样例，不读取个人文档、不加载任何远程资源；
    // 媒体是「blocked 占位」而非真实 <video>/<iframe> 元素（预览不加载媒体）。
    if (features.includes("title")) {
        parts.push(`<div class="protyle-title"${nid(cursor++)} data-type="NodeDocument">${text("probeDocTitle", "日记标题探针（文档级标题）")}</div>`);
    }
    if (features.includes("callouts")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">💡 Callout 提示块效果演示（柔彩微底、圆角阴影与主题侧边条）：</div>`
            + `<div class="bq b3-callout"${nid(cursor++)} data-type="NodeBlockquote" data-subtype="callout" style="display:flex;align-items:flex-start;gap:8px;margin-bottom:10px;"><span class="b3-callout__icon" style="font-size:16px;line-height:1.2;">💡</span><div contenteditable="true" style="flex:1;"><strong>${text("probeCallout", "Callout 提示块探针")}</strong><div style="font-size:13px;margin-top:2px;">微质感柔彩微底与主题边条已生效，层级分明。</div></div></div>`
            + `<div class="bq"${nid(cursor++)} data-type="NodeBlockquote" style="margin-bottom:12px;"><div contenteditable="true" style="font-size:13px;">标准引述块：对比左侧边线颜色、微光背景与缩进。</div></div>`);
    }
    if (features.includes("columns")) {
        parts.push(`<div${nid(cursor++)} data-type="NodeLayout" class="layout-column"><div class="p" contenteditable="true">${text("probeColumnA", "列布局探针 · 第一列")}</div></div><div${nid(cursor++)} data-type="NodeLayout" class="layout-column"><div class="p" contenteditable="true">${text("probeColumnB", "列布局探针 · 第二列")}</div></div>`);
    }
    if (features.includes("formula")) {
        parts.push(`<div class="p"${nid(cursor++)} data-type="NodeParagraph"><span class="katex" data-subtype="math" contenteditable="true">${text("probeFormula", "公式占位 E=mc²（静态样例，非真实渲染）")}</span></div>`);
    }
    if (features.includes("attrs")) {
        parts.push(`<div class="p"${nid(cursor++)} data-type="NodeParagraph"><div contenteditable="true">${text("probeAttrsLead", "带属性块探针")}</div><div class="protyle-attr">${text("probeAttrsValue", "别名 · #标签 · 自定义属性")}</div></div>`);
    }
    if (features.includes("database")) {
        parts.push(`<div class="av"${nid(cursor++)} data-type="NodeAttributeView"><table><thead><tr><th>${text("probeDbColA", "名称")}</th><th>${text("probeDbColB", "状态")}</th></tr></thead><tbody><tr><td>${text("probeDbRowA", "静态行一")}</td><td>${text("probeDbRowB", "静态行二")}</td></tr></tbody></table></div>`);
    }
    if (features.includes("media")) {
        parts.push(`<div class="p"${nid(cursor++)} data-type="NodeParagraph"><span class="studio-media-blocked" data-type="NodeVideo">${text("probeMediaBlocked", "媒体占位：预览中不加载音视频/嵌入内容")}</span></div>`);
    }
    if (features.includes("outline")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">📑 大纲树层级虚线效果演示（各级缩进彩色对齐虚线与悬浮提亮）：</div>`
            + `<div class="protyle-outline" style="border:1px solid var(--b3-border-color);border-radius:10px;padding:12px;background:var(--b3-theme-surface);margin-bottom:14px;">`
            + `<div class="b3-list-item" style="--indent:0;padding:4px 8px;font-weight:600;"><span class="b3-list-item__text">📑 一级标题：思源笔记核心大纲</span></div>`
            + `<div class="b3-list-item is-active" style="--indent:1;padding:4px 8px 4px 28px;"><span class="b3-list-item__text">📄 二级节点：块级双向链接与引用</span></div>`
            + `<div class="b3-list-item" style="--indent:2;padding:4px 8px 4px 48px;"><span class="b3-list-item__text">💡 三级分片：原子切片与知识流转</span></div>`
            + `<div class="b3-list-item" style="--indent:3;padding:4px 8px 4px 68px;"><span class="b3-list-item__text">🍀 深度聚合看板与视图</span></div>`
            + `<div class="b3-list-item" style="--indent:1;padding:4px 8px 4px 28px;"><span class="b3-list-item__text">📄 二级节点：社区 CSS 个性化渲染</span></div>`
            + `</div>`);
    }
    if (features.includes("codeblock")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">💻 代码块终端视觉效果演示（Mac 三色控制圆点、边框阴影、字阶与行高）：</div>`
            + `<div class="code-block"${nid(cursor++)} data-type="NodeCodeBlock" data-subtype="js" style="position:relative;margin-bottom:12px;"><div class="hljs">`
            + `<span style="color:#7c68d5;">export function</span> <span style="color:#4dabf7;">renderTheme</span>() {\n`
            + `  <span style="color:#51cf66;">const</span> theme = <span style="color:#f2a03d;">"mac-terminal"</span>;\n`
            + `  return theme + <span style="color:#e8637c;">"✨ 终端样式实时生效"</span>;\n`
            + `}</div></div>`
            + `<div class="p" style="font-size:12px;color:var(--b3-theme-on-surface-light);margin:4px 0 12px;">行内代码对照：<span data-type="code" class="code">const status = "ready";</span></div>`);
    }
    if (features.includes("fold")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">📂 折叠标题动效演示（旋转微箭头、虚线装饰与收拢状态）：</div>`
            + `<div class="h2"${nid(cursor++)} data-type="NodeHeading" data-subtype="h2" fold="1" style="display:flex;align-items:center;margin:8px 0;cursor:pointer;"><span class="protyle-action--fold" style="display:inline-flex;align-items:center;margin-right:8px;transform:rotate(-90deg);"><svg viewBox="0 0 32 32" style="width:14px;height:14px;fill:currentColor;"><path d="M10 6L22 16L10 26Z"></path></svg></span><span contenteditable="true">折叠标题演示（已折叠状态 · 带旋转箭头与微光下划线）</span></div>`
            + `<div class="h2"${nid(cursor++)} data-type="NodeHeading" data-subtype="h2" style="display:flex;align-items:center;margin:12px 0 6px;"><span class="protyle-action--fold" style="display:inline-flex;align-items:center;margin-right:8px;"><svg viewBox="0 0 32 32" style="width:14px;height:14px;fill:currentColor;"><path d="M10 6L22 16L10 26Z"></path></svg></span><span contenteditable="true">展开状态标题演示</span></div>`
            + `<div class="p" data-type="NodeParagraph" style="margin:0 0 12px 24px;font-size:13px;color:var(--b3-theme-on-surface-light);">这是展开标题下的正文段落，折叠时随标题收拢隐藏。</div>`);
    }
    if (features.includes("focus")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">🎯 段落聚焦呼吸效果演示（左侧呼吸边条与沉浸底色）：</div>`
            + `<div class="p is-focused"${nid(cursor++)} data-type="NodeParagraph" tabindex="0" autofocus style="border-inline-start:3px solid var(--b3-theme-primary,#3575f0);padding-inline-start:0.8em;background:var(--b3-theme-background-light,rgba(53,117,240,0.06));margin:8px 0;border-radius:0 6px 6px 0;"><div contenteditable="true">👉 当前获得焦点的段落（正在编辑中，左侧呈现主色高亮边条与呼吸淡底色）</div></div>`
            + `<div class="p"${nid(cursor++)} data-type="NodeParagraph" style="margin:8px 0;padding-inline-start:0.8em;color:var(--b3-theme-on-surface-light);"><div contenteditable="true">普通的失焦段落，恢复常规无干扰阅读排版。</div></div>`);
    }
    if (features.includes("table")) {
        parts.push(`<div class="p" style="margin:12px 0 6px;font-size:12px;color:var(--b3-theme-primary);font-weight:600;">📊 表格斑马纹与悬浮提亮效果演示（交替底色、沉浸表头与紧凑内边距）：</div>`
            + `<div class="table"${nid(cursor++)} data-type="NodeTable" style="margin-bottom:14px;"><table><thead><tr><th>序号</th><th>功能模块</th><th>类型</th><th>适配状态</th></tr></thead><tbody>`
            + `<tr><td>1</td><td>大纲树彩虹线</td><td>Outline</td><td><span style="color:var(--b3-theme-primary);font-weight:600;">已就绪</span></td></tr>`
            + `<tr><td>2</td><td>Mac 终端代码块</td><td>CodeBlock</td><td><span style="color:var(--b3-theme-primary);font-weight:600;">已生效</span></td></tr>`
            + `<tr><td>3</td><td>Bento 彩色 Callout</td><td>Quote</td><td><span style="color:var(--b3-theme-primary);font-weight:600;">已生效</span></td></tr>`
            + `<tr><td>4</td><td>表格交替斑马纹</td><td>DataView</td><td><span style="color:var(--b3-theme-primary);font-weight:600;">已就绪</span></td></tr>`
            + `</tbody></table></div>`);
    }
    if (!parts.length) return "";
    const probeHeading = `<div class="h2"${nid(cursor++)} data-type="NodeHeading" data-subtype="h2"><div contenteditable="true">${text("probeTitle", "按当前 CSS 追加的探针内容")}</div></div>`;
    const probeNote = `<div class="p"${nid(cursor++)} data-type="NodeParagraph"><div contenteditable="true" class="studio-probe-note">${text("probeNote", "以下元素由你的片段选择器命中，用于观察对应样式。")}</div></div>`;
    return probeHeading + probeNote + parts.join("");
}

// ==================== T-6990：主题 token bridge（只读内置快照） ====================
// 只读 light/dark 两套 --b3-* 变量快照 + 字体说明；不加载整套宿主 CSS、不允许
// 外部注入（buildSnippetPreviewDocument 不接受 token 参数，快照表冻结）。
// baseline 对照视图沿用亮色快照（原始样例的底色即亮色）。
const SNIPPET_PREVIEW_THEME_PROFILES = Object.freeze({
    light: Object.freeze({
        id: "light",
        colorScheme: "light",
        tokens: Object.freeze({
            "--b3-theme-background": "#fff",
            "--b3-theme-on-background": "#253146",
            "--b3-theme-primary": "#7c68d5",
            "--b3-theme-primary-lightest": "#ece8fa",
            "--b3-theme-surface": "#f5f6fa",
            "--b3-border-color": "#dce1ea",
            "--b3-font-family": "system-ui,sans-serif",
            "--b3-font-family-code": "monospace",
        }),
    }),
    dark: Object.freeze({
        id: "dark",
        colorScheme: "dark",
        tokens: Object.freeze({
            "--b3-theme-background": "#20242c",
            "--b3-theme-on-background": "#e2e8f0",
            "--b3-theme-primary": "#7c68d5",
            "--b3-theme-primary-lightest": "#ece8fa",
            "--b3-theme-surface": "#2a303c",
            "--b3-border-color": "#414958",
            "--b3-font-family": "system-ui,sans-serif",
            "--b3-font-family-code": "monospace",
        }),
    }),
});

function resolveThemeProfile(theme) {
    return SNIPPET_PREVIEW_THEME_PROFILES[theme === "dark" ? "dark" : "light"] || SNIPPET_PREVIEW_THEME_PROFILES.light;
}

function renderThemeTokens(profile) {
    return Object.entries(profile.tokens).map(([key, value]) => `${key}:${value}`).join(";");
}

function buildSnippetPreviewDocument({type = "css", content = "", dark = false, baseline = false, token = "", labels = {}, scene = "reading", category = ""} = {}) {
    const text = (key, fallback) => escapeHtml(labels[key] || fallback);
    // T-6990：主题 token 只读快照（baseline 沿用亮色）；不接受外部 token 注入。
    const themeProfile = resolveThemeProfile(baseline ? "light" : (dark ? "dark" : "light"));
    // T-7022：JS 执行能力整体封死（T-6996 用户决策：维持 blocked）——预览文档
    // 零脚本元素、CSP script-src 恒为 'none'、沙箱恒不带 allow-scripts；
    // UI 按钮禁用不构成安全契约，边界必须由本模块唯一决定。
    const policy = `default-src 'none'; style-src 'unsafe-inline' data:; script-src 'none'; img-src data:; connect-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'`;
    // Data URL preserves CSS tokens exactly and prevents </style> HTML breakout.
    const css = type === "css" && !baseline ? `<link rel="stylesheet" href="data:text/css;charset=utf-8,${encodeURIComponent(content)}">` : "";
    // CSS 预览按片段选择器追加探针内容（baseline 对比视图保持原始样例，不探针）。
    const features = type === "css" && !baseline ? analyzeCssCoverage(content) : [];
    return `<!doctype html><html lang="${text("lang", "zh-CN")}" data-theme-mode="${dark ? "dark" : "light"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(policy)}"><style>
:root{color-scheme:${themeProfile.colorScheme};${renderThemeTokens(themeProfile)}}
*{box-sizing:border-box}body{margin:0;background:var(--b3-theme-background);color:var(--b3-theme-on-background);font-family:var(--b3-font-family);font-size:15px}.studio-demo-bar{padding:12px 24px;border-bottom:1px solid var(--b3-border-color);display:flex;gap:18px;font-size:12px;color:var(--b3-theme-primary)}.studio-probe-note{color:var(--b3-theme-primary);font-size:12px}.protyle-wysiwyg{max-width:820px;margin:auto;padding:24px 32px;line-height:1.6}.h1{font-size:27px;font-weight:700}.h2{font-size:19px;font-weight:650;margin-top:16px}.h3{font-size:17px;font-weight:650;margin-top:14px}.h4,.h5,.h6{font-size:15.5px;font-weight:650;margin-top:12px}.p{margin:12px 0}blockquote,.bq{border-left:3px solid var(--b3-theme-primary);padding:8px 16px;margin:16px 0;background:var(--b3-theme-surface)}.list{margin:12px 0;padding-left:24px}.list .li{margin:6px 0;list-style:disc}table{border-collapse:collapse;width:100%}td,th{padding:8px 12px;border:1px solid var(--b3-border-color);text-align:left}[data-type="code"]{font-family:var(--b3-font-family-code);background:var(--b3-theme-surface);padding:2px 5px;border-radius:4px}.code-block{font-family:var(--b3-font-family-code);background:var(--b3-theme-surface);padding:14px;border-radius:8px;white-space:pre-wrap}button{font:inherit;padding:6px 14px;cursor:pointer}.demo-chip{display:inline-block;padding:2px 10px;border-radius:999px;background:var(--b3-theme-surface);border:1px solid var(--b3-border-color);font-size:12px}.demo-chip.is-accent{background:var(--b3-theme-primary-lightest);color:var(--b3-theme-primary);border-color:transparent}.demo-count{display:inline-block;min-width:20px;text-align:center;padding:1px 6px;border-radius:999px;background:var(--b3-theme-error);color:#fff;font-size:12px}input,select{font:inherit;padding:5px 10px;border:1px solid var(--b3-border-color);border-radius:6px;background:var(--b3-theme-background);color:var(--b3-theme-on-background)}img{max-width:100%;border-radius:8px}.b3-callout{border-left:3px solid var(--b3-theme-primary);padding:8px 14px;margin:12px 0;background:var(--b3-theme-surface)}.layout-column{display:block;padding:8px 12px;margin:10px 0;border:1px dashed var(--b3-border-color);border-radius:8px}.katex{font-family:var(--b3-font-family-code);background:var(--b3-theme-surface);padding:2px 6px;border-radius:4px}.protyle-attr{margin-top:4px;color:var(--b3-theme-on-surface-light);font-size:11px}.av table{margin:8px 0}.studio-media-blocked{display:inline-block;padding:10px 14px;border:1px dashed var(--b3-border-color);border-radius:8px;color:var(--b3-theme-on-surface-light);font-size:12px}.protyle-title{font-size:22px;font-weight:700;margin:0 0 12px}kbd{font-family:var(--b3-font-family-code);border:1px solid var(--b3-border-color);border-bottom-width:2px;border-radius:4px;padding:0 5px;font-size:12px}a{color:var(--b3-theme-primary)}.protyle-outline{font-size:13px;line-height:1.5}.b3-list-item{cursor:pointer;transition:background .15s;border-radius:6px}.b3-list-item:hover{background:var(--b3-theme-surface)}.b3-list-item.is-active{background:color-mix(in srgb,var(--b3-theme-primary) 12%,transparent)}.protyle-action--fold{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;margin-right:6px}.table tbody tr:hover{background:color-mix(in srgb,var(--b3-theme-primary) 6%,transparent)}.protyle-wysiwyg [data-type="NodeParagraph"].is-focused{border-inline-start:3px solid var(--b3-theme-primary,#4c78a8);background:var(--b3-theme-background-light,#f4f5f7)}
</style>${css}</head><body><div class="studio-demo-bar"><span>SiYuan</span><span>${text("sample", "演示文档 · 不读取个人笔记")}</span></div><div class="protyle"><div class="protyle-wysiwyg b3-typography protyle-wysiwyg--attr" spellcheck="false">${buildSceneBody(normalizePreviewScene(scene), text, features, category)}</div></div></body></html>`;
}

function createSnippetPreview(container, {title, labels, onError = () => {}, onReady = () => {}} = {}) {
    const doc = container.ownerDocument;
    const win = doc.defaultView;
    let frame = null;
    let disposed = false;
    let token = "";
    const handleMessage = (event) => {
        if (disposed || event.source !== frame?.contentWindow || event.data?.kind !== "sw-snippet-preview" || event.data.token !== token) return;
        if (typeof event.data.error === "string") onError(event.data.error.slice(0, 200));
    };
    win.addEventListener("message", handleMessage);
    return {
        render(options) {
            if (disposed) return;
            frame?.remove();
            const nextFrame = doc.createElement("iframe");
            nextFrame.addEventListener("load", () => {
                if (!disposed && frame === nextFrame) onReady();
            }, {once: true});
            frame = nextFrame;
            token = `${Date.now()}-${Math.random()}`;
            frame.title = title || "Snippet preview";
            frame.referrerPolicy = "no-referrer";
            // T-7022：沙箱恒不带 allow-scripts——JS 预览能力已在模块层封死
            frame.setAttribute("sandbox", "");
            frame.setAttribute("allow", "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'");
            // T-6960：宽度档位——容器容不下所选档位时回退单视图（100%）
            const fixedWidth = resolvePreviewWidth(options.width, container.clientWidth);
            if (fixedWidth > 0) {
                nextFrame.style.width = `${fixedWidth}px`;
                nextFrame.style.margin = "0 auto";
                nextFrame.style.display = "block";
            }
            frame.srcdoc = buildSnippetPreviewDocument({...options, scene: options.scene, labels, token});
            container.replaceChildren(frame);
        },
        clear() {
            if (disposed) return;
            frame?.remove();
            frame = null;
            token = "";
        },
        dispose() { disposed = true; frame?.remove(); frame = null; win.removeEventListener("message", handleMessage); },
    };
}

module.exports = {SNIPPET_PREVIEW_SCENES, SNIPPET_PREVIEW_WIDTHS, SNIPPET_PREVIEW_THEMES, SNIPPET_PREVIEW_THEME_PROFILES, CSS_PROBE_PATTERNS, normalizePreviewScene, normalizePreviewTheme, resolvePreviewWidth, resolvePreviewCapability, formatPreviewCapability, resolveThemeProfile, renderThemeTokens, analyzeCssCoverage, analyzeSelectorDiagnostics, SELECTOR_DIAGNOSTICS_LIMITS, stripCssNoise, buildSnippetPreviewDocument, createSnippetPreview};
