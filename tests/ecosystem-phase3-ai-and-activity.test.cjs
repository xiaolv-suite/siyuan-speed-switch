const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");

test("lvActivity 生态流：广播活动、检索今日记录与格式化为 Markdown", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    global.window = dom.window;
    delete dom.window.__LV_ACTIVITY_STREAM__;

    const {lvActivity} = require("../src/libs/lv-notice-kit.ts");

    let receivedActivity = null;
    const unsub = lvActivity.onActivity((item) => {
        receivedActivity = item;
    });

    lvActivity.record({
        source: "雷切",
        category: "note",
        title: "保存切片集合「架构思考」",
        detail: "写入 5 条切片",
        linkBlockId: "20261103000000-block123",
    });

    assert.ok(receivedActivity, "活动订阅者必须收到广播事件");
    assert.equal(receivedActivity.source, "雷切");
    assert.equal(receivedActivity.title, "保存切片集合「架构思考」");

    const todayRecords = lvActivity.getTodayRecords();
    assert.equal(todayRecords.length, 1);
    assert.equal(todayRecords[0].title, "保存切片集合「架构思考」");

    const md = lvActivity.formatAsMarkdown();
    assert.match(md, /### 🐴 小驴全家桶 · 今日活动汇编/);
    assert.match(md, /\[雷切\] 💡 保存切片集合「架构思考」/);
    assert.match(md, /siyuan:\/\/blocks\/20261103000000-block123/);

    unsub();
    delete global.window;
    dom.window.close();
});

test("lvAi 统一网关：配置共享凭据与未配置时的防护拦截", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://127.0.0.1"});
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    delete dom.window.__LV_AI_GATEWAY__;

    const {lvAi} = require("../src/libs/lv-notice-kit.ts");

    // 默认未配置时应拒绝并给出友好指引
    await assert.rejects(
        async () => {
            await lvAi.chat({
                source: "雷切",
                messages: [{role: "user", content: "hello"}],
            });
        },
        /未配置共享 API Key/,
        "未配置 Key 时应安全阻断",
    );

    lvAi.setConfig({
        endpoint: "https://api.deepseek.com/v1",
        apiKey: "sk-test-token",
        model: "deepseek-chat",
    });

    const cfg = lvAi.getConfig();
    assert.equal(cfg.apiKey, "sk-test-token");
    assert.equal(cfg.model, "deepseek-chat");

    delete global.window;
    delete global.localStorage;
    dom.window.close();
});

test("T-Phase3 源码契约：切片保存与组装必须广播 lvActivity 活动记录", () => {
    const root = path.resolve(__dirname, "..");
    const indexSource = readSourceText(path.join(root, "src", "index.ts"));
    const adaptersSource = readSourceText(path.join(root, "src", "home-external-adapters.ts"));

    assert.match(
        indexSource,
        /lvActivity\.record\s*\(\s*\{\s*source:\s*["']雷切["']\s*,\s*category:\s*["']note["']\s*,\s*title:\s*`保存切片集合/,
        "切片组装保存时必须广播 lvActivity 活动",
    );

    assert.match(
        adaptersSource,
        /register\s*\(\s*["']ecosystem-activity-stream["']/,
        "工作台外部组件必须注册 ecosystem-activity-stream 适配器",
    );

    assert.match(
        indexSource,
        /openActivityStreamDialog\s*\(\s*\)/,
        "雷切必须提供 openActivityStreamDialog 预览弹窗入口",
    );
});

test("T-Phase3 门禁负向验证：未配置活动记录时 formatAsMarkdown 给出空态提示", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    global.window = dom.window;
    delete dom.window.__LV_ACTIVITY_STREAM__;

    const {lvActivity} = require("../src/libs/lv-notice-kit.ts");
    const emptyMd = lvActivity.formatAsMarkdown();
    assert.match(emptyMd, /今日暂无小驴生态活动记录/);

    delete global.window;
    dom.window.close();
});
