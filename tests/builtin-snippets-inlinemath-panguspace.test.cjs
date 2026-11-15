"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7494: BUILTIN_SNIPPETS 包含 inlinemath 行内公式与 panguspace 盘古字距", () => {
    const inlinemath = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-inlinemath");
    assert.ok(inlinemath, "必须包含 swss-builtin-inlinemath 片段");
    assert.equal(inlinemath.category, "typography");
    assert.equal(inlinemath.type, "css");
    assert.ok(inlinemath.content.includes("data-type=\"inline-math\""));
    assert.ok(inlinemath.content.includes("var(--b3-theme-primary"));

    const panguspace = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-panguspace");
    assert.ok(panguspace, "必须包含 swss-builtin-panguspace 片段");
    assert.equal(panguspace.category, "typography");
    assert.equal(panguspace.type, "css");
    assert.ok(panguspace.content.includes("data-type=\"NodeParagraph\""));
    assert.ok(panguspace.content.includes("letter-spacing: 0.025em"));
    assert.ok(panguspace.content.includes("text-align: justify"));
});

test("T-7494: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinInlinemathName",
        "snippetBuiltinInlinemathDescription",
        "snippetBuiltinPanguspaceName",
        "snippetBuiltinPanguspaceDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7494: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-inlinemath", "swss-builtin-panguspace"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});
