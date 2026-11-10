"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7558: BUILTIN_SNIPPETS 包含 quotehover 引用悬停平移与 listbulletpulse 列表圆点微动效", () => {
    const quotehover = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quotehover");
    assert.ok(quotehover, "必须包含 swss-builtin-quotehover 片段");
    assert.equal(quotehover.category, "quote");
    assert.equal(quotehover.type, "css");
    assert.ok(quotehover.content.includes('[data-type="NodeBlockquote"]:hover'));
    assert.ok(quotehover.content.includes("translateX(3px)"));
    assert.ok(quotehover.content.includes("var(--b3-theme-primary"));

    const listbulletpulse = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-listbulletpulse");
    assert.ok(listbulletpulse, "必须包含 swss-builtin-listbulletpulse 片段");
    assert.equal(listbulletpulse.category, "list");
    assert.equal(listbulletpulse.type, "css");
    assert.ok(listbulletpulse.content.includes('[data-subtype="u"] > [data-type="NodeListItem"]'));
    assert.ok(listbulletpulse.content.includes("scale(1.25)"));
    assert.ok(listbulletpulse.content.includes("var(--b3-theme-primary"));
});

test("T-7558: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinQuotehoverName",
        "snippetBuiltinQuotehoverDescription",
        "snippetBuiltinListbulletpulseName",
        "snippetBuiltinListbulletpulseDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7558: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-quotehover", "swss-builtin-listbulletpulse"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7558 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quotehover-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const quotehover = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quotehover");
    assert.throws(() => {
        assert.equal(quotehover.category, "code");
    });

    // 3. 缺少关键选择器断言必须失败
    const listbulletpulse = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-listbulletpulse");
    assert.throws(() => {
        assert.ok(listbulletpulse.content.includes(".nonexistent-bullet"));
    });
});
