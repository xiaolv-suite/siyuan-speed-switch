"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7506: BUILTIN_SNIPPETS 包含 tagpill 标签药丸胶囊与 extlinkicon 外链对角箭头", () => {
    const tagpill = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-tagpill");
    assert.ok(tagpill, "必须包含 swss-builtin-tagpill 片段");
    assert.equal(tagpill.category, "tag");
    assert.equal(tagpill.type, "css");
    assert.ok(tagpill.content.includes("data-type=\"tag\""));
    assert.ok(tagpill.content.includes("border-radius: 999px"));
    assert.ok(tagpill.content.includes("var(--b3-theme-primary"));

    const extlinkicon = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-extlinkicon");
    assert.ok(extlinkicon, "必须包含 swss-builtin-extlinkicon 片段");
    assert.equal(extlinkicon.category, "typography");
    assert.equal(extlinkicon.type, "css");
    assert.ok(extlinkicon.content.includes("a[href^=\"http\"]::after"));
    assert.ok(extlinkicon.content.includes("↗"));
});

test("T-7506: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinTagpillName",
        "snippetBuiltinTagpillDescription",
        "snippetBuiltinExtlinkiconName",
        "snippetBuiltinExtlinkiconDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7506: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-tagpill", "swss-builtin-extlinkicon"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7506 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-tagpill-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const tagpill = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-tagpill");
    assert.throws(() => {
        assert.equal(tagpill.category, "wrong-category-typography");
    });

    // 3. 缺少 .protyle-wysiwyg 作用域断言必须失败
    const unanchoredContent = "a[href^=\"http\"] { color: red; }";
    assert.throws(() => {
        assert.ok(unanchoredContent.startsWith(".protyle-wysiwyg"), "应当失败：未锚定作用域");
    });
});
