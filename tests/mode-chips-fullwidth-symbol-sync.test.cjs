// T-7403 多模态搜索模式 Chips 栏全角符号识别与切换防重叠契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 中 setupSearchModeChips 支持全角 ＠ ＃ ＾ ＊ 识别；
//   2. 验证 index.ts 中 currentPrefixMatch 正则覆盖全角前缀，防止双前缀污染；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));

test("T-7403: setupSearchModeChips 包含全角符号识别", () => {
    assert.match(
        indexTs,
        /val\.startsWith\("@"\)\s*\|\|\s*val\.startsWith\("＠"\)/,
        "大纲模式必须支持全角 ＠",
    );
    assert.match(
        indexTs,
        /val\.startsWith\("#"\)\s*\|\|\s*val\.startsWith\("＃"\)/,
        "标签模式必须支持全角 ＃",
    );
    assert.match(
        indexTs,
        /val\.startsWith\("\^"\)\s*\|\|\s*val\.startsWith\("＾"\)/,
        "正文块模式必须支持全角 ＾",
    );
    assert.match(
        indexTs,
        /val\.startsWith\("\*"\)\s*\|\|\s*val\.startsWith\("＊"\)/,
        "书签模式必须支持全角 ＊",
    );
});

test("T-7403: currentPrefixMatch 包含全角前缀字符剥除", () => {
    assert.ok(
        indexTs.includes('const currentPrefixMatch = rawVal.match(/^(@|＠|\\^|＾|#|＃|!|！|\\*|＊|>|》|\\?|？|:|：|-|－|task:|task：|\\[ \\])/);'),
        "必须完整包含全角字符集以防止切换时双前缀叠加",
    );
});

test("T-7403 门禁负向验证: 若仅包含半角字符必定精准红", () => {
    // 探针 1: 负向断言旧的仅半角正则必定不存在
    assert.doesNotMatch(indexTs, /rawVal\.match\(\/\^\[@\^#!>\?？》！:：\]\/\)/);
});
