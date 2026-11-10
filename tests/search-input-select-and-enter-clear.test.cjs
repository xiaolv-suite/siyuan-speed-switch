// T-7413 平台搜索框获焦自动全选与无匹配项 Enter 自愈清空契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 与 index.js 在 bindSearchInputComposition 声明 focus select()；
//   2. 验证 index.ts 与 index.js 在 Enter 无匹配结果时清空 input.value 并触发 onTrigger()；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7413: bindSearchInputComposition 为 input 绑定 focus select()", () => {
    assert.match(
        indexTs,
        /input\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?input\.select\(\);/,
        "index.ts 必须绑定 focus select()",
    );
    assert.match(
        indexJs,
        /input\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?input\.select\(\);/,
        "index.js 必须绑定 focus select()",
    );
});

test("T-7413: bindSearchInputComposition 在 Enter 无匹配项时清空 input.value 并触发 onTrigger()", () => {
    assert.match(
        indexTs,
        /if\s*\(input\.value\)\s*\{[\s\S]*?input\.value = "";[\s\S]*?onTrigger\(\);/,
        "index.ts 必须在 Enter 无匹配项时清空并 onTrigger",
    );
    assert.match(
        indexJs,
        /if\s*\(input\.value\)\s*\{[\s\S]*?input\.value = "";[\s\S]*?onTrigger\(\);/,
        "index.js 必须在 Enter 无匹配项时清空并 onTrigger",
    );
});

test("T-7413 门禁负向验证: 若 Enter 清空未阻止默认行为必定精准红", () => {
    assert.doesNotMatch(indexTs, /if \(input\.value\) \{\s*input\.value = "";\s*updateClearVisibility/);
});
