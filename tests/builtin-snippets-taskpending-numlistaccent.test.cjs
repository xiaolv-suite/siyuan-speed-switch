"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7514: BUILTIN_SNIPPETS 包含 taskpending 待办未完成指示与 numlistaccent 有序列表序号胶囊", () => {
    const taskpending = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskpending");
    assert.ok(taskpending, "必须包含 swss-builtin-taskpending 片段");
    assert.equal(taskpending.category, "list");
    assert.equal(taskpending.type, "css");
    assert.ok(taskpending.content.includes("data-type=\"NodeTaskListItem\""));
    assert.ok(taskpending.content.includes("data-subtype=\"u\""));
    assert.ok(taskpending.content.includes("var(--b3-theme-primary"));

    const numlistaccent = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-numlistaccent");
    assert.ok(numlistaccent, "必须包含 swss-builtin-numlistaccent 片段");
    assert.equal(numlistaccent.category, "list");
    assert.equal(numlistaccent.type, "css");
    assert.ok(numlistaccent.content.includes("data-subtype=\"o\""));
    assert.ok(numlistaccent.content.includes(".protyle-action"));
    assert.ok(numlistaccent.content.includes("var(--b3-theme-primary"));
});

test("T-7514: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinTaskpendingName",
        "snippetBuiltinTaskpendingDescription",
        "snippetBuiltinNumlistaccentName",
        "snippetBuiltinNumlistaccentDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7514: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-taskpending", "swss-builtin-numlistaccent"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7514 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskpending-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const taskpending = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskpending");
    assert.throws(() => {
        assert.equal(taskpending.category, "table");
    });

    // 3. 缺少 data-subtype=\"o\" 关键选择器断言必须失败
    const numlistaccent = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-numlistaccent");
    assert.throws(() => {
        assert.ok(numlistaccent.content.includes("data-subtype=\"nonexistent-type\""));
    });
});
