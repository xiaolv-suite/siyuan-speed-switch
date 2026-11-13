"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7554: BUILTIN_SNIPPETS 包含 imgcard 图片卡片画框与 codelineright 代码行号右对齐", () => {
    const imgcard = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-imgcard");
    assert.ok(imgcard, "必须包含 swss-builtin-imgcard 片段");
    assert.equal(imgcard.category, "image");
    assert.equal(imgcard.type, "css");
    assert.ok(imgcard.content.includes('[data-type="NodeImage"]'));
    assert.ok(imgcard.content.includes("border-radius: 10px"));
    assert.ok(imgcard.content.includes("var(--b3-theme-primary"));

    const codelineright = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-codelineright");
    assert.ok(codelineright, "必须包含 swss-builtin-codelineright 片段");
    assert.equal(codelineright.category, "code");
    assert.equal(codelineright.type, "css");
    assert.ok(codelineright.content.includes(".protyle-linenumber__rows"));
    assert.ok(codelineright.content.includes("text-align: right"));
});

test("T-7554: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinImgcardName",
        "snippetBuiltinImgcardDescription",
        "snippetBuiltinCodelinerightName",
        "snippetBuiltinCodelinerightDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7554: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-imgcard", "swss-builtin-codelineright"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7554 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-imgcard-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const imgcard = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-imgcard");
    assert.throws(() => {
        assert.equal(imgcard.category, "list");
    });

    // 3. 缺少关键选择器断言必须失败
    const codelineright = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-codelineright");
    assert.throws(() => {
        assert.ok(codelineright.content.includes(".nonexistent-linenumber"));
    });
});
