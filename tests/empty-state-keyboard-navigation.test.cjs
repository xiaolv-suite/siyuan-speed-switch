// T-7406 切换器空态引导卡片全键盘无障碍导航契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 与 index.js 在 buildEmptyState 中声明 emptyNavTargets 键盘流；
//   2. 验证 首项在 ArrowUp 时平滑向上聚焦搜索框；
//   3. 验证 支持 Escape 快捷键平滑回焦搜索框；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7406: index.ts 与 index.js buildEmptyState 声明空态卡片键盘流", () => {
    assert.match(
        indexTs,
        /const emptyNavTargets = Array\.from\(empty\.querySelectorAll<HTMLButtonElement>\("\.sw__empty-action, \.sw__empty-syntax-chip"\)\);/,
        "index.ts 必须绑定空态操作与速查胶囊目标集合",
    );
    assert.match(
        indexJs,
        /const emptyNavTargets = Array\.from\(empty\.querySelectorAll\("\.sw__empty-action, \.sw__empty-syntax-chip"\)\);/,
        "index.js 必须绑定空态操作与速查胶囊目标集合",
    );
});

test("T-7406: 空态操作首项在 ArrowUp 时向上聚焦搜索框", () => {
    assert.match(
        indexTs,
        /if\s*\(idx === 0\)\s*\{[\s\S]*?targetSurface\?\.querySelector<HTMLInputElement>\("\.sw__search"\)\?\.focus/,
        "index.ts 必须在首项按 ArrowUp 时聚焦搜索框",
    );
    assert.match(
        indexJs,
        /if\s*\(idx === 0\)\s*\{[\s\S]*?targetSurface\?\.querySelector\("\.sw__search"\)\?\.focus/,
        "index.js 必须在首项按 ArrowUp 时聚焦搜索框",
    );
});

test("T-7406: 空态操作支持按 Escape 直接回焦搜索框", () => {
    assert.match(indexTs, /else if \(e\.key === "Escape"\) \{[\s\S]*?targetSurface\?\.querySelector/);
    assert.match(indexJs, /else if \(e\.key === "Escape"\) \{[\s\S]*?targetSurface\?\.querySelector/);
});

test("T-7406 门禁负向验证: 若缺少 idx === 0 判定导致无限死循环必定精准红", () => {
    assert.doesNotMatch(indexTs, /if \(e\.key === "ArrowUp"\) \{\s*emptyNavTargets\[0\]\.focus\(\);\s*\}/);
});
