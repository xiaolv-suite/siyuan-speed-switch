// 【断点消除战役】Selection Context Classifier 选区上下文分类器契约与单测
// 门禁自查（docs/gate-audit-checklist.md）：
// 1. 四类文本（url/code/concept/general）分类精度与置信度；
// 2. 边界条件：超长短语、超短文本、带空格 URL、含个别关键字的普通英文段落；
// 3. 智能置顶排布：对应动作置顶第 1 位，带「⚡ 推荐」微标，其余动作严格顺延不漏项；
// 4. 插件缺失降级：未安装插件置灰 disabled，提示降级复制；
// 5. 门禁负向验证：非法输入隔离保护。

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    CONTEXT_ACTIONS,
    classifySelectionContext,
    rankActionsWithSelectionPromotion,
} = require("../src/selection-context-classifier.js");

test("1. URL 选区分类：单行纯 URL 正确识别与收录拾遗动作映射", () => {
    const urls = [
        "https://ld246.com/article/123456",
        "http://127.0.0.1:6806/api/version",
        "https://github.com/xiaolv-suite/siyuan-speed-switch?tab=readme-ov-file#installation",
        "  https://siyuan-note.com  ",
    ];

    for (const url of urls) {
        const res = classifySelectionContext(url);
        assert.equal(res.kind, "url", `应判定为 url: ${url}`);
        assert.equal(res.confidence, 1.0);
        assert.equal(res.recommendedAction.id, "glean-clip");
        assert.equal(res.recommendedAction.label, "🔖 收录拾遗");
        assert.equal(res.recommendedAction.targetPlugin, "glean");
    }
});

test("2. Code 选区分类：Markdown 反引号块与多行代码语法密度识别", () => {
    // 2.1 反引号代码块
    const fencedJs = "```javascript\nconst a = 1;\nconsole.log(a);\n```";
    const resFenced = classifySelectionContext(fencedJs);
    assert.equal(resFenced.kind, "code");
    assert.ok(resFenced.confidence >= 0.9);
    assert.equal(resFenced.recommendedAction.id, "common-snippet");
    assert.equal(resFenced.recommendedAction.label, "🔤 存入常用");

    // 2.2 多行含函数与语法的代码
    const jsFunction = `
        function computeTotal(items) {
            const sum = items.reduce((acc, it) => acc + it.price, 0);
            return sum;
        }
    `;
    const resFn = classifySelectionContext(jsFunction);
    assert.equal(resFn.kind, "code");
    assert.ok(resFn.confidence >= 0.75);

    // 2.3 Python 脚本
    const pyCode = `
        def fetch_records(endpoint):
            import requests
            res = requests.get(endpoint)
            return res.json()
    `;
    const resPy = classifySelectionContext(pyCode);
    assert.equal(resPy.kind, "code");
});

test("3. Concept 选区分类：6~120 字且包含定义标点/指示词", () => {
    const concepts = [
        "微前端：去中心化协同架构与组件通信规范",
        "自协商协议是指多个兄弟插件自组织通信",
        "状态机——驱动 UI 渲染与时序流转的单一事实源",
        "什么是高阶选区上下文分类器？",
        "Focus Trap: 模态弹窗全键盘无障碍焦点捕获循环",
        "原子切片即知识蒸馏最小不可分单元",
        "What is Selection Context Classifier?",
    ];

    for (const text of concepts) {
        const res = classifySelectionContext(text);
        assert.equal(res.kind, "concept", `应判定为 concept: ${text}`);
        assert.ok(res.confidence >= 0.8);
        assert.equal(res.recommendedAction.id, "cards-create");
        assert.equal(res.recommendedAction.label, "🎴 生成闪卡");
        assert.equal(res.recommendedAction.targetPlugin, "cards");
    }
});

test("4. General 选区分类：普通文本默认兜底与切入暂存栈", () => {
    const texts = [
        "今天思源笔记工作区运行非常稳定，所有历史记录与标签均已同步完成。",
        "简单的笔记摘抄随手记录一下备用。",
        "雷切分栏切换与选区暂存平台",
    ];

    for (const text of texts) {
        const res = classifySelectionContext(text);
        assert.equal(res.kind, "general", `应判定为 general: ${text}`);
        assert.equal(res.recommendedAction.id, "stack-capture");
        assert.equal(res.recommendedAction.label, "✂️ 切入暂存栈");
        assert.equal(res.recommendedAction.targetPlugin, "raikiri");
    }
});

test("5. 边界条件测试：超长短语、超短文本、带空格 URL、伪代码普通英语段落", () => {
    // 边界 1：长度超过 120 字的超长短语，即使含有“：”或“是指”，也不属于简要概念，归入 general
    const longConcept = "知识蒸馏体系：".padEnd(130, "这是一个关于知识蒸馏与切片暂存的超长论述段落，包含了大量的分析与背景说明。");
    const resLong = classifySelectionContext(longConcept);
    assert.equal(resLong.kind, "general", "超过 120 字必须降级为 general");

    // 边界 2：长度小于 6 字的超短文本，即使包含“：”，也归入 general
    const shortConcept = "概念：A"; // 4 字
    const resShort = classifySelectionContext(shortConcept);
    assert.equal(resShort.kind, "general", "小于 6 字必须降级为 general");

    // 边界 3：中间包含空格的非法 URL（非单行标准链接）
    const spaceUrl = "https://example.com/api/get query item";
    const resSpaceUrl = classifySelectionContext(spaceUrl);
    assert.notEqual(resSpaceUrl.kind, "url", "带空格的文本不得误判为纯 URL");

    // 边界 4：普通英语多行段落（包含单个 if 或 for，但无代码语法符号密度）
    const englishProse = `
        This is a product design review for the new release.
        If you have any questions or feedback for the team,
        please reach out to us in the community channel.
    `;
    const resProse = classifySelectionContext(englishProse);
    assert.equal(resProse.kind, "general", "普通英文段落绝不得误判为代码");
});

test("6. 智能置顶排布：匹配动作置顶第 1 位带「⚡ 推荐」微标，其余动作顺延不漏项", () => {
    const baseActions = [
        {id: "open-active", label: "在当前页签打开"},
        {id: "open-right", label: "在右侧分栏打开"},
        {id: "copy-block-link", label: "复制块超链接"},
        {id: "glean-clip", label: "收录拾遗"},
        {id: "common-snippet", label: "存入常用"},
    ];

    // 测试 6.1：URL 文本输入 -> glean-clip 置顶第 1 位
    const rankedUrl = rankActionsWithSelectionPromotion(baseActions, "https://github.com/xiaolv-suite");
    assert.equal(rankedUrl.length, baseActions.length, "动作总数不得减少");
    assert.equal(rankedUrl[0].id, "glean-clip", "首项必须为推荐的 glean-clip");
    assert.equal(rankedUrl[0].recommended, true);
    assert.equal(rankedUrl[0].recommendBadge, "⚡ 推荐");
    // 验证其余动作顺延且保持原本相对顺序
    const remainingIdsUrl = rankedUrl.slice(1).map((a) => a.id);
    assert.deepEqual(remainingIdsUrl, ["open-active", "open-right", "copy-block-link", "common-snippet"]);

    // 测试 6.2：Code 文本输入 -> common-snippet 置顶第 1 位
    const codeSnippet = "function foo() {\n    return 42;\n}";
    const rankedCode = rankActionsWithSelectionPromotion(baseActions, codeSnippet);
    assert.equal(rankedCode[0].id, "common-snippet", "首项必须为推荐的 common-snippet");
    assert.equal(rankedCode[0].recommended, true);
    assert.equal(rankedCode[0].recommendBadge, "⚡ 推荐");
    const remainingIdsCode = rankedCode.slice(1).map((a) => a.id);
    assert.deepEqual(remainingIdsCode, ["open-active", "open-right", "copy-block-link", "glean-clip"]);

    // 测试 6.3：原列表中不存在置顶动作时，安全前置插入，其余顺延
    const rankedConcept = rankActionsWithSelectionPromotion(baseActions, "微前端：去中心化协作架构");
    assert.equal(rankedConcept.length, baseActions.length + 1, "未在清单中的推荐动作安全前置注入");
    assert.equal(rankedConcept[0].id, "cards-create");
    assert.equal(rankedConcept[0].recommended, true);
    assert.equal(rankedConcept[0].recommendBadge, "⚡ 推荐");
});

test("7. 目标插件缺失降级：未安装插件置灰 disabled，点击指示复制降级", () => {
    const baseActions = [
        {id: "open-active", label: "打开"},
    ];

    // 模拟 glean 插件未安装
    const isInstalled = (pluginId) => pluginId !== "glean";
    const ranked = rankActionsWithSelectionPromotion(baseActions, "https://example.com", {
        isPluginInstalled: isInstalled,
    });

    const topAction = ranked[0];
    assert.equal(topAction.id, "glean-clip");
    assert.equal(topAction.recommended, true);
    assert.equal(topAction.disabled, true, "未安装目标插件时置顶动作必须置灰");
    assert.equal(topAction.available, false);
    assert.match(topAction.degradedHint, /未安装对应插件/);
});

test("8. 门禁负向验证：非法与空输入安全隔离，零崩溃兜底", () => {
    const invalidInputs = [null, undefined, "", "   ", 12345, {}, []];
    for (const input of invalidInputs) {
        const res = classifySelectionContext(input);
        assert.equal(res.kind, "general", "非法输入必须安全兜底为 general");
        assert.ok(res.recommendedAction, "必须提供默认推荐动作");
        assert.equal(res.recommendedAction.id, "stack-capture");
    }

    const resEmptyRank = rankActionsWithSelectionPromotion(null, null);
    assert.ok(Array.isArray(resEmptyRank));
    assert.ok(resEmptyRank.length >= 1);
});
