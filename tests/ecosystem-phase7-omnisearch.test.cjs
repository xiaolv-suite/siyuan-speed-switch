const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");

test("lvOmnisearch 穿透搜索：切片暂存提供者注册、跨插件穿透检索与分栏还原", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://127.0.0.1"});
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    delete dom.window.__LV_OMNISEARCH__;
    delete dom.window.__LV_OMNISEARCH_PROVIDERS__;

    const {lvOmnisearch} = require("../src/libs/lv-notice-kit.ts");

    let columnRestored = false;
    let stackOpened = false;

    // 1. 模拟雷切注册切片穿透搜索切面
    const mockSlices = [
        {
            id: "slice-101",
            title: "微前端架构演进",
            rawFragment: "去中心化协议与自协商技术能够彻底消灭插件间硬依赖。",
            keyFragment: "微前端核心要点：自协商 Coordinator 与热替换",
            actionFragment: "落地 Protocol v1.6.0",
            pinned: true,
            sourceBlockId: "20261103120000-block001",
        },
        {
            id: "slice-102",
            title: "全键盘导航设计",
            rawFragment: "Tab 循环与 Escape 阶梯式回焦，严防焦点陷入黑洞。",
            keyFragment: "键盘交互遵循无障碍 WCAG 2.1 AA 规范",
            pinned: false,
        },
    ];

    const cleanRaikiri = lvOmnisearch.registerProvider("siyuan-speed-switch", (keyword) => {
        const kw = keyword.toLowerCase();
        return mockSlices
            .filter((s) => s.title.toLowerCase().includes(kw) || s.rawFragment.toLowerCase().includes(kw))
            .map((s) => ({
                id: `slice-${s.id}`,
                source: "雷切",
                category: "切片暂存",
                title: s.title,
                snippet: s.keyFragment || s.rawFragment,
                badge: s.pinned ? "已锁定" : "暂存",
                linkBlockId: s.sourceBlockId,
                onClick: async () => {
                    columnRestored = true;
                    stackOpened = true;
                },
            }));
    });

    // 2. 模拟快门注册全局快捷动作提供者
    const cleanQuickgate = lvOmnisearch.registerProvider("siyuan-quickgate", (keyword) => {
        if (keyword.includes("架构")) {
            return [
                {
                    id: "action-arch",
                    source: "快门",
                    category: "快捷指令",
                    title: "打开架构设计看板",
                    onClick: () => {},
                },
            ];
        }
        return [];
    });

    // 3. 执行穿透检索
    const results = await lvOmnisearch.search("架构");
    assert.equal(results.length, 2, "应汇聚雷切与快门两家插件的搜索结果");

    const sliceResult = results.find((r) => r.source === "雷切");
    assert.ok(sliceResult);
    assert.equal(sliceResult.title, "微前端架构演进");
    assert.equal(sliceResult.category, "切片暂存");
    assert.equal(sliceResult.badge, "已锁定");
    assert.equal(sliceResult.linkBlockId, "20261103120000-block001");

    // 4. 点击结果项触发一键还原分栏与打开暂存栈
    await sliceResult.onClick();
    assert.equal(columnRestored, true, "点击搜索项必须触发分栏还原");
    assert.equal(stackOpened, true, "点击搜索项必须打开切片暂存栈");

    // 5. 验证清洁注销
    cleanRaikiri();
    const afterCleanResults = await lvOmnisearch.search("微前端");
    assert.equal(afterCleanResults.length, 0, "注销后不再返回雷切切片");

    cleanQuickgate();
    delete global.window;
    delete global.localStorage;
    dom.window.close();
});

test("T-Phase7 源码契约：雷切必须向 lvOmnisearch 注册并实现 searchOmniSlices", () => {
    const root = path.resolve(__dirname, "..");
    const indexSource = readSourceText(path.join(root, "src", "index.ts"));

    // 注册与注销契约
    assert.match(
        indexSource,
        /lvOmnisearch\.registerProvider\s*\(\s*["']siyuan-speed-switch["']/,
        "雷切必须在 onload 中向 lvOmnisearch 登记切面",
    );

    assert.match(
        indexSource,
        /this\.omnisearchCleaner\?\.\(\)/,
        "雷切必须在 onunload 中注销 omnisearchCleaner",
    );

    // searchOmniSlices 实现契约
    assert.match(
        indexSource,
        /searchOmniSlices\s*\(\s*keyword:\s*string\s*\)\s*:\s*any\[\]/,
        "雷切主类必须导出 searchOmniSlices 搜索方法",
    );

    // 分栏还原与暂存栈呼出契约
    assert.ok(
        indexSource.includes("this.updateSettings({columns: 2})"),
        "searchOmniSlices 的 onClick 必须执行一键还原双栏对照分栏",
    );

    assert.ok(
        indexSource.includes("this.openSnippetStackDialog()"),
        "searchOmniSlices 的 onClick 必须打开暂存栈",
    );
});

test("T-Phase7 门禁负向验证：空查询安全拦截、超时熔断与异常隔离", async () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://127.0.0.1"});
    global.window = dom.window;
    global.localStorage = dom.window.localStorage;
    delete dom.window.__LV_OMNISEARCH__;
    delete dom.window.__LV_OMNISEARCH_PROVIDERS__;

    const {lvOmnisearch} = require("../src/libs/lv-notice-kit.ts");

    // 负向探针 1：空串与空白查询必定返回空列表
    const empty1 = await lvOmnisearch.search("");
    assert.deepEqual(empty1, []);
    const empty2 = await lvOmnisearch.search("   ");
    assert.deepEqual(empty2, []);

    // 负向探针 2：故障提供者异常隔离
    const activeTimers = new Set();
    const origSetTimeout = global.setTimeout;
    const origClearTimeout = global.clearTimeout;
    global.setTimeout = (fn, ms, ...args) => {
        const id = origSetTimeout((...a) => {
            activeTimers.delete(id);
            fn(...a);
        }, ms, ...args);
        activeTimers.add(id);
        return id;
    };
    global.clearTimeout = (id) => {
        activeTimers.delete(id);
        return origClearTimeout(id);
    };

    const unregisterBad = lvOmnisearch.registerProvider("faulty-plugin", () => {
        throw new Error("Simulated Provider Crash");
    });

    const unregisterGood = lvOmnisearch.registerProvider("healthy-plugin", () => [
        {
            id: "h1",
            source: "正常插件",
            category: "通用",
            title: "正常条目",
            onClick: () => {},
        },
    ]);

    // 某插件抛错时，整个穿透搜索不得崩溃，且正常插件的结果必须保留
    const res = await lvOmnisearch.search("正常");
    assert.equal(res.length, 1);
    assert.equal(res[0].title, "正常条目");

    // 清理已结束搜索遗留的 1000ms 超时熔断悬挂定时器
    activeTimers.forEach((id) => origClearTimeout(id));
    activeTimers.clear();
    global.setTimeout = origSetTimeout;
    global.clearTimeout = origClearTimeout;

    unregisterBad();
    unregisterGood();

    delete global.window;
    delete global.localStorage;
    dom.window.close();
});
