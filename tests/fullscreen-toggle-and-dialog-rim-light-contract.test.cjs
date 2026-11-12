// tests/fullscreen-toggle-and-dialog-rim-light-contract.test.cjs
// 契约测试：全屏切换 RAF 节流锁、弹窗 Bento 软影微光切面与沉浸全屏消线（T-7710~T-7713）
// 1. 验证 bindSwitcherFullscreenToggle 声明 isToggling 锁与 RAF 解锁机制；
// 2. 验证非全屏弹窗容器声明 18px 大圆角、var(--sw-shadow-bento) 与 1px 微光切面；
// 3. 验证全屏弹窗容器严格抹除外边框、阴影与圆角（零缝隙沉浸）；
// 4. 负向验证探针：若破坏节流锁或全屏未彻底清边，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const indexTs = fs.readFileSync(path.join(ROOT, "src/index.ts"), "utf8");
const shellScss = fs.readFileSync(path.join(ROOT, "src/styles/_platform-shell.scss"), "utf8");

test("T-7710: 全屏切换按钮 RAF 连击节流锁", () => {
    assert.match(
        indexTs,
        /bindSwitcherFullscreenToggle[\s\S]*?let isToggling = false;[\s\S]*?if \(!container \|\| toFullscreen === isFullscreen \|\| isToggling\) \{[\s\S]*?isToggling = true;[\s\S]*?window\.requestAnimationFrame\(\(\) => \{[\s\S]*?isToggling = false;/s,
        "index.ts 必须声明 isToggling 锁并在 RAF 中重置"
    );
});

test("T-7711: 平台弹窗非全屏模式 Bento 悬浮阴影与 1px 微光切面", () => {
    assert.match(
        shellScss,
        /\.b3-dialog__container\.sw-platform-dialog:not\(\.sw-dialog--fullscreen\)\s*\{[\s\S]*?border-radius:\s*var\(--sw-radius-panel,\s*18px\);/s,
        "非全屏弹窗必须声明 18px 大圆角"
    );
    assert.match(
        shellScss,
        /\.b3-dialog__container\.sw-platform-dialog:not\(\.sw-dialog--fullscreen\)\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\),\s*inset 0 0 0 1px/s,
        "非全屏弹窗必须声明 Bento 软影与 inset 1px 微光切面"
    );
});

test("T-7712: 全屏铺满模式边界消除与无缝直角规整", () => {
    assert.match(
        shellScss,
        /\.b3-dialog__container\.sw-platform-dialog\.sw-dialog--fullscreen\s*\{[\s\S]*?border:\s*none\s*!important;[\s\S]*?border-radius:\s*0\s*!important;[\s\S]*?box-shadow:\s*none\s*!important;/s,
        "全屏模式必须彻底清除 border、border-radius 与 box-shadow"
    );
});

test("T-7713 负向验证探针：若破坏节流锁或全屏未彻底清边必精准拦截", () => {
    // 探针 1：检验全屏节流锁
    function checkThrottleLock(code) {
        return /let isToggling = false;[\s\S]*?isToggling = true;[\s\S]*?window\.requestAnimationFrame/s.test(code);
    }
    assert.equal(checkThrottleLock(indexTs), true);

    assert.throws(() => {
        const brokenCode = indexTs.replace("let isToggling = false;", "");
        if (!checkThrottleLock(brokenCode)) {
            throw new Error("PROBE_DETECTED_MISSING_FULLSCREEN_THROTTLE: 全屏原地切换按钮丢失连击节流保护");
        }
    }, /PROBE_DETECTED_MISSING_FULLSCREEN_THROTTLE/, "破坏性负向探针必须准确捕获节流锁丢失缺陷");

    // 探针 2：检验全屏清边规则
    function checkFullscreenClean(css) {
        return /\.b3-dialog__container\.sw-platform-dialog\.sw-dialog--fullscreen\s*\{[\s\S]*?border:\s*none\s*!important/s.test(css);
    }
    assert.equal(checkFullscreenClean(shellScss), true);

    assert.throws(() => {
        const brokenCss = shellScss.replace("border: none !important;", "border: 1px solid black;");
        if (!checkFullscreenClean(brokenCss)) {
            throw new Error("PROBE_DETECTED_DIRTY_FULLSCREEN_BORDER: 全屏状态残留外边框未彻底抹平");
        }
    }, /PROBE_DETECTED_DIRTY_FULLSCREEN_BORDER/, "破坏性负向探针必须准确捕获全屏残留边框缺陷");
});
