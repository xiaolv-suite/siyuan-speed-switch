"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7490: BUILTIN_SNIPPETS 包含 selectionglow 划词微光与 rainbowbrackets 嵌套标点高亮", () => {
    const selection = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-selectionglow");
    assert.ok(selection, "必须包含 swss-builtin-selectionglow 片段");
    assert.equal(selection.category, "typography");
    assert.equal(selection.type, "css");
    assert.ok(selection.content.includes("::selection"));
    assert.ok(selection.content.includes("var(--b3-theme-primary"));

    const rainbow = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-rainbowbrackets");
    assert.ok(rainbow, "必须包含 swss-builtin-rainbowbrackets 片段");
    assert.equal(rainbow.category, "code");
    assert.equal(rainbow.type, "css");
    assert.ok(rainbow.content.includes(".hljs-punctuation"));
    assert.ok(rainbow.content.includes(".hljs-bracket"));
    assert.ok(rainbow.content.includes("var(--b3-theme-primary"));
});

test("T-7490: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinSelectionglowName",
        "snippetBuiltinSelectionglowDescription",
        "snippetBuiltinRainbowbracketsName",
        "snippetBuiltinRainbowbracketsDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7490: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-selectionglow", "swss-builtin-rainbowbrackets"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});
