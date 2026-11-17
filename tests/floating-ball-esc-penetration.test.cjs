const test = require("node:test");
const assert = require("node:assert/strict");
const {JSDOM} = require("jsdom");
const {createFloatingBallPanelController} = require("../src/floating-ball-panel.js");
const {createDefaultFloatingBallConfig} = require("../src/floating-ball-model.js");

function createTestEnvironment() {
    const dom = new JSDOM("<!doctype html><html><body><div id='container'></div></body></html>", {
        url: "https://speedswitch.test",
    });
    const {window} = dom;
    const {document} = window;
    const container = document.getElementById("container");
    const config = createDefaultFloatingBallConfig();
    const controller = createFloatingBallPanelController({
        container,
        documentRef: document,
        surface: "desktop",
        config,
        availableActions: [],
        labels: {},
    });
    return {dom, window, document, container, controller};
}

test("Esc 键穿透防护：悬浮球更多菜单开启时，按 Esc 阻止事件冒泡至宿主编辑区并关闭抽屉", () => {
    const {dom, window, document, controller} = createTestEnvironment();

    let hostEditorEscapeTriggered = false;
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hostEditorEscapeTriggered = true;
    });

    controller.mount();
    controller.openMore();

    const escEvent = new window.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
    });
    let propagationStopped = false;
    escEvent.stopPropagation = () => { propagationStopped = true; };

    document.dispatchEvent(escEvent);

    assert.ok(propagationStopped, "按 Esc 必须调用 stopPropagation 阻断冒泡");
    assert.ok(escEvent.defaultPrevented, "按 Esc 必须阻止默认行为");
    assert.equal(hostEditorEscapeTriggered, false, "宿主底层编辑区绝不可收到穿透的 Esc 事件");

    dom.window.close();
});

test("Esc 键穿透防护：搜索框有文字时，按 Esc 阶梯式仅清空文字并阻断穿透，抽屉保持打开", () => {
    const {dom, window, document, container, controller} = createTestEnvironment();

    let hostEditorEscapeTriggered = false;
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hostEditorEscapeTriggered = true;
    });

    controller.mount();
    controller.openMore();

    const searchInput = container.querySelector(".sw__floating-ball-more-search");
    assert.ok(searchInput, "必须存在搜索输入框");
    searchInput.value = "test-query";
    searchInput.focus();

    const escEvent = new window.KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
    });
    let propagationStopped = false;
    escEvent.stopPropagation = () => { propagationStopped = true; };

    searchInput.dispatchEvent(escEvent);

    assert.equal(searchInput.value, "", "第一次按 Esc 应清空搜索框内容");
    assert.ok(propagationStopped, "清空搜索框必须阻断 Esc 穿透");
    assert.equal(hostEditorEscapeTriggered, false, "底层编辑区不可收到穿透事件");

    dom.window.close();
});

test("Esc 键穿透防护门禁负向验证：未阻止冒泡时宿主编辑区必被触发", () => {
    const dom = new JSDOM("<!doctype html><html><body><div id='box'></div></body></html>");
    let leaked = false;
    dom.window.addEventListener("keydown", () => { leaked = true; });

    const leakingEvent = new dom.window.KeyboardEvent("keydown", {key: "Escape", bubbles: true});
    dom.window.document.getElementById("box").dispatchEvent(leakingEvent);

    assert.equal(leaked, true, "若未调用 stopPropagation，普通事件必然泄漏至 window");
    dom.window.close();
});
