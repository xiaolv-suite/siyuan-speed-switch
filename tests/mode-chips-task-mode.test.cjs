// T-7436 多模态搜索模式 Chips 栏接入「待办模式」契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 在 setupSearchModeChips 包含 task 模式声明；
//   2. 验证 index.ts 支持 - / － / task: / task： / [ ] 前缀识别；
//   3. 验证 currentPrefixMatch 包含待办前缀剥除；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));

test("T-7436: index.ts 声明 task 待办模式与前缀识别", () => {
    assert.match(
        indexTs,
        /\{key:\s*"task",\s*prefix:\s*"-",\s*label:\s*"- "\s*\+\s*\(this\.i18n\.searchModeTask \|\| "待办"\),\s*icon:\s*"iconCheck"/,
        "必须声明 task 待办药丸",
    );
    assert.match(
        indexTs,
        /else if \(val\.startsWith\("-"\) \|\| val\.startsWith\("－"\) \|\| val\.startsWith\("task:"\) \|\| val\.startsWith\("task："\) \|\| val\.startsWith\("\[ \]"\)\) matchedPrefix = "-";/,
        "必须支持 -、－、task:、task：、[ ] 前缀识别",
    );
});

test("T-7436: index.ts 包含多字符前缀安全剥除", () => {
    assert.ok(
        indexTs.includes("rawVal.match(/^(@|＠|\\^|＾|#|＃|!|！|\\*|＊|>|》|\\?|？|:|：|-|－|task:|task：|\\[ \\])/)"),
        "前缀剥除正则必须完整包含待办前缀",
    );
});

test("T-7436 门禁负向验证: 若缺失 task: 前缀识别必定精准红", () => {
    assert.match(indexTs, /val\.startsWith\("task:"\)/);
});
