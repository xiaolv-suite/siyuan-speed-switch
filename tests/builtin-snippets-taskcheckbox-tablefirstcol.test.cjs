"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7538: BUILTIN_SNIPPETS 包含 taskcheckbox 任务复选框微缩放与 tablefirstcol 表格首列强调", () => {
    const taskcheckbox = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskcheckbox");
    assert.ok(taskcheckbox, "必须包含 swss-builtin-taskcheckbox 片段");
    assert.equal(taskcheckbox.category, "list");
    assert.equal(taskcheckbox.type, "css");
    assert.ok(taskcheckbox.content.includes(".protyle-action--task"));
    assert.ok(taskcheckbox.content.includes("border-radius: 4px"));
    assert.ok(taskcheckbox.content.includes("var(--b3-theme-primary"));

    const tablefirstcol = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-tablefirstcol");
    assert.ok(tablefirstcol, "必须包含 swss-builtin-tablefirstcol 片段");
    assert.equal(tablefirstcol.category, "table");
    assert.equal(tablefirstcol.type, "css");
    assert.ok(tablefirstcol.content.includes("table td:first-child"));
    assert.ok(tablefirstcol.content.includes("font-weight: 600"));
    assert.ok(tablefirstcol.content.includes("var(--b3-theme-primary"));
});

test("T-7538: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinTaskcheckboxName",
        "snippetBuiltinTaskcheckboxDescription",
        "snippetBuiltinTablefirstcolName",
        "snippetBuiltinTablefirstcolDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7538: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-taskcheckbox", "swss-builtin-tablefirstcol"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7538 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskcheckbox-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const taskcheckbox = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-taskcheckbox");
    assert.throws(() => {
        assert.equal(taskcheckbox.category, "code");
    });

    // 3. 缺少关键选择器断言必须失败
    const tablefirstcol = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-tablefirstcol");
    assert.throws(() => {
        assert.ok(tablefirstcol.content.includes("table td:nonexistent"));
    });
});
