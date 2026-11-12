// T-7570 优化 clampOversizedIcons 读写交替回流与 RAF 批处理契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 util.js 中 clampOversizedIcons 拆分为纯读取收集 (Phase 1) 与纯写入应用 (Phase 2) 两个独立阶段；
//   2. 验证 home-config-form.ts 与 home-config-form.js 中的 MutationObserver 采用 requestAnimationFrame 防抖；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const utilJs = readSourceText(path.join(root, "src", "util.js"));
const formTs = readSourceText(path.join(root, "src", "home-config-form.ts"));
const formJs = readSourceText(path.join(root, "src", "home-config-form.js"));

test("T-7570: util.js 中 clampOversizedIcons 实行严格的两阶段读写分离批处理", () => {
    assert.match(
        utilJs,
        /function clampOversizedIcons\(root\)\s*\{[\s\S]*?const toFix = \[\];[\s\S]*?toFix\.push\(\{svg,\s*size\}\);[\s\S]*?for \(let i = 0; i < toFix\.length; i\+\+\)\s*\{[\s\S]*?svg\.setAttribute\("width",\s*String\(size\)\);[\s\S]*?return toFix\.length;/,
        "util.js 必须将 clampOversizedIcons 分离为读取阶段与写入阶段",
    );
});

test("T-7570: home-config-form 采用 requestAnimationFrame 防抖执行图标钳制", () => {
    // TS
    assert.match(
        formTs,
        /let iconClampFrame:\s*number \| null = null;[\s\S]*?const iconClampObserver = new MutationObserver\(\(\)\s*=>\s*\{[\s\S]*?iconClampFrame = requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*?clampOversizedIcons\(root\);/,
        "TS 文件必须通过 requestAnimationFrame 防抖执行 clampOversizedIcons",
    );

    // JS
    assert.match(
        formJs,
        /let iconClampFrame = null;[\s\S]*?const iconClampObserver = new MutationObserver\(\(\)\s*=>\s*\{[\s\S]*?iconClampFrame = requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*?clampOversizedIcons/,
        "JS 文件必须通过 requestAnimationFrame 防抖执行 clampOversizedIcons",
    );
});

test("T-7570 门禁负向验证: 若倒退为 forEach 内边读边写必定被拦截", () => {
    assert.throws(() => {
        assert.match(utilJs, /root\.querySelectorAll\("svg"\)\)\.forEach\(\(svg\)\s*=>\s*\{[\s\S]*?svg\.getBoundingClientRect\(\)[\s\S]*?svg\.setAttribute\("width"/);
    }, assert.AssertionError);
});
