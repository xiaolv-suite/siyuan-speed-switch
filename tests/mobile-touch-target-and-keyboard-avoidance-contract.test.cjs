// tests/mobile-touch-target-and-keyboard-avoidance-contract.test.cjs
// 契约测试：移动端软键盘避让、全面屏安全区加固与 44px 触控保真（T-7702~T-7705）
// 1. 验证 .sw__mobile.sw-keyboard-open 下收起 .sw__quick-actions 释放纵向视口；
// 2. 验证 .sw__mobile .sw__quick-actions 声明 env(safe-area-inset-bottom) 安全区保护；
// 3. 验证 .sw__mobile .sw__mobile-close-btn 声明 ::after 达到 >=44px 触控保真热区；
// 4. 负向验证探针：若破坏软键盘避让规则或移除全面屏安全区，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const switcherMobileScss = fs.readFileSync(path.join(ROOT, "src/styles/_03-switcher-mobile.scss"), "utf8");
const fabFullscreenScss = fs.readFileSync(path.join(ROOT, "src/styles/_04-fab-fullscreen-soft.scss"), "utf8");

test("T-7702: 移动端软键盘输入态底栏自动避让（释放浏览视口）", () => {
    assert.match(
        switcherMobileScss,
        /\.sw__mobile\.sw-keyboard-open\s*\{[\s\S]*?\.sw__quick-actions[\s\S]*?display:\s*none\s*!important/s,
        "软键盘弹起 .sw-keyboard-open 时必须将底栏 .sw__quick-actions 设置为 display: none !important"
    );
});

test("T-7703: 移动端底栏全面屏安全区加固（防 Home 指示条压盖）", () => {
    assert.match(
        switcherMobileScss,
        /&\.sw__mobile\s*\{[\s\S]*?\.sw__quick-actions\s*\{[^}]*env\(safe-area-inset-bottom/s,
        "移动端底栏 .sw__quick-actions 必须声明 env(safe-area-inset-bottom) 底部安全区内边距"
    );
});

test("T-7704: 移动端关闭按钮触控热区保真（>=44px 触控区）", () => {
    assert.match(
        fabFullscreenScss,
        /\.sw__mobile-close-btn\s*\{[\s\S]*?position:\s*relative;[\s\S]*?&::after\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*-6px;/s,
        ".sw__mobile-close-btn 必须声明 position: relative 并通过 &::after 伪元素将 34×32 扩大为 >=44px 热区"
    );
});

test("T-7705 负向验证探针：若破坏键盘避让或安全区防护必精准拦截", () => {
    // 探针 1：检验如果有人删除了键盘打开时底栏的隐藏规则
    function checkKeyboardAvoidance(css) {
        return /\.sw__mobile\.sw-keyboard-open\s*\{[\s\S]*?\.sw__quick-actions[\s\S]*?display:\s*none\s*!important/s.test(css);
    }
    assert.equal(checkKeyboardAvoidance(switcherMobileScss), true);

    assert.throws(() => {
        const brokenCss = switcherMobileScss.replaceAll("display: none !important;", "display: block;");
        if (!checkKeyboardAvoidance(brokenCss)) {
            throw new Error("PROBE_DETECTED_BROKEN_KEYBOARD_AVOIDANCE: 软键盘弹起时底栏未自动避让隐藏");
        }
    }, /PROBE_DETECTED_BROKEN_KEYBOARD_AVOIDANCE/, "破坏性负向探针必须准确捕获键盘避让失效缺陷");

    // 探针 2：检验如果有人抹除了 env(safe-area-inset-bottom)
    function checkSafeArea(css) {
        return /env\(safe-area-inset-bottom/s.test(css);
    }
    assert.equal(checkSafeArea(switcherMobileScss), true);

    assert.throws(() => {
        const brokenCss = switcherMobileScss.replace(/env\(safe-area-inset-bottom[^)]*\)/g, "0px");
        if (!checkSafeArea(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_SAFE_AREA: 移动端底栏缺少全面屏 safe-area-inset-bottom 防护");
        }
    }, /PROBE_DETECTED_MISSING_SAFE_AREA/, "破坏性负向探针必须准确捕获安全区防护丢失缺陷");
});
