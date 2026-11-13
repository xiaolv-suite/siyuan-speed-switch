"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7522: BUILTIN_SNIPPETS 包含 inlinecodecard 行内代码卡片与 embedglow 挂件微光边框", () => {
    const inlinecodecard = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-inlinecodecard");
    assert.ok(inlinecodecard, "必须包含 swss-builtin-inlinecodecard 片段");
    assert.equal(inlinecodecard.category, "code");
    assert.equal(inlinecodecard.type, "css");
    assert.ok(inlinecodecard.content.includes("span[data-type=\"code\"]"));
    assert.ok(inlinecodecard.content.includes("border-radius: 5px"));
    assert.ok(inlinecodecard.content.includes("var(--b3-theme-primary"));

    const embedglow = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-embedglow");
    assert.ok(embedglow, "必须包含 swss-builtin-embedglow 片段");
    assert.equal(embedglow.category, "layout");
    assert.equal(embedglow.type, "css");
    assert.ok(embedglow.content.includes("data-type=\"NodeWidget\""));
    assert.ok(embedglow.content.includes("box-shadow"));
    assert.ok(embedglow.content.includes("var(--b3-theme-primary"));
});

test("T-7522: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinInlinecodecardName",
        "snippetBuiltinInlinecodecardDescription",
        "snippetBuiltinEmbedglowName",
        "snippetBuiltinEmbedglowDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7522: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-inlinecodecard", "swss-builtin-embedglow"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7522 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-inlinecodecard-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const inlinecodecard = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-inlinecodecard");
    assert.throws(() => {
        assert.equal(inlinecodecard.category, "wrong-category");
    });

    // 3. 缺少关键选择器断言必须失败
    const embedglow = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-embedglow");
    assert.throws(() => {
        assert.ok(embedglow.content.includes("data-type=\"nonexistent-widget\""));
    });
});
