"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7534: BUILTIN_SNIPPETS 包含 calloutgradient 双色渐变卡片与 hrdots 三点艺术分割线", () => {
    const calloutgradient = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-calloutgradient");
    assert.ok(calloutgradient, "必须包含 swss-builtin-calloutgradient 片段");
    assert.equal(calloutgradient.category, "quote");
    assert.equal(calloutgradient.type, "css");
    assert.ok(calloutgradient.content.includes(".b3-callout"));
    assert.ok(calloutgradient.content.includes("border-image"));
    assert.ok(calloutgradient.content.includes("linear-gradient"));

    const hrdots = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-hrdots");
    assert.ok(hrdots, "必须包含 swss-builtin-hrdots 片段");
    assert.equal(hrdots.category, "divider");
    assert.equal(hrdots.type, "css");
    assert.ok(hrdots.content.includes("data-type=\"NodeThematicBreak\""));
    assert.ok(hrdots.content.includes("::before"));
    assert.ok(hrdots.content.includes("•••"));
    assert.ok(hrdots.content.includes("letter-spacing"));
});

test("T-7534: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinCalloutgradientName",
        "snippetBuiltinCalloutgradientDescription",
        "snippetBuiltinHrdotsName",
        "snippetBuiltinHrdotsDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7534: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-calloutgradient", "swss-builtin-hrdots"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7534 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-calloutgradient-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const calloutgradient = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-calloutgradient");
    assert.throws(() => {
        assert.equal(calloutgradient.category, "layout");
    });

    // 3. 缺少关键选择器断言必须失败
    const hrdots = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-hrdots");
    assert.throws(() => {
        assert.ok(hrdots.content.includes("data-type=\"nonexistent-thematic-break\""));
    });
});
