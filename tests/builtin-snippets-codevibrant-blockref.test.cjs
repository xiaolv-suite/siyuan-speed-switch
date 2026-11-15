"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7502: BUILTIN_SNIPPETS 包含 codevibrant 代码高亮微调色与 blockrefaccent 块引用下划线", () => {
    const codevibrant = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-codevibrant");
    assert.ok(codevibrant, "必须包含 swss-builtin-codevibrant 片段");
    assert.equal(codevibrant.category, "code");
    assert.equal(codevibrant.type, "css");
    assert.ok(codevibrant.content.includes("NodeCodeBlock"));
    assert.ok(codevibrant.content.includes(".hljs-string"));
    assert.ok(codevibrant.content.includes(".hljs-number"));

    const blockref = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-blockrefaccent");
    assert.ok(blockref, "必须包含 swss-builtin-blockrefaccent 片段");
    assert.equal(blockref.category, "typography");
    assert.equal(blockref.type, "css");
    assert.ok(blockref.content.includes("data-type=\"block-ref\""));
    assert.ok(blockref.content.includes("var(--b3-theme-primary"));
});

test("T-7502: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinCodevibrantName",
        "snippetBuiltinCodevibrantDescription",
        "snippetBuiltinBlockrefaccentName",
        "snippetBuiltinBlockrefaccentDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7502: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-codevibrant", "swss-builtin-blockrefaccent"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});
