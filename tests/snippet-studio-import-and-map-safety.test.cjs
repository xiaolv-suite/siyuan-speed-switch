// T-7565 Snippet Studio 动态导入失败自愈与 loadUpdatedMap 异步安全闭环契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 与 index.js 在动态导入 snippet-studio-ui 时声明 .catch 异常防御；
//   2. 验证 catch 分支包含 dialog.destroy() 自愈机制；
//   3. 验证 index.ts 与 index.js 中的 loadUpdatedMap 异步调用均完整链接 .catch 处理；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7565: index.ts 与 index.js 声明 snippet-studio-ui 动态导入 catch 自愈分支", () => {
    // TS 文件
    assert.match(
        indexTs,
        /\.catch\(\(error\)\s*=>\s*\{[\s\S]*?logger\.warn\("snippet studio import failed", error\);[\s\S]*?dialog\.destroy\(\);/,
        "TS 文件必须包含动态导入 catch 异常捕获与 dialog.destroy 自愈",
    );
    // JS 文件
    assert.match(
        indexJs,
        /\.catch\(\(error\)\s*=>\s*\{[\s\S]*?logger_1\.logger\.warn\("snippet studio import failed", error\);[\s\S]*?dialog\.destroy\(\);/,
        "JS 文件必须包含动态导入 catch 异常捕获与 dialog.destroy 自愈",
    );
});

test("T-7565: index.ts 与 index.js 中所有 loadUpdatedMap 调用必须链接 catch 防护", () => {
    assert.match(indexTs, /this\.loadUpdatedMap\(tabs\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger\.warn\("loadUpdatedMap initial failed"/);
    assert.match(indexTs, /this\.loadUpdatedMap\(getAllTabs\(\)\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger\.warn\("loadUpdatedMap on sort change failed"/);
    assert.match(indexTs, /this\.loadUpdatedMap\(tabs\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger\.warn\("loadUpdatedMap on createdMonth failed"/);
    assert.match(indexTs, /this\.loadUpdatedMap\(this\.getMobileTabs\(\)\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger\.warn\("loadUpdatedMap on mobile failed"/);
    assert.match(indexTs, /this\.loadUpdatedMap\(tabs\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger\.warn\("loadUpdatedMap on sidebar failed"/);

    assert.match(indexJs, /this\.loadUpdatedMap\(tabs\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger_1\.logger\.warn\("loadUpdatedMap initial failed"/);
    assert.match(indexJs, /this\.loadUpdatedMap\(\(0,\s*siyuan_1\.getAllTabs\)\(\)\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger_1\.logger\.warn\("loadUpdatedMap on sort change failed"/);
    assert.match(indexJs, /this\.loadUpdatedMap\(tabs\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger_1\.logger\.warn\("loadUpdatedMap on createdMonth failed"/);
    assert.match(indexJs, /this\.loadUpdatedMap\(this\.getMobileTabs\(\)\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger_1\.logger\.warn\("loadUpdatedMap on mobile failed"/);
    assert.match(indexJs, /this\.loadUpdatedMap\(tabs\)\.then[\s\S]*?\.catch\(\(err\)\s*=>\s*logger_1\.logger\.warn\("loadUpdatedMap on sidebar failed"/);
});

test("T-7565 门禁负向验证: 若动态导入缺少 catch 或裸写 loadUpdatedMap 必被拦截", () => {
    const fakeTs = indexTs.replace(/logger\.warn\("snippet studio import failed", error\);/, "/* removed */");
    assert.doesNotMatch(fakeTs, /logger\.warn\("snippet studio import failed", error\);/);

    assert.throws(() => {
        assert.match(indexTs, /this\.loadUpdatedMap\(tabs\)\.then\(\(map\)\s*=>\s*\{[\s\S]*?\}\);\s*\/\/\s*no-catch/);
    }, assert.AssertionError);
});
