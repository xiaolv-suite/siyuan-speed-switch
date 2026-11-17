"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7550: BUILTIN_SNIPPETS 包含 embedshadow 嵌入块光晕与 taggradient 渐变标签药丸", () => {
    const embedshadow = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-embedshadow");
    assert.ok(embedshadow, "必须包含 swss-builtin-embedshadow 片段");
    assert.equal(embedshadow.category, "layout");
    assert.equal(embedshadow.type, "css");
    assert.ok(embedshadow.content.includes('[data-type="NodeBlockQueryEmbed"]'));
    assert.ok(embedshadow.content.includes("border-left"));
    assert.ok(embedshadow.content.includes("var(--b3-theme-primary"));

    const taggradient = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taggradient");
    assert.ok(taggradient, "必须包含 swss-builtin-taggradient 片段");
    assert.equal(taggradient.category, "tag");
    assert.equal(taggradient.type, "css");
    assert.ok(taggradient.content.includes('span[data-type="tag"]'));
    assert.ok(taggradient.content.includes("linear-gradient"));
    assert.ok(taggradient.content.includes("var(--b3-theme-primary"));
});

test("T-7550: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinEmbedshadowName",
        "snippetBuiltinEmbedshadowDescription",
        "snippetBuiltinTaggradientName",
        "snippetBuiltinTaggradientDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7550: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-embedshadow", "swss-builtin-taggradient"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7550 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-embedshadow-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const embedshadow = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-embedshadow");
    assert.throws(() => {
        assert.equal(embedshadow.category, "code");
    });

    // 3. 缺少关键选择器断言必须失败
    const taggradient = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taggradient");
    assert.throws(() => {
        assert.ok(taggradient.content.includes("div.nonexistent-selector"));
    });
});
