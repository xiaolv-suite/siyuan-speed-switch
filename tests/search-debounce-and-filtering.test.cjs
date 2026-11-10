// T-7571 文档预览查找框、组件商店与片段库实时过滤输入防抖加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 doc-search-ui.ts 与 doc-search-ui.js 为文档查找框输入实现防抖；
//   2. 验证 home-store-ui.ts 与 home-store-ui.js 为组件商店输入过滤实现防抖；
//   3. 验证 snippet-studio-ui.js 为代码片段库与目录搜索实现防抖；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const docSearchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const docSearchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));
const homeStoreTs = readSourceText(path.join(root, "src", "home-store-ui.ts"));
const homeStoreJs = readSourceText(path.join(root, "src", "home-store-ui.js"));
const studioUiJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7571: doc-search-ui 实现文档预览查找输入防抖", () => {
    assert.match(
        docSearchTs,
        /let findDebounceTimer:\s*number \| null = null;[\s\S]*?findDebounceTimer = window\.setTimeout\(\(\)\s*=>\s*\{[\s\S]*?runDocPreviewFind\.call\(this,\s*pane\);[\s\S]*?120\);/,
        "TS doc-search-ui 必须包含 findDebounceTimer 防抖逻辑",
    );
    assert.match(
        docSearchJs,
        /let findDebounceTimer = null;[\s\S]*?findDebounceTimer = window\.setTimeout\(\(\)\s*=>\s*\{[\s\S]*?runDocPreviewFind\.call\(this,\s*pane\);[\s\S]*?120\);/,
        "JS doc-search-ui 必须包含 findDebounceTimer 防抖逻辑",
    );
});

test("T-7571: home-store-ui 实现组件商店输入过滤防抖", () => {
    assert.match(
        homeStoreTs,
        /let storeDebounceTimer:[\s\S]*?storeDebounceTimer = (?:window\.)?setTimeout\(\(\)\s*=>\s*\{[\s\S]*?applyFilter\(\);[\s\S]*?100\);/,
        "TS home-store-ui 必须包含 storeDebounceTimer 防抖逻辑",
    );
    assert.match(
        homeStoreJs,
        /let storeDebounceTimer = null;[\s\S]*?storeDebounceTimer = (?:window\.)?setTimeout\(\(\)\s*=>\s*\{[\s\S]*?applyFilter\(\);[\s\S]*?100\);/,
        "JS home-store-ui 必须包含 storeDebounceTimer 防抖逻辑",
    );
});

test("T-7571: snippet-studio-ui 实现代码片段库与目录搜索防抖", () => {
    assert.match(
        studioUiJs,
        /let librarySearchTimer = null;[\s\S]*?librarySearchTimer = setTimeout\(\(\)\s*=>\s*\{[\s\S]*?renderLibrary\(\);[\s\S]*?100\);/,
        "snippet-studio-ui 必须为 librarySearch 绑定防抖",
    );
    assert.match(
        studioUiJs,
        /let catalogQueryTimer = null;[\s\S]*?catalogQueryTimer = setTimeout\(\(\)\s*=>\s*\{[\s\S]*?render\(\);[\s\S]*?100\);/,
        "snippet-studio-ui 必须为 catalog picker 绑定防抖",
    );
});

test("T-7571 门禁负向验证: 若移除防抖恢复即时裸调必被拦截", () => {
    assert.throws(() => {
        assert.match(docSearchTs, /input\.addEventListener\("input",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(!alreadyCommitted\)\s*runDocPreviewFind/);
    }, assert.AssertionError);

    assert.throws(() => {
        assert.match(homeStoreTs, /root\.dataset\.query = normalizeHomeStoreQuery\(storeQuery\);\s*applyFilter\(\);/);
    }, assert.AssertionError);
});
