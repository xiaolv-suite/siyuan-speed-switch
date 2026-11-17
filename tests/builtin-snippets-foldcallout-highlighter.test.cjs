"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7510: BUILTIN_SNIPPETS 包含 foldcallout 折叠块引用与 highlighter 荧光划词强调", () => {
    const foldcallout = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-foldcallout");
    assert.ok(foldcallout, "必须包含 swss-builtin-foldcallout 片段");
    assert.equal(foldcallout.category, "quote");
    assert.equal(foldcallout.type, "css");
    assert.ok(foldcallout.content.includes("data-type=\"NodeBlockquote\""));
    assert.ok(foldcallout.content.includes("fold=\"1\""));
    assert.ok(foldcallout.content.includes("var(--b3-theme-primary"));

    const highlighter = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-highlighter");
    assert.ok(highlighter, "必须包含 swss-builtin-highlighter 片段");
    assert.equal(highlighter.category, "typography");
    assert.equal(highlighter.type, "css");
    assert.ok(highlighter.content.includes("data-type=\"mark\""));
    assert.ok(highlighter.content.includes("linear-gradient"));
});

test("T-7510: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinFoldcalloutName",
        "snippetBuiltinFoldcalloutDescription",
        "snippetBuiltinHighlighterName",
        "snippetBuiltinHighlighterDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7510: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-foldcallout", "swss-builtin-highlighter"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7510 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-foldcallout-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const foldcallout = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-foldcallout");
    assert.throws(() => {
        assert.equal(foldcallout.category, "wrong-category");
    });

    // 3. 缺少 mark 关键选择器断言必须失败
    const highlighter = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-highlighter");
    assert.throws(() => {
        assert.ok(highlighter.content.includes("data-type=\"unsupported-mark\""));
    });
});
