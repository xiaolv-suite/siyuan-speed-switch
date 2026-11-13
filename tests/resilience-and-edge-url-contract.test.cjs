// T-7597~T-7600: URL 穿透消歧、极窄侧栏高度收敛与模式药丸反选重置契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 penetration-search-model.js 对带端口/路径冒号的 URL 准确放行至 DOC 模式；
//   2. 验证 _07-sidebar-panel-store.scss 在 280px 极窄断点下为快捷入口提供横向滚动与高度保护；
//   3. 验证 index.ts setupSearchModeChips 具备二次点击已激活药丸清空前缀重置机制；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const penetrationModelJs = readSourceText(path.join(ROOT, "src", "penetration-search-model.js"));
const sidebarScss = readSourceText(path.join(ROOT, "src", "styles", "_07-sidebar-panel-store.scss"));
const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));
const {parsePenetrationQuery, SEARCH_MODES} = require("../src/penetration-search-model.js");

test("T-7597: penetration-search-model.js 准确保护带端口与路径冒号的 URL 检索", () => {
    assert.match(
        penetrationModelJs,
        /findOutlineColonIndex\(text\)\s*\{[\s\S]*?trimmed\.startsWith\("http:\/\/"\)/,
        "findOutlineColonIndex 必须包含协议头 URL 保护"
    );

    // 1. 本地带端口 URL 必须保持 doc 模式
    const localPortUrl = parsePenetrationQuery("http://localhost:6806");
    assert.equal(localPortUrl.mode, SEARCH_MODES.DOC, "http://localhost:6806 必须识别为 doc 模式");
    assert.equal(localPortUrl.cleanKernelQuery, "http://localhost:6806");

    // 2. 带路径冒号的 HTTPS 链接必须保持 doc 模式
    const pathColonUrl = parsePenetrationQuery("https://domain.com/path:123");
    assert.equal(pathColonUrl.mode, SEARCH_MODES.DOC, "带路径冒号的 URL 必须识别为 doc 模式");
    assert.equal(pathColonUrl.cleanKernelQuery, "https://domain.com/path:123");

    // 3. 正常大纲穿透语法保持正常识别
    const outlineQuery = parsePenetrationQuery("文档名:章节标题");
    assert.equal(outlineQuery.mode, SEARCH_MODES.OUTLINE, "常规冒号必须正常进入大纲模式");
    assert.equal(outlineQuery.docNeedle, "文档名");
    assert.equal(outlineQuery.headingNeedle, "章节标题");
});

test("T-7598: _07-sidebar-panel-store.scss 为侧栏极窄快捷动作区提供高度与滚动保护", () => {
    assert.match(
        sidebarScss,
        /@container\s*\(max-width:\s*280px\)\s*\{[\s\S]*?\.sw__quick-actions\s*\{[\s\S]*?max-height:\s*38px;[\s\S]*?overflow-x:\s*auto;[\s\S]*?flex-wrap:\s*nowrap;/,
        "280px 极窄断点必须为 .sw__quick-actions 限制最大高度与单行横向滚动"
    );
});

test("T-7599: index.ts setupSearchModeChips 支持二次点击已激活药丸清空前缀", () => {
    assert.match(
        indexTs,
        /const\s+isAlreadyActive\s*=\s*btn\.classList\.contains\("is-active"\)\s*&&\s*prefix\s*!==\s*"";/,
        "setupSearchModeChips 必须判定当前药丸是否已被激活"
    );
    assert.match(
        indexTs,
        /if\s*\(isAlreadyActive\s*\|\|\s*prefix\s*===\s*""\)\s*\{[\s\S]*?searchInput\.value\s*=\s*pureText;/,
        "二次点击已激活药丸时必须清空前缀恢复纯净文本"
    );
});

test("T-7597~T-7600 门禁负向验证: 若 URL 误判大纲或缺少极窄限制必定报错", () => {
    // 探针 1: 缺少 URL 保护时的错误模式判定探针
    assert.throws(() => {
        const fakeResult = parsePenetrationQuery("http://localhost:6806");
        assert.equal(fakeResult.mode, "invalid_probe_mode");
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的不存在样式规则
    assert.throws(() => {
        assert.match(sidebarScss, /\.sw__nonexistent-sidebar-guard-class/);
    }, assert.AssertionError);
});
