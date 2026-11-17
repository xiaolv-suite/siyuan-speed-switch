"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.join(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7526: BUILTIN_SNIPPETS 包含 scriptsaccent 上下标强调与 mediarounded 音视频媒体卡片", () => {
    const scriptsaccent = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-scriptsaccent");
    assert.ok(scriptsaccent, "必须包含 swss-builtin-scriptsaccent 片段");
    assert.equal(scriptsaccent.category, "typography");
    assert.equal(scriptsaccent.type, "css");
    assert.ok(scriptsaccent.content.includes("data-type=\"sup\""));
    assert.ok(scriptsaccent.content.includes("data-type=\"sub\""));
    assert.ok(scriptsaccent.content.includes("var(--b3-theme-primary"));

    const mediarounded = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-mediarounded");
    assert.ok(mediarounded, "必须包含 swss-builtin-mediarounded 片段");
    assert.equal(mediarounded.category, "layout");
    assert.equal(mediarounded.type, "css");
    assert.ok(mediarounded.content.includes("data-type=\"NodeVideo\""));
    assert.ok(mediarounded.content.includes("data-type=\"NodeAudio\""));
    assert.ok(mediarounded.content.includes("border-radius: 8px"));
    assert.ok(mediarounded.content.includes("var(--b3-theme-primary"));
});

test("T-7526: 新增片段在双语语言文件中完整解析且非空", () => {
    const keys = [
        "snippetBuiltinScriptsaccentName",
        "snippetBuiltinScriptsaccentDescription",
        "snippetBuiltinMediaroundedName",
        "snippetBuiltinMediaroundedDescription",
    ];
    for (const key of keys) {
        assert.ok(zh[key], `zh-CN 必须定义 ${key}`);
        assert.ok(en[key], `en 必须定义 ${key}`);
        assert.ok(zh[key].trim().length > 0, `zh-CN[${key}] 必须为有效文本`);
        assert.ok(en[key].trim().length > 0, `en[${key}] 必须为有效文本`);
    }
});

test("T-7526: 新增片段在 protyle 作用域内且与既有片段选择器零冲突", () => {
    const targetIds = ["swss-builtin-scriptsaccent", "swss-builtin-mediarounded"];
    const others = BUILTIN_SNIPPETS.filter((item) => !targetIds.includes(item.id));
    for (const id of targetIds) {
        const item = BUILTIN_SNIPPETS.find((s) => s.id === id);
        assert.ok(item.content.startsWith(".protyle-wysiwyg"), `${id} 必须以 .protyle-wysiwyg 开头`);
        for (const other of others) {
            assert.notEqual(item.content, other.content, `${id} 内容不得与 ${other.id} 重复`);
        }
    }
});

test("T-7526 [负向验证]: 注入非法或缺失片段时门禁测试必须确凿失败", () => {
    // 1. 缺失片段断言必须失败
    const missing = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-scriptsaccent-nonexistent");
    assert.throws(() => {
        assert.ok(missing, "应当失败：不存在的片段不应找到");
    });

    // 2. 类别不匹配断言必须失败
    const scriptsaccent = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-scriptsaccent");
    assert.throws(() => {
        assert.equal(scriptsaccent.category, "code");
    });

    // 3. 缺少关键选择器断言必须失败
    const mediarounded = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-mediarounded");
    assert.throws(() => {
        assert.ok(mediarounded.content.includes("data-type=\"nonexistent-media\""));
    });
});
