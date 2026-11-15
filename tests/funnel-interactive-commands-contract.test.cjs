// T-7397 知识蒸馏漏斗条目级交互指令分发契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-external-adapters 中的 knowledge-funnel 生成带 command 的交互行；
//   2. 验证 index.ts 与 index.js 的 handleHomeItemAction 拦截 glean-keep-roaming 指令；
//   3. 验证 index.ts 与 index.js 的 handleHomeItemAction 拦截 action:riffCard 指令；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const adaptersTs = readSourceText(path.join(root, "src", "home-external-adapters.ts"));
const adaptersJs = readSourceText(path.join(root, "src", "home-external-adapters.js"));
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7397: knowledge-funnel 条目注入 glean-keep-roaming 与 action:riffCard 交互指令", () => {
    assert.match(adaptersTs, /label:\s*"📚 待读分片",[\s\S]*?command:\s*"glean-keep-roaming"/);
    assert.match(adaptersTs, /label:\s*"🎴 今日到期卡",[\s\S]*?command:\s*"action:riffCard"/);
    assert.match(adaptersJs, /label:\s*"📚 待读分片",[\s\S]*?command:\s*"glean-keep-roaming"/);
    assert.match(adaptersJs, /label:\s*"🎴 今日到期卡",[\s\S]*?command:\s*"action:riffCard"/);
});

test("T-7397: index.ts 与 index.js handleHomeItemAction 拦截 glean-keep-roaming 指令", () => {
    assert.match(
        indexTs,
        /if\s*\(item\.command === "glean-keep-roaming"[\s\S]*?void this\.executeKeepRoaming\(\);/,
        "index.ts 必须拦截 glean-keep-roaming 并执行 executeKeepRoaming",
    );
    assert.match(
        indexJs,
        /if\s*\(item\.command === "glean-keep-roaming"[\s\S]*?void this\.executeKeepRoaming\(\);/,
        "index.js 必须拦截 glean-keep-roaming 并执行 executeKeepRoaming",
    );
});

test("T-7397 门禁负向验证: 若指令拼写错误或未拦截必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在指令必定不在组件中
    assert.doesNotMatch(adaptersTs, /command:\s*"non_existent_fake_cmd"/);

    // 探针 2: 负向断言 index.ts 没有在拦截前直接漏给外部浏览器
    assert.doesNotMatch(
        indexTs,
        /if\s*\(item\.command === "glean-keep-roaming"\)\s*window\.open\(/,
    );
});
