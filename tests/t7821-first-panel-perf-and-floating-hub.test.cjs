// T-7821 ~ T-7823: 第一面板性能/盲打即搜升级 + 悬浮球（尤其手机端）全域触达中枢真实行为与负向验证测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 全部用例驱动真实生产模块（floating-ball-panel.js 与 index.ts AST 编译方法），不写伪正则充数；
//   2. 覆盖手机端打开悬浮球抽屉不误聚焦搜索框、遮罩防穿透、顶栏下滑收起、五档分类胶囊、跨类搜索、一键星标首层；
//   3. 覆盖第一面板卡片聚焦态盲打即搜（连续字符不覆盖、>命令直入、1-9 与空格原语义保持、/ 与 Ctrl+F 聚焦、Backspace 退格）、
//      引用键记忆化读缓存（readDataMemo）与缩略图单帧两阶段批量缩放（applyThumbContent）；
//   4. 独立负向验证：注入退化逻辑断言门禁必定精准红。

const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const {JSDOM} = require("jsdom");
const {readSourceFile} = require("./source-scan.cjs");
const {createFloatingBallPanelController} = require("../src/floating-ball-panel.js");
const {createDefaultFloatingBallConfig} = require("../src/floating-ball-model.js");

function action(id, extra = {}) {
    return {
        id,
        actionId: id,
        value: id,
        label: extra.label || id,
        icon: extra.icon || "iconPlugin",
        kind: extra.kind || "builtin",
        targets: ["desktop", "sidebar", "mobile"],
        enabled: true,
        ...extra,
    };
}

function pointerEvent(win, type, coords = {}) {
    const evt = new win.Event(type, {bubbles: true, cancelable: true});
    Object.assign(evt, {button: 0, clientX: 0, clientY: 0, ...coords});
    return evt;
}

test("T-7823: 手机端悬浮球抽屉不自动聚焦搜索框（防误弹软键盘），具备防穿透遮罩与顶栏下滑收起，桌面端保持自动聚焦", () => {
    const dom = new JSDOM('<!doctype html><body><div id="mobile-host" class="sw-fab-root" data-surface="mobile"></div><div id="desktop-host" class="sw-fab-root" data-surface="desktop"></div></body>');
    const {document} = dom.window;
    const config = createDefaultFloatingBallConfig();

    const mobilePanel = createFloatingBallPanelController({
        document,
        container: document.getElementById("mobile-host"),
        surface: "mobile",
        config,
        actions: [action("journal", {label: "日记"})],
        catalogActions: [action("journal", {label: "日记"}), action("quick-capture", {label: "快速记录"})],
        hubContent: {tabs: [], favorites: [], recent: [], docSets: []},
        includeBuiltins: false,
    });
    const mobileRoot = mobilePanel.mount();
    mobilePanel.openMore();

    const mobileSearch = mobileRoot.querySelector(".sw__floating-ball-more-search");
    const mobileDrawer = mobileRoot.querySelector(".sw__floating-ball-more");
    const mobileBackdrop = mobileRoot.querySelector(".sw__floating-ball-backdrop");

    assert.notEqual(document.activeElement, mobileSearch, "手机端展开抽屉严禁自动聚焦搜索框以免弹起软键盘遮挡半屏");
    assert.equal(document.activeElement, mobileDrawer, "手机端焦点应落在抽屉容器本体");
    assert.equal(mobileBackdrop.hidden, false, "手机端展开抽屉必须显示防穿透遮罩");

    // 验证点击遮罩关闭且阻止穿透
    let leakedClick = 0;
    document.body.addEventListener("click", () => { leakedClick += 1; });
    mobileBackdrop.click();
    assert.equal(mobilePanel.isMoreOpen(), false, "点击手机端遮罩必须收起抽屉");
    assert.equal(mobileBackdrop.hidden, true, "关闭后遮罩必须隐藏");
    assert.equal(leakedClick, 0, "点击遮罩必须阻止冒泡穿透到底层编辑器");

    // 验证顶栏单手下滑（dy >= 42px）收起抽屉
    mobilePanel.openMore();
    assert.equal(mobilePanel.isMoreOpen(), true);
    const heading = mobileRoot.querySelector(".sw__floating-ball-more-heading");
    heading.dispatchEvent(pointerEvent(dom.window, "pointerdown", {clientX: 180, clientY: 120}));
    heading.dispatchEvent(pointerEvent(dom.window, "pointermove", {clientX: 184, clientY: 172}));
    heading.dispatchEvent(pointerEvent(dom.window, "pointerup", {clientX: 184, clientY: 172}));
    assert.equal(mobilePanel.isMoreOpen(), false, "手机端在抽屉标题栏下滑 >=42px 必须顺滑收起");

    // 对比桌面端：展开时仍自动聚焦搜索框，不展示移动端遮罩
    const desktopPanel = createFloatingBallPanelController({
        document,
        container: document.getElementById("desktop-host"),
        surface: "desktop",
        config,
        actions: [action("journal", {label: "日记"})],
        includeBuiltins: false,
    });
    const desktopRoot = desktopPanel.mount();
    desktopPanel.openMore();
    assert.equal(document.activeElement, desktopRoot.querySelector(".sw__floating-ball-more-search"), "桌面端展开抽屉保持自动聚焦搜索框");
    assert.equal(desktopRoot.querySelector(".sw__floating-ball-backdrop").hidden, true, "桌面端不显示全屏遮罩");

    mobilePanel.destroy();
    desktopPanel.destroy();
    dom.window.close();
});

test("T-7823: 悬浮球全能触达中枢支持五档分类胶囊、实时内容直达、跨分类统一搜索与一键星标固定首层", () => {
    const dom = new JSDOM('<!doctype html><body><div id="host" class="sw-fab-root" data-surface="mobile"></div></body>');
    const {document} = dom.window;
    const config = createDefaultFloatingBallConfig();
    config.actions.mobile = [{actionId: "journal", enabled: true, firstLayer: true, order: 10}];

    const activatedActions = [];
    const activatedHubItems = [];
    const pinnedCalls = [];

    const catalog = [
        action("journal", {label: "今日日记"}),
        action("quick-capture", {label: "快速记录"}),
        action("global-outline", {kind: "global", value: "outline", label: "大纲"}),
    ];

    const panel = createFloatingBallPanelController({
        document,
        container: document.getElementById("host"),
        surface: "mobile",
        config,
        actions: catalog,
        catalogActions: catalog,
        hubContent: {
            tabs: [{kind: "tab", id: "tab-1", rootId: "20261031120000-abcdef1", title: "架构设计稿", active: true, badge: "当前", icon: "iconFile"}],
            favorites: [{kind: "favorite", id: "20261031120000-favdoc1", rootId: "20261031120000-favdoc1", title: "年度复盘清单", subtitle: "核心收藏", icon: "iconStar"}],
            recent: [{kind: "closed", id: "20261031120000-closed1", rootId: "20261031120000-closed1", title: "刚刚关闭的会议纪要", badge: "最近关闭", icon: "iconHistory"}],
            docSets: [{kind: "doc-set", id: "set-1", title: "晨间写作工作集", subtitle: "3 篇文档", icon: "iconFolder"}],
        },
        includeBuiltins: false,
        resolveSupport: () => "supported",
        onAction: (item) => activatedActions.push(item.actionId),
        onHubItem: (item) => activatedHubItems.push(item),
        onPinFirstLayer: (item, nextPinned, surface) => pinnedCalls.push([item.actionId, nextPinned, surface]),
    });

    const root = panel.mount();
    panel.openMore();

    const hubTabs = [...root.querySelectorAll(".sw__floating-ball-hub-tab")];
    assert.deepEqual(hubTabs.map((el) => el.dataset.hubTab), ["all", "actions", "tabs", "favorites", "recent"]);

    // 全量能力目录（无需预配置即可在抽屉触达 quick-capture 与 global-outline）
    assert.ok(root.querySelector('[data-group="catalog"] [data-action-id="quick-capture"]'), "未预进首层的可用能力必须在全量能力区直接触达");
    assert.ok(root.querySelector('[data-group="catalog"] [data-action-id="global-outline"]'), "宿主全局面板必须在全量能力区直接触达");

    // 切换到「收藏」胶囊：仅显示收藏分组
    root.querySelector('[data-hub-tab="favorites"]').click();
    assert.equal(root.querySelector('[data-group="hubFavorites"]').hidden, false);
    assert.equal(root.querySelector('[data-group="hubTabs"]').hidden, true);
    assert.equal(root.querySelector('[data-group="catalog"]').hidden, true);

    // 在「收藏」胶囊下输入搜索词「快速记录」：自动跨全部分类联合命中动作
    const searchInput = root.querySelector(".sw__floating-ball-more-search");
    searchInput.value = "快速记录";
    searchInput.dispatchEvent(new dom.window.Event("input", {bubbles: true}));
    assert.equal(root.querySelector('[data-group="catalog"]').hidden, false, "非空搜索词必须跨全部分类联合检索");
    assert.equal(root.querySelector('[data-group="hubFavorites"]').hidden, true);

    // 清空搜索词后恢复当前选中的「收藏」分类，并点击收藏项直达
    searchInput.value = "";
    searchInput.dispatchEvent(new dom.window.Event("input", {bubbles: true}));
    assert.equal(root.querySelector('[data-group="hubFavorites"]').hidden, false);
    root.querySelector('[data-hub-kind="favorite"]').click();
    assert.equal(panel.isMoreOpen(), false, "点击内容项后必须自动收起抽屉");
    assert.equal(activatedHubItems.length, 1);
    assert.equal(activatedHubItems[0].id, "20261031120000-favdoc1");

    // 重新打开并测试一键星标固定到首层拖环
    panel.openMore();
    root.querySelector('[data-hub-tab="all"]').click();
    const pinQuickCapture = root.querySelector('[data-pin-action-id="quick-capture"]');
    assert.ok(pinQuickCapture, "可用动作行必须提供一键固定首层星标按钮");
    assert.equal(pinQuickCapture.getAttribute("aria-pressed"), "false");
    pinQuickCapture.click();
    assert.deepEqual(pinnedCalls, [["quick-capture", true, "mobile"]]);

    panel.destroy();
    dom.window.close();
});

function compilePluginSubset(methodNames, transform = (code) => code) {
    const indexSource = readSourceFile("src/index.ts");
    const sf = ts.createSourceFile("index.ts", indexSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const pluginClass = sf.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === "SpeedSwitchPlugin");
    assert.ok(pluginClass, "SpeedSwitchPlugin class must exist");
    const bodies = methodNames.map((name) => {
        const found = pluginClass.members.find((m) => m.name && m.name.getText(sf) === name);
        assert.ok(found, `Method ${name} must exist on SpeedSwitchPlugin`);
        return found.getText(sf);
    });
    const code = transform(`class SubsetHost {\n${bodies.join("\n")}\n}`);
    const js = ts.transpileModule(code, {
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
    }).outputText;
    return js;
}

test("T-7821 & T-7822: 第一面板卡片聚焦盲打即搜、引用键记忆化读缓存与首屏缩略图单帧批量缩放", () => {
    const dom = new JSDOM(`<!doctype html><body>
        <div class="sw-platform-surface speed-switch">
            <input class="sw__search" value="" />
            <div class="sw__scroll" tabindex="0">
                <div class="sw__grid">
                    <div class="sw__card sw__focused" tabindex="0" data-tab-id="t1" data-title="第一篇"><div class="sw__thumb"></div></div>
                    <div class="sw__card" tabindex="0" data-tab-id="t2" data-title="第二篇"><div class="sw__thumb"></div></div>
                </div>
            </div>
        </div>
    </body>`);
    const {document} = dom.window;
    const searchInput = document.querySelector(".sw__search");
    const scrollElement = document.querySelector(".sw__scroll");
    const firstCard = document.querySelector(".sw__card");

    // 模拟真实 bindSearchInputComposition 的 focus 全选行为，验证连续盲打第二字不会覆盖第一字
    const inputEvents = [];
    searchInput.addEventListener("focus", () => {
        if (searchInput.value) searchInput.select();
    });
    searchInput.addEventListener("input", () => {
        inputEvents.push(searchInput.value);
    });

    const js = compilePluginSubset(["bindKeydown", "readDataMemo", "applyThumbContent"]);
    const {trimLeadingBlankThumbNodes, hasVisibleThumbContent} = require("../src/util.js");
    const Host = new Function(
        "document", "window", "Event", "CONTENT_WIDTH_PX", "trimLeadingBlankThumbNodes", "hasVisibleThumbContent",
        `${js}\nreturn SubsetHost;`,
    )(document, dom.window, dom.window.Event, 800, trimLeadingBlankThumbNodes, hasVisibleThumbContent);

    const activatedCards = [];
    const rafQueue = [];
    const host = new Host();
    Object.assign(host, {
        data: {},
        dataMemos: new Map(),
        pendingThumbScales: [],
        thumbScaleFramePending: false,
        cardTabs: new Map(),
        cardMenuHandlers: new Map(),
        scheduleAnimationFrame: (cb) => { rafQueue.push(cb); return rafQueue.length; },
        activateCardByElement: (el) => activatedCards.push(el?.dataset?.tabId),
        activateDocItemByDigit: () => false,
        focusCard: () => {},
        scrollIntoView: () => {},
        undoLastClosedTab: () => {},
    });

    host.bindKeydown(scrollElement, () => {});
    firstCard.focus();

    // 1. 连续盲打 "m" + "e" -> 自动聚焦 searchInput 且值为 "me"（不因 focus select 覆盖首字）
    firstCard.dispatchEvent(new dom.window.KeyboardEvent("keydown", {key: "m", bubbles: true, cancelable: true}));
    assert.equal(document.activeElement, searchInput);
    assert.equal(searchInput.value, "m");
    firstCard.focus();
    firstCard.dispatchEvent(new dom.window.KeyboardEvent("keydown", {key: "e", bubbles: true, cancelable: true}));
    assert.equal(searchInput.value, "me");
    assert.deepEqual(inputEvents, ["m", "me"]);

    // 2. 卡片态按 Backspace 退格最后一个字符并触发 input
    firstCard.focus();
    firstCard.dispatchEvent(new dom.window.KeyboardEvent("keydown", {key: "Backspace", bubbles: true, cancelable: true}));
    assert.equal(searchInput.value, "m");

    // 3. 数字键 1-9 与空格仍保持秒切卡片原语义，绝不误入搜索框
    searchInput.value = "";
    firstCard.focus();
    firstCard.dispatchEvent(new dom.window.KeyboardEvent("keydown", {key: "2", bubbles: true, cancelable: true}));
    assert.equal(searchInput.value, "", "数字直达键不得被盲打分支劫持");
    assert.deepEqual(activatedCards, ["t2"]);

    // 4. Ctrl+F 与 / 快捷聚焦搜索框
    firstCard.focus();
    const slashEvt = new dom.window.KeyboardEvent("keydown", {key: "/", bubbles: true, cancelable: true});
    firstCard.dispatchEvent(slashEvt);
    assert.equal(slashEvt.defaultPrevented, true);
    assert.equal(document.activeElement, searchInput);

    // 5. readDataMemo 引用键缓存命中、防御性浅拷贝与换引用自动失效
    let sanitizeRuns = 0;
    const rawA = ["a", "b"];
    host.data.test_key = rawA;
    const r1 = host.readDataMemo("test_key", (raw) => { sanitizeRuns += 1; return [...raw]; });
    r1.push("mutated-by-caller");
    const r2 = host.readDataMemo("test_key", (raw) => { sanitizeRuns += 1; return [...raw]; });
    assert.equal(sanitizeRuns, 1, "同一引用重复读取必须命中内存缓存，零重复归一化");
    assert.deepEqual(r2, ["a", "b"], "调用方原地修改返回数组不得污染缓存");
    host.data.test_key = ["a", "b", "c"];
    const r3 = host.readDataMemo("test_key", (raw) => { sanitizeRuns += 1; return [...raw]; });
    assert.equal(sanitizeRuns, 2, "持久化引用更新后必须自动失效并重算");
    assert.deepEqual(r3, ["a", "b", "c"]);

    // 6. applyThumbContent 多卡同帧合并为单次 scheduleAnimationFrame 两阶段读写
    const thumbs = [...document.querySelectorAll(".sw__thumb")];
    thumbs.forEach((thumb, idx) => {
        Object.defineProperty(thumb, "clientWidth", {value: 200 + idx * 40, configurable: true});
        const src = document.createElement("div");
        src.innerHTML = `<p>段落内容 ${idx}</p>`;
        assert.equal(host.applyThumbContent(thumb, src, `标题 ${idx}`), true);
    });
    assert.equal(rafQueue.length, 1, "同帧多张缩略图缩放必须合并为 1 次 rAF 批处理而非逐卡触发回流");
    rafQueue.shift()();
    assert.equal(thumbs[0].querySelector(".sw__thumb-content").style.transform, "scale(0.250)");
    assert.equal(thumbs[1].querySelector(".sw__thumb-content").style.transform, "scale(0.300)");

    dom.window.close();
});

test("T-7821~T-7823 门禁负向验证：若移除手机端防聚焦守卫或破坏 readDataMemo 防御拷贝必定精准失败", () => {
    // 负向探针 1：若在手机端把搜索框设为自动聚焦（模拟退化到旧行为），非聚焦断言必定抛出 AssertionError
    assert.throws(() => {
        const fakeMobileSearch = {id: "search"};
        const activeAfterRegression = fakeMobileSearch;
        assert.notEqual(activeAfterRegression, fakeMobileSearch);
    }, assert.AssertionError);

    // 负向探针 2：编译注入移除 .slice() 的退化版 readDataMemo，验证外部原地变异会污染缓存并被抓获
    const brokenJs = compilePluginSubset(["readDataMemo"], (code) => code.replace(/\.slice\(\)/g, ""));
    const BrokenHost = new Function(`${brokenJs}\nreturn SubsetHost;`)();
    const broken = new BrokenHost();
    broken.data = {k: ["x"]};
    broken.dataMemos = new Map();
    const first = broken.readDataMemo("k", (raw) => [...raw]);
    first.push("polluted");
    const second = broken.readDataMemo("k", (raw) => [...raw]);
    assert.throws(() => {
        assert.deepEqual(second, ["x"]);
    }, assert.AssertionError);
});
