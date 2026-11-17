"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7494: BUILTIN_SNIPPETS 包含 taskbounce 任务弹跳与 boldaccent 粗体柔光", () => {
    const taskbounce = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskbounce");
    assert.ok(taskbounce, "必须包含 swss-builtin-taskbounce 片段");
    assert.equal(taskbounce.category, "list");
    assert.equal(taskbounce.type, "css");
    assert.ok(taskbounce.content.includes("data-subtype=\"t\""));
    assert.ok(taskbounce.content.includes(".protyle-action:active"));
    assert.ok(taskbounce.content.includes("scale(0.85)"));

    const boldaccent = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-boldaccent");
    assert.ok(boldaccent, "必须包含 swss-builtin-boldaccent 片段");
    assert.equal(boldaccent.category, "typography");
    assert.equal(boldaccent.type, "css");
    assert.ok(boldaccent.content.includes("data-type=\"strong\""));
    assert.ok(boldaccent.content.includes("var(--b3-theme-primary"));
});

test("T-7494: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinTaskbounceName",
        "snippetBuiltinTaskbounceDescription",
        "snippetBuiltinBoldaccentName",
        "snippetBuiltinBoldaccentDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7494: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-taskbounce", "swss-builtin-boldaccent"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});
