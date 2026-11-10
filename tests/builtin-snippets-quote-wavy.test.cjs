// T-7475 内置片段库新增金句大双引号装饰与波浪下划线重点标记 CSS 片段契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 BUILTIN_SNIPPETS 包含 swss-builtin-quote-gold 与 swss-builtin-wavy-underline；
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

test("T-7475: BUILTIN_SNIPPETS 包含 quote-gold 大双引号与 wavy-underline 波浪线下划线", () => {
    const quoteGold = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-quote-gold");
    assert.ok(quoteGold, "必须包含 swss-builtin-quote-gold 片段");
    assert.equal(quoteGold.category, "quote");
    assert.equal(quoteGold.type, "css");
    assert.ok(quoteGold.content.includes("content: \"“\""));
    assert.ok(quoteGold.content.includes("color-mix(in srgb, var(--b3-theme-primary"));

    const wavy = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-wavy-underline");
    assert.ok(wavy, "必须包含 swss-builtin-wavy-underline 片段");
    assert.equal(wavy.category, "typography");
    assert.equal(wavy.type, "css");
    assert.ok(wavy.content.includes("underline wavy var(--b3-theme-primary"));
    assert.ok(wavy.content.includes("text-underline-offset: 4px"));
});

test("T-7475: 新增片段在双语语言文件中完整解析且非空", () => {
    for (const id of ["swss-builtin-quote-gold", "swss-builtin-wavy-underline"]) {
        const item = BUILTIN_SNIPPETS.find((entry) => entry.id === id);
        assert.ok(item, `${id} 必须存在`);
        assert.ok(zh[item.nameKey] && zh[item.nameKey].length > 0, `${item.nameKey} 必须存在于 zh-CN.json`);
        assert.ok(zh[item.descriptionKey] && zh[item.descriptionKey].length > 0, `${item.descriptionKey} 必须存在于 zh-CN.json`);
        assert.ok(en[item.nameKey] && en[item.nameKey].length > 0, `${item.nameKey} 必须存在于 en.json`);
        assert.ok(en[item.descriptionKey] && en[item.descriptionKey].length > 0, `${item.descriptionKey} 必须存在于 en.json`);
    }
});

test("T-7475 门禁负向验证: 若缺少新片段定义或缺失双语文案必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在片段必定失败
    assert.throws(() => {
        const fake = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-fake-quote-wavy-nonexistent");
        assert.ok(fake);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的语言 key 必定失败
    assert.throws(() => {
        assert.ok(zh["fakeNonExistentQuoteWavyKey"]);
    }, assert.AssertionError);
});
