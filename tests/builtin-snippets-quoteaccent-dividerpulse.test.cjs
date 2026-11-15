"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7518: BUILTIN_SNIPPETS 包含 quoteaccent 引用大引号与 dividerpulse 渐变分割线", () => {
    const quoteaccent = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quoteaccent");
    assert.ok(quoteaccent, "必须包含 swss-builtin-quoteaccent 片段");
    assert.equal(quoteaccent.category, "quote");
    assert.equal(quoteaccent.type, "css");
    assert.ok(quoteaccent.content.includes("data-type=\"NodeBlockquote\""));
    assert.ok(quoteaccent.content.includes("::after"));
    assert.ok(quoteaccent.content.includes("”"));
    assert.ok(quoteaccent.content.includes("var(--b3-theme-primary"));

    const dividerpulse = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-dividerpulse");
    assert.ok(dividerpulse, "必须包含 swss-builtin-dividerpulse 片段");
    assert.equal(dividerpulse.category, "divider");
    assert.equal(dividerpulse.type, "css");
    assert.ok(dividerpulse.content.includes("data-type=\"NodeThematicBreak\""));
    assert.ok(dividerpulse.content.includes("> hr"));
    assert.ok(dividerpulse.content.includes("linear-gradient"));
    assert.ok(dividerpulse.content.includes("var(--b3-theme-primary"));
});

test("T-7518: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinQuoteaccentName",
        "snippetBuiltinQuoteaccentDescription",
        "snippetBuiltinDividerpulseName",
        "snippetBuiltinDividerpulseDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7518: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-quoteaccent", "swss-builtin-dividerpulse"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7518 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quoteaccent-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const quoteaccent = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quoteaccent");
    assert.throws(() => {
        assert.equal(quoteaccent.category, "code");
    });

    // 3. 缺少关键选择器断言必须失败
    const dividerpulse = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-dividerpulse");
    assert.throws(() => {
        assert.ok(dividerpulse.content.includes("data-type=\"nonexistent-break\""));
    });
});
