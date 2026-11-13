// T-7409 切换器卡片列表 ⌘D/⌘P/⌘W 直达快捷键契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 与 index.js 声明 ⌘D 收藏/取消直接快捷键；
//   2. 验证 index.ts 与 index.js 声明 ⌘P 置顶/取消直接快捷键；
//   3. 验证 index.ts 与 index.js 声明 ⌘W 关闭卡片直接快捷键；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7409: index.ts 与 index.js 声明卡片直达快捷键 ⌘D、⌘P、⌘W", () => {
    assert.match(
        indexTs,
        /if\s*\(lowerKey === "d" && tab\)\s*\{[\s\S]*?this\.handleToggleFav\(tab, targetCard\);/,
        "index.ts 必须拦截 ⌘D 触发 handleToggleFav",
    );
    assert.match(
        indexTs,
        /if\s*\(lowerKey === "p" && tab\)\s*\{[\s\S]*?this\.handleTogglePin\(tab, targetCard\);/,
        "index.ts 必须拦截 ⌘P 触发 handleTogglePin",
    );
    assert.match(
        indexTs,
        /if\s*\(lowerKey === "w" && tab && handlers\?\.onCloseTab\)\s*\{[\s\S]*?handlers\.onCloseTab\(tab, targetCard\);/,
        "index.ts 必须拦截 ⌘W 触发 onCloseTab",
    );

    assert.match(
        indexJs,
        /if\s*\(lowerKey === "d" && tab\)\s*\{[\s\S]*?this\.handleToggleFav\(tab, targetCard\);/,
        "index.js 必须拦截 ⌘D 触发 handleToggleFav",
    );
    assert.match(
        indexJs,
        /if\s*\(lowerKey === "p" && tab\)\s*\{[\s\S]*?this\.handleTogglePin\(tab, targetCard\);/,
        "index.js 必须拦截 ⌘P 触发 handleTogglePin",
    );
    assert.match(
        indexJs,
        /if\s*\(lowerKey === "w" && tab &&[\s\S]*?handlers\.onCloseTab\(tab, targetCard\);/,
        "index.js 必须拦截 ⌘W 触发 onCloseTab",
    );
});

test("T-7409 门禁负向验证: 若缺少 stopPropagation 或未阻止默认必定精准红", () => {
    assert.doesNotMatch(indexTs, /lowerKey === "d" && tab\)\s*\{\s*this\.handleToggleFav/);
});
