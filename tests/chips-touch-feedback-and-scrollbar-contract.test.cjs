// tests/chips-touch-feedback-and-scrollbar-contract.test.cjs
// 契约测试：多模态 Chips 触感微反馈、粗指针触控热区提量与主滚动条滑块主题色悬浮（T-7730~T-7733）
// 1. 验证 .sw__mode-chip 声明 var(--sw-card-float-bg)、:active 微缩放与 :focus-visible 发光环；
// 2. 验证 @media (pointer: coarse) 下 .sw__mode-chip 声明 30px 触控高保真热区；
// 3. 验证 .sw__scroll::-webkit-scrollbar-thumb:hover 声明 var(--sw-color-accent) 悬停主色微光；
// 4. 负向验证探针：若破坏粗指针 30px 触控热区或丢失 active 触感反馈，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const polishScss = fs.readFileSync(path.join(ROOT, "src/styles/_11-ui-polish.scss"), "utf8");

test("T-7730: 多模态 Chips 触感微反馈与双层微底白卡浮起加固", () => {
    assert.match(
        polishScss,
        /\.sw__mode-chip\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        ".sw__mode-chip 必须声明 var(--sw-card-float-bg) 白底浮起"
    );
    assert.match(
        polishScss,
        /\.sw__mode-chip\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*translateY\(0\.5px\)\s*scale\(0\.97\);/s,
        ".sw__mode-chip 必须声明 &:active 触感按压微动效"
    );
    assert.match(
        polishScss,
        /\.sw__mode-chip\s*\{[\s\S]*?&:focus-visible\s*\{[^}]*box-shadow:\s*var\(--sw-focus-glow\);/s,
        ".sw__mode-chip 必须声明 &:focus-visible 统一发光微环"
    );
});

test("T-7731: 粗指针触控模式下 Chips 30px 热区与内边距自适应提升", () => {
    assert.match(
        polishScss,
        /@media\s*\(pointer:\s*coarse\)[\s\S]*?\.sw__mode-chip\s*\{[^}]*min-height:\s*30px;[^}]*height:\s*30px;/s,
        "@media (pointer: coarse) 下 .sw__mode-chip 必须声明 30px 触控热区"
    );
});

test("T-7732: 切换器主滚动条滑块主题色悬浮微透高亮加固", () => {
    assert.match(
        polishScss,
        /\.sw__scroll::-webkit-scrollbar-thumb:hover\s*\{[^}]*var\(--sw-color-accent/s,
        ".sw__scroll 滑块 hover 必须接入 var(--sw-color-accent) 语义色"
    );
});

test("T-7733 负向验证探针：若破坏粗指针 30px 触控热区或丢失 active 触感反馈必精准拦截", () => {
    // 探针 1：验证粗指针触控热区
    function checkTouchTarget(css) {
        return /@media\s*\(pointer:\s*coarse\)[\s\S]*?\.sw__mode-chip\s*\{[^}]*height:\s*30px;/s.test(css);
    }
    assert.equal(checkTouchTarget(polishScss), true);

    assert.throws(() => {
        const brokenCss = polishScss.replace("min-height: 30px;\n            height: 30px;", "height: 20px;");
        if (!checkTouchTarget(brokenCss)) {
            throw new Error("PROBE_DETECTED_DEGRADED_TOUCH_CHIP: 粗指针触控模式下模式药丸热区被非法篡改压缩");
        }
    }, /PROBE_DETECTED_DEGRADED_TOUCH_CHIP/, "破坏性负向探针必须精准捕获触控热区压缩缺陷");

    // 探针 2：验证 active 微动效反馈
    function checkActiveFeedback(css) {
        return /\.sw__mode-chip\s*\{[\s\S]*?&:active\s*\{[^}]*scale\(0\.97\);/s.test(css);
    }
    assert.equal(checkActiveFeedback(polishScss), true);

    assert.throws(() => {
        const brokenCss = polishScss.replace("scale(0.97);", "scale(1);");
        if (!checkActiveFeedback(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_CHIP_ACTIVE_FEEDBACK: 模式药丸丢失 active 按压微动效反馈");
        }
    }, /PROBE_DETECTED_MISSING_CHIP_ACTIVE_FEEDBACK/, "破坏性负向探针必须精准捕获按压触感丢失缺陷");
});
