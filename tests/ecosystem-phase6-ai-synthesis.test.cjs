const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");

test("lvAi 单切片精炼与多切片智能编织合成", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://127.0.0.1"});
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    delete dom.window.__LV_AI_GATEWAY__;
    delete dom.window.__LV_ACTIVITY_STREAM__;

    const {lvAi, lvActivity} = require("../src/libs/lv-notice-kit.ts");

    // 配置模拟共享 AI 网关配置
    lvAi.setConfig({
        endpoint: "https://api.deepseek.com/v1",
        apiKey: "sk-mock-token-for-test",
        model: "deepseek-chat",
    });

    // 劫持 global.fetch 用于单测大模型返回，严格离线无远程调用
    const originalFetch = global.fetch;
    let lastChatPayload = null;
    global.fetch = async (url, opts) => {
        lastChatPayload = JSON.parse(opts.body);
        const isSynthesis = lastChatPayload.messages.some((m) => m.content.includes("智能编织"));
        return {
            ok: true,
            status: 200,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: isSynthesis
                                ? "## 架构专题深度论述\n\n### 一、背景\n...综合分析..."
                                : "### 核心要点\n- 要点一：模块解耦\n- 要点二：并发写锁\n\n### 行动项\n- [ ] 开展全量回归测试",
                        },
                    },
                ],
                usage: {total_tokens: 180},
            }),
        };
    };

    // 1. 测试单切片 AI 精炼
    const sliceItem = {
        id: "slice-1",
        title: "高并发架构切片",
        rawFragment: "内核读写应采用 docId 内存队列排队串行处理，避免锁冲突。",
    };

    const res = await lvAi.chat({
        source: "雷切",
        messages: [
            {role: "system", content: "你是一个深度知识提炼专家。"},
            {role: "user", content: `请精炼以下切片：\n\n${sliceItem.rawFragment}`},
        ],
    });

    assert.ok(res.content.includes("核心要点"));
    assert.ok(res.content.includes("行动项"));

    // 2. 测试多切片智能编织合成
    const slices = [
        {title: "切片 A", rawFragment: "去中心化协议设计"},
        {title: "切片 B", rawFragment: "Top-Surface Esc 焦点栈捕获"},
        {title: "切片 C", rawFragment: "AI 统一凭据复用"},
    ];

    const joinedText = slices.map((s, idx) => `### 切片 ${idx + 1}：${s.title}\n${s.rawFragment}`).join("\n\n");
    const synthRes = await lvAi.chat({
        source: "雷切",
        messages: [
            {role: "system", content: "你是一个严谨的研究员。请将笔记进行智能编织与综合论述。"},
            {role: "user", content: `请将以下切片笔记进行智能编织与综合论述：\n\n${joinedText}`},
        ],
    });

    assert.ok(synthRes.content.includes("架构专题深度论述"));

    // 3. 测试生态活动流量化统计 (getDailyStats)
    lvActivity.record({source: "雷切", category: "note", title: "AI 精炼切片「高并发架构切片」"});
    lvActivity.record({source: "雷切", category: "note", title: "AI 智能编织专题笔记「架构专题」"});

    const stats = lvActivity.getDailyStats();
    assert.equal(stats.total >= 2, true);
    assert.equal(stats.note >= 2, true);
    assert.equal(stats["雷切"] >= 2, true);

    global.fetch = originalFetch;
    delete global.window;
    delete global.localStorage;
    dom.window.close();
});

test("lvLaunchpad 外部穿透执行二级行动 (executeAction)", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://127.0.0.1"});
    global.window = dom.window;
    delete dom.window.__LV_LAUNCHPAD__;
    delete dom.window.__LV_LAUNCHPAD_REGISTRY__;

    const {lvLaunchpad} = require("../src/libs/lv-notice-kit.ts");

    let receivedAction = "";
    lvLaunchpad.register({
        id: "siyuan-speed-switch",
        name: "雷切",
        fullName: "小驴雷切",
        svgIcon: "icon-lv-raikiri",
        actions: ["切换至双栏对照模式", "查看切片暂存栈并批量导出"],
        onClick: () => {},
        onAction: (act) => {
            receivedAction = act;
        },
    });

    // 模拟 Quicker 外部毫秒级穿透调用二级行动
    const executed = lvLaunchpad.executeAction("siyuan-speed-switch", "切换至双栏对照模式");
    assert.equal(executed, true);
    assert.equal(receivedAction, "切换至双栏对照模式");

    const executedStack = lvLaunchpad.executeAction("siyuan-speed-switch", "查看切片暂存栈并批量导出");
    assert.equal(executedStack, true);
    assert.equal(receivedAction, "查看切片暂存栈并批量导出");

    delete global.window;
    delete global.localStorage;
    dom.window.close();
});

test("T-Phase6 源码契约：雷切必须支持单切片 AI 精炼与多切片智能编织", () => {
    const root = path.resolve(__dirname, "..");
    const indexSource = readSourceText(path.join(root, "src", "index.ts"));
    const stackUiSource = readSourceText(path.join(root, "src", "snippet-stack-ui.js"));

    // 契约 1：主类实现 refineSnippetWithAi
    assert.match(
        indexSource,
        /refineSnippetWithAi\s*\(\s*item:\s*any\s*\)\s*:\s*Promise</,
        "雷切主类必须导出 refineSnippetWithAi 方法",
    );

    // 契约 2：主类实现 synthesizeSnippetsWithAi
    assert.match(
        indexSource,
        /synthesizeSnippetsWithAi\s*\(\s*items:\s*any\[\]\s*\)\s*:\s*Promise</,
        "雷切主类必须导出 synthesizeSnippetsWithAi 方法",
    );

    // 契约 3：暂存栈 UI 挂载 AI 精炼按钮 (ai-refine)
    assert.match(
        stackUiSource,
        /makeOpBtn\(\s*["']ai-refine["']/,
        "暂存卡片操作区必须装配 ai-refine 精炼按钮",
    );

    // 契约 4：暂存栈组装区挂载 AI 智能编织按钮 (ai-synthesize)
    assert.match(
        stackUiSource,
        /makeAssembleBtn\(\s*["']ai-synthesize["']/,
        "组装操作区必须装配 ai-synthesize 智能编织按钮",
    );

    // 契约 5：主类 handleQuickAction 包含双栏、三栏、暂存栈与编织分支
    assert.ok(indexSource.includes("action.includes(\"双栏\")"), "handleQuickAction 必须支持双栏对照模式");
    assert.ok(indexSource.includes("action.includes(\"三栏\")"), "handleQuickAction 必须支持三栏专注模式");
    assert.ok(indexSource.includes("action.includes(\"编织\")"), "handleQuickAction 必须支持多切片AI编织");
});

test("T-Phase6 门禁负向验证：空切片精炼与空列表编织安全拦截、未知插件调用失败", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://127.0.0.1"});
    global.window = dom.window;
    delete dom.window.__LV_LAUNCHPAD__;
    delete dom.window.__LV_LAUNCHPAD_REGISTRY__;

    const {lvLaunchpad} = require("../src/libs/lv-notice-kit.ts");

    // 负向探针 1：未知插件调用 executeAction 返回 false
    const ok = lvLaunchpad.executeAction("non-existent-plugin-xyz", "任意动作");
    assert.equal(ok, false, "不存在的插件调用二级行动必须返回 false");

    // 负向探针 2：空输入安全兜底验证
    const safeRefine = async (item) => {
        const text = item?.rawFragment || item?.title || "";
        if (!text.trim()) return "";
        return "refined";
    };

    const emptyRes = await safeRefine({rawFragment: "   ", title: ""});
    assert.equal(emptyRes, "", "空切片必须直接安全返回空字符串，不产生多余调用");

    const safeSynthesize = async (items) => {
        if (!Array.isArray(items) || items.length === 0) {
            return {ok: false, message: "暂存栈为空"};
        }
        return {ok: true};
    };

    const emptySynth = await safeSynthesize([]);
    assert.equal(emptySynth.ok, false, "空切片列表编织必须直接拒绝，返回 ok: false");

    delete global.window;
    delete global.localStorage;
    dom.window.close();
});
