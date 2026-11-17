// tests/switcher-card-and-preview-bento-contract.test.cjs
// 契约测试：切换器页签卡片与文档速览浮窗 Bento 软影与白卡浮起（T-7722~T-7725）
// 1. 验证 .sw__card 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-bento)；
// 2. 验证 .sw__doc-preview 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-bento)；
// 3. 验证卡片 hover 态声明 translateY(-2px)，active 态声明 1.5px 复合发光环；
// 4. 负向验证探针：若卡片丢失 Bento 软影或白卡浮起底色，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const switcherScss = fs.readFileSync(path.join(ROOT, "src/styles/_03-switcher-mobile.scss"), "utf8");
const polishScss = fs.readFileSync(path.join(ROOT, "src/styles/_11-ui-polish.scss"), "utf8");

test("T-7722: 页签卡片双层微底白卡浮起与 Bento 深度软影加固", () => {
    assert.match(
        switcherScss,
        /\.sw__card\s*\{[\s\S]*?background-color:\s*var\(--sw-card-float-bg/s,
        ".sw__card 必须声明 var(--sw-card-float-bg) 白卡浮起底色"
    );
    assert.match(
        switcherScss,
        /\.sw__card\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s,
        ".sw__card 必须声明 var(--sw-shadow-bento) 深度软影"
    );
    assert.match(
        switcherScss,
        /\.sw__card\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateY\(-2px\);/s,
        ".sw__card hover 态必须声明 translateY(-2px) 轻微抬升"
    );
});

test("T-7723: 文档速览浮窗材质收敛与后置切片防覆盖闭环", () => {
    assert.match(
        polishScss,
        /\.sw__doc-preview\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        "_11-ui-polish.scss 中 .sw__doc-preview 必须统一为 var(--sw-card-float-bg)"
    );
    assert.match(
        polishScss,
        /\.sw__doc-preview\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s,
        "_11-ui-polish.scss 中 .sw__doc-preview 必须收敛至 var(--sw-shadow-bento)"
    );
});

test("T-7724: 卡片聚焦与激活态发光环对齐（消灭内阴影切边）", () => {
    assert.match(
        switcherScss,
        /\.sw__card[\s\S]*?&\.sw__focused\s*\{[\s\S]*?box-shadow:\s*0 0 0 1\.5px/s,
        ".sw__focused 必须采用 1.5px 复合外发光环"
    );
    assert.match(
        switcherScss,
        /\.sw__card[\s\S]*?&\.sw__active\s*\{[\s\S]*?box-shadow:\s*0 0 0 1\.5px/s,
        ".sw__active 必须采用 1.5px 复合发光环"
    );
});

test("T-7725 负向验证探针：若卡片丢失 Bento 软影或白卡浮起底色必精准拦截", () => {
    // 探针 1：验证卡片 Bento 软影
    function checkCardBento(css) {
        return /\.sw__card\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s.test(css);
    }
    assert.equal(checkCardBento(switcherScss), true);

    assert.throws(() => {
        const brokenCss = switcherScss.replaceAll("var(--sw-shadow-bento)", "none");
        if (!checkCardBento(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_CARD_BENTO: 页签卡片丢失 var(--sw-shadow-bento) 软影");
        }
    }, /PROBE_DETECTED_MISSING_CARD_BENTO/, "破坏性负向探针必须精准捕获卡片软影丢失缺陷");

    // 探针 2：验证文档速览浮窗白底浮起
    function checkDocPreviewFloat(css) {
        return /\.sw__doc-preview\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s.test(css);
    }
    assert.equal(checkDocPreviewFloat(polishScss), true);

    assert.throws(() => {
        const brokenCss = polishScss.replaceAll("var(--sw-card-float-bg,", "var(--sw-broken,");
        if (!checkDocPreviewFloat(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_PREVIEW_FLOAT: 文档速览浮窗丢失白卡浮起背景");
        }
    }, /PROBE_DETECTED_MISSING_PREVIEW_FLOAT/, "破坏性负向探针必须精准捕获速览白卡浮起丢失缺陷");
});
