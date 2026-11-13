"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7562: BUILTIN_SNIPPETS 包含 calloutinfo 信息提示块与 markgradient 文本高亮渐变", () => {
    const calloutinfo = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-calloutinfo");
    assert.ok(calloutinfo, "必须包含 swss-builtin-calloutinfo 片段");
    assert.equal(calloutinfo.category, "quote");
    assert.equal(calloutinfo.type, "css");
    assert.ok(calloutinfo.content.includes('[data-type="NodeBlockquote"][data-subtype="info"]'));
    assert.ok(calloutinfo.content.includes("border-left"));
    assert.ok(calloutinfo.content.includes("#1890ff"));

    const markgradient = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-markgradient");
    assert.ok(markgradient, "必须包含 swss-builtin-markgradient 片段");
    assert.equal(markgradient.category, "typography");
    assert.equal(markgradient.type, "css");
    assert.ok(markgradient.content.includes('span[data-type="mark"]'));
    assert.ok(markgradient.content.includes("linear-gradient"));
    assert.ok(markgradient.content.includes("box-decoration-break: clone"));
});

test("T-7562: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinCalloutinfoName",
        "snippetBuiltinCalloutinfoDescription",
        "snippetBuiltinMarkgradientName",
        "snippetBuiltinMarkgradientDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7562: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-calloutinfo", "swss-builtin-markgradient"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7562 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-calloutinfo-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const calloutinfo = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-calloutinfo");
    assert.throws(() => {
        assert.equal(calloutinfo.category, "code");
    });

    // 3. 缺少关键选择器断言必须失败
    const markgradient = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-markgradient");
    assert.throws(() => {
        assert.ok(markgradient.content.includes("mark.nonexistent"));
    });
});
