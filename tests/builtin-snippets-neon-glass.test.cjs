"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7483: BUILTIN_SNIPPETS 包含 neonglow 赛博发光与 frostedglass 毛玻璃嵌入卡片", () => {
    const neonglow = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-neonglow");
    assert.ok(neonglow, "必须包含 swss-builtin-neonglow 片段");
    assert.equal(neonglow.category, "layout");
    assert.equal(neonglow.type, "css");
    assert.ok(neonglow.content.includes(".protyle-wysiwyg--select"));
    assert.ok(neonglow.content.includes("var(--b3-theme-primary"));
    assert.ok(neonglow.content.includes("box-shadow: 0 0 12px"));

    const frostedglass = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-frostedglass");
    assert.ok(frostedglass, "必须包含 swss-builtin-frostedglass 片段");
    assert.equal(frostedglass.category, "layout");
    assert.equal(frostedglass.type, "css");
    assert.ok(frostedglass.content.includes("NodeBlockQueryEmbed"));
    assert.ok(frostedglass.content.includes("backdrop-filter: blur(8px)"));
    assert.ok(frostedglass.content.includes("color-mix(in srgb"));
});

test("T-7483: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinNeonglowName",
        "snippetBuiltinNeonglowDescription",
        "snippetBuiltinFrostedglassName",
        "snippetBuiltinFrostedglassDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7483: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-neonglow", "swss-builtin-frostedglass"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});
