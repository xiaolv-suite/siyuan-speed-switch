'use strict';

/**
 * Selection Context Classifier · 小驴雷切选区上下文纯函数分类器
 * 零 DOM、零网络依赖，纯领域逻辑，供单测与生产环境无缝调用。
 */

const URL_SINGLE_LINE_RE = /^(?:(?:链接|网址|发现新链接|参考|来源)[：:])?\s*https?:\/\/\S+$/i;

// 概念定义标点与连词：：, :, ——, 是指, 即, ？, ?
const CONCEPT_PUNCTUATION_RE = /[：:——？?]|是指|即/;

// 代码特征关键字
const CODE_KEYWORDS_RE = /\b(function|const|let|var|import|export|class|def|return|if|else|for|while|switch|case|try|catch|async|await|interface|type|fn|impl|struct|enum|public|private)\b/g;

// 代码块语法标记
const CODE_SYNTAX_TOKENS_RE = /[{}()[\];]|=>|===|!==|==|!=|\+\+|--|&&|\|\||console\.log|println!|def\s+\w+\(|fun\s+\w+\(/;

const ACTION_ALIASES = Object.freeze({
    "glean-clip": ["glean-clip", "glean-keep-roaming"],
    "common-snippet": ["common-snippet", "snippet-studio"],
    "cards-create": ["cards-create"],
    "stack-capture": ["stack-capture"],
});

const CONTEXT_ACTIONS = Object.freeze({
    url: Object.freeze({
        id: "glean-clip",
        actionId: "glean-clip",
        label: "🔖 收录拾遗",
        icon: "iconBook",
        targetPlugin: "glean",
        recommended: true,
        recommendBadge: "⚡ 推荐",
        description: "一键收录至小驴拾遗漫游阅读流",
    }),
    code: Object.freeze({
        id: "common-snippet",
        actionId: "common-snippet",
        label: "🔤 存入常用",
        icon: "iconCode",
        targetPlugin: "common",
        recommended: true,
        recommendBadge: "⚡ 推荐",
        description: "保存代码片段至小驴常用短语库",
    }),
    concept: Object.freeze({
        id: "cards-create",
        actionId: "cards-create",
        label: "🎴 生成闪卡",
        icon: "iconSparkles",
        targetPlugin: "cards",
        recommended: true,
        recommendBadge: "⚡ 推荐",
        description: "提炼概念定义并生成小驴记忆闪卡",
    }),
    general: Object.freeze({
        id: "stack-capture",
        actionId: "stack-capture",
        label: "✂️ 切入暂存栈",
        icon: "iconCut",
        targetPlugin: "raikiri",
        recommended: true,
        recommendBadge: "⚡ 推荐",
        description: "将当前选区存入雷切切片暂存栈",
    }),
});

/**
 * 分析多行文本的代码语法特征密度
 * @param {string} text 选区文本
 * @returns {{ isCode: boolean, confidence: number }}
 */
function analyzeCodeDensity(text) {
    if (typeof text !== "string" || !text.trim()) {
        return { isCode: false, confidence: 0 };
    }
    const trimmed = text.trim();

    // 1. Markdown 反引号包裹的代码块（``` 或 `）
    if (/^```[\w-]*\s*[\s\S]+```$/.test(trimmed)) {
        return { isCode: true, confidence: 0.98 };
    }
    if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length >= 6 && !trimmed.slice(1, -1).includes("`")) {
        return { isCode: true, confidence: 0.90 };
    }

    // 2. 多行代码语法密度分析（至少包含换行符）
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
        return { isCode: false, confidence: 0 };
    }

    const keywordMatches = trimmed.match(CODE_KEYWORDS_RE) || [];
    const keywordCount = keywordMatches.length;
    const hasSyntaxTokens = CODE_SYNTAX_TOKENS_RE.test(trimmed);

    // 缩进/花括号代码块结构检测
    const hasCurlyBraces = trimmed.includes("{") && trimmed.includes("}");
    const linesEndingWithSyntax = lines.filter((l) => /[;{}(),]$/.test(l)).length;
    const syntaxRatio = linesEndingWithSyntax / lines.length;

    // 代码判定准则：
    // a. 出现至少 2 个代码关键字且包含语法标点
    // b. 包含花括号代码块结构且至少出现 1 个关键字或语法尾符
    // c. 超过半数行包含程序语言语法结尾（如分号、逗号、大括号）且有标点
    if (
        (keywordCount >= 2 && hasSyntaxTokens) ||
        (hasCurlyBraces && (keywordCount >= 1 || linesEndingWithSyntax >= 1)) ||
        (syntaxRatio >= 0.5 && hasSyntaxTokens && keywordCount >= 1)
    ) {
        const confidence = Math.min(0.96, Math.max(0.75, 0.70 + (keywordCount * 0.05) + (syntaxRatio * 0.15)));
        return { isCode: true, confidence: Math.round(confidence * 100) / 100 };
    }

    return { isCode: false, confidence: 0 };
}

/**
 * 选区文本分类器纯函数
 * @param {string} rawText 选区文本
 * @returns {{
 *   kind: "url" | "code" | "concept" | "general",
 *   confidence: number,
 *   recommendedAction: object,
 *   meta: Record<string, unknown>
 * }}
 */
function classifySelectionContext(rawText) {
    if (typeof rawText !== "string" || !rawText.trim()) {
        return {
            kind: "general",
            confidence: 0,
            recommendedAction: CONTEXT_ACTIONS.general,
            meta: { charCount: 0, hasNewlines: false },
        };
    }

    const trimmed = rawText.trim();
    const hasNewlines = /[\r\n]/.test(trimmed);
    const charCount = Array.from(trimmed).length;

    // 1. URL 分类：单行无换行、纯单个合法 URL 链接匹配（支持通用分享前缀如“发现新链接：https://…”）
    if (!hasNewlines && URL_SINGLE_LINE_RE.test(trimmed)) {
        return {
            kind: "url",
            confidence: 1.0,
            recommendedAction: CONTEXT_ACTIONS.url,
            meta: { url: trimmed, charCount },
        };
    }

    // 2. 代码分类：多行含代码语法特征密度，或首尾反引号包裹
    const codeAnalysis = analyzeCodeDensity(trimmed);
    if (codeAnalysis.isCode) {
        return {
            kind: "code",
            confidence: codeAnalysis.confidence,
            recommendedAction: CONTEXT_ACTIONS.code,
            meta: { charCount, hasNewlines, codeConfidence: codeAnalysis.confidence },
        };
    }

    // 3. 概念定义分类：长度 6~120 字且包含定义标点/指示词
    if (charCount >= 6 && charCount <= 120 && CONCEPT_PUNCTUATION_RE.test(trimmed)) {
        return {
            kind: "concept",
            confidence: 0.88,
            recommendedAction: CONTEXT_ACTIONS.concept,
            meta: { charCount, hasNewlines },
        };
    }

    // 4. 普通文本兜底
    return {
        kind: "general",
        confidence: 0.65,
        recommendedAction: CONTEXT_ACTIONS.general,
        meta: { charCount, hasNewlines },
    };
}

/**
 * 智能置顶排布动作列表：
 * 按分类将最匹配动作置顶第 1 位并加「⚡ 推荐」微光标，其余动作顺延不漏项。
 * 目标插件未安装时通过 isPluginInstalled 判断，并安全置灰。
 *
 * @param {Array<object>} actions 待排布的动作数组
 * @param {string|object} selection 选区文本或分类结果
 * @param {object} [options] 配置选项
 * @param {(pluginId: string) => boolean} [options.isPluginInstalled] 插件安装状态检测函数
 * @param {boolean} [options.injectMissing] 若列表中无该动作是否强制前置注入（默认 true）
 * @returns {Array<object>} 智能排序后的动作数组
 */
function rankActionsWithSelectionPromotion(actions, selection, options = {}) {
    const list = Array.isArray(actions) ? actions.slice() : [];
    const classification = typeof selection === "object" && selection !== null && typeof selection.kind === "string"
        ? selection
        : classifySelectionContext(typeof selection === "string" ? selection : "");

    const rec = classification.recommendedAction || CONTEXT_ACTIONS.general;
    const isInstalledFn = typeof options.isPluginInstalled === "function"
        ? options.isPluginInstalled
        : () => true;

    const targetPlugin = rec.targetPlugin || "raikiri";
    const isTargetInstalled = targetPlugin === "raikiri" || isInstalledFn(targetPlugin);

    // 查找已有 actions 中是否已存在相同动作 ID 或同族别名
    const candidateIds = ACTION_ALIASES[rec.id] || [rec.id];
    let existingIndex = -1;
    for (const cid of candidateIds) {
        existingIndex = list.findIndex(
            (a) => (a && (a.id === cid || a.actionId === cid || a.value === cid))
        );
        if (existingIndex >= 0) break;
    }

    if (existingIndex >= 0) {
        const existing = list[existingIndex];
        const promotedAction = {
            ...existing,
            recommended: true,
            recommendBadge: "⚡ 推荐",
            recommendReason: classification.kind,
            disabled: !isTargetInstalled,
            available: isTargetInstalled,
            installed: isTargetInstalled,
            degradedHint: !isTargetInstalled ? `未安装对应插件，点击将复制选区` : undefined,
        };
        const remainingActions = list.filter((_, idx) => idx !== existingIndex);
        return [promotedAction, ...remainingActions];
    }

    if (options.injectMissing !== false) {
        const promotedAction = {
            ...rec,
            recommended: true,
            recommendBadge: "⚡ 推荐",
            recommendReason: classification.kind,
            disabled: !isTargetInstalled,
            available: isTargetInstalled,
            installed: isTargetInstalled,
            degradedHint: !isTargetInstalled ? `未安装对应插件，点击将复制选区` : undefined,
        };
        return [promotedAction, ...list];
    }

    return list;
}

module.exports = {
    ACTION_ALIASES,
    CONTEXT_ACTIONS,
    classifySelectionContext,
    rankActionsWithSelectionPromotion,
};
