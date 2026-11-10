const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {readSourceText} = require("./source-scan.cjs");
const {declaresIn} = require("./css-block-scan.cjs");

const ROOT = path.resolve(__dirname, "..");

function validateDualStoreContracts({indexTs, homeStoreUiTs, studioUiJs, storeCardsScss, studioScss}) {
    if (!/context\s*=\s*context\s*\|\|\s*\(?\{/.test(indexTs)) {
        throw new Error("index.ts openSnippetStudio must normalize context = context || ({entry: 'internal'}) when context is null/undefined");
    }
    if (!/sw-home-store__category-nav/.test(homeStoreUiTs) || !/sw-home-store__category-pill/.test(homeStoreUiTs)) {
        throw new Error("home-store-ui.ts must render .sw-home-store__category-nav scene pills");
    }
    if (!/if\s*\(!browse\s*&&\s*snippetGroups\.view\s*===\s*"tree"\)/.test(studioUiJs)) {
        throw new Error("snippet-studio-ui.js must bypass tree grouping in browse (Snippet Store) mode");
    }
    if (!/sw-studio__store-body/.test(studioUiJs) || !/sw-studio__store-install/.test(studioUiJs)) {
        throw new Error("snippet-studio-ui.js must mount 2-column .sw-studio__store-body and one-click install button");
    }
    if (!declaresIn(studioScss, ".sw-studio__group", /grid-column:\s*1\s*\/\s*-1/, {topLevel: true})) {
        throw new Error("_snippet-studio.scss .sw-studio__group must span full grid width (1 / -1)");
    }
    if (!declaresIn(storeCardsScss, ".sw-home-store__catalog .sw-home-store__card .sw-home-store__availability--conditional", /display:\s*none/, {topLevel: true})) {
        throw new Error("_08-home-store-cards.scss must hide noisy conditional availability badge in catalog rows");
    }
}

test("T-7831: 小组件商店与片段商店双商店重构源码与样式契约", () => {
    const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));
    const homeStoreUiTs = readSourceText(path.join(ROOT, "src", "home-store-ui.ts"));
    const studioUiJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));
    const storeCardsScss = readSourceText(path.join(ROOT, "src", "styles", "_08-home-store-cards.scss"));
    const studioScss = readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss"));

    validateDualStoreContracts({indexTs, homeStoreUiTs, studioUiJs, storeCardsScss, studioScss});
});

test("T-7831: 片段商店运行时双栏挂载、分类胶囊过滤、首项自动预览与一键安装启用闭环", async (t) => {
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

    let savedSnippets = [
        {id: "native-1", name: "已装片段", type: "css", content: ".native-1{}", enabled: true, disabledInPublish: false},
    ];
    let mutateCalls = 0;

    const root = document.getElementById("root");
    const controller = mountSnippetStudio(root, {
        window,
        document,
        i18n,
        session: {draft: {...savedSnippets[0]}, baseline: {...savedSnippets[0]}},
        store: {
            read: async () => savedSnippets.map((s) => ({...s})),
            mutate: async (_baseline, action, candidate) => {
                mutateCalls += 1;
                if (action === "save") {
                    const created = {...candidate, id: `installed-${mutateCalls}`};
                    savedSnippets = [...savedSnippets, created];
                } else if (action === "toggle") {
                    savedSnippets = savedSnippets.map((s) => (s.id === candidate.id ? {...candidate} : s));
                }
                return savedSnippets.map((s) => ({...s}));
            },
            dispose: () => {},
        },
    });
    await controller.ready;

    // 1. 左侧目录底部展示预设商店探索引导卡
    const storeCta = root.querySelector(".sw-studio__library-store-cta");
    assert.ok(storeCta, "左侧目录必须渲染预设商店探索引导卡");

    // 2. 点击「✨ 预设商店」打开宽屏双栏片段商店
    root.querySelector(".sw-studio__store-banner-btn").click();
    const sheet = root.querySelector(".sw-studio__picker-sheet--store");
    assert.ok(sheet, "片段商店必须挂载 .sw-studio__picker-sheet--store 宽屏容器");
    assert.equal(sheet.querySelector(".sw-studio__group-toolbar").hidden, true, "商店模式下必须隐藏分组管理栏");
    assert.equal(sheet.querySelectorAll(".sw-studio__group--ungrouped").length, 0, "商店模式下禁止将预设塞入『未分组』树形容器");

    // 3. 打开商店时自动选中首个内置预设并渲染预览与源码
    const storeCode = sheet.querySelector(".sw-studio__store-code");
    assert.ok(storeCode.textContent.trim().length > 0, "打开片段商店时必须自动选中并展示首个预设的代码与预览");
    const selectedCard = sheet.querySelector(".sw-studio__catalog-item.is-store-selected");
    assert.ok(selectedCard, "当前预览的商店卡片必须带有 .is-store-selected 高亮状态");

    // 4. 点击分类胶囊过滤商店列表
    const tablePill = sheet.querySelector('.sw-studio__category-pill[data-category-value="table"]');
    assert.ok(tablePill, "必须渲染分类胶囊按钮");
    tablePill.click();
    assert.equal(tablePill.classList.contains("is-active"), true, "点击分类胶囊后必须激活高亮");
    const filteredCards = sheet.querySelectorAll(".sw-studio__catalog-item");
    assert.ok(filteredCards.length >= 1 && filteredCards.length < 20, "点击『表格』分类胶囊后必须过滤出表格类片段");

    // 5. 点击「⚡ 一键安装并启用」直接安装内置片段并更新状态
    const installBtn = sheet.querySelector(".sw-studio__store-install");
    assert.ok(installBtn && !installBtn.disabled, "一键安装并启用按钮必须可用");
    installBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(mutateCalls, 1, "点击一键安装并启用必须调用 store.mutate 保存");
    assert.match(installBtn.textContent, /已在思源启用/, "安装完成后按钮文案必须即时更新为已在思源启用");

    controller.dispose();
});

test("T-7831 门禁负向验证：若回退树形未分组混排、丢失 context?.objectId 空守卫或丢失全宽网格声明必须报错", () => {
    const base = {
        indexTs: readSourceText(path.join(ROOT, "src", "index.ts")),
        homeStoreUiTs: readSourceText(path.join(ROOT, "src", "home-store-ui.ts")),
        studioUiJs: readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js")),
        storeCardsScss: readSourceText(path.join(ROOT, "src", "styles", "_08-home-store-cards.scss")),
        studioScss: readSourceText(path.join(ROOT, "src", "styles", "_snippet-studio.scss")),
    };

    assert.throws(
        () => validateDualStoreContracts({...base, studioUiJs: base.studioUiJs.replace("!browse && snippetGroups.view === \"tree\"", "snippetGroups.view === \"tree\"")}),
        /bypass tree grouping/,
        "回退为商店模式强制走 tree 分组时必须报错",
    );

    assert.throws(
        () => validateDualStoreContracts({...base, indexTs: base.indexTs.replace(/context\s*=\s*context\s*\|\|\s*[^;]+;/, "")}),
        /openSnippetStudio must normalize context/,
        "移除 context 兜底赋值时必须报错",
    );

    assert.throws(
        () => validateDualStoreContracts({...base, studioScss: base.studioScss.replace(/(&__group\s*\{[^}]*?)grid-column:\s*1\s*\/\s*-1;/, "$1")}),
        /span full grid width/,
        "移除 .sw-studio__group 的 grid-column: 1 / -1 时必须报错",
    );
});
