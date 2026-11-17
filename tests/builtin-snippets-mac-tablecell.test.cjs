"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7486: BUILTIN_SNIPPETS 包含 codemac 终端控制点与 tablecell 单元格微高亮", () => {
    const codemac = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-codemac");
    assert.ok(codemac, "必须包含 swss-builtin-codemac 片段");
    assert.equal(codemac.category, "code");
    assert.equal(codemac.type, "css");
    assert.ok(codemac.content.includes("NodeCodeBlock"));
    assert.ok(codemac.content.includes("::before"));
    assert.ok(codemac.content.includes("#ff5f56"));
    assert.ok(codemac.content.includes("#ffbd2e"));
    assert.ok(codemac.content.includes("#27c93f"));

    const tablecell = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-tablecell");
    assert.ok(tablecell, "必须包含 swss-builtin-tablecell 片段");
    assert.equal(tablecell.category, "table");
    assert.equal(tablecell.type, "css");
    assert.ok(tablecell.content.includes("table td:hover"));
    assert.ok(tablecell.content.includes("var(--b3-theme-primary"));
    assert.ok(tablecell.content.includes("color-mix(in srgb"));
});

test("T-7486: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinCodemacName",
        "snippetBuiltinCodemacDescription",
        "snippetBuiltinTablecellName",
        "snippetBuiltinTablecellDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7486: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-codemac", "swss-builtin-tablecell"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});
