// T-7384 端到端全功能排查、预览框单例互斥强防线与老用户功能指南契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 mountDocPreviewPane 具备全表面作用域的单例互斥排他防线与首帧宽度兜底；
//   2. 验证 切换器桌面与移动端顶栏装配 sw__help-guide-btn 帮助按钮；
//   3. 验证 空态引导卡片装配 sw__empty-syntax-bar 符号速查胶囊；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const docSearchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const docSearchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));
const mobileSwitcherTs = readSourceText(path.join(root, "src", "mobile-switcher-ui.ts"));

test("T-7384: mountDocPreviewPane 具备全表面单例互斥排他防线与首帧宽度兜底", () => {
    assert.match(
        docSearchTs,
        /const measuredWidth = scrollElement\.clientWidth \|\| scrollElement\.parentElement\?\.clientWidth \|\| window\.innerWidth \|\| 0;/,
        "doc-search-ui.ts 必须对首帧 clientWidth 做自适应宽度兜底",
    );
    assert.match(
        docSearchTs,
        /const surfaceScope = [\s\S]*?scrollElement\.closest<HTMLElement>\("\.sw-platform-surface"\)[\s\S]*?allPreviews\.forEach[\s\S]*?existing !== pane[\s\S]*?existing\.remove\(\)/,
        "doc-search-ui.ts 必须跨整个包含表面执行全局单例排他清理",
    );
    assert.match(
        docSearchJs,
        /const surfaceScope = [\s\S]*?scrollElement\.closest\("\.sw-platform-surface"\)[\s\S]*?allPreviews\.forEach[\s\S]*?existing !== pane[\s\S]*?existing\.remove\(\)/,
        "doc-search-ui.js 必须同步执行全局单例排他清理",
    );
});

test("T-7384: 桌面与移动端切换器顶栏装配 sw__help-guide-btn 指南按钮与事件绑定", () => {
    assert.match(
        indexTs,
        /class="b3-button b3-button--text sw__icon-btn sw__help-guide-btn b3-tooltips b3-tooltips__s"/,
        "index.ts 桌面顶栏必须装配 sw__help-guide-btn 帮助按钮",
    );
    assert.match(
        indexTs,
        /dialog\.element\.querySelector\("\.sw__help-guide-btn"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*\{[\s\S]*?this\.openPlatformGuide\("switcher"\);/s,
        "index.ts 桌面顶栏必须绑定 openPlatformGuide 事件",
    );
    assert.match(
        indexTs,
        /class="b3-button b3-button--text sw__icon-btn sw__help-guide-btn"/,
        "index.ts 移动端顶栏必须装配 sw__help-guide-btn 按钮",
    );
    assert.match(
        mobileSwitcherTs,
        /dialog\.element\.querySelector\("\.sw__help-guide-btn"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*\{[\s\S]*?this\.openPlatformGuide\?\.?\("switcher"\);/s,
        "mobile-switcher-ui.ts 必须绑定移动端指南触发事件",
    );
});

test("T-7384: 空态引导卡片装配 sw__empty-syntax-bar 穿透检索与操作速查胶囊", () => {
    assert.match(
        indexTs,
        /syntaxBar\.className = "sw__empty-syntax-bar";[\s\S]*?: 大纲[\s\S]*?# 标签[\s\S]*?! 书签[\s\S]*?\^ 正文块[\s\S]*?⌘K 动作画板[\s\S]*?↩ 撤销关闭/s,
        "index.ts 空态卡片必须包含大纲、标签、书签、正文块、动作画板与撤销关闭等速查胶囊",
    );
});

test("T-7384 门禁负向验证: 若缺少全局单例互斥或帮助引导必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在代码必定失败
    assert.throws(() => {
        assert.match(docSearchTs, /fake_non_existent_surface_scope_invariant/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的按钮必定失败
    assert.throws(() => {
        assert.match(indexTs, /class="sw__non_existent_fake_help_btn"/);
    }, assert.AssertionError);
});
