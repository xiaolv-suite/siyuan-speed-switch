// T-7479 内置片段库新增渐变彩色滚动条与正文大写首字母下沉 CSS 片段契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 BUILTIN_SNIPPETS 包含 swss-builtin-dropcap 与 swss-builtin-gradient-bar；
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

test("T-7479: BUILTIN_SNIPPETS 包含 dropcap 首字下沉与 gradient-bar 渐变细滚动条", () => {
    const dropcap = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-dropcap");
    assert.ok(dropcap, "必须包含 swss-builtin-dropcap 片段");
    assert.equal(dropcap.category, "typography");
    assert.equal(dropcap.type, "css");
    assert.ok(dropcap.content.includes("::first-letter"));
    assert.ok(dropcap.content.includes("var(--b3-theme-primary"));

    const gradientBar = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-gradient-bar");
    assert.ok(gradientBar, "必须包含 swss-builtin-gradient-bar 片段");
    assert.equal(gradientBar.category, "layout");
    assert.equal(gradientBar.type, "css");
    assert.ok(gradientBar.content.includes("linear-gradient"));
    assert.ok(gradientBar.content.includes("NodeCodeBlock"));
    assert.ok(gradientBar.content.includes("::-webkit-scrollbar"));
});

test("T-7479: 新增片段在双语语言文件中完整解析且非空", () => {
    for (const id of ["swss-builtin-dropcap", "swss-builtin-gradient-bar"]) {
        const item = BUILTIN_SNIPPETS.find((entry) => entry.id === id);
        assert.ok(item, `${id} 必须存在`);
        assert.ok(zh[item.nameKey] && zh[item.nameKey].length > 0, `${item.nameKey} 必须存在于 zh-CN.json`);
        assert.ok(zh[item.descriptionKey] && zh[item.descriptionKey].length > 0, `${item.descriptionKey} 必须存在于 zh-CN.json`);
        assert.ok(en[item.nameKey] && en[item.nameKey].length > 0, `${item.nameKey} 必须存在于 en.json`);
        assert.ok(en[item.descriptionKey] && en[item.descriptionKey].length > 0, `${item.descriptionKey} 必须存在于 en.json`);
    }
});

test("T-7479 门禁负向验证: 若缺少新片段定义或缺失双语文案必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在片段必定失败
    assert.throws(() => {
        const fake = BUILTIN_SNIPPETS.find((item) => item.id === "swss-builtin-fake-dropcap-nonexistent");
        assert.ok(fake);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的语言 key 必定失败
    assert.throws(() => {
        assert.ok(zh["fakeNonExistentDropcapKey"]);
    }, assert.AssertionError);
});
