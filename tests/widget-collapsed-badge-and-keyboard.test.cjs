"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {JSDOM} = require("jsdom");
const {buildHomeModuleView, renderHomeModuleView} = require("../src/home-view.js");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");

test("T-7489: 折叠状态下组件头部动态渲染条目计数或统计角标", () => {
    const dom = new JSDOM("<!doctype html><body></body>");
    const doc = dom.window.document;

    // 1. 折叠且有条目
    const collapsedItemsView = buildHomeModuleView(
        {moduleId: "tasks", title: "待办任务"},
        {ok: true, snapshot: {items: [{label: "Task 1", value: "1"}, {label: "Task 2", value: "2"}]}},
        {collapsed: true},
    );
    assert.equal(collapsedItemsView.collapsed, true);
    const root1 = renderHomeModuleView(doc, collapsedItemsView, {onToggle: () => {}});
    const badge1 = root1.querySelector(".sw__home-collapsed-badge");
    assert.ok(badge1, "折叠态下必须渲染条目角标");
    assert.equal(badge1.textContent, "2");

    // 2. 折叠且有统计值
    const collapsedStatView = buildHomeModuleView(
        {moduleId: "stats", title: "统计数据"},
        {ok: true, snapshot: {stat: {value: "95%"}, items: []}},
        {collapsed: true},
    );
    const root2 = renderHomeModuleView(doc, collapsedStatView, {onToggle: () => {}});
    const badge2 = root2.querySelector(".sw__home-collapsed-badge");
    assert.ok(badge2, "统计卡片折叠态下必须回显统计值");
    assert.equal(badge2.textContent, "95%");

    // 3. 展开态不得显示折叠角标（负向保护）
    const expandedView = buildHomeModuleView(
        {moduleId: "tasks", title: "待办任务"},
        {ok: true, snapshot: {items: [{label: "Task 1", value: "1"}]}},
        {collapsed: false},
    );
    const root3 = renderHomeModuleView(doc, expandedView, {onToggle: () => {}});
    assert.equal(root3.querySelectorAll(".sw__home-collapsed-badge").length, 0, "展开态不得渲染折叠角标");
});

test("T-7489: second-panel-ui.ts 与 second-panel-ui.js 包含小组件空格与括号折叠热键", () => {
    const tsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
    const jsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));
    const scss = readSourceText(path.join(ROOT, "src", "styles", "_05-settings-widgets.scss"));

    assert.ok(tsSource.includes('key.key === " " || key.key === "[" || key.key === "]"'), "TS 必须包含空格或括号折叠热键");
    assert.ok(jsSource.includes('key.key === " " || key.key === "[" || key.key === "]"'), "JS 镜像必须同步包含空格或括号折叠热键");
    assert.ok(tsSource.includes("cell.querySelector<HTMLButtonElement>(\".sw__home-module-fold\")"), "TS 必须触发折叠按钮点击");
    assert.ok(jsSource.includes("cell.querySelector(\".sw__home-module-fold\")"), "JS 必须同步触发折叠按钮点击");

    assert.ok(scss.includes(".sw__home-collapsed-badge"), "SCSS 必须声明 .sw__home-collapsed-badge 样式");
});
