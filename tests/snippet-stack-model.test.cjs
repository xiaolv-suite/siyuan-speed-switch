// TASK-20261031 / TASK-20261030:
// 连续切片暂存栈（Snippet Stack）+ 多维分片 + TextFold 5阶语义树原子切片 + 选区特征感知契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证暂存栈的增删、容量有界淘汰、置顶锁定、Alt+↑/↓调序与行内微调；
//   2. 验证多维分片（raw / key / action）与 TextFold 5 阶语义树转换及 Verbatim Guard 原文逐字保真；
//   3. 验证批量组装输出包含 ((blockId "来源锚点")) 反链与 custom-lv-source-block 属性；
//   4. 验证选区特征（长段落/URL/任务列表/代码块）智能推荐动作重排；
//   5. 包含四重破坏性负向验证探针。

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    SNIPPET_STACK_MAX,
    isVerbatimSubstring,
    extractVerbatimBrief,
    extractTopicFromText,
    extractKeySummaryFromText,
    extractActionItemsFromText,
    formatBlockRefBacklink,
    formatLineageKramdownIAL,
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
} = require("../src/snippet-stack-model.js");

test("Snippet Stack: 基础创建、多维分片归一与容量有界淘汰", () => {
    const rawParagraph = "小驴雷切是思源笔记的统一切换与工作上下文平台。核心价值在于让用户更快地找到、查看、切换与恢复工作内容。- [ ] 优化切片栈；- [x] 验证反链。";
    const res = pushSnippetStackItem(null, {
        text: rawParagraph,
        sourceBlockId: "20261031120000-blk1234",
        sourceDocId: "20261031120000-doc1234",
        sourceTitle: "雷切架构手册",
        gleanId: "glean-clip-001",
    });

    assert.ok(res.added, "必须成功生成切片项");
    assert.equal(res.added.sourceBlockId, "20261031120000-blk1234");
    assert.equal(res.added.sourceDocId, "20261031120000-doc1234");
    assert.equal(res.added.gleanId, "glean-clip-001");
    assert.equal(res.added.rawFragment.includes("统一切换与工作上下文平台"), true, "原文分片必须保真包含原文字符");
    assert.ok(res.added.keyFragment.length > 0, "核心提炼分片必须自动派生");
    assert.equal(res.added.actionFragment.includes("- [ ] 优化切片栈"), true, "行动项分片必须自动提取待办项");
    assert.equal(res.added.activeTab, "raw", "默认初始分片视图为 raw");

    // 批量追加测试容量有界（最大 32 项）
    let currentStack = res.stack;
    for (let i = 0; i < 40; i += 1) {
        currentStack = pushSnippetStackItem(currentStack, {
            rawFragment: `切片内容片段编号 ${i}`,
            title: `切片 ${i}`,
            pinned: i === 0, // 置顶第一项
        }).stack;
    }
    assert.equal(currentStack.items.length, SNIPPET_STACK_MAX, "栈容量必须严格钳制在 32 项");
    assert.equal(currentStack.items[0].pinned, true, "置顶项在容量淘汰时必须受到绝对保护");
    assert.equal(currentStack.items[0].title, "切片 0");
});

test("Snippet Stack: 置顶锁定（Pin）、Alt+↑/↓ 调序与行内微调", () => {
    let stack = normalizeSnippetStack([
        {id: "s1", title: "切片一", rawFragment: "内容1", pinned: false},
        {id: "s2", title: "切片二", rawFragment: "内容2", pinned: false},
        {id: "s3", title: "切片三", rawFragment: "内容3", pinned: false},
    ]);

    // 1. 下移 s1
    const moveDownRes = moveSnippetStackItem(stack, "s1", 1);
    assert.equal(moveDownRes.moved, true);
    assert.equal(moveDownRes.stack.items[0].id, "s2");
    assert.equal(moveDownRes.stack.items[1].id, "s1");
    stack = moveDownRes.stack;

    // 2. 置顶 s3
    const pinRes = toggleSnippetStackPin(stack, "s3");
    assert.equal(pinRes.changed, true);
    assert.equal(pinRes.stack.items[0].id, "s3", "置顶项必须自动跃升至栈顶");
    assert.equal(pinRes.stack.items[0].pinned, true);
    stack = pinRes.stack;

    // 3. 跨置顶分区调序保护（非置顶项不得跨越置顶项进入置顶区）
    const invalidMove = moveSnippetStackItem(stack, "s2", -1);
    assert.equal(invalidMove.moved, false, "非置顶项不得跨越置顶锁定边界");

    // 4. 行内微调（F2 修改标题与当前分片）
    const editRes = updateSnippetStackItem(stack, "s3", {
        title: "微调后的置顶切片",
        rawFragment: "全新微调内容",
        activeTab: "key",
        keyFragment: "核心微调要点",
    });
    assert.ok(editRes.updated);
    assert.equal(editRes.stack.items[0].title, "微调后的置顶切片");
    assert.equal(editRes.stack.items[0].rawFragment, "全新微调内容");
    assert.equal(editRes.stack.items[0].keyFragment, "核心微调要点");
    assert.equal(editRes.stack.items[0].activeTab, "key");

    // 5. 清理非锁定项：置顶项保留
    const clearRes = clearSnippetStack(editRes.stack, {keepPinned: true});
    assert.equal(clearRes.clearedCount, 2);
    assert.equal(clearRes.stack.items.length, 1);
    assert.equal(clearRes.stack.items[0].id, "s3");
});

test("TextFold 5 阶语义树原子切片派生与 Verbatim Guard 逐字保真校验", () => {
    const rawParagraph = "知识工程的核心在于通过连续切片与血缘反链保持论据真实性，杜绝大模型在总结时产生的语义漂移。这是构建可信个人知识库的基石。";
    const foldNode = {
        id: "20261031150000-fld001",
        blockId: "20261031150000-fld001",
        level: 5,
        concept: "可信知识基石",
        takeaway: "通过连续切片与血缘反链保持论据真实性，杜绝语义漂移。",
        key: "论点支撑：1. 连续切片保持结构；2. 反链提供可核实证据链。",
        points: ["连续切片保持结构完整", "双链提供可核实证据链"],
        brief: "知识工程的核心在于通过连续切片与血缘反链保持论据真实性",
        fullText: rawParagraph,
        actions: ["在工作台中验证 5 阶语义切片"],
    };

    // 逐字子串校验
    assert.equal(isVerbatimSubstring(foldNode.brief, rawParagraph), true, "Brief 必须为原文逐字子串");
    assert.equal(isVerbatimSubstring("虚构改写的内容", rawParagraph), false, "虚构内容必须被 Verbatim Guard 拦截");

    const atomicSlice = convertFoldNodeToAtomicSlice(foldNode, {
        gleanId: "glean-doc-888",
        sourceDocId: "20261031150000-root01",
        sourceTitle: "知识工程导论",
    });

    assert.ok(atomicSlice);
    assert.equal(atomicSlice.title, "可信知识基石", "Level 5 概念作为卡片标题");
    assert.equal(atomicSlice.sourceBlockId, "20261031150000-fld001");
    assert.equal(atomicSlice.gleanId, "glean-doc-888");
    assert.equal(atomicSlice.foldLevel, 5);
    assert.equal(atomicSlice.verbatimBrief, foldNode.brief);
    assert.equal(atomicSlice.verbatimBlockRef, `((20261031150000-fld001 "${foldNode.brief}"))`);
    assert.equal(atomicSlice.actionFragment.includes("- [ ] 在工作台中验证 5 阶语义切片"), true);
});

test("批量组装：生成带 ((blockId)) 血缘反链与 Kramdown 属性的结构化 Markdown", () => {
    const stack = normalizeSnippetStack([
        {
            id: "card-1",
            title: "第一条核心切片",
            rawFragment: "这是第一段原文摘录，描述架构核心原理。",
            keyFragment: "核心提炼：架构核心原理至关重要。",
            actionFragment: "- [ ] 完成第一阶段开发",
            sourceBlockId: "20261031160000-blk0001",
            anchorText: "这是第一段原文摘录",
            gleanId: "glean-01",
        },
        {
            id: "card-2",
            title: "第二条行动切片",
            rawFragment: "第二段原文背景信息。",
            keyFragment: "要点：确保单元测试与全量门禁 100% 绿灯。",
            actionFragment: "- [ ] 跑通 verify:release",
            sourceBlockId: "20261031160000-blk0002",
            anchorText: "第二段原文背景信息",
        },
    ]);

    // 1. 全维结构化模式（full）
    const fullAssembled = assembleSnippetStackMarkdown(stack, {
        mode: "full",
        headingTitle: "今日知识切片汇编",
        includeBlockAttrs: true,
    });

    assert.equal(fullAssembled.itemCount, 2);
    assert.equal(fullAssembled.backlinkCount, 2);
    assert.equal(fullAssembled.blockAttrCount, 2);
    assert.equal(fullAssembled.markdown.includes("## 今日知识切片汇编"), true);
    assert.equal(fullAssembled.markdown.includes("### 1. 第一条核心切片"), true);
    assert.equal(fullAssembled.markdown.includes('((20261031160000-blk0001 "这是第一段原文摘录"))'), true, "必须包含思源反链锚点");
    assert.equal(fullAssembled.markdown.includes('{: custom-lv-source-block="20261031160000-blk0001" custom-lv-glean-id="glean-01"}'), true, "必须附带 Kramdown IAL 血缘属性");

    // 2. 纯行动项模式（action）
    const actionAssembled = assembleSnippetStackMarkdown(stack, {
        mode: "action",
        includeBlockAttrs: false,
    });
    assert.equal(actionAssembled.markdown.includes("- [ ] 完成第一阶段开发"), true);
    assert.equal(actionAssembled.markdown.includes("- [ ] 跑通 verify:release"), true);
});

test("选区上下文特征识别与动作智能置顶重排（Rubick 式 Super Panel）", () => {
    // 1. 无选区：返回 none，动作不重排
    const emptyCtx = analyzeSelectionContext("");
    assert.equal(emptyCtx.kind, "none");
    const baseActions = [{id: "open-active"}, {id: "copy-id"}, {id: "stack-capture"}];
    const unchanged = rankActionsBySelectionContext(baseActions, emptyCtx);
    assert.deepEqual(unchanged.map((a) => a.id), ["open-active", "copy-id", "stack-capture"]);

    // 2. 长段落（>200 字）：智能置顶 stack-capture
    const longText = "小驴雷切是一个非常优秀的思源插件。".repeat(15);
    const longCtx = analyzeSelectionContext(longText);
    assert.equal(longCtx.kind, "long-paragraph");
    assert.equal(longCtx.isLongParagraph, true);
    const rankedLong = rankActionsBySelectionContext(baseActions, longCtx, {target: "palette"});
    assert.equal(rankedLong[0].id, "stack-capture", "长段落必须智能首推原子切片入栈");
    assert.equal(rankedLong[0].recommended, true);

    // 3. URL 选区：智能置顶 glean-keep-roaming 与 stack-capture
    const urlText = "请参考 GitHub 标杆项目：https://github.com/chenxiachan/textfold 了解语义折叠。";
    const urlCtx = analyzeSelectionContext(urlText);
    assert.equal(urlCtx.kind, "url");
    assert.equal(urlCtx.hasUrl, true);
    assert.equal(urlCtx.extractedUrl, "https://github.com/chenxiachan/textfold");
    const urlActions = [{id: "open-active"}, {id: "glean-keep-roaming"}, {id: "stack-capture"}];
    const rankedUrl = rankActionsBySelectionContext(urlActions, urlCtx, {target: "palette"});
    assert.equal(rankedUrl[0].id, "glean-keep-roaming");

    // 4. 待办列表选区：智能置顶 task-horizon-today
    const taskText = "- [ ] 完善连续切片暂存栈\n- [ ] 提交本地 Git";
    const taskCtx = analyzeSelectionContext(taskText);
    assert.equal(taskCtx.kind, "task-list");
    assert.equal(taskCtx.hasTaskList, true);
    const taskActions = [{id: "open-active"}, {id: "task-horizon-today"}, {id: "stack-capture"}];
    const rankedTask = rankActionsBySelectionContext(taskActions, taskCtx, {target: "palette"});
    assert.equal(rankedTask[0].id, "task-horizon-today");
});

test("破坏性负向验证探针：拦截反链丢失、逐字违背、容量越界或选区错乱", () => {
    // 探针 1: 若反链格式化丢失了 blockId，必须返回空字符串
    assert.equal(formatBlockRefBacklink("", "锚点"), "");
    assert.equal(formatBlockRefBacklink("bad id with spaces", "锚点"), "");

    // 探针 2: 若试图断言虚构子串为 Verbatim，必须严格拒绝
    assert.throws(() => {
        assert.equal(isVerbatimSubstring("完全不存在的句子", "原文内容"), true);
    }, assert.AssertionError, "虚构子串必须被 Verbatim 校验拒绝");

    // 探针 3: 归一化输入超限数组必须裁剪至 SNIPPET_STACK_MAX（32）
    const oversizedArray = Array.from({length: 64}, (_, i) => ({
        id: `card-${i}`,
        rawFragment: `内容 ${i}`,
    }));
    const clamped = normalizeSnippetStack(oversizedArray);
    assert.equal(clamped.items.length, 32);

    // 探针 4: 调序越界必须安全失败（不抛错且保持原状）
    const singleStack = normalizeSnippetStack([{id: "c1", rawFragment: "一"}]);
    const outOfBoundsMove = moveSnippetStackItem(singleStack, "c1", -1);
    assert.equal(outOfBoundsMove.moved, false);
});
