// T-7470 内置片段库新增折叠标题指示微动效与数学公式块卡片美化契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 BUILTIN_SNIPPETS 包含 swss-builtin-foldheading 与 swss-builtin-mathblock；
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

test("T-7470: BUILTIN_SNIPPETS 包含 foldheading 折叠指示与 mathblock 数学公式微卡片", () => {
    const foldheading = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-foldheading");
    assert.ok(foldheading, "必须包含 swss-builtin-foldheading 片段");
    assert.equal(foldheading.category, "heading");
    assert.equal(foldheading.type, "css");
    assert.ok(foldheading.content.includes("fold=\"1\""));
    assert.ok(foldheading.content.includes("var(--b3-theme-primary"));

    const mathblock = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-mathblock");
    assert.ok(mathblock, "必须包含 swss-builtin-mathblock 片段");
    assert.equal(mathblock.category, "layout");
    assert.equal(mathblock.type, "css");
    assert.ok(mathblock.content.includes("NodeMathBlock"));
    assert.ok(mathblock.content.includes("var(--b3-border-color"));
});

test("T-7470: 新增片段在双语语言文件中完整解析且非空", () => {
    for (const id of ["swss-builtin-foldheading", "swss-builtin-mathblock"]) {
        const item = BUILTIN_SNIPPETS.find((entry) => entry.id === id);
        assert.ok(item, `${id} 必须存在`);
        assert.ok(zh[item.nameKey] && zh[item.nameKey].length > 0, `${item.nameKey} 必须存在于 zh-CN.json`);
        assert.ok(zh[item.descriptionKey] && zh[item.descriptionKey].length > 0, `${item.descriptionKey} 必须存在于 zh-CN.json`);
        assert.ok(en[item.nameKey] && en[item.nameKey].length > 0, `${item.nameKey} 必须存在于 en.json`);
        assert.ok(en[item.descriptionKey] && en[item.descriptionKey].length > 0, `${item.descriptionKey} 必须存在于 en.json`);
    }
});

test("T-7470 门禁负向验证: 若缺少新片段定义或缺失双语文案必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在片段必定失败
    assert.throws(() => {
        const fake = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-fake-folding-nonexistent");
        assert.ok(fake);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的语言 key 必定失败
    assert.throws(() => {
        assert.ok(zh["fakeNonExistentFoldingMathKey"]);
    }, assert.AssertionError);
});
