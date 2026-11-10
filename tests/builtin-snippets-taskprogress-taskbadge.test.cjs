"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7542: BUILTIN_SNIPPETS 包含 taskprogress 任务列表进度导轨与 taskbadge 待办项卡片", () => {
    const taskprogress = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskprogress");
    assert.ok(taskprogress, "必须包含 swss-builtin-taskprogress 片段");
    assert.equal(taskprogress.category, "list");
    assert.equal(taskprogress.type, "css");
    assert.ok(taskprogress.content.includes('[data-type="NodeList"][data-subtype="t"]'));
    assert.ok(taskprogress.content.includes("border-left"));
    assert.ok(taskprogress.content.includes("var(--b3-theme-primary"));

    const taskbadge = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskbadge");
    assert.ok(taskbadge, "必须包含 swss-builtin-taskbadge 片段");
    assert.equal(taskbadge.category, "list");
    assert.equal(taskbadge.type, "css");
    assert.ok(taskbadge.content.includes('[data-type="NodeTaskListItem"]'));
    assert.ok(taskbadge.content.includes("border-radius: 6px"));
    assert.ok(taskbadge.content.includes("var(--b3-theme-primary"));
});

test("T-7542: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinTaskprogressName",
        "snippetBuiltinTaskprogressDescription",
        "snippetBuiltinTaskbadgeName",
        "snippetBuiltinTaskbadgeDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7542: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-taskprogress", "swss-builtin-taskbadge"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7542 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskprogress-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const taskprogress = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskprogress");
    assert.throws(() => {
        assert.equal(taskprogress.category, "theme");
    });

    // 3. 缺少关键选择器断言必须失败
    const taskbadge = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskbadge");
    assert.throws(() => {
        assert.ok(taskbadge.content.includes("table td:nonexistent"));
    });
});
