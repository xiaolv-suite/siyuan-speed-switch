"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {buildHomeModuleView, renderHomeModuleView} = require("../src/home-view.js");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");

test("T-7481: 空态或受阻状态下可配置组件渲染配置自愈按钮并支持点击回调", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    const doc = dom.window.document;
    const calls = [];

    const configurableDef = {
        moduleId: "fixed-document",
        title: "常用文档",
        configSchema: [{key: "docId", label: "文档", type: "text"}],
    };

    // 1. ready 态但 items 为空（常规未选文档空态）
    const emptyView = buildHomeModuleView(configurableDef, {
        ok: true,
        emptyHint: "请先搜索并选择一个文档",
        snapshot: {items: []},
    });
    assert.equal(emptyView.configurable, true);

    const emptyRoot = renderHomeModuleView(doc, emptyView, {
        onConfig: (v) => calls.push(v.moduleId),
    });
    const emptyBtn = emptyRoot.querySelector(".sw__home-module-config-hint");
    assert.ok(emptyBtn, "空态下必须渲染 .sw__home-module-config-hint");
    assert.equal(emptyBtn.dataset.focusKey, "config-hint");
    assert.equal(emptyBtn.textContent, "配置组件");
    emptyBtn.click();
    assert.deepEqual(calls, ["fixed-document"]);

    // 2. blocked 受阻态
    const blockedView = buildHomeModuleView(configurableDef, {
        ok: false,
        reason: "blocked",
        emptyHint: "绑定文档不存在，请重新配置",
    });
    const blockedRoot = renderHomeModuleView(doc, blockedView, {
        onConfig: (v) => calls.push("blocked:" + v.moduleId),
    });
    const blockedBtn = blockedRoot.querySelector(".sw__home-module-config-hint");
    assert.ok(blockedBtn, "受阻态下必须渲染 .sw__home-module-config-hint");
    blockedBtn.click();
    assert.deepEqual(calls, ["fixed-document", "blocked:fixed-document"]);
});

test("T-7481: 非可配置组件或未传入 onConfig 时不渲染配置按钮（负向与边界保护）", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    const doc = dom.window.document;

    // 1. 无 configSchema 的普通组件
    const plainDef = {moduleId: "plain-tasks", title: "任务"};
    const plainView = buildHomeModuleView(plainDef, {ok: true, snapshot: {items: []}});
    assert.equal(plainView.configurable, false);

    const plainRoot = renderHomeModuleView(doc, plainView, {onConfig: () => {}});
    assert.equal(plainRoot.querySelectorAll(".sw__home-module-config-hint").length, 0, "不可配置组件禁止渲染配置按钮");

    // 2. 可配置但未提供 onConfig 选项
    const configurableDef = {
        moduleId: "fixed-document",
        title: "常用文档",
        configSchema: [{key: "docId", label: "文档", type: "text"}],
    };
    const withoutHandlerView = buildHomeModuleView(configurableDef, {ok: true, snapshot: {items: []}});
    const withoutHandlerRoot = renderHomeModuleView(doc, withoutHandlerView, {});
    assert.equal(withoutHandlerRoot.querySelectorAll(".sw__home-module-config-hint").length, 0, "无回调时不渲染配置按钮");
});

test("T-7481: second-panel-ui.ts 与 second-panel-ui.js 镜像接入 onConfig 与 configAction 标签", () => {
    const tsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
    const jsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));

    assert.ok(tsSource.includes("configAction: this.i18n.homeConfigAction"), "second-panel-ui.ts 必须注入 configAction 国际化");
    assert.ok(jsSource.includes("configAction: this.i18n.homeConfigAction"), "second-panel-ui.js 必须同步注入 configAction 国际化");
    assert.ok(tsSource.includes("def.configSchema && def.configSchema.length > 0"), "second-panel-ui.ts 必须挂载 onConfig 回调与配置校验");
    assert.ok(jsSource.includes("def.configSchema && def.configSchema.length > 0"), "second-panel-ui.js 必须同步挂载 onConfig 回调与配置校验");
});
