// T-7566 全表面活动弹窗统一追踪与插件卸载 onunload 无损清理契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 与 index.js 在 onunload 时集中清理活动弹窗与 .sw-platform-dialog 孤儿节点；
//   2. 验证 onunload 中消除了重复调用 mobileSwitcherDialog 的历史笔误；
//   3. 验证 mountPlatformDialogTitleWrap 统一为弹窗注入 .sw-platform-dialog 标记、role="dialog" 与 aria-modal；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));
const platformDomJs = readSourceText(path.join(root, "src", "platform-dom.js"));

test("T-7566: index.ts 与 index.js 在 onunload 清理活动弹窗与 .sw-platform-dialog", () => {
    // TS onunload
    assert.match(
        indexTs,
        /async onunload\(\)\s*\{[\s\S]*?this\.activeDialogs\.forEach\([\s\S]*?this\.settingsDialog\?\.destroy\(\);[\s\S]*?document\.querySelectorAll<HTMLElement>\("\.sw-platform-dialog"\)\.forEach\(/,
        "TS 文件 onunload 必须包含 activeDialogs 遍历销毁与 DOM 残留清理",
    );

    // JS onunload
    assert.match(
        indexJs,
        /async onunload\(\)\s*\{[\s\S]*?this\.activeDialogs\.forEach\([\s\S]*?this\.settingsDialog[\s\S]*?document\.querySelectorAll\("\.sw-platform-dialog"\)\.forEach\(/,
        "JS 文件 onunload 必须包含 activeDialogs 遍历销毁与 DOM 残留清理",
    );
});

test("T-7566: onunload 中必须彻底消除 mobileSwitcherDialog 连续双调用的历史冗余", () => {
    // TS
    const tsOnunloadMatch = indexTs.match(/async onunload\(\)[\s\S]*?\n    \}/);
    assert.ok(tsOnunloadMatch, "必须匹配到 TS onunload 函数体");
    const tsCount = (tsOnunloadMatch[0].match(/this\.mobileSwitcherDialog\?\.destroy\(\);/g) || []).length;
    assert.equal(tsCount, 1, `TS onunload 中 mobileSwitcherDialog.destroy 只能被调用 1 次，实测 ${tsCount}`);

    // JS
    const jsOnunloadMatch = indexJs.match(/async onunload\(\)[\s\S]*?\n    \}/);
    assert.ok(jsOnunloadMatch, "必须匹配到 JS onunload 函数体");
    const jsCount = (jsOnunloadMatch[0].match(/this\.mobileSwitcherDialog\?\.destroy\(\);/g) || []).length;
    assert.equal(jsCount, 1, `JS onunload 中 mobileSwitcherDialog 只能被销毁 1 次，实测 ${jsCount}`);
});

test("T-7566: mountPlatformDialogTitleWrap 统一注入 sw-platform-dialog、role、aria-modal 与 svg aria-hidden", () => {
    assert.match(
        platformDomJs,
        /container\.classList\.add\("sw-platform-dialog"\);[\s\S]*?container\.setAttribute\("role", "dialog"\);[\s\S]*?container\.setAttribute\("aria-modal", "true"\);/,
        "platform-dom.js 必须为弹窗容器注入 sw-platform-dialog 与标准 ARIA 属性",
    );
    assert.match(
        platformDomJs,
        /<svg aria-hidden="true">/,
        "标题栏图标必须包含 aria-hidden=true 避免读屏无意义播报",
    );
});

test("T-7566 门禁负向验证: 若 onunload 残留双调用或缺少 .sw-platform-dialog 兜底必被拦截", () => {
    assert.throws(() => {
        assert.match(
            indexTs,
            /this\.mobileSwitcherDialog\?\.destroy\(\);[\s\S]*?this\.mobileSwitcherDialog = null;[\s\S]*?this\.mobileSwitcherDialog\?\.destroy\(\);/,
        );
    }, assert.AssertionError);

    const fakeDom = platformDomJs.replace(/container\.classList\.add\("sw-platform-dialog"\);/, "/* removed */");
    assert.doesNotMatch(fakeDom, /container\.classList\.add\("sw-platform-dialog"\);/);
});
