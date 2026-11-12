const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");
const {declaresIn} = require("./css-block-scan.cjs");

const ROOT = path.resolve(__dirname, "..");

function validateSnippetStoreContracts({studioUiJs, studioScss, zhJson, enJson}) {
    if (!/isCommunity:\s*true/.test(studioUiJs)) {
        throw new Error("snippet-studio-ui.js must tag COMMUNITY_SNIPPETS with isCommunity: true");
    }
    if (!/rankA\s*=\s*a\.isCommunity\s*\?\s*0/.test(studioUiJs)) {
        throw new Error("snippet-studio-ui.js browse mode must prioritize LianDi community snippets as tier 0");
    }
    if (!/["']🔥 链滴社区["']/.test(studioUiJs)) {
        throw new Error("snippet-studio-ui.js must render '🔥 链滴社区' category pill and source info");
    }
    if (!/item\.source\s*===\s*["']native["']\s*\?\s*["']["']\s*:\s*t\(["']snippetDescription["']\)/.test(studioUiJs)) {
        throw new Error("snippet-studio-ui.js renderCatalogItem must not pollute native snippets with verbose snippetDescription fallback");
    }
    if (!declaresIn(studioScss, ".sw-studio__picker-sheet--store .sw-studio__group-toolbar", /display:\s*none/)) {
        throw new Error("_snippet-studio.scss must hide .sw-studio__group-toolbar in .sw-studio__picker-sheet--store");
    }
    if (!zhJson.snippetCategoryCommunity || !enJson.snippetCategoryCommunity) {
        throw new Error("i18n must declare snippetCategoryCommunity in both zh-CN and en");
    }
}

test("T-7867: 片段商店链滴社区精选置顶、专属分类胶囊与原帖直达契约", () => {
    const studioUiJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));
    const studioScss = readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss"));
    const zhJson = JSON.parse(readSourceText(path.join(ROOT, "src", "i18n", "zh-CN.json")));
    const enJson = JSON.parse(readSourceText(path.join(ROOT, "src", "i18n", "en.json")));

    validateSnippetStoreContracts({studioUiJs, studioScss, zhJson, enJson});
});

test("T-7867: 运行时模拟多原生片段环境下，片段商店首屏必置顶链滴社区名作，且可一键胶囊筛选 10 款社区精品", async (t) => {
    const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
        url: "http://127.0.0.1:43928/",
        pretendToBeVisual: true,
    });
    const {window} = dom;
    const {document} = window;
    const Module = require("node:module");
    const originalLoad = Module._load;
    Module._load = function (request, parent, isMain) {
        if (request === "siyuan") {
            return {Dialog: class {}, showMessage: () => {}};
        }
        return originalLoad.apply(this, arguments);
    };
    t.after(() => {
        Module._load = originalLoad;
        window.close();
    });
    const {mountSnippetStudio} = require("../src/snippet-studio-ui.js");
    const i18n = require("../src/i18n/zh-CN.json");

    // 模拟真实用户拥有 11 个原生片段（标题颜色、lifelog 标签、媒体播放器等）
    const mockNativeSnippets = [
        {id: "n1", name: "标题颜色-neo蓝色", type: "css", content: ".n1{}", enabled: false},
        {id: "n2", name: "css lifelog 标签-日记", type: "css", content: ".n2{}", enabled: false},
        {id: "n3", name: "css lifelog 标签-家庭", type: "css", content: ".n3{}", enabled: true},
        {id: "n4", name: "css lifelog 标签-个人", type: "css", content: ".n4{}", enabled: true},
        {id: "n5", name: "思源媒体播放器 - TVBox 源配置", type: "js", content: "console.log(1)", enabled: true},
        {id: "n6", name: "待办圆圈-颜色", type: "css", content: ".n6{}", enabled: false},
        {id: "n7", name: "标题颜色-莫兰迪", type: "css", content: ".n7{}", enabled: false},
        {id: "n8", name: "css lifelog 标签-感悟", type: "css", content: ".n8{}", enabled: true},
        {id: "n9", name: "css lifelog 标签-思考", type: "css", content: ".n9{}", enabled: true},
        {id: "n10", name: "思源阅读器 - 书源配置扩展", type: "js", content: "console.log(2)", enabled: true},
        {id: "n11", name: "思源媒体播放器 - B站 API 扩展", type: "js", content: "console.log(3)", enabled: true},
    ];

    const root = document.getElementById("root");
    const controller = mountSnippetStudio(root, {
        window,
        document,
        i18n,
        session: {draft: {...mockNativeSnippets[0]}, baseline: {...mockNativeSnippets[0]}},
        store: {
            read: async () => mockNativeSnippets.map((s) => ({...s})),
            mutate: async () => mockNativeSnippets.map((s) => ({...s})),
            dispose: () => {},
        },
    });
    await controller.ready;

    // 打开片段商店
    root.querySelector(".sw-studio__store-banner-btn").click();
    const sheet = root.querySelector(".sw-studio__picker-sheet--store");
    assert.ok(sheet, "片段商店弹窗容器必须就绪");

    // 1. 验证首屏首项必须是链滴社区精选名作，绝不能被本地原生片段霸榜淹没
    const firstCard = sheet.querySelector(".sw-studio__catalog-item");
    assert.ok(firstCard, "商店必须渲染卡片");
    assert.ok(firstCard.textContent.includes("彩虹大纲树引导虚线") || firstCard.textContent.includes("Mac 终端"), "商店第一项必须为链滴社区精选名作");
    assert.ok(firstCard.querySelector(".sw-studio__author--liandi"), "社区卡片必须带有链滴专属高亮徽标");

    // 2. 验证原生卡片不再输出 35 字冗余废话描述
    const allHints = Array.from(sheet.querySelectorAll(".sw-studio__hint")).map((el) => el.textContent);
    assert.equal(allHints.some((txt) => txt.includes("原生思源片段仍是保存来源")), false, "严禁刷屏输出原生片段冗长默认说明");

    // 3. 验证右侧详情不再显示『社区目录尚未建立』消极提示，而是精美原帖直达
    const storeInfo = sheet.querySelector(".sw-studio__store-preview .sw-studio__hint");
    assert.ok(!storeInfo.textContent.includes("社区目录尚未建立"), "右侧预览面板严禁显示社区目录尚未建立消极文案");
    assert.match(storeInfo.textContent, /链滴社区精选/, "右侧信息栏必须清晰标注链滴社区精选");

    const sourceLink = sheet.querySelector(".sw-studio__store-source-link--liandi");
    assert.ok(sourceLink, "必须挂载链滴社区原帖直达超链接");
    assert.match(sourceLink.textContent, /链滴社区原帖与讨论/, "链接文案必须清晰直观");

    // 4. 点击专属『🔥 链滴社区』分类胶囊，列表必须精准收敛为 10 款社区名作
    const communityPill = sheet.querySelector('.sw-studio__category-pill[data-category-value="community"]');
    assert.ok(communityPill, "必须渲染专属『🔥 链滴社区』分类胶囊");
    assert.match(communityPill.textContent, /🔥 链滴社区 · 10/, "胶囊必须显示 10 款社区精选计数");

    communityPill.click();
    assert.equal(communityPill.classList.contains("is-active"), true, "点击后必须激活高亮");

    const communityCards = sheet.querySelectorAll(".sw-studio__catalog-item");
    assert.equal(communityCards.length, 10, "链滴社区视图必须精确展示 10 款社区名作");
    for (const card of communityCards) {
        assert.ok(card.querySelector(".sw-studio__author--liandi"), "社区视图下所有卡片必须带有链滴作者标识");
    }

    controller.dispose();
});

test("T-7867 门禁负向验证：若回退为原生片段霸榜、丢失链滴专属胶囊或泄漏冗余废话描述必须精准报错", () => {
    const base = {
        studioUiJs: readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js")),
        studioScss: readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss")),
        zhJson: JSON.parse(readSourceText(path.join(ROOT, "src", "i18n", "zh-CN.json"))),
        enJson: JSON.parse(readSourceText(path.join(ROOT, "src", "i18n", "en.json"))),
    };

    assert.throws(
        () => validateSnippetStoreContracts({...base, studioUiJs: base.studioUiJs.replace("isCommunity: true", "isCommunity: false")}),
        /tag COMMUNITY_SNIPPETS with isCommunity: true/,
        "移除 isCommunity 标签时必须报错",
    );

    assert.throws(
        () => validateSnippetStoreContracts({...base, studioUiJs: base.studioUiJs.replace("rankA = a.isCommunity ? 0", "rankA = a.isCommunity ? 3")}),
        /prioritize LianDi community snippets as tier 0/,
        "破坏链滴社区置顶排序梯队时必须报错",
    );

    assert.throws(
        () => validateSnippetStoreContracts({...base, studioUiJs: base.studioUiJs.replaceAll("🔥 链滴社区", "其他分类")}),
        /must render '🔥 链滴社区'/,
        "丢失链滴社区专属胶囊时必须报错",
    );

    assert.throws(
        () => validateSnippetStoreContracts({...base, studioUiJs: base.studioUiJs.replace("item.source === \"native\" ? \"\" : t(\"snippetDescription\")", "t(\"snippetDescription\")")}),
        /verbose snippetDescription fallback/,
        "恢复原生片段 35 字废话描述时必须报错",
    );
});
