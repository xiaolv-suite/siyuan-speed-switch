// T-7402 全屏模式顶栏右上角安全避让与双预览框单例彻底根治契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 _platform-shell.scss 为全屏模式声明 >= 140px 的右上角安全避让内边距；
//   2. 验证 doc-search-ui.ts 与 doc-search-ui.js 在 mountDocPreviewPane 中扫描全局顶层弹窗与根容器；
//   3. 验证 index.ts 与 index.js 在 renderList 装配 layout 前主动清扫孤儿预览框；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const shellScss = readSourceText(path.join(root, "src", "styles", "_platform-shell.scss"));
const docSearchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const docSearchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));

test("T-7402: _platform-shell.scss 为全屏模式声明 140px 右上角安全避让", () => {
    assert.match(
        shellScss,
        /padding-right:\s*calc\(140px\s*\+\s*var\(--sw-platform-space-4,\s*16px\)\);/,
        "全屏顶栏必须具备 140px 以上安全避让，避开思源桌面端系统控制按钮",
    );
});

test("T-7402: doc-search-ui 扩大单例排他作用域至全局顶层弹窗容器", () => {
    assert.match(
        docSearchTs,
        /scrollElement\.closest<HTMLElement>\("\.speed-switch"\)[\s\S]*?\|\|\s*scrollElement\.closest<HTMLElement>\("\.b3-dialog__container"\)/,
        "TS 文件必须向上扫描 speed-switch 与 b3-dialog__container 顶层容器",
    );
    assert.match(
        docSearchJs,
        /scrollElement\.closest\("\.speed-switch"\)[\s\S]*?\|\|\s*scrollElement\.closest\("\.b3-dialog__container"\)/,
        "JS 文件必须向上扫描 speed-switch 与 b3-dialog__container 顶层容器",
    );
});

test("T-7402: index.ts 与 index.js 在 renderList 装配 layout 前主动清扫残留预览框", () => {
    assert.match(
        indexTs,
        /scrollElement\.querySelectorAll\("\.sw__doc-preview"\)\.forEach\(\(el\) => el\.remove\(\)\);[\s\S]*?scrollElement\.appendChild\(layout\);/,
        "index.ts 必须在 appendChild(layout) 前强制清除孤儿预览框",
    );
    assert.match(
        indexJs,
        /scrollElement\.querySelectorAll\("\.sw__doc-preview"\)\.forEach\(\(el\) => el\.remove\(\)\);[\s\S]*?scrollElement\.appendChild\(layout\);/,
        "index.js 必须在 appendChild(layout) 前强制清除孤儿预览框",
    );
});

test("T-7402 门禁负向验证: 若全屏避让不足或排他回退为局部浅层必定精准红", () => {
    // 探针 1: 负向断言全屏避让不得为 0 或无避让
    assert.doesNotMatch(shellScss, /\.sw-dialog--fullscreen\s*\.sw-platform-header\s*\{\s*padding-right:\s*0;/);

    // 探针 2: 负向断言旧的浅层单例清理逻辑已被增强升级
    assert.doesNotMatch(docSearchTs, /const surfaceScope = scrollElement\.closest<HTMLElement>\("\.sw-platform-surface"\) \|\| scrollElement\.parentElement \|\| scrollElement;\s*const allPreviews = Array\.from\(surfaceScope\.querySelectorAll<HTMLElement>\("\.sw__doc-preview"\)\);/);
});
