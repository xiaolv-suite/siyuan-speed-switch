"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {clearRecycleStore, buildRecycleEntry, appendRecycleEntry} = require("../src/snippet-recycle.js");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const uiSource = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));

test("T-7482: clearRecycleStore 纯模型安全清空并返回合规空 store", () => {
    const store = clearRecycleStore();
    assert.equal(store.version, 1, "版本号必须为 1");
    assert.deepEqual(store.entries, [], "条目列表必须清空");
    assert.ok(Object.isFrozen(store), "store 必须冻结");
    assert.ok(Object.isFrozen(store.entries), "entries 必须冻结");
});

test("T-7482: 回收站清空按钮空态禁用与全键盘快捷清空（Ctrl/Cmd+Shift+Delete 与 Alt+C）", () => {
    // 1. 空态禁用逻辑
    assert.match(
        uiSource,
        /clearButton\.disabled\s*=\s*entries\.length\s*===\s*0;/,
        "当回收站无条目时清空按钮必须禁用",
    );
    assert.match(
        uiSource,
        /clearButton\.setAttribute\("aria-disabled",\s*"true"\);/,
        "空态时必须添加 aria-disabled 语义",
    );

    // 2. 快捷键清空绑定
    assert.match(
        uiSource,
        /\(event\.ctrlKey \|\| event\.metaKey\) && event\.shiftKey && \(event\.key === "Delete" \|\| event\.key === "Backspace"\)/,
        "必须支持 Ctrl/Cmd+Shift+Delete/Backspace 快捷清空",
    );
    assert.match(
        uiSource,
        /event\.altKey && String\(event\.key\)\.toLowerCase\(\) === "c"/,
        "必须支持 Alt+C 快捷清空",
    );
});

test("T-7482: 回收站单项键盘回车/r快捷恢复与Delete/Backspace快捷永久删除", () => {
    // 1. 列表单项行 tabindex 与键盘事件
    assert.match(
        uiSource,
        /row\.tabIndex\s*=\s*0;/,
        "回收站单项行必须具备 tabIndex=0 以便聚焦",
    );
    assert.match(
        uiSource,
        /row\.dataset\.recId\s*=\s*entry\.recId;/,
        "回收站单项行必须带 data-rec-id",
    );
    assert.match(
        uiSource,
        /e\.key === "Enter" \|\| e\.key\.toLowerCase\(\) === "r"/,
        "聚焦行时按 Enter 或 R 键必须触发快捷恢复",
    );
    assert.match(
        uiSource,
        /e\.key === "Delete" \|\| e\.key === "Backspace"/,
        "聚焦行时按 Delete 或 Backspace 键必须触发快捷永久删除",
    );

    // 2. Home 与 End 边界直达按键流
    assert.match(
        uiSource,
        /\["Home", "End"\]\.includes\(event\.key\)/,
        "必须支持 Home 与 End 键在回收站列表中跳跃",
    );
});
