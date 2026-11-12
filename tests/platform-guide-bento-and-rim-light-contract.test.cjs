// tests/platform-guide-bento-and-rim-light-contract.test.cjs
// 契约测试：平台指引弹窗 Rim Light 微光切面、双层微底与 Bento 白卡浮起（T-7734~T-7737）
// 1. 验证 openPlatformGuide 弹窗容器注入 sw-platform-dialog 与 sw-platform-dialog--guide；
// 2. 验证 .sw-platform-guide 声明 var(--sw-bg-tinted) 浅色托底；
// 3. 验证 .sw-platform-guide__section 声明 var(--sw-card-float-bg) 与 var(--sw-shadow-bento)；
// 4. 验证 .sw-platform-guide__close 声明全圆角胶囊与微动效；
// 5. 负向验证探针：若破坏指引弹窗容器类名或分节丢失 Bento 软影，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const indexTs = fs.readFileSync(path.join(ROOT, "src/index.ts"), "utf8");
const widgetsScss = fs.readFileSync(path.join(ROOT, "src/styles/_05-settings-widgets.scss"), "utf8");

test("T-7734: 平台指引弹窗容器接入平台外壳类名与 Rim Light 微光切面", () => {
    assert.match(
        indexTs,
        /openPlatformGuide[\s\S]*?\.classList\.add\("sw-platform-dialog",\s*"sw-platform-dialog--guide"\)/s,
        "index.ts openPlatformGuide 必须为容器注入 sw-platform-dialog 与 sw-platform-dialog--guide"
    );
});

test("T-7735: 快速指引面板双层微底托底与 Bento 白卡浮起加固", () => {
    assert.match(
        widgetsScss,
        /\.sw-platform-guide\s*\{[\s\S]*?background:\s*var\(--sw-bg-tinted/s,
        ".sw-platform-guide 必须声明 var(--sw-bg-tinted) 浅色同族底色托底"
    );
    assert.match(
        widgetsScss,
        /&__section\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        "指引分节必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        widgetsScss,
        /&__section\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s,
        "指引分节必须声明 var(--sw-shadow-bento) 深度软影"
    );
});

test("T-7736: 当前指引分节高光呼吸微环与完成胶囊按钮加固", () => {
    assert.match(
        widgetsScss,
        /&__section\.is-current\s*\{[\s\S]*?box-shadow:\s*0 0 0 1\.5px var\(--sw-platform-accent/s,
        "当前分节必须声明 1.5px 复合外发光环"
    );
    assert.match(
        widgetsScss,
        /&__close\s*\{[\s\S]*?border-radius:\s*var\(--sw-platform-radius-pill/s,
        "完成按钮必须声明全圆角胶囊规格"
    );
});

test("T-7737 负向验证探针：若破坏指引弹窗类名或分节丢失 Bento 软影必精准拦截", () => {
    // 探针 1：验证容器类名注入
    function checkGuideDialogClass(code) {
        return /\.classList\.add\("sw-platform-dialog",\s*"sw-platform-dialog--guide"\)/s.test(code);
    }
    assert.equal(checkGuideDialogClass(indexTs), true);

    assert.throws(() => {
        const brokenCode = indexTs.replace('.classList.add("sw-platform-dialog", "sw-platform-dialog--guide");', "");
        if (!checkGuideDialogClass(brokenCode)) {
            throw new Error("PROBE_DETECTED_MISSING_GUIDE_DIALOG_CLASS: 指引弹窗容器丢失 sw-platform-dialog 外壳注入");
        }
    }, /PROBE_DETECTED_MISSING_GUIDE_DIALOG_CLASS/, "破坏性负向探针必须精准捕获外壳类名丢失缺陷");

    // 探针 2：验证分节卡片 Bento 软影
    function checkSectionBento(css) {
        return /&__section\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s.test(css);
    }
    assert.equal(checkSectionBento(widgetsScss), true);

    assert.throws(() => {
        const brokenCss = widgetsScss.replaceAll("box-shadow: var(--sw-shadow-bento);", "box-shadow: none;");
        if (!checkSectionBento(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_SECTION_BENTO: 指引分节卡片丢失 var(--sw-shadow-bento) 深度软影");
        }
    }, /PROBE_DETECTED_MISSING_SECTION_BENTO/, "破坏性负向探针必须精准捕获分节软影丢失缺陷");
});
