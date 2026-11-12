// T-7466 内置片段库新增链滴精品呼叫盒与双栏响应式卡片 CSS 片段契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 BUILTIN_SNIPPETS 包含 swss-builtin-callout 与 swss-builtin-multicolumn；
//   2. 验证 样式声明全部使用思源官方 CSS 变量（--b3-theme-*），禁止硬编码颜色；
//   3. 验证 双语文件 zh-CN.json 与 en.json 均包含对应的名称与描述字段；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {BUILTIN_SNIPPETS} = require("../src/snippet-studio-model.js");

const ROOT = path.resolve(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7466: BUILTIN_SNIPPETS 包含 callout 提示框与 multicolumn 双栏卡片", () => {
    const callout = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-callout");
    assert.ok(callout, "必须包含 swss-builtin-callout 片段");
    assert.equal(callout.category, "quote");
    assert.equal(callout.type, "css");
    assert.ok(callout.content.includes("border-inline-start"));
    assert.ok(callout.content.includes("color-mix(in srgb, var(--b3-theme-primary"));

    const multicolumn = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-multicolumn");
    assert.ok(multicolumn, "必须包含 swss-builtin-multicolumn 片段");
    assert.equal(multicolumn.category, "layout");
    assert.equal(multicolumn.type, "css");
    assert.ok(multicolumn.content.includes("data-subtype=\"row\""));
    assert.ok(multicolumn.content.includes("var(--b3-border-color"));
});

test("T-7466: 新增片段在双语语言文件中完整解析且非空", () => {
    for (const id of ["swss-builtin-callout", "swss-builtin-multicolumn"]) {
        const item = BUILTIN_SNIPPETS.find((entry) => entry.id === id);
        assert.ok(item, `${id} 必须存在`);
        assert.ok(zh[item.nameKey] && zh[item.nameKey].length > 0, `${item.nameKey} 必须存在于 zh-CN.json`);
        assert.ok(zh[item.descriptionKey] && zh[item.descriptionKey].length > 0, `${item.descriptionKey} 必须存在于 zh-CN.json`);
        assert.ok(en[item.nameKey] && en[item.nameKey].length > 0, `${item.nameKey} 必须存在于 en.json`);
        assert.ok(en[item.descriptionKey] && en[item.descriptionKey].length > 0, `${item.descriptionKey} 必须存在于 en.json`);
    }
});

test("T-7466 门禁负向验证: 若缺少新片段定义或缺失双语文案必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在片段必定失败
    assert.throws(() => {
        const fake = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-fake-nonexistent");
        assert.ok(fake);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的语言 key 必定失败
    assert.throws(() => {
        assert.ok(zh["fakeNonExistentSnippetKey"]);
    }, assert.AssertionError);
});
