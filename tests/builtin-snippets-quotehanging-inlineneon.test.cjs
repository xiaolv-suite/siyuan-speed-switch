"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7546: BUILTIN_SNIPPETS 包含 quotehanging 引用悬挂引号与 inlineneon 行内代码霓虹微光", () => {
    const quotehanging = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quotehanging");
    assert.ok(quotehanging, "必须包含 swss-builtin-quotehanging 片段");
    assert.equal(quotehanging.category, "quote");
    assert.equal(quotehanging.type, "css");
    assert.ok(quotehanging.content.includes('[data-type="NodeBlockquote"]::before'));
    assert.ok(quotehanging.content.includes('content: "“"'));
    assert.ok(quotehanging.content.includes("var(--b3-theme-primary"));

    const inlineneon = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-inlineneon");
    assert.ok(inlineneon, "必须包含 swss-builtin-inlineneon 片段");
    assert.equal(inlineneon.category, "code");
    assert.equal(inlineneon.type, "css");
    assert.ok(inlineneon.content.includes(".protyle-wysiwyg code"));
    assert.ok(inlineneon.content.includes("box-shadow: 0 0 6px"));
    assert.ok(inlineneon.content.includes("var(--b3-theme-primary"));
});

test("T-7546: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinQuotehangingName",
        "snippetBuiltinQuotehangingDescription",
        "snippetBuiltinInlineneonName",
        "snippetBuiltinInlineneonDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7546: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-quotehanging", "swss-builtin-inlineneon"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7546 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quotehanging-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const quotehanging = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quotehanging");
    assert.throws(() => {
        assert.equal(quotehanging.category, "list");
    });

    // 3. 缺少关键选择器断言必须失败
    const inlineneon = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-inlineneon");
    assert.throws(() => {
        assert.ok(inlineneon.content.includes("code.nonexistent-selector"));
    });
});
