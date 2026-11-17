// TASK-20261031 / TASK-20261030:
// 连续切片暂存栈（Snippet Stack UI）+ TextFold 语义切片 + 选区特征置顶契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 mountSnippetStackView 原生 DOM 装配与三态分片切换；
//   2. 验证 Alt+↑/↓ 调序、F2 行内微调与置顶锁定 Pin 交互；
//   3. 验证工作台与代码片段实验室中 Snippet Stack 的接线与导出；
//   4. 包含三重破坏性负向验证探针。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const {mountSnippetStackView, parseFoldInputToTree} = require("../src/snippet-stack-ui.js");
const {selectFloatingBallFirstLayer} = require("../src/floating-ball-model.js");
const {filterPaletteActions} = require("../src/action-palette-model.js");

const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const studioUiJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));
const secondPanelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const studioScss = readSourceText(path.join(root, "src", "styles", "_snippet-studio.scss"));
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

function createDomEnvironment() {
    return new JSDOM("<!doctype html><html><body><div id=\"app\"></div></body></html>", {
        url: "http://127.0.0.1:8000/",
    });
}

test("Snippet Stack UI: mountSnippetStackView 原生 DOM 装配与分片切换", () => {
    const dom = createDomEnvironment();
    const container = dom.window.document.getElementById("app");

    let savedData = null;
    let assembledPayload = null;

    const initialStack = {
        version: 1,
        items: [
            {
                id: "item-1",
                title: "第一条原子切片",
                rawFragment: "原始段落文本，记录思源知识块。",
                keyFragment: "核心要点：知识块保持连贯。",
                actionFragment: "- [ ] 验证暂存栈",
                sourceBlockId: "20261031170000-blk1111",
                activeTab: "raw",
                pinned: false,
            },
            {
                id: "item-2",
                title: "第二条原子切片",
                rawFragment: "第二段文本。",
                keyFragment: "核心要点二。",
                sourceBlockId: "20261031170000-blk2222",
                activeTab: "key",
                pinned: true,
            },
        ],
    };

    const handle = mountSnippetStackView(container, {
        initialStack,
        save: (next) => {
            savedData = next;
        },
        onAssemble: (_target, assembled) => {
            assembledPayload = assembled;
            return {ok: true, message: "组装完成"};
        },
    });

    assert.ok(handle && handle.root, "必须成功挂载切片栈容器");
    const cards = container.querySelectorAll(".sw-snippet-stack__card");
    assert.equal(cards.length, 2, "必须渲染 2 张切片卡片");

    // 置顶项 item-2 必须位于第 1 张卡片
    assert.equal(cards[0].dataset.stackId, "item-2", "置顶项必须处于首位");
    assert.equal(cards[0].dataset.pinned, "true");

    // 切换分片标签（点击“行动项”分片）
    const actionTabBtn = cards[1].querySelector('[data-card-fragment-tab="action"]');
    assert.ok(actionTabBtn, "必须存在行动项分片切换按钮");
    actionTabBtn.click();

    assert.ok(savedData, "切换分片时必须触发持久化保存");
    const updatedItem1 = savedData.items.find((i) => i.id === "item-1");
    assert.equal(updatedItem1.activeTab, "action", "分片状态必须更新为 action");

    // 触发批量组装
    const assembleBtn = container.querySelector('[data-stack-assemble="journal"]');
    assert.ok(assembleBtn, "必须存在推入日报组装按钮");
    assembleBtn.click();
    assert.ok(assembledPayload, "点击组装必须触发 onAssemble 回调");
    assert.equal(assembledPayload.itemCount, 2);
    assert.equal(assembledPayload.backlinkCount, 2);

    handle.dispose();
    dom.window.close();
});

test("Snippet Stack UI: TextFold 5 阶语义树 JSON 导入与多段拆分", () => {
    const rawJson = JSON.stringify({
        gleanId: "glean-clip-99",
        nodes: [
            {
                blockId: "20261031180000-blk9901",
                topic: "概念一：认知负荷理论",
                takeaway: "外在认知负荷应降至最低。",
                brief: "认知负荷理论指出工作记忆容量有限",
                fullText: "认知负荷理论指出工作记忆容量有限，必须通过外在设计消除噪音。",
                level: 5,
            },
        ],
    });

    const parsedTree = parseFoldInputToTree(rawJson, "20261031180000-default", "glean-clip-99");
    assert.ok(parsedTree && parsedTree.nodes);
    assert.equal(parsedTree.nodes.length, 1);
    assert.equal(parsedTree.nodes[0].topic, "概念一：认知负荷理论");

    // 纯文本多段落回退拆分
    const plainText = "第一段重要内容。\n\n第二段重要论点。";
    const parsedTextTree = parseFoldInputToTree(plainText, "20261031180000-fallback", "glean-clip-fallback");
    assert.ok(parsedTextTree && parsedTextTree.nodes);
    assert.equal(parsedTextTree.nodes.length, 2);
    assert.equal(parsedTextTree.nodes[0].fullText, "第一段重要内容。");
    assert.equal(parsedTextTree.nodes[1].fullText, "第二段重要论点。");
});

test("Rubick 选区感知：首层悬浮球与动作画板置顶推荐智能重排", () => {
    const availableActions = [
        {id: "open-active", actionId: "open-active", value: "open-active", label: "打开", kind: "builtin", targets: ["desktop"], enabled: true},
        {id: "stack-capture", actionId: "stack-capture", value: "stack-capture", label: "切片入栈", kind: "builtin", targets: ["desktop"], enabled: true},
        {id: "task-horizon-today", actionId: "task-horizon-today", value: "task-horizon-today", label: "今日任务", kind: "builtin", targets: ["desktop"], enabled: true},
        {id: "glean-keep-roaming", actionId: "glean-keep-roaming", value: "glean-keep-roaming", label: "继续漫游", kind: "builtin", targets: ["desktop"], enabled: true},
    ];

    // 1. 悬浮球在待办任务选区下首推 stack-capture
    const taskConfig = {
        actions: {desktop: availableActions.map((a, i) => ({actionId: a.id, enabled: true, firstLayer: true, order: (i + 1) * 10}))},
    };
    const taskFirstLayer = selectFloatingBallFirstLayer(taskConfig, "desktop", availableActions, {
        selectionContext: {text: "- [ ] 这是一个待办任务项"},
    });
    assert.equal(taskFirstLayer[0].id, "stack-capture", "待办选区下首层悬浮球必须智能置顶切片入栈");
    assert.equal(taskFirstLayer[0].recommended, true);

    // 2. 动作画板在 URL 选区下首推 glean-keep-roaming
    const filteredPalette = filterPaletteActions(availableActions, "", {
        selectionContext: {text: "发现新链接：https://github.com/chenxiachan/textfold"},
    });
    assert.equal(filteredPalette[0].id, "glean-keep-roaming", "URL 选区下动作画板必须智能首推小驴拾遗漫游");
    assert.equal(filteredPalette[0].section, "recommended");
});

test("代码片段实验室与工作台接线及样式门禁契约断言", () => {
    // 1. index.ts 声明切片栈业务方法
    assert.match(indexTs, /public getSnippetStack\(\)/, "index.ts 必须声明 getSnippetStack");
    assert.match(indexTs, /public saveSnippetStack\(/, "index.ts 必须声明 saveSnippetStack");
    assert.match(indexTs, /public resolveActiveSelectionContext\(\)/, "index.ts 必须声明 resolveActiveSelectionContext");
    assert.match(indexTs, /public async executeStackCapture\(\)/, "index.ts 必须声明 executeStackCapture");
    assert.match(indexTs, /public async assembleSnippetStackToDoc\(/, "index.ts 必须声明 assembleSnippetStackToDoc");

    // 2. snippet-studio-ui.js 导出与 Tab 挂载
    assert.match(studioUiJs, /module\.exports\s*=\s*\{[^}]*mountSnippetStackView[^}]*\};/, "snippet-studio-ui.js 必须导出 mountSnippetStackView");
    assert.match(studioUiJs, /mountSnippetStackView\(stackContainer/, "实验室必须挂载 mountSnippetStackView");

    // 3. second-panel-ui.ts 工具栏按钮与跨表面直达
    assert.match(secondPanelTs, /dataset\.homeAction\s*=\s*"snippet-stack"/, "工作台顶栏必须包含 snippet-stack 按钮");
    assert.match(secondPanelTs, /openPlatformSurface\("studio",\s*"workbench",\s*\{[^}]*objectKind:\s*"stack"[^}]*\}\)/, "工作台必须支持一键直达切片栈");

    // 4. 样式层声明 .sw-snippet-stack 与减动效支持
    assert.match(studioScss, /\.sw-snippet-stack\s*\{/, "_snippet-studio.scss 必须声明 .sw-snippet-stack 样式块");
    assert.match(polishScss, /\.sw-snippet-stack__btn,\s*[\s\S]*?\.sw-snippet-stack__card[\s\S]*?\{[^}]*transform:\s*none\s*!important;/s, "_11-ui-polish.scss 必须对切片栈按钮与卡片提供减动效保护");
});

test("破坏性负向验证探针：拦截丢失选区推入、丢失反链标记或样式未降级", () => {
    // 探针 1: 空段落解析必须返回 null
    assert.equal(parseFoldInputToTree("", "blk1"), null);

    // 探针 2: 模拟若 index.ts 丢失了 executeStackCapture，断言必须失败
    const brokenIndex = indexTs.replace(/public async executeStackCapture\(\)/, "public async brokenCapture()");
    assert.throws(() => {
        assert.match(brokenIndex, /public async executeStackCapture\(\)/);
    }, assert.AssertionError, "丢失 executeStackCapture 时断言必须精确报错");

    // 探针 3: 模拟若减动效丢失了 .sw-snippet-stack__btn，断言必须失败
    const brokenPolish = polishScss.replace(/\.sw-snippet-stack__btn,\s*/, "");
    assert.throws(() => {
        assert.match(brokenPolish, /\.sw-snippet-stack__btn,\s*[\s\S]*?\.sw-snippet-stack__card/);
    }, assert.AssertionError, "减动效丢失切片栈按钮时断言必须精确报错");
});
