"use strict";

// Experimental snippet studio: pure data operations. Native snippets remain
// authoritative; previews and AI drafts must not enter the native list implicitly.
const SNIPPET_CODE_MAX = 65536;
const NEW_SNIPPET_ID = /^\d{14}-[a-z0-9]{7}$/;
const SNIPPET_BACKUP_SCHEMA_VERSION = 1;
const SNIPPET_BACKUP_MAX_SNIPPETS = 256;
const SNIPPET_BACKUP_MAX_BYTES = 2 * 1024 * 1024;
const encoder = new TextEncoder();

function fail(code) {
    const error = new Error(code);
    error.code = code;
    throw error;
}

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** Clone JSON values without dropping unknown host fields or invoking setters. */
function cloneJson(value, ancestors = new Set()) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if ((!isRecord(value) && !Array.isArray(value)) || ancestors.has(value)) fail("snippet-invalid-data");
    ancestors.add(value);
    const clone = Array.isArray(value)
        ? value.map((item) => cloneJson(item, ancestors))
        : Object.fromEntries(Object.keys(value).map((key) => [key, cloneJson(value[key], ancestors)]));
    ancestors.delete(value);
    return clone;
}

function assertNativeSnippet(snippet) {
    if (!isRecord(snippet)
        || typeof snippet.id !== "string" || snippet.id.length === 0 || /[\u0000-\u001f\u007f]/.test(snippet.id)
        || typeof snippet.name !== "string" || typeof snippet.content !== "string"
        || (snippet.type !== "css" && snippet.type !== "js") || typeof snippet.enabled !== "boolean"
        || (Object.hasOwn(snippet, "disabledInPublish") && typeof snippet.disabledInPublish !== "boolean")) {
        fail("snippet-invalid-data");
    }
}

// The kernel's setSnippet contract is intentionally narrower than the object
// we keep in memory. Unknown fields may be returned by a future host build and
// are useful for conflict detection, but must never be sent back to an
// additionalProperties:false endpoint.
function projectSnippetForWire(snippet) {
    assertNativeSnippet(snippet);
    return {
        id: snippet.id,
        name: snippet.name,
        type: snippet.type,
        content: snippet.content,
        enabled: snippet.enabled,
        // Snippet responses require this field; older native rows may omit it.
        // The input contract permits omission, and false preserves that legacy
        // row's effective publish behavior.
        disabledInPublish: typeof snippet.disabledInPublish === "boolean" ? snippet.disabledInPublish : false,
    };
}

function projectSnippetListForWire(snippets) {
    if (!Array.isArray(snippets)) fail("snippet-invalid-data");
    return snippets.map(projectSnippetForWire);
}

function cloneNativeList(list) {
    if (!Array.isArray(list)) fail("snippet-invalid-data");
    const seen = new Set();
    for (const snippet of list) {
        assertNativeSnippet(snippet);
        if (seen.has(snippet.id)) fail("snippet-duplicate-id");
        seen.add(snippet.id);
    }
    return cloneJson(list);
}

function normalizeSnippetSettings(settings) {
    if (!isRecord(settings)
        || typeof settings.enabledCSS !== "boolean"
        || typeof settings.enabledJS !== "boolean") {
        fail("snippet-settings-invalid");
    }
    return {enabledCSS: settings.enabledCSS, enabledJS: settings.enabledJS};
}

function normalizeSnippetSnapshot(value) {
    const source = Array.isArray(value) ? {snippets: value} : value;
    if (!isRecord(source) || !Array.isArray(source.snippets)) fail("snippet-snapshot-invalid");
    const snippets = projectSnippetListForWire(cloneNativeList(source.snippets));
    const settings = normalizeSnippetSettings(source.settings || {enabledCSS: true, enabledJS: true});
    if (snippets.length > SNIPPET_BACKUP_MAX_SNIPPETS) fail("snippet-backup-too-many");
    return {snippets, settings};
}

function snippetSnapshotSignature(value) {
    return JSON.stringify(normalizeSnippetSnapshot(value));
}

function buildSnippetBackup(snapshot, options = {}) {
    const normalized = normalizeSnippetSnapshot(snapshot);
    const createdAt = Number(options.now) > 0 ? Math.round(Number(options.now)) : Date.now();
    const backup = {
        kind: "siyuan-snippet-backup",
        version: SNIPPET_BACKUP_SCHEMA_VERSION,
        createdAt,
        source: options.source === "undo" ? "undo" : "native",
        snippets: normalized.snippets,
        settings: normalized.settings,
    };
    const bytes = encoder.encode(JSON.stringify(backup)).byteLength;
    if (bytes > SNIPPET_BACKUP_MAX_BYTES) fail("snippet-backup-too-large");
    return cloneJson({...backup, bytes});
}

function normalizeSnippetBackup(value) {
    try {
        if (!isRecord(value)
            || value.kind !== "siyuan-snippet-backup"
            || value.version !== SNIPPET_BACKUP_SCHEMA_VERSION
            || !Number.isFinite(Number(value.createdAt))
            || Number(value.createdAt) <= 0
            || (value.source !== "native" && value.source !== "undo")
            || !Array.isArray(value.snippets)) return null;
        const snapshot = normalizeSnippetSnapshot(value);
        const bytes = encoder.encode(JSON.stringify({
            kind: value.kind, version: value.version, createdAt: Math.round(Number(value.createdAt)),
            source: value.source, snippets: snapshot.snippets, settings: snapshot.settings,
        })).byteLength;
        if (bytes > SNIPPET_BACKUP_MAX_BYTES) return null;
        return Object.freeze({
            kind: value.kind,
            version: value.version,
            createdAt: Math.round(Number(value.createdAt)),
            source: value.source,
            snippets: Object.freeze(snapshot.snippets),
            settings: Object.freeze(snapshot.settings),
            bytes,
        });
    } catch (_) {
        return null;
    }
}

function diffSnippetBackup(current, backup) {
    const currentSnapshot = normalizeSnippetSnapshot(current);
    const normalizedBackup = normalizeSnippetBackup(backup);
    if (!normalizedBackup) fail("snippet-backup-invalid");
    const currentById = new Map(currentSnapshot.snippets.map((snippet) => [snippet.id, snippet]));
    const backupById = new Map(normalizedBackup.snippets.map((snippet) => [snippet.id, snippet]));
    const rows = [];
    for (const after of normalizedBackup.snippets) {
        const before = currentById.get(after.id) || null;
        rows.push({
            id: after.id,
            action: before ? (JSON.stringify(before) === JSON.stringify(after) ? "keep" : "replace") : "add",
            before,
            after,
        });
    }
    for (const before of currentSnapshot.snippets) {
        if (backupById.has(before.id)) continue;
        rows.push({id: before.id, action: "delete", before, after: null});
    }
    const changed = rows.filter((row) => row.action !== "keep");
    return {
        rows,
        changed,
        summary: {
            total: rows.length,
            changed: changed.length,
            keep: rows.filter((row) => row.action === "keep").length,
            add: rows.filter((row) => row.action === "add").length,
            replace: rows.filter((row) => row.action === "replace").length,
            delete: rows.filter((row) => row.action === "delete").length,
            settingsChanged: JSON.stringify(currentSnapshot.settings) !== JSON.stringify(normalizedBackup.settings),
        },
        backup: normalizedBackup,
        current: currentSnapshot,
    };
}

function buildSnippetRestorePlan(current, backup, options = {}) {
    const diff = diffSnippetBackup(current, backup);
    const ids = options.ids instanceof Set
        ? new Set(options.ids)
        : new Set(Array.isArray(options.ids) ? options.ids : diff.changed.map((row) => row.id));
    const includeDeletes = options.includeDeletes !== false;
    const selected = diff.rows.filter((row) => row.action !== "keep" && ids.has(row.id));
    const selectedById = new Map(selected.map((row) => [row.id, row]));
    const snippets = [];
    for (const snippet of diff.current.snippets) {
        const row = selectedById.get(snippet.id);
        if (!row) snippets.push(snippet);
        else if (row.action === "delete" && !includeDeletes) snippets.push(snippet);
        else if (row.action !== "delete") snippets.push(row.after);
    }
    for (const row of diff.rows) {
        if (row.action === "add" && selectedById.has(row.id)) snippets.push(row.after);
    }
    const settings = options.restoreSettings === false ? diff.current.settings : diff.backup.settings;
    const snapshot = {snippets, settings};
    return {
        ...diff,
        selected: selected.map((row) => row.id),
        settingsSelected: options.restoreSettings !== false,
        snapshot,
        signature: snippetSnapshotSignature(snapshot),
    };
}

/** Malformed/error responses must never be treated as an empty native store. */
function readNativeSnippetResponse(response) {
    if (!isRecord(response) || response.code !== 0 || !isRecord(response.data)) {
        fail("snippet-read-failed");
    }
    return cloneNativeList(response.data.snippets);
}

function assertDraftCode(content) {
    if (typeof content !== "string" || content.trim().length === 0 || content.includes("\u0000")) {
        fail("snippet-invalid-code");
    }
    if (encoder.encode(content).byteLength > SNIPPET_CODE_MAX) fail("snippet-code-too-large");
}

/** Import plain code as an inert draft. No imported file can enable itself. */
function parseSnippetImport(filename, text) {
    if (typeof filename !== "string" || typeof text !== "string") fail("snippet-import-invalid");
    const basename = filename.split(/[\\/]/).pop();
    const extension = basename.match(/\.(css|js)$/i);
    if (!extension) fail("snippet-import-type");
    const name = basename.slice(0, -extension[0].length).trim();
    if (!name || /[\u0000-\u001f\u007f]/.test(name)) fail("snippet-import-name");
    // T-6912/T-6923：普通样式去头防往返累积；含 @var/@advanced 变量的样式保留
    // 头部并按默认值代入占位符（变量数随导入回执披露）。
    let content;
    let varsResolved = 0;
    const headerMatch = text.match(/^\uFEFF?(\/\* ==UserStyle==[\s\S]*?==\/UserStyle== \*\/)/);
    if (headerMatch && /@(?:var|advanced)\b/i.test(headerMatch[1])) {
        const resolved = resolveUsercssVariables(text);
        content = resolved.text;
        varsResolved = resolved.resolved;
    } else {
        content = stripUsercssHeader(text);
    }
    assertDraftCode(content);
    return {name, type: extension[1].toLowerCase(), content, enabled: false, ...(varsResolved > 0 ? {varsResolved} : {})};
}

const USERCSS_HEADER_RE = /\/\* ==UserStyle==[\s\S]*?==\/UserStyle== \*\//;

/**
 * T-6912（R8-A4）：usercss 生态互通头。只有展示用元数据（名称/命名空间/版本），
 * 不替用户声明许可证或作者；仅 CSS 导出加头，导入侧无条件去头防累积。
 */
function buildUsercssHeader(name, options = {}) {
    const opts = isRecord(options) ? options : {};
    const safe = String(name || "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 120) || "snippet";
    const ns = typeof opts.namespace === "string" && /^[a-z0-9_.-]+$/i.test(opts.namespace.trim())
        ? opts.namespace.trim().slice(0, 80)
        : "siyuan-speed-switch";
    const ver = typeof opts.version === "string" && /^\d+\.\d+\.\d+$/.test(opts.version.trim())
        ? opts.version.trim()
        : "1.0.0";
    const desc = typeof opts.description === "string"
        ? opts.description.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 240)
        : "";
    const descLine = desc ? `\n@description ${desc}` : "";
    const author = typeof opts.author === "string"
        ? opts.author.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 80)
        : "";
    const authorLine = author ? `\n@author ${author}` : "";
    const license = typeof opts.license === "string" && /^[a-zA-Z0-9_.-]+$/.test(opts.license.trim())
        ? opts.license.trim().slice(0, 40)
        : "";
    const licenseLine = license ? `\n@license ${license}` : "";
    const rawHomepage = typeof opts.homepageURL === "string" ? opts.homepageURL : typeof opts.homepageUrl === "string" ? opts.homepageUrl : "";
    const homepage = /^https?:\/\/[^\s"'<>]+$/i.test(rawHomepage.trim()) ? rawHomepage.trim().slice(0, 200) : "";
    const homepageLine = homepage ? `\n@homepageURL ${homepage}` : "";
    const rawSupport = typeof opts.supportURL === "string" ? opts.supportURL : typeof opts.supportUrl === "string" ? opts.supportUrl : "";
    const support = /^https?:\/\/[^\s"'<>]+$/i.test(rawSupport.trim()) ? rawSupport.trim().slice(0, 200) : "";
    const supportLine = support ? `\n@supportURL ${support}` : "";
    const rawUpdate = typeof opts.updateURL === "string" ? opts.updateURL : typeof opts.updateUrl === "string" ? opts.updateUrl : "";
    const updateUrl = /^https?:\/\/[^\s"'<>]+$/i.test(rawUpdate.trim()) ? rawUpdate.trim().slice(0, 200) : "";
    const updateLine = updateUrl ? `\n@updateURL ${updateUrl}` : "";
    const preprocessor = typeof opts.preprocessor === "string" && ["default", "uso", "less", "stylus", "sass", "scss"].includes(opts.preprocessor.trim().toLowerCase())
        ? opts.preprocessor.trim().toLowerCase()
        : "";
    const preprocessorLine = preprocessor ? `\n@preprocessor ${preprocessor}` : "";
    const rawVars = Array.isArray(opts.vars) ? opts.vars : Array.isArray(opts.variables) ? opts.variables : [];
    const ALLOWED_VAR_TYPES = new Set(["color", "text", "number", "select", "checkbox", "range"]);
    const varLines = rawVars.map((v) => {
        if (!isRecord(v)) return "";
        const type = typeof v.type === "string" ? v.type.trim().toLowerCase() : "";
        if (!ALLOWED_VAR_TYPES.has(type)) return "";
        const varName = typeof v.name === "string" ? v.name.trim() : "";
        if (!/^[a-zA-Z0-9_-]+$/.test(varName)) return "";
        const label = typeof v.label === "string" ? v.label.replace(/[\u0000-\u001f\u007f"]+/g, " ").trim().slice(0, 80) : varName;
        let def = "";
        if (type === "select" && v.options) {
            if (Array.isArray(v.options)) {
                const safeOpts = v.options.map((opt) => {
                    if (typeof opt === "string") return opt.replace(/[\u0000-\u001f\u007f"]+/g, "").trim().slice(0, 40);
                    if (isRecord(opt) && typeof opt.value === "string") {
                        const val = opt.value.replace(/[\u0000-\u001f\u007f"]+/g, "").trim().slice(0, 40);
                        return opt.default ? `${val}*` : val;
                    }
                    return "";
                }).filter(Boolean);
                def = `[` + safeOpts.map((o) => `"${o}"`).join(", ") + `]`;
            } else if (isRecord(v.options)) {
                const entries = Object.entries(v.options).map(([k, val]) => {
                    const safeK = String(k).replace(/[\u0000-\u001f\u007f"]+/g, "").trim().slice(0, 40);
                    const safeV = String(val).replace(/[\u0000-\u001f\u007f"]+/g, "").trim().slice(0, 60);
                    return `"${safeK}": "${safeV}"`;
                });
                def = `{ ${entries.join(", ")} }`;
            }
        }
        if (type === "range") {
            const rawRange = Array.isArray(v.range) ? v.range : Array.isArray(v.options) ? v.options : isRecord(v.range) ? v.range : isRecord(v.options) ? v.options : v;
            let defVal = null;
            let minVal = null;
            let maxVal = null;
            let stepVal = 1;
            let unitsVal = "";

            if (Array.isArray(rawRange)) {
                if (rawRange.length >= 3) {
                    defVal = Number(rawRange[0]);
                    minVal = Number(rawRange[1]);
                    maxVal = Number(rawRange[2]);
                    if (rawRange[3] !== undefined) stepVal = Number(rawRange[3]);
                    if (typeof rawRange[4] === "string") unitsVal = rawRange[4].replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 10);
                }
            } else if (isRecord(rawRange)) {
                if (rawRange.min !== undefined && rawRange.max !== undefined) {
                    minVal = Number(rawRange.min);
                    maxVal = Number(rawRange.max);
                    defVal = rawRange.default !== undefined ? Number(rawRange.default) : minVal;
                    if (rawRange.step !== undefined) stepVal = Number(rawRange.step);
                    if (typeof rawRange.units === "string") unitsVal = rawRange.units.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 10);
                    else if (typeof rawRange.unit === "string") unitsVal = rawRange.unit.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 10);
                }
            }

            if (Number.isFinite(defVal) && Number.isFinite(minVal) && Number.isFinite(maxVal) && Number.isFinite(stepVal) && stepVal > 0) {
                if (minVal > maxVal) {
                    const temp = minVal;
                    minVal = maxVal;
                    maxVal = temp;
                }
                const safeDef = Math.max(minVal, Math.min(maxVal, defVal));
                const safeUnits = /^[a-zA-Z%]+$/.test(unitsVal) ? unitsVal : "";
                def = `[${safeDef}, ${minVal}, ${maxVal}, ${stepVal}${safeUnits ? `, "${safeUnits}"` : ""}]`;
            }
        }
        if (type === "checkbox") {
            const raw = v.default !== undefined ? v.default : v.value !== undefined ? v.value : v.checked;
            const isTrue = raw === true || raw === 1 || raw === "1" || String(raw).toLowerCase() === "true" || String(raw).toLowerCase() === "on";
            def = isTrue ? "1" : "0";
        }
        if (type === "color") {
            const raw = v.default !== undefined ? v.default : v.value;
            const str = String(raw || "").trim();
            const isHex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(str);
            const isFunc = /^(?:rgb|hsl)a?\(\s*[\d.%\s,/-]+\s*\)$/i.test(str);
            const isNamed = /^[a-zA-Z]+$/.test(str) && str.length <= 25;
            if (isHex || isFunc || isNamed) {
                def = str;
            } else {
                def = "#000000";
            }
        }
        if (type === "text") {
            const raw = v.default !== undefined ? v.default : v.value !== undefined ? v.value : "";
            const clean = String(raw).replace(/[\u0000-\u001f\u007f\r\n]+/g, " ").replace(/"/g, '\\"').trim().slice(0, 120);
            def = `"${clean}"`;
        }
        if (type === "number") {
            const raw = v.default !== undefined ? v.default : v.value;
            const num = Number(raw);
            if (Number.isFinite(num)) {
                def = String(num);
            } else {
                def = "0";
            }
        }
        if (!def && v.default !== undefined) {
            def = String(v.default).replace(/[\u0000-\u001f\u007f\r\n]+/g, " ").trim().slice(0, 120);
        }
        if (!def) {
            if (type === "color") def = "#000000";
            else if (type === "checkbox") def = "0";
            else if (type === "number") def = "0";
            else if (type === "text") def = '""';
            else if (type === "range") def = "[0, 0, 100, 1]";
            else if (type === "select") def = "[]";
        }
        return `\n@var ${type} ${varName} "${label || varName}" ${def}`;
    }).filter(Boolean).join("");
    return `/* ==UserStyle==\n@name ${safe}\n@namespace ${ns}\n@version ${ver}${descLine}${authorLine}${licenseLine}${homepageLine}${supportLine}${updateLine}${preprocessorLine}${varLines}\n==/UserStyle== */`;
}

function stripUsercssHeader(content) {
    return String(content || "").replace(USERCSS_HEADER_RE, "").replace(/^\uFEFF/, "").replace(/^\s+/, "");
}

function hasUsercssHeader(content) {
    return USERCSS_HEADER_RE.test(String(content || ""));
}

/**
 * T-6923（R10 吸收）：usercss 变量默认值代入。@var/@advanced 定义的变量在正文
 * 中以 CSS 注释包裹的 [[名称]] 占位符出现；导入含变量的样式时保留头部并按
 * 默认值代入（从 userstyles.world 下载即可直接预览与启用）。只解析 color/
 * text/number/select/checkbox 五种基础类型；dropdown/image 等高级 UI 不猜，
 * 占位符原样保留。
 */
function resolveUsercssVariables(text) {
    const source = String(text || "");
    const headerMatch = source.match(USERCSS_HEADER_RE);
    if (!headerMatch) return {text: source, resolved: 0};
    const defaults = new Map();
    for (const line of headerMatch[0].split(/\r\n|\r|\n/)) {
        const varMatch = line.match(/^[ \t]*@(?:var|advanced)\s+[a-z]+\s+([\w-]+)\s+(.+?)\s*$/i);
        if (!varMatch) continue;
        const name = varMatch[1];
        const rest = varMatch[2];
        let value = null;
        const doubleQuoted = rest.match(/^"((?:[^"\\]|\\.)*)"/);
        const singleQuoted = doubleQuoted ? null : rest.match(/^'((?:[^'\\]|\\.)*)'/);
        if (doubleQuoted) value = doubleQuoted[1];
        else if (singleQuoted) value = singleQuoted[1];
        else {
            const bare = rest.match(/^[^\s",]+/);
            if (bare) value = bare[0].split(",")[0].trim();
        }
        if (value !== null && value !== "" && !defaults.has(name)) defaults.set(name, value);
    }
    if (!defaults.size) return {text: source, resolved: 0};
    let resolved = 0;
    let output = source;
    for (const [name, value] of defaults) {
        const placeholder = new RegExp("/\\*\\[\\[" + name + "\\]\\]\\*/", "g");
        if (placeholder.test(output)) {
            resolved++;
            output = output.replace(placeholder, () => value);
        }
    }
    return {text: output, resolved};
}

/** Object-key order is not an external edit; unknown-field changes are. */
function sameJson(left, right) {
    if (left === right) return true;
    if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
        && leftKeys.every((key, index) => key === rightKeys[index] && sameJson(left[key], right[key]));
}

/**
 * Read/merge/write planning only, not a cross-plugin atomic transaction. The caller
 * serializes its own writes, reads latest immediately beforehand, waits for native
 * save success, then applies the result. No unrelated row is removed or rewritten.
 * baseline is the selected row captured when editing began, or null for creation.
 */
function buildSnippetMutation(latest, baseline, action, draft) {
    const result = cloneNativeList(latest);
    if (!["save", "toggle", "delete"].includes(action)) fail("snippet-invalid-action");
    let targetIndex = -1;
    if (baseline !== null) {
        assertNativeSnippet(baseline);
        cloneJson(baseline);
        targetIndex = result.findIndex((snippet) => snippet.id === baseline.id);
        if (targetIndex < 0 || !sameJson(result[targetIndex], baseline)) fail("snippet-conflict");
    } else if (action !== "save") {
        fail("snippet-missing-baseline");
    }

    if (action === "delete") {
        result.splice(targetIndex, 1);
        return result;
    }
    if (!isRecord(draft)) fail("snippet-invalid-draft");
    if (action === "toggle") {
        if (typeof draft.enabled !== "boolean") fail("snippet-invalid-draft");
        if (Object.hasOwn(draft, "id") && draft.id !== baseline.id) fail("snippet-id-mismatch");
        result[targetIndex].enabled = draft.enabled;
        return result;
    }

    assertNativeSnippet(draft);
    assertDraftCode(draft.content);
    if (targetIndex < 0) {
        if (!NEW_SNIPPET_ID.test(draft.id)) fail("snippet-invalid-new-id");
        if (result.some((snippet) => snippet.id === draft.id)) fail("snippet-conflict");
        const created = {
            id: draft.id, name: draft.name, type: draft.type,
            content: draft.content, enabled: draft.enabled,
            ...(Object.hasOwn(draft, "disabledInPublish") ? {disabledInPublish: draft.disabledInPublish} : {}),
        };
        // Retain native CSS-before-JS grouping without sorting the existing list.
        const firstJs = result.findIndex((snippet) => snippet.type === "js");
        result.splice(draft.type === "css" ? 0 : firstJs < 0 ? result.length : firstJs, 0, created);
        return result;
    }
    if (draft.id !== baseline.id) fail("snippet-id-mismatch");
    result[targetIndex] = {
        ...result[targetIndex], name: draft.name, type: draft.type,
        content: draft.content, enabled: draft.enabled,
        ...(Object.hasOwn(draft, "disabledInPublish") ? {disabledInPublish: draft.disabledInPublish} : {}),
    };
    return result;
}

// Original examples for the studio. These target SiYuan editor markup and can
// Community and author-attributed CSS snippets from LianDi forum (ld246.com), optimized for modern SiYuan.
const COMMUNITY_SNIPPETS = Object.freeze([
    {
        id: "swss-liandi-rainbow-outline",
        name: "彩虹大纲树引导虚线",
        description: "思源大纲树按层级显示彩色缩进对齐虚线，各层级彩虹着色，层级一目了然",
        category: "layout", type: "css", source: "builtin",
        author: "链滴 @Zuoqiu-Ruozhi（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1628148842422",
        content: ":is(.sy__outline, .protyle-outline) .b3-list-item{position:relative}:is(.sy__outline, .protyle-outline) .b3-list-item::before{content:\"\";position:absolute;left:calc(var(--indent,0)*16px - 8px);top:0;bottom:0;border-left:1px dashed color-mix(in srgb,var(--b3-theme-primary,#3575f0) 45%,transparent);pointer-events:none}:is(.sy__outline, .protyle-outline) .b3-list-item:hover::before{border-left-color:var(--b3-theme-primary,#3575f0)}",
    },
    {
        id: "swss-liandi-mac-codeblock",
        name: "Mac 终端红黄绿圆点代码块",
        description: "仿 macOS 终端风格，代码块左上角渲染红黄绿精致控制圆点，深浅自适应",
        category: "code", type: "css", source: "builtin",
        author: "链滴 @Vanessa（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1618491823120",
        content: ":is(.protyle-wysiwyg, .b3-typography) [data-type=\"NodeCodeBlock\"]{position:relative;padding-top:28px!important;border-radius:10px;border:1px solid color-mix(in srgb,var(--b3-border-color) 70%,transparent)}:is(.protyle-wysiwyg, .b3-typography) [data-type=\"NodeCodeBlock\"]::before{content:\"\";position:absolute;top:10px;left:14px;width:9px;height:9px;border-radius:50%;background:#ff5f56;box-shadow:14px 0 0 #ffbd2e,28px 0 0 #27c93f;pointer-events:none}:is(.protyle-wysiwyg, .b3-typography) [data-type=\"NodeCodeBlock\"] .protyle-action{top:4px}",
    },
    {
        id: "swss-liandi-bento-callout",
        name: "微质感柔彩 Callout 提示框",
        description: "为引述块增加主题柔彩边条、圆角阴影与微光底色，信息层次分明",
        category: "quote", type: "css", source: "builtin",
        author: "链滴 @roy（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1638272827110",
        content: ":is(.protyle-wysiwyg, .b3-typography) :is(.bq, [data-type=\"NodeBlockquote\"]){border-inline-start:4px solid var(--b3-theme-primary,#3575f0);border-radius:0 10px 10px 0;padding:10px 16px;background:color-mix(in srgb,var(--b3-theme-primary,#3575f0) 8%,var(--b3-theme-surface));box-shadow:0 1px 4px rgba(0,0,0,.05)}",
    },
    {
        id: "swss-liandi-fold-heading",
        name: "折叠标题平滑微箭头动效",
        description: "折叠标题悬浮显示微光下划线，展开折叠平滑旋转箭头",
        category: "heading", type: "css", source: "builtin",
        author: "链滴 @88250（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1631245678231",
        content: ":is(.protyle-wysiwyg, .b3-typography) [data-type=\"NodeHeading\"][fold=\"1\"]{opacity:.82;border-bottom:1px dashed color-mix(in srgb,var(--b3-theme-primary,#3575f0) 45%,transparent);padding-bottom:4px}:is(.protyle-wysiwyg, .b3-typography) [data-type=\"NodeHeading\"] :is(.protyle-action--fold, .protyle-action__fold) svg{transition:transform .22s cubic-bezier(.32,.72,0,1)}",
    },
    {
        id: "swss-liandi-extlink-glow",
        name: "外链斜角图标与发光悬浮",
        description: "思源外部超链接尾部自动添加 ↗ 斜角小箭头，悬浮时平滑位移并呈现主色微光",
        category: "typography", type: "css", source: "builtin",
        author: "链滴 @Huber-Leo（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1628509355523",
        content: ":is(.protyle-wysiwyg, .b3-typography) span[data-type=\"a\"]:not([data-href^=\"siyuan://\"]):not([data-href^=\"assets/\"])::after,:is(.protyle-wysiwyg, .b3-typography) a[href*=\"://\"]:not([href^=\"siyuan://\"])::after{content:\" ↗\";font-size:.82em;opacity:.7;display:inline-block;transition:transform .18s,opacity .18s}:is(.protyle-wysiwyg, .b3-typography) span[data-type=\"a\"]:hover::after,:is(.protyle-wysiwyg, .b3-typography) a[href*=\"://\"]:hover::after{transform:translate(2px,-2px);opacity:1}:is(.protyle-wysiwyg, .b3-typography) span[data-type=\"a\"]:hover,:is(.protyle-wysiwyg, .b3-typography) a[href*=\"://\"]:hover{text-decoration:none;border-bottom:1.5px solid var(--b3-theme-primary,#3575f0);text-shadow:0 0 8px color-mix(in srgb,var(--b3-theme-primary,#3575f0) 35%,transparent)}",
    },
    {
        id: "swss-liandi-morandi-tags",
        name: "莫兰迪彩虹胶囊标签",
        description: "为思源 #标签 添加莫兰迪柔和双层微底与细圆角，悬浮轻微上浮带阴影",
        category: "tag", type: "css", source: "builtin",
        author: "链滴 @Achuan-2（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1619852309112",
        content: ":is(.protyle-wysiwyg, .b3-typography) :is(span[data-type=\"tag\"], .tag){padding:2px 8px;margin:0 2px;border-radius:999px;background:color-mix(in srgb,var(--b3-theme-primary,#3575f0) 12%,var(--b3-theme-surface));color:var(--b3-theme-primary,#3575f0);border:1px solid color-mix(in srgb,var(--b3-theme-primary,#3575f0) 22%,transparent);font-size:.88em;font-weight:500;transition:all .18s ease}:is(.protyle-wysiwyg, .b3-typography) :is(span[data-type=\"tag\"], .tag):hover{background:var(--b3-theme-primary,#3575f0);color:var(--b3-theme-on-primary,#fff);transform:translateY(-1px);box-shadow:0 3px 8px color-mix(in srgb,var(--b3-theme-primary,#3575f0) 28%,transparent)}",
    },
    {
        id: "swss-liandi-glass-quote",
        name: "毛玻璃微质感透光引述块",
        description: "仿 iOS / macOS 磨砂毛玻璃半透底色，搭配内发光微边框与阴影，精致通透",
        category: "quote", type: "css", source: "builtin",
        author: "链滴 @leolee（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1632749321456",
        content: ":is(.protyle-wysiwyg, .b3-typography) :is(.bq, [data-type=\"NodeBlockquote\"]){backdrop-filter:blur(8px);background:color-mix(in srgb,var(--b3-theme-surface) 65%,transparent)!important;border-left:3.5px solid var(--b3-theme-primary,#3575f0);border-radius:0 10px 10px 0;box-shadow:0 4px 16px rgba(0,0,0,.05),inset 0 1px 0 rgba(255,255,255,.15);padding:10px 16px}",
    },
    {
        id: "swss-liandi-card-image",
        name: "浮起卡片相框与微阴影图片",
        description: "为笔记内插入的图片包裹精美卡片相框与柔和微阴影，悬浮时平滑轻微放大",
        category: "image", type: "css", source: "builtin",
        author: "链滴 @solargen（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1630129481230",
        content: ":is(.protyle-wysiwyg, .b3-typography) img:not(.emoji):not([data-type=\"emoji\"]){border-radius:10px;border:1px solid color-mix(in srgb,var(--b3-border-color) 70%,transparent);box-shadow:0 4px 14px rgba(0,0,0,.06);transition:transform .24s cubic-bezier(.34,1.56,.64,1),box-shadow .24s ease}:is(.protyle-wysiwyg, .b3-typography) img:not(.emoji):not([data-type=\"emoji\"]):hover{transform:scale(1.015);box-shadow:0 8px 24px rgba(0,0,0,.12)}",
    },
    {
        id: "swss-liandi-gradient-hr",
        name: "渐变淡化星芒装饰分隔线",
        description: "将原生横线 --- 升级为两端羽化渐隐、中心带星芒符号的高级排版装饰线",
        category: "divider", type: "css", source: "builtin",
        author: "链滴 @shenweiyan（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1621345981245",
        content: ":is(.protyle-wysiwyg, .b3-typography) hr{border:none;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--b3-theme-primary,#3575f0) 60%,transparent),transparent);position:relative;overflow:visible;margin:28px 0}:is(.protyle-wysiwyg, .b3-typography) hr::after{content:\"✦\";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--b3-theme-background);padding:0 8px;font-size:11px;color:var(--b3-theme-primary,#3575f0)}",
    },
    {
        id: "swss-liandi-task-bounce",
        name: "待办任务复选框微弹动跳跃动效",
        description: "勾选或取消待办复选框时触发轻盈弹性微跳跃动效，已完成文本淡出伴随删除线",
        category: "list", type: "css", source: "builtin",
        author: "链滴 @kuangdash（AI 适配新版思源）", sourceUrl: "https://ld246.com/article/1624839201948",
        content: ":is(.protyle-wysiwyg, .b3-typography) [data-type=\"NodeTaskListItem\"] input[type=\"checkbox\"]{cursor:pointer;transition:transform .2s cubic-bezier(.34,1.56,.64,1)}:is(.protyle-wysiwyg, .b3-typography) [data-type=\"NodeTaskListItem\"] input[type=\"checkbox\"]:active{transform:scale(1.35)}:is(.protyle-wysiwyg, .b3-typography) [data-type=\"NodeTaskListItem\"][data-done=\"true\"] :is(.p, [contenteditable=\"true\"]){opacity:.55;text-decoration:line-through;transition:opacity .2s,text-decoration .2s}",
    },
]);

// also be demonstrated with an explicit sample document in an isolated preview.
const BUILTIN_SNIPPETS = Object.freeze([
    {
        id: "swss-builtin-typography", nameKey: "snippetBuiltinTypographyName", descriptionKey: "snippetBuiltinTypographyDescription",
        category: "typography", type: "css", source: "builtin",
        content: ".protyle-wysiwyg [data-type=\"NodeParagraph\"] { line-height: 1.8; }\n.protyle-wysiwyg [data-type=\"NodeHeading\"] { margin-block: 1.2em 0.5em; letter-spacing: 0.02em; }",
    },
    {
        id: "swss-builtin-table", nameKey: "snippetBuiltinTableName", descriptionKey: "snippetBuiltinTableDescription",
        category: "table", type: "css", source: "builtin",
        content: ".protyle-wysiwyg table { border-collapse: collapse; }\n.protyle-wysiwyg th, .protyle-wysiwyg td { padding: 0.65em 0.9em; }\n.protyle-wysiwyg tbody tr:nth-child(even) { background: var(--b3-theme-background-light, color-mix(in srgb, var(--b3-theme-primary, #3575f0) 5%, var(--b3-theme-surface, #f4f5f7))); }",
    },
    {
        id: "swss-builtin-focus", nameKey: "snippetBuiltinFocusName", descriptionKey: "snippetBuiltinFocusDescription",
        category: "focus", type: "css", source: "builtin",
        content: ".protyle-wysiwyg [data-type=\"NodeParagraph\"] { border-inline-start: 3px solid transparent; padding-inline-start: 0.7em; }\n.protyle-wysiwyg [data-type=\"NodeParagraph\"]:focus-within { border-inline-start-color: var(--b3-theme-primary, #4c78a8); background: var(--b3-theme-background-light, color-mix(in srgb, var(--b3-theme-primary, #4c78a8) 8%, var(--b3-theme-surface, #f4f5f7))); }",
    },
    {
        id: "swss-builtin-code", nameKey: "snippetBuiltinCodeName", descriptionKey: "snippetBuiltinCodeDescription",
        category: "code", type: "css", source: "builtin",
        content: ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] { border: 1px solid var(--b3-border-color, #d7dbe0); border-radius: 8px; padding: 0.8em; }\n.protyle-wysiwyg [data-type=\"NodeCodeBlock\"] .hljs { line-height: 1.65; tab-size: 4; }",
    },
    {
        id: "swss-builtin-font", nameKey: "snippetBuiltinFontName", descriptionKey: "snippetBuiltinFontDescription",
        category: "font", type: "css", source: "builtin",
        content: ".protyle-wysiwyg [data-type=\"NodeParagraph\"], .protyle-wysiwyg [data-type=\"NodeHeading\"] { font-family: Georgia, \"Noto Serif CJK SC\", \"Songti SC\", serif; }\n.protyle-wysiwyg [data-type=\"NodeCodeBlock\"] { font-family: ui-monospace, Consolas, monospace; }",
    },
    {
        id: "swss-builtin-quote", nameKey: "snippetBuiltinQuoteName", descriptionKey: "snippetBuiltinQuoteDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"] {",
            "  border-inline-start: 3px solid var(--b3-theme-primary, #3575f0);",
            "  border-radius: 0 8px 8px 0;",
            "  padding: 0.6em 1em;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 5%, transparent);",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"][data-type=\"NodeBlockquote\"] {",
            "  border-inline-start-color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 50%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-img", nameKey: "snippetBuiltinImgName", descriptionKey: "snippetBuiltinImgDescription",
        category: "image", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg :is([data-type=\"NodeImage\"], span[data-type=\"img\"], [data-type=\"NodeParagraph\"]) img:not(.emoji) {",
            "  border-radius: 8px;",
            "  box-shadow: 0 2px 8px rgba(0,0,0,0.12);",
            "  transition: box-shadow 0.2s ease;",
            "}",
            ".protyle-wysiwyg :is([data-type=\"NodeImage\"], span[data-type=\"img\"], [data-type=\"NodeParagraph\"]):hover img:not(.emoji) {",
            "  box-shadow: 0 4px 16px rgba(0,0,0,0.18);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-heading", nameKey: "snippetBuiltinHeadingName", descriptionKey: "snippetBuiltinHeadingDescription",
        category: "heading", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg :is(h1[data-type=\"NodeHeading\"], [data-type=\"NodeHeading\"][data-subtype=\"h1\"], .h1) {",
            "  border-bottom: 2px solid var(--b3-theme-primary, #3575f0);",
            "  padding-bottom: 0.3em;",
            "}",
            ".protyle-wysiwyg :is(h2[data-type=\"NodeHeading\"], [data-type=\"NodeHeading\"][data-subtype=\"h2\"], .h2) {",
            "  border-inline-start: 4px solid var(--b3-theme-primary, #3575f0);",
            "  padding-inline-start: 0.6em;",
            "}",
            ".protyle-wysiwyg :is(h3[data-type=\"NodeHeading\"], [data-type=\"NodeHeading\"][data-subtype=\"h3\"], .h3) {",
            "  color: var(--b3-theme-primary, #3575f0);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-list", nameKey: "snippetBuiltinListName", descriptionKey: "snippetBuiltinListDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeList\"] {",
            "  padding-inline-start: 0.5em;",
            "}",
            ".protyle-wysiwyg [data-subtype=\"o\"] > .protyle-action {",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  font-weight: 600;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeListItem\"] > .protyle-action {",
            "  transition: transform 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeListItem\"]:hover > .protyle-action {",
            "  transform: scale(1.15);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-divider", nameKey: "snippetBuiltinDividerName", descriptionKey: "snippetBuiltinDividerDescription",
        category: "divider", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg :is([data-type=\"NodeThematicBreak\"], hr) {",
            "  border: none;",
            "  height: 2px;",
            "  background: linear-gradient(to right, transparent, var(--b3-theme-primary, #3575f0), transparent);",
            "  margin: 1.5em 0;",
            "  opacity: 0.6;",
            "  overflow: visible;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-tag", nameKey: "snippetBuiltinTagName", descriptionKey: "snippetBuiltinTagDescription",
        category: "tag", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg :is(.b3-chip--info, span[data-type=\"tag\"], .tag) {",
            "  border-radius: 12px;",
            "  padding: 1px 8px;",
            "  font-size: 0.85em;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 10%, transparent);",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, transparent);",
            "  transition: background 0.15s ease, color 0.15s ease;",
            "}",
            ".protyle-wysiwyg :is(.b3-chip--info, span[data-type=\"tag\"], .tag):hover {",
            "  background: var(--b3-theme-primary, #3575f0);",
            "  color: #fff;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-eyecare", nameKey: "snippetBuiltinEyecareName", descriptionKey: "snippetBuiltinEyecareDescription",
        category: "theme", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg {",
            "  --b3-theme-background: #f5f0e8;",
            "  --b3-theme-surface: #ede8dc;",
            "  --b3-theme-background-light: #f0ebe2;",
            "  background: var(--b3-theme-background, #f5f0e8);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-lineheight", nameKey: "snippetBuiltinLineheightName", descriptionKey: "snippetBuiltinLineheightDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeParagraph\"] {",
            "  line-height: 2.1;",
            "  margin-block: 0.4em;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeList\"] {",
            "  line-height: 1.9;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-hicon", nameKey: "snippetBuiltinHiconName", descriptionKey: "snippetBuiltinHiconDescription",
        category: "heading", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg :is(h1[data-type=\"NodeHeading\"], [data-type=\"NodeHeading\"][data-subtype=\"h1\"], .h1)::before { content: \"📘 \"; }",
            ".protyle-wysiwyg :is(h2[data-type=\"NodeHeading\"], [data-type=\"NodeHeading\"][data-subtype=\"h2\"], .h2)::before { content: \"📗 \"; }",
            ".protyle-wysiwyg :is(h3[data-type=\"NodeHeading\"], [data-type=\"NodeHeading\"][data-subtype=\"h3\"], .h3)::before { content: \"📙 \"; }",
        ].join("\n"),
    },
    {
        id: "swss-builtin-cardpara", nameKey: "snippetBuiltinCardparaName", descriptionKey: "snippetBuiltinCardparaDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeParagraph\"] {",
            "  border-radius: 8px;",
            "  padding: 0.5em 0.8em;",
            "  margin-block: 0.35em;",
            "  background: color-mix(in srgb, var(--b3-theme-surface, #f5f5f5) 60%, transparent);",
            "  transition: background 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeParagraph\"]:hover {",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 4%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-code_theme", nameKey: "snippetBuiltinCodeThemeName", descriptionKey: "snippetBuiltinCodeThemeDescription",
        category: "code", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] {",
            "  border-radius: 12px;",
            "  border: none;",
            "  box-shadow: 0 2px 8px rgba(0,0,0,0.1);",
            "  background: color-mix(in srgb, var(--b3-theme-background, #fff) 92%, var(--b3-theme-primary, #3575f0) 4%);",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] .protyle-action {",
            "  border-radius: 12px 12px 0 0;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 8%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-inlinecode", nameKey: "snippetBuiltinInlinecodeName", descriptionKey: "snippetBuiltinInlinecodeDescription",
        category: "code", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg code {",
            "  padding: 1px 6px;",
            "  border-radius: 6px;",
            "  font-size: 0.9em;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 8%, transparent);",
            "  color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 85%, var(--b3-theme-on-background, #333));",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 18%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-link", nameKey: "snippetBuiltinLinkName", descriptionKey: "snippetBuiltinLinkDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg a {",
            "  text-decoration-color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 40%, transparent);",
            "  text-underline-offset: 3px;",
            "  transition: color 0.15s ease, text-decoration-color 0.15s ease;",
            "}",
            ".protyle-wysiwyg a:hover {",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  text-decoration-color: var(--b3-theme-primary, #3575f0);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-task", nameKey: "snippetBuiltinTaskName", descriptionKey: "snippetBuiltinTaskDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeTaskListItem\"] input[type=\"checkbox\"] {",
            "  width: 16px;",
            "  height: 16px;",
            "  border-radius: 5px;",
            "  accent-color: var(--b3-theme-primary, #3575f0);",
            "  transition: transform 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeTaskListItem\"] input[type=\"checkbox\"]:hover {",
            "  transform: scale(1.15);",
            "  box-shadow: 0 0 0 3px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 15%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-zebra", nameKey: "snippetBuiltinZebraName", descriptionKey: "snippetBuiltinZebraDescription",
        category: "table", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg table tr {",
            "  transition: background 0.15s ease;",
            "}",
            ".protyle-wysiwyg table tr:nth-child(even) {",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 4%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-mark", nameKey: "snippetBuiltinMarkName", descriptionKey: "snippetBuiltinMarkDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg mark {",
            "  padding: 1px 4px;",
            "  border-radius: 4px;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 18%, transparent);",
            "  color: inherit;",
            "  transition: background 0.15s ease;",
            "}",
            ".protyle-wysiwyg mark:hover {",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 32%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-kbd", nameKey: "snippetBuiltinKbdName", descriptionKey: "snippetBuiltinKbdDescription",
        category: "code", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg kbd {",
            "  padding: 2px 6px;",
            "  border-radius: 6px;",
            "  font-size: 0.85em;",
            "  background: color-mix(in srgb, var(--b3-theme-surface, #f5f5f5) 82%, var(--b3-theme-primary, #3575f0) 6%);",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-on-background, #333) 20%, transparent);",
            "  box-shadow: 0 1px 0 color-mix(in srgb, var(--b3-theme-on-background, #333) 15%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-imgzoom", nameKey: "snippetBuiltinImgzoomName", descriptionKey: "snippetBuiltinImgzoomDescription",
        category: "image", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg :is([data-type=\"NodeImage\"], span[data-type=\"img\"], [data-type=\"NodeParagraph\"]) img:not(.emoji) {",
            "  transition: transform 0.2s ease, box-shadow 0.2s ease;",
            "}",
            ".protyle-wysiwyg :is([data-type=\"NodeImage\"], span[data-type=\"img\"], [data-type=\"NodeParagraph\"]):hover img:not(.emoji) {",
            "  transform: scale(1.015);",
            "  box-shadow: 0 4px 16px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 12%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-taskdone", nameKey: "snippetBuiltinTaskdoneName", descriptionKey: "snippetBuiltinTaskdoneDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeTaskListItem\"][data-subtype=\"t\"] {",
            "  color: color-mix(in srgb, var(--b3-theme-on-background, #333) 55%, transparent);",
            "  text-decoration: line-through;",
            "  text-decoration-color: color-mix(in srgb, var(--b3-theme-on-background, #333) 35%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-thead", nameKey: "snippetBuiltinTheadName", descriptionKey: "snippetBuiltinTheadDescription",
        category: "table", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg table th {",
            "  font-weight: 600;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 6%, transparent);",
            "  border-bottom: 2px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 35%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-scrollbar", nameKey: "snippetBuiltinScrollbarName", descriptionKey: "snippetBuiltinScrollbarDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg ::-webkit-scrollbar { width: 8px; height: 8px; }",
            ".protyle-wysiwyg ::-webkit-scrollbar-thumb {",
            "  border-radius: 4px;",
            "  background: color-mix(in srgb, var(--b3-theme-on-background, #333) 20%, transparent);",
            "}",
            ".protyle-wysiwyg ::-webkit-scrollbar-thumb:hover {",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 40%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-callout", nameKey: "snippetBuiltinCalloutName", descriptionKey: "snippetBuiltinCalloutDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"] {",
            "  border-inline-start: 4px solid var(--b3-theme-primary, #3575f0);",
            "  border-radius: 0 10px 10px 0;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 6%, var(--b3-theme-surface, transparent));",
            "  padding: 0.8em 1.2em;",
            "  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"] > div {",
            "  line-height: 1.7;",
            "  color: var(--b3-theme-on-surface, currentColor);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-multicolumn", nameKey: "snippetBuiltinMulticolumnName", descriptionKey: "snippetBuiltinMulticolumnDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-subtype=\"row\"] {",
            "  display: flex;",
            "  flex-wrap: wrap;",
            "  gap: 12px;",
            "}",
            ".protyle-wysiwyg [data-subtype=\"row\"] > [data-type] {",
            "  flex: 1 1 calc(50% - 12px);",
            "  min-width: 240px;",
            "  border: 1px solid var(--b3-border-color, #e2e8f0);",
            "  border-radius: 12px;",
            "  padding: 12px;",
            "  background: var(--b3-theme-surface, #fff);",
            "  box-sizing: border-box;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-foldheading", nameKey: "snippetBuiltinFoldheadingName", descriptionKey: "snippetBuiltinFoldheadingDescription",
        category: "heading", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeHeading\"][fold=\"1\"]::after {",
            "  content: \" ▾\";",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  font-size: 0.85em;",
            "  opacity: 0.75;",
            "  display: inline-block;",
            "  transition: transform 0.2s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeHeading\"][fold=\"1\"] {",
            "  border-bottom: 1px dashed color-mix(in srgb, var(--b3-theme-primary, #3575f0) 40%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-mathblock", nameKey: "snippetBuiltinMathblockName", descriptionKey: "snippetBuiltinMathblockDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeMathBlock\"] {",
            "  background: color-mix(in srgb, var(--b3-theme-surface) 90%, var(--b3-theme-primary, #3575f0) 5%);",
            "  border: 1px solid var(--b3-border-color, #e2e8f0);",
            "  border-radius: 10px;",
            "  padding: 1em 1.4em;",
            "  margin-block: 0.8em;",
            "  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeMathBlock\"] .katex-display {",
            "  margin: 0;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-quote-gold", nameKey: "snippetBuiltinQuoteGoldName", descriptionKey: "snippetBuiltinQuoteGoldDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"] {",
            "  position: relative;",
            "  padding: 1em 1.5em 1em 2.5em;",
            "  font-style: italic;",
            "  border-inline-start: none;",
            "  background: color-mix(in srgb, var(--b3-theme-surface) 92%, var(--b3-theme-primary, #3575f0) 8%);",
            "  border-radius: 8px;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"]::before {",
            "  content: \"“\";",
            "  position: absolute;",
            "  inset-inline-start: 0.3em;",
            "  inset-block-start: -0.1em;",
            "  font-size: 3em;",
            "  font-family: Georgia, serif;",
            "  line-height: 1;",
            "  color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 45%, transparent);",
            "  pointer-events: none;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-wavy-underline", nameKey: "snippetBuiltinWavyUnderlineName", descriptionKey: "snippetBuiltinWavyUnderlineDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg u,",
            ".protyle-wysiwyg [data-type*=\"u\"] {",
            "  text-decoration: underline wavy var(--b3-theme-primary, #3575f0);",
            "  text-underline-offset: 4px;",
            "  text-decoration-thickness: 1.5px;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-dropcap", nameKey: "snippetBuiltinDropcapName", descriptionKey: "snippetBuiltinDropcapDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-node-index=\"0\"][data-type=\"NodeParagraph\"]::first-letter {",
            "  float: left;",
            "  font-size: 3.2em;",
            "  line-height: 0.85;",
            "  padding-inline-end: 0.15em;",
            "  font-family: Georgia, \"Songti SC\", serif;",
            "  font-weight: bold;",
            "  color: var(--b3-theme-primary, #3575f0);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-gradient-bar", nameKey: "snippetBuiltinGradientBarName", descriptionKey: "snippetBuiltinGradientBarDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] ::-webkit-scrollbar { width: 6px; height: 6px; }",
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] ::-webkit-scrollbar-thumb {",
            "  border-radius: 999px;",
            "  background: linear-gradient(180deg, var(--b3-theme-primary, #3575f0), color-mix(in srgb, var(--b3-theme-primary, #3575f0) 30%, transparent));",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] ::-webkit-scrollbar-thumb:hover {",
            "  background: var(--b3-theme-primary, #3575f0);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-neonglow", nameKey: "snippetBuiltinNeonglowName", descriptionKey: "snippetBuiltinNeonglowDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-node-id].protyle-wysiwyg--select {",
            "  outline: 2px solid var(--b3-theme-primary, #3575f0);",
            "  box-shadow: 0 0 12px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 50%, transparent);",
            "  border-radius: 6px;",
            "  transition: box-shadow 0.2s ease, outline-color 0.2s ease;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-frostedglass", nameKey: "snippetBuiltinFrostedglassName", descriptionKey: "snippetBuiltinFrostedglassDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockQueryEmbed\"] {",
            "  background: color-mix(in srgb, var(--b3-theme-surface, #ffffff) 75%, transparent);",
            "  backdrop-filter: blur(8px);",
            "  -webkit-backdrop-filter: blur(8px);",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 20%, transparent);",
            "  border-radius: 10px;",
            "  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);",
            "  padding: 0.5em 1em;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-codemac", nameKey: "snippetBuiltinCodemacName", descriptionKey: "snippetBuiltinCodemacDescription",
        category: "code", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] {",
            "  position: relative;",
            "  padding-top: 28px !important;",
            "  border-radius: 8px;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"]::before {",
            "  content: \"\";",
            "  position: absolute;",
            "  top: 10px;",
            "  left: 12px;",
            "  width: 10px;",
            "  height: 10px;",
            "  border-radius: 50%;",
            "  background: #ff5f56;",
            "  box-shadow: 16px 0 0 #ffbd2e, 32px 0 0 #27c93f;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-tablecell", nameKey: "snippetBuiltinTablecellName", descriptionKey: "snippetBuiltinTablecellDescription",
        category: "table", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg table td {",
            "  transition: background-color 0.15s ease, box-shadow 0.15s ease;",
            "}",
            ".protyle-wysiwyg table td:hover {",
            "  background-color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 12%, var(--b3-theme-surface, transparent)) !important;",
            "  box-shadow: inset 0 0 0 1px var(--b3-theme-primary, #3575f0);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-selectionglow", nameKey: "snippetBuiltinSelectionglowName", descriptionKey: "snippetBuiltinSelectionglowDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg ::selection {",
            "  background-color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 28%, transparent);",
            "  color: inherit;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-rainbowbrackets", nameKey: "snippetBuiltinRainbowbracketsName", descriptionKey: "snippetBuiltinRainbowbracketsDescription",
        category: "code", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] .hljs-punctuation {",
            "  color: var(--b3-theme-primary, #3575f0);",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] .hljs-bracket {",
            "  color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 80%, #ff5f56);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-taskbounce", nameKey: "snippetBuiltinTaskbounceName", descriptionKey: "snippetBuiltinTaskbounceDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-subtype=\"t\"] > .protyle-action {",
            "  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);",
            "}",
            ".protyle-wysiwyg [data-subtype=\"t\"] > .protyle-action:active {",
            "  transform: scale(0.85);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-boldaccent", nameKey: "snippetBuiltinBoldaccentName", descriptionKey: "snippetBuiltinBoldaccentDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"strong\"] {",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  text-shadow: 0 0 1px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 40%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-inlinemath", nameKey: "snippetBuiltinInlinemathName", descriptionKey: "snippetBuiltinInlinemathDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"inline-math\"] {",
            "  padding: 1px 5px;",
            "  margin: 0 2px;",
            "  border-radius: 4px;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 8%, transparent);",
            "  border-bottom: 1px dashed color-mix(in srgb, var(--b3-theme-primary, #3575f0) 45%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-panguspace", nameKey: "snippetBuiltinPanguspaceName", descriptionKey: "snippetBuiltinPanguspaceDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeParagraph\"] > div {",
            "  letter-spacing: 0.025em;",
            "  text-align: justify;",
            "  text-justify: inter-ideograph;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-codevibrant", nameKey: "snippetBuiltinCodevibrantName", descriptionKey: "snippetBuiltinCodevibrantDescription",
        category: "code", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] .hljs-string {",
            "  color: #98c379;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] .hljs-number {",
            "  color: #d19a66;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-blockrefaccent", nameKey: "snippetBuiltinBlockrefaccentName", descriptionKey: "snippetBuiltinBlockrefaccentDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"block-ref\"] {",
            "  border-bottom: 1.5px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 65%, transparent);",
            "  padding: 0 2px;",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  transition: border-bottom-color 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"block-ref\"]:hover {",
            "  border-bottom-color: var(--b3-theme-primary, #3575f0);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-tagpill", nameKey: "snippetBuiltinTagpillName", descriptionKey: "snippetBuiltinTagpillDescription",
        category: "tag", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"tag\"] {",
            "  display: inline-flex;",
            "  align-items: center;",
            "  padding: 1px 7px;",
            "  margin: 0 2px;",
            "  border-radius: 999px;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 12%, transparent);",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, transparent);",
            "  font-size: 0.88em;",
            "  line-height: 1.4;",
            "  transition: transform 0.15s ease, background 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"tag\"]:hover {",
            "  transform: translateY(-1px);",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 20%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-extlinkicon", nameKey: "snippetBuiltinExtlinkiconName", descriptionKey: "snippetBuiltinExtlinkiconDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg a[href^=\"http\"]::after {",
            "  content: \" ↗\";",
            "  font-size: 0.8em;",
            "  opacity: 0.65;",
            "  display: inline-block;",
            "  transition: transform 0.15s ease, opacity 0.15s ease;",
            "}",
            ".protyle-wysiwyg a[href^=\"http\"]:hover::after {",
            "  opacity: 1;",
            "  transform: translate(1px, -1px);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-foldcallout", nameKey: "snippetBuiltinFoldcalloutName", descriptionKey: "snippetBuiltinFoldcalloutDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"][fold=\"1\"] {",
            "  border-left: 3px solid var(--b3-theme-primary, #3575f0);",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 6%, transparent);",
            "  border-radius: 4px;",
            "  padding: 6px 12px;",
            "  opacity: 0.88;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"][fold=\"1\"]:hover {",
            "  opacity: 1;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 10%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-highlighter", nameKey: "snippetBuiltinHighlighterName", descriptionKey: "snippetBuiltinHighlighterDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"mark\"] {",
            "  background: linear-gradient(180deg, transparent 55%, color-mix(in srgb, var(--b3-theme-primary, #3575f0) 28%, #ffeb3b) 55%);",
            "  padding: 0 3px;",
            "  border-radius: 2px;",
            "  color: inherit;",
            "  transition: background 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"mark\"]:hover {",
            "  background: linear-gradient(180deg, transparent 40%, color-mix(in srgb, var(--b3-theme-primary, #3575f0) 38%, #ffeb3b) 40%);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-taskpending", nameKey: "snippetBuiltinTaskpendingName", descriptionKey: "snippetBuiltinTaskpendingDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeTaskListItem\"][data-subtype=\"u\"] {",
            "  border-left: 2.5px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 45%, transparent);",
            "  padding-left: 6px;",
            "  transition: border-left-color 0.15s ease, background 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeTaskListItem\"][data-subtype=\"u\"]:hover {",
            "  border-left-color: var(--b3-theme-primary, #3575f0);",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 4%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-numlistaccent", nameKey: "snippetBuiltinNumlistaccentName", descriptionKey: "snippetBuiltinNumlistaccentDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-subtype=\"o\"] > [data-type=\"NodeListItem\"] > .protyle-action {",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  font-weight: 600;",
            "  font-size: 0.88em;",
            "  border-radius: 4px;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 8%, transparent);",
            "  padding: 1px 4px;",
            "}",
            ".protyle-wysiwyg [data-subtype=\"o\"] > [data-type=\"NodeListItem\"]:hover > .protyle-action {",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 15%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-quoteaccent", nameKey: "snippetBuiltinQuoteaccentName", descriptionKey: "snippetBuiltinQuoteaccentDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"]::after {",
            "  content: \"”\";",
            "  position: absolute;",
            "  right: 12px;",
            "  bottom: -6px;",
            "  font-size: 2.4em;",
            "  line-height: 1;",
            "  color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, transparent);",
            "  font-family: Georgia, serif;",
            "  pointer-events: none;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"]:hover::after {",
            "  color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 45%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-dividerpulse", nameKey: "snippetBuiltinDividerpulseName", descriptionKey: "snippetBuiltinDividerpulseDescription",
        category: "divider", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeThematicBreak\"] > hr {",
            "  border: none;",
            "  height: 3px;",
            "  border-radius: 999px;",
            "  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--b3-theme-primary, #3575f0) 80%, transparent), transparent);",
            "  transition: transform 0.2s ease, opacity 0.2s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeThematicBreak\"]:hover > hr {",
            "  transform: scaleY(1.5);",
            "  opacity: 1;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-inlinecodecard", nameKey: "snippetBuiltinInlinecodecardName", descriptionKey: "snippetBuiltinInlinecodecardDescription",
        category: "code", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg span[data-type=\"code\"] {",
            "  font-family: var(--b3-font-family-code, monospace);",
            "  padding: 2px 6px;",
            "  border-radius: 5px;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 8%, var(--b3-theme-surface, #fff));",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 22%, transparent);",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  font-size: 0.88em;",
            "  transition: border-color 0.15s ease, background 0.15s ease;",
            "}",
            ".protyle-wysiwyg span[data-type=\"code\"]:hover {",
            "  border-color: var(--b3-theme-primary, #3575f0);",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 14%, var(--b3-theme-surface, #fff));",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-embedglow", nameKey: "snippetBuiltinEmbedglowName", descriptionKey: "snippetBuiltinEmbedglowDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeWidget\"] {",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, transparent);",
            "  border-radius: 8px;",
            "  overflow: hidden;",
            "  transition: border-color 0.2s ease, box-shadow 0.2s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeWidget\"]:hover {",
            "  border-color: var(--b3-theme-primary, #3575f0);",
            "  box-shadow: 0 4px 16px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 15%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-scriptsaccent", nameKey: "snippetBuiltinScriptsaccentName", descriptionKey: "snippetBuiltinScriptsaccentDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"sup\"], .protyle-wysiwyg [data-type=\"sub\"] {",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  font-weight: 600;",
            "  padding: 0 3px;",
            "  border-radius: 3px;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 8%, transparent);",
            "  transition: background 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"sup\"]:hover, .protyle-wysiwyg [data-type=\"sub\"]:hover {",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 18%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-mediarounded", nameKey: "snippetBuiltinMediaroundedName", descriptionKey: "snippetBuiltinMediaroundedDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeVideo\"], .protyle-wysiwyg [data-type=\"NodeAudio\"] {",
            "  border-radius: 8px;",
            "  overflow: hidden;",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 20%, transparent);",
            "  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);",
            "  transition: box-shadow 0.2s ease, border-color 0.2s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeVideo\"]:hover, .protyle-wysiwyg [data-type=\"NodeAudio\"]:hover {",
            "  border-color: var(--b3-theme-primary, #3575f0);",
            "  box-shadow: 0 4px 16px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 15%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-calloutcolored", nameKey: "snippetBuiltinCalloutcoloredName", descriptionKey: "snippetBuiltinCalloutcoloredDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-subtype=\"callout\"] {",
            "  border-left: 4px solid var(--b3-theme-primary, #3575f0);",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 8%, var(--b3-theme-surface, transparent));",
            "  border-radius: 6px;",
            "  padding: 10px 14px;",
            "  margin: 12px 0;",
            "  transition: transform 0.15s ease, box-shadow 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-subtype=\"callout\"]:hover {",
            "  transform: translateY(-1px);",
            "  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-linkdashed", nameKey: "snippetBuiltinLinkdashedName", descriptionKey: "snippetBuiltinLinkdashedDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg span[data-type=\"a\"] {",
            "  border-bottom: 1px dashed color-mix(in srgb, var(--b3-theme-primary, #3575f0) 55%, transparent);",
            "  text-decoration: none;",
            "  transition: border-bottom-color 0.15s ease, color 0.15s ease;",
            "}",
            ".protyle-wysiwyg span[data-type=\"a\"]:hover {",
            "  border-bottom: 1px solid var(--b3-theme-primary, #3575f0);",
            "  color: var(--b3-theme-primary, #3575f0);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-calloutgradient", nameKey: "snippetBuiltinCalloutgradientName", descriptionKey: "snippetBuiltinCalloutgradientDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg .b3-callout {",
            "  border-left: 4px solid var(--b3-theme-primary, #3575f0);",
            "  border-image: linear-gradient(180deg, var(--b3-theme-primary, #3575f0), color-mix(in srgb, var(--b3-theme-primary, #3575f0) 40%, #ff9800)) 1;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 5%, transparent);",
            "  padding: 8px 14px;",
            "  margin: 12px 0;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-hrdots", nameKey: "snippetBuiltinHrdotsName", descriptionKey: "snippetBuiltinHrdotsDescription",
        category: "divider", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeThematicBreak\"]::before {",
            "  content: \"•••\";",
            "  display: block;",
            "  text-align: center;",
            "  letter-spacing: 0.6em;",
            "  color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 45%, transparent);",
            "  font-size: 14px;",
            "  line-height: 1;",
            "  margin: 1.2em auto;",
            "  transition: color 0.2s ease, letter-spacing 0.2s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeThematicBreak\"]:hover::before {",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  letter-spacing: 0.8em;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-taskcheckbox", nameKey: "snippetBuiltinTaskcheckboxName", descriptionKey: "snippetBuiltinTaskcheckboxDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg .protyle-action--task {",
            "  border-radius: 4px;",
            "  transition: transform 0.15s ease, background-color 0.15s ease;",
            "}",
            ".protyle-wysiwyg .protyle-action--task:hover {",
            "  transform: scale(1.12);",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 15%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-tablefirstcol", nameKey: "snippetBuiltinTablefirstcolName", descriptionKey: "snippetBuiltinTablefirstcolDescription",
        category: "table", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg table td:first-child {",
            "  font-weight: 600;",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 4%, transparent);",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  border-right: 2px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, transparent);",
            "}",
            ".protyle-wysiwyg table tr:hover td:first-child {",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 8%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-taskprogress", nameKey: "snippetBuiltinTaskprogressName", descriptionKey: "snippetBuiltinTaskprogressDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeList\"][data-subtype=\"t\"] {",
            "  border-left: 2.5px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, transparent);",
            "  padding-left: 8px;",
            "  border-radius: 2px;",
            "  transition: border-left-color 0.18s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeList\"][data-subtype=\"t\"]:hover {",
            "  border-left-color: var(--b3-theme-primary, #3575f0);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-taskbadge", nameKey: "snippetBuiltinTaskbadgeName", descriptionKey: "snippetBuiltinTaskbadgeDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeTaskListItem\"] {",
            "  border-radius: 6px;",
            "  padding: 2px 6px;",
            "  transition: background-color 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeTaskListItem\"]:hover {",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 5%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-quotehanging", nameKey: "snippetBuiltinQuotehangingName", descriptionKey: "snippetBuiltinQuotehangingDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"]::before {",
            "  content: \"“\";",
            "  position: absolute;",
            "  top: -8px;",
            "  left: 8px;",
            "  font-size: 3em;",
            "  font-family: \"Times New Roman\", Times, serif;",
            "  color: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 22%, transparent);",
            "  pointer-events: none;",
            "  line-height: 1;",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-inlineneon", nameKey: "snippetBuiltinInlineneonName", descriptionKey: "snippetBuiltinInlineneonDescription",
        category: "code", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg code {",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 45%, transparent);",
            "  box-shadow: 0 0 6px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 20%, transparent);",
            "  transition: box-shadow 0.2s ease, border-color 0.2s ease;",
            "}",
            ".protyle-wysiwyg code:hover {",
            "  box-shadow: 0 0 10px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 40%, transparent);",
            "  border-color: var(--b3-theme-primary, #3575f0);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-embedshadow", nameKey: "snippetBuiltinEmbedshadowName", descriptionKey: "snippetBuiltinEmbedshadowDescription",
        category: "layout", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockQueryEmbed\"] {",
            "  border-left: 3px solid var(--b3-theme-primary, #3575f0);",
            "  transition: box-shadow 0.2s ease, border-color 0.2s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeBlockQueryEmbed\"]:hover {",
            "  box-shadow: 0 4px 18px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 18%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-taggradient", nameKey: "snippetBuiltinTaggradientName", descriptionKey: "snippetBuiltinTaggradientDescription",
        category: "tag", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg span[data-type=\"tag\"] {",
            "  background: linear-gradient(135deg, color-mix(in srgb, var(--b3-theme-primary, #3575f0) 14%, transparent), color-mix(in srgb, var(--b3-theme-primary, #3575f0) 4%, transparent));",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 30%, transparent);",
            "  border-radius: 12px;",
            "  padding: 1px 8px;",
            "  font-weight: 500;",
            "  transition: transform 0.15s ease, box-shadow 0.15s ease;",
            "}",
            ".protyle-wysiwyg span[data-type=\"tag\"]:hover {",
            "  transform: translateY(-1px);",
            "  box-shadow: 0 2px 6px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-imgcard", nameKey: "snippetBuiltinImgcardName", descriptionKey: "snippetBuiltinImgcardDescription",
        category: "image", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg :is([data-type=\"NodeImage\"], span[data-type=\"img\"], [data-type=\"NodeParagraph\"]) img:not(.emoji) {",
            "  padding: 6px;",
            "  background: color-mix(in srgb, var(--b3-theme-surface, #ffffff) 90%, transparent);",
            "  border: 1px solid color-mix(in srgb, var(--b3-theme-primary, #3575f0) 15%, transparent);",
            "  border-radius: 10px;",
            "  display: inline-block;",
            "  transition: border-color 0.2s ease, box-shadow 0.2s ease;",
            "}",
            ".protyle-wysiwyg :is([data-type=\"NodeImage\"], span[data-type=\"img\"], [data-type=\"NodeParagraph\"]):hover img:not(.emoji) {",
            "  border-color: var(--b3-theme-primary, #3575f0);",
            "  box-shadow: 0 4px 14px color-mix(in srgb, var(--b3-theme-primary, #3575f0) 12%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-codelineright", nameKey: "snippetBuiltinCodelinerightName", descriptionKey: "snippetBuiltinCodelinerightDescription",
        category: "code", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeCodeBlock\"] .protyle-linenumber__rows {",
            "  text-align: right;",
            "  padding-right: 8px;",
            "  opacity: 0.65;",
            "  color: var(--b3-theme-on-surface-light, #888);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-quotehover", nameKey: "snippetBuiltinQuotehoverName", descriptionKey: "snippetBuiltinQuotehoverDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"] {",
            "  transition: transform 0.18s ease, background-color 0.18s ease;",
            "}",
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"]:hover {",
            "  transform: translateX(3px);",
            "  background: color-mix(in srgb, var(--b3-theme-primary, #3575f0) 6%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-listbulletpulse", nameKey: "snippetBuiltinListbulletpulseName", descriptionKey: "snippetBuiltinListbulletpulseDescription",
        category: "list", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-subtype=\"u\"] > [data-type=\"NodeListItem\"] > .protyle-action {",
            "  color: var(--b3-theme-primary, #3575f0);",
            "  transition: transform 0.15s ease, color 0.15s ease;",
            "}",
            ".protyle-wysiwyg [data-subtype=\"u\"] > [data-type=\"NodeListItem\"]:hover > .protyle-action {",
            "  transform: scale(1.25);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-calloutinfo", nameKey: "snippetBuiltinCalloutinfoName", descriptionKey: "snippetBuiltinCalloutinfoDescription",
        category: "quote", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg [data-type=\"NodeBlockquote\"][data-subtype=\"info\"] {",
            "  border-left: 4px solid #1890ff;",
            "  background: color-mix(in srgb, #1890ff 8%, var(--b3-theme-surface, transparent));",
            "  border-radius: 6px;",
            "  box-shadow: 0 2px 8px color-mix(in srgb, #1890ff 15%, transparent);",
            "}",
        ].join("\n"),
    },
    {
        id: "swss-builtin-markgradient", nameKey: "snippetBuiltinMarkgradientName", descriptionKey: "snippetBuiltinMarkgradientDescription",
        category: "typography", type: "css", source: "builtin",
        content: [
            ".protyle-wysiwyg span[data-type=\"mark\"] {",
            "  background: linear-gradient(120deg, color-mix(in srgb, var(--b3-theme-primary, #3575f0) 25%, #ffeb3b), color-mix(in srgb, var(--b3-theme-primary, #3575f0) 10%, #fff59d));",
            "  border-radius: 4px;",
            "  padding: 1px 4px;",
            "  box-decoration-break: clone;",
            "  -webkit-box-decoration-break: clone;",
            "}",
        ].join("\n"),
    },
].map((entry) => Object.freeze(entry)));

/** Caller may attach localized name/description and its own native entries. */
function filterSnippetCatalog(catalog, filters = {}) {
    if (!Array.isArray(catalog)) return [];
    const options = isRecord(filters) ? filters : {};
    const query = typeof options.query === "string" ? options.query.trim().toLocaleLowerCase() : "";
    const found = catalog.filter((entry) => {
        if (!isRecord(entry)) return false;
        for (const key of ["type", "category", "source"]) {
            if (options[key] && options[key] !== "all" && entry[key] !== options[key]) return false;
        }
        if (!query) return true;
        return [entry.id, entry.name, entry.description, entry.nameKey, entry.descriptionKey, entry.category, entry.content,
            entry.alias, entry.summary, ...(Array.isArray(entry.tags) ? entry.tags : [])]
            .filter((value) => typeof value === "string").join("\n").toLocaleLowerCase().includes(query);
    });
    // T-6913（R8-A6 变体）：宿主 getSnippet 契约没有更新时间字段（仅
    // id/name/type/content/enabled/disabledInPublish），无法按更新时间排序。
    // 以"自有片段优先于内建示例"防内建样本霸榜；组内保持宿主返回序（≈创建序）。
    return found.sort((first, second) => Number(second.pinned === true) - Number(first.pinned === true)
        || (options.sort === "name" ? String(first.alias || first.name || "").localeCompare(String(second.alias || second.name || ""))
            : options.sort === "modified" ? (Number(second.modifiedAt) || 0) - (Number(first.modifiedAt) || 0) : 0)
        || (first.source === "native" ? 0 : 1) - (second.source === "native" ? 0 : 1));
}

// T-6956：脏稿三选一的待执行意图协调器。宿主 canClose 保持同步阻止（返回 false
// 并打开三选一），保存/放弃得到明确结果后再执行待执行意图——绝不把 Promise 当
// 布尔用。语义：干净直接放行；保存成功才导航一次（失败/冲突/异常停在草稿）；
// 放弃零写入直接放行；取消清空意图；saving 期间拒绝重复提交（连续点击不重复
// 写入、不执行两个导航）。
function createLeaveIntentCoordinator() {
    let pending = null;
    let saving = false;
    return {
        requestLeave(dirty, busy, run) {
            if (busy || saving) return {action: "reject"};
            if (!dirty) {
                if (typeof run === "function") run();
                return {action: "run"};
            }
            pending = {run};
            return {action: "confirm"};
        },
        async confirmSave(save) {
            if (!pending || saving) return {saved: false, navigated: false};
            saving = true;
            try {
                const ok = await save();
                saving = false;
                if (ok !== true) {
                    pending = null;
                    return {saved: false, navigated: false};
                }
                const run = pending ? pending.run : null;
                pending = null;
                if (typeof run === "function") run();
                return {saved: true, navigated: true};
            } catch (_) {
                saving = false;
                pending = null;
                return {saved: false, navigated: false};
            }
        },
        confirmDiscard() {
            const run = pending ? pending.run : null;
            pending = null;
            saving = false;
            if (typeof run === "function") {
                run();
                return {navigated: true};
            }
            return {navigated: false};
        },
        cancel() {
            pending = null;
            saving = false;
            return {pending: false};
        },
        hasPending: () => Boolean(pending),
        isSaving: () => saving,
    };
}

// T-6957：统一草稿历史（名称/类型/正文事务）——快照策略：SNIPPET_CODE_MAX=64 KiB
// 时 50 步全量快照最坏 ~3.2 MB，故设 512 KiB 总字节预算，超限从最旧端丢弃（至少
// 保留当前态）；不新建持久化片段副本，历史只存活于编辑会话。
const DRAFT_HISTORY_MAX_STEPS = 50;
const DRAFT_HISTORY_MAX_BYTES = 512 * 1024;

function estimateDraftStateBytes(state) {
    if (!state || typeof state !== "object") return 8;
    return (String(state.name || "").length) + (String(state.content || "").length) + 8;
}

function createDraftHistory(state, options) {
    const opts = options || {};
    const entry = {state: {...(state || {name: "", type: "css", content: ""})}, bytes: estimateDraftStateBytes(state)};
    return {stack: [entry], index: 0, max: opts.max || DRAFT_HISTORY_MAX_STEPS, maxBytes: opts.maxBytes || DRAFT_HISTORY_MAX_BYTES};
}

function pushDraftHistory(history, state) {
    const top = history.stack[history.index];
    if (top && JSON.stringify(top.state) === JSON.stringify(state)) return history;
    const stack = history.stack.slice(0, history.index + 1);
    stack.push({state: {...state}, bytes: estimateDraftStateBytes(state)});
    let index = stack.length - 1;
    while (stack.length > 1 && (stack.length > history.max || totalDraftBytes(stack) > history.maxBytes)) {
        stack.shift();
        index = Math.min(index, stack.length - 1);
    }
    return {stack, index, max: history.max, maxBytes: history.maxBytes};
}

function totalDraftBytes(stack) {
    return stack.reduce((sum, entry) => sum + entry.bytes, 0);
}

function canUndoDraftHistory(history) {
    return history.index > 0;
}

function canRedoDraftHistory(history) {
    return history.index < history.stack.length - 1;
}

function undoDraftHistory(history) {
    if (!canUndoDraftHistory(history)) return {history, state: null};
    const index = history.index - 1;
    return {history: {...history, index}, state: {...history.stack[index].state}};
}

function redoDraftHistory(history) {
    if (!canRedoDraftHistory(history)) return {history, state: null};
    const index = history.index + 1;
    return {history: {...history, index}, state: {...history.stack[index].state}};
}

// T-6958：冲突副本——把本地草稿保留为「禁用的新片段」：新 id、enabled=false、
// 名称在最新清单内唯一（冲突副本/序号递增，长度 40 上限）；原清单与冲突原件
// 完全不动。最新清单不可得时返回 null（调用方禁用副本出口并给回执）。
const CONFLICT_COPY_NAME_MAX = 40;

function nextConflictCopyName(existingNames, baseName) {
    const clean = String(baseName || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 30) || "snippet";
    const names = new Set((Array.isArray(existingNames) ? existingNames : []).map((value) => String(value || "").trim()));
    const base = `${clean} (冲突副本)`;
    if (!names.has(base)) return base.slice(0, CONFLICT_COPY_NAME_MAX);
    for (let index = 2; index < 100; index += 1) {
        const candidate = `${clean.slice(0, 24)} (冲突副本 ${index})`;
        if (!names.has(candidate)) return candidate.slice(0, CONFLICT_COPY_NAME_MAX);
    }
    return `${base.slice(0, 34)}-${Date.now().toString(36).slice(-4)}`;
}

function buildConflictCopyEntry(latestList, draft, newId) {
    if (!Array.isArray(latestList)) return null;
    if (!draft || typeof draft !== "object" || typeof draft.content !== "string" || !draft.content.trim()) return null;
    const existingNames = latestList.map((snippet) => (snippet && typeof snippet.name === "string" ? snippet.name : ""));
    return {
        id: String(newId || ""),
        name: nextConflictCopyName(existingNames, draft.name),
        type: draft.type === "js" ? "js" : "css",
        content: draft.content,
        enabled: false,
    };
}

// T-6979：实验室会话内的最近原生片段，只记 ID，不复制正文或写入存储。
function rememberRecentSnippet(ids, id, limit = 6) {
    if (typeof id !== "string" || !id) return Array.isArray(ids) ? ids.slice(0, limit) : [];
    return [id, ...(Array.isArray(ids) ? ids : []).filter((entry) => typeof entry === "string" && entry !== id)].slice(0, limit);
}

// T-6959：草稿内纯文本查找与替换。字面匹配（无正则）、不区分大小写、
// 左起不重叠顺序命中；命中数封顶 1000 防超大文本刷屏；替换逐段拼装，
// 绝不使用字符串替换的正则形态。
const DRAFT_FIND_MATCH_CAP = 1000;

function findDraftMatches(content, query) {
    if (typeof content !== "string" || typeof query !== "string" || query === "") return [];
    const haystack = content.toLocaleLowerCase();
    const needle = query.toLocaleLowerCase();
    if (needle.length === 0 || needle.length > haystack.length) return [];
    const matches = [];
    let pos = haystack.indexOf(needle);
    while (pos >= 0 && matches.length < DRAFT_FIND_MATCH_CAP) {
        matches.push({start: pos, end: pos + needle.length});
        pos = haystack.indexOf(needle, pos + needle.length);
    }
    return matches;
}

function replaceDraftMatches(content, query, replacement) {
    const source = typeof content === "string" ? content : "";
    const safeReplacement = typeof replacement === "string" ? replacement : "";
    const matches = findDraftMatches(source, query);
    if (matches.length === 0) return {content: source, count: 0};
    let out = "";
    let cursor = 0;
    for (const match of matches) {
        out += source.slice(cursor, match.start) + safeReplacement;
        cursor = match.end;
    }
    out += source.slice(cursor);
    return {content: out, count: matches.length};
}

// T-7698：代码片段微指标统计模型
function calculateSnippetStats(snippets) {
    if (!Array.isArray(snippets)) {
        return { total: 0, enabled: 0, cssCount: 0, jsCount: 0 };
    }
    let total = 0;
    let enabled = 0;
    let cssCount = 0;
    let jsCount = 0;
    for (const snip of snippets) {
        if (!snip || typeof snip !== "object") continue;
        total += 1;
        if (snip.enabled) enabled += 1;
        if (snip.type === "css") cssCount += 1;
        else if (snip.type === "js") jsCount += 1;
    }
    return { total, enabled, cssCount, jsCount };
}

function buildSnippetMetricPills(stats = {}, labels = {}) {
    const total = Number(stats.total) || 0;
    const enabled = Number(stats.enabled) || 0;
    const cssCount = Number(stats.cssCount) || 0;
    const jsCount = Number(stats.jsCount) || 0;
    return [
        {
            key: "all",
            filterType: "all",
            label: labels.all || "全部",
            count: total,
            isDataAccent: false,
        },
        {
            key: "enabled",
            filterType: "enabled",
            label: labels.enabled || "已启用",
            count: enabled,
            isDataAccent: true, // 采用青绿语义色
        },
        {
            key: "css",
            filterType: "css",
            label: labels.css || "CSS",
            count: cssCount,
            isDataAccent: false,
        },
        {
            key: "js",
            filterType: "js",
            label: labels.js || "JavaScript",
            count: jsCount,
            isDataAccent: false,
        },
    ];
}

module.exports = {
    SNIPPET_CODE_MAX,
    SNIPPET_BACKUP_SCHEMA_VERSION,
    SNIPPET_BACKUP_MAX_SNIPPETS,
    SNIPPET_BACKUP_MAX_BYTES,
    parseSnippetImport, readNativeSnippetResponse,
    buildSnippetMutation, projectSnippetForWire, projectSnippetListForWire,
    normalizeSnippetSnapshot, snippetSnapshotSignature, buildSnippetBackup,
    normalizeSnippetBackup, diffSnippetBackup, buildSnippetRestorePlan,
    BUILTIN_SNIPPETS, filterSnippetCatalog, buildUsercssHeader, stripUsercssHeader,
    hasUsercssHeader, resolveUsercssVariables,
    USERCSS_HEADER_RE,
    createLeaveIntentCoordinator,
    DRAFT_HISTORY_MAX_STEPS,
    DRAFT_HISTORY_MAX_BYTES,
    createDraftHistory,
    pushDraftHistory,
    undoDraftHistory,
    redoDraftHistory,
    canUndoDraftHistory,
    canRedoDraftHistory,
    CONFLICT_COPY_NAME_MAX,
    nextConflictCopyName,
    buildConflictCopyEntry,
    rememberRecentSnippet,
    DRAFT_FIND_MATCH_CAP,
    findDraftMatches,
    replaceDraftMatches,
    calculateSnippetStats,
    buildSnippetMetricPills,
    COMMUNITY_SNIPPETS,
};
