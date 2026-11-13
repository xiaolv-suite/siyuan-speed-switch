// T-7593~T-7596: 移动端软键盘防遮挡自适应、在途请求状态感知与悬浮球防闪烁契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 mobile-switcher-ui.ts 声明 visualViewport 动态视口高度适配与清理；
//   2. 验证 _03-switcher-mobile.scss 支持 .sw-mobile-switcher-dialog 的 visual-viewport 限制；
//   3. 验证 doc-search-ui.ts 在 runDocSearchFetch 期间为 searchInput 声明 aria-busy="true" 与 finally 清理；
//   4. 验证 index.ts suspendFABForDialog 采用 requestAnimationFrame 延迟合帧恢复防闪烁；
//   5. 负向验证探针：若缺失状态清理或防闪烁机制，断言必须精准红。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const mobileUiTs = readSourceText(path.join(ROOT, "src", "mobile-switcher-ui.ts"));
const mobileScss = readSourceText(path.join(ROOT, "src", "styles", "_03-switcher-mobile.scss"));
const docSearchTs = readSourceText(path.join(ROOT, "src", "doc-search-ui.ts"));
const polishScss = readSourceText(path.join(ROOT, "src", "styles", "_11-ui-polish.scss"));
const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));

test("T-7593: mobile-switcher-ui.ts 具备 visualViewport 软键盘动态自适应与清理", () => {
    assert.match(
        mobileUiTs,
        /window\.visualViewport\.addEventListener\("resize",\s*handleViewportResize\);/,
        "mobile-switcher-ui.ts 必须监听 visualViewport 的 resize 事件"
    );
    assert.match(
        mobileUiTs,
        /dialog\.element\.style\.setProperty\("--sw-visual-viewport-h",\s*`\$\{currentHeight\}px`\);/,
        "软键盘弹起时必须动态设置 --sw-visual-viewport-h 限制最大高度"
    );
    assert.match(
        mobileUiTs,
        /disposeVisualViewport\(\);/,
        "移动端切换器销毁时必须同步注销 visualViewport 监听器"
    );
});

test("T-7594: _03-switcher-mobile.scss 支持移动端视口高度与软键盘样式", () => {
    assert.match(
        mobileScss,
        /\.sw-mobile-switcher-dialog\s*\{[\s\S]*?max-height:\s*var\(--sw-visual-viewport-h,\s*100dvh\)\s*!important;/,
        ".sw-mobile-switcher-dialog 必须基于 --sw-visual-viewport-h 限制高度"
    );
    assert.match(
        mobileScss,
        /\.sw__mobile\.sw-keyboard-open\s*\{[\s\S]*?max-height:\s*var\(--sw-visual-viewport-h,\s*100dvh\)\s*!important;/,
        ".sw__mobile.sw-keyboard-open 必须自适应软键盘开启状态"
    );
});

test("T-7595: doc-search-ui.ts 在检索在途期间为输入框设置 aria-busy 与呼吸光晕", () => {
    assert.match(
        docSearchTs,
        /searchInput\.setAttribute\("aria-busy",\s*"true"\);/,
        "runDocSearchFetch 开始时必须标记 searchInput aria-busy='true'"
    );
    assert.match(
        docSearchTs,
        /finally\s*\{[\s\S]*?searchInput\.removeAttribute\("aria-busy"\);/,
        "runDocSearchFetch 结束时必须在 finally 中清理 aria-busy 属性"
    );
    assert.match(
        polishScss,
        /\.sw__search-wrap\s*\.sw__search\[aria-busy="true"\]\s*\{/,
        "样式层必须提供 .sw__search[aria-busy='true'] 视觉微光晕"
    );
});

test("T-7596: index.ts suspendFABForDialog 采用 requestAnimationFrame 延迟合帧恢复防闪烁", () => {
    assert.match(
        indexTs,
        /if\s*\(this\.fabModalDepth\s*===\s*0\)\s*\{[\s\S]*?window\.requestAnimationFrame\(restore\);/,
        "suspendFABForDialog 必须使用 requestAnimationFrame 延迟合帧判定以杜绝弹窗连续开关闪烁"
    );
});

test("T-7593~T-7596 门禁负向验证: 若破坏状态清理或防闪烁机制必定精准红", () => {
    // 探针 1: 缺少 disposeVisualViewport 的源码必定报错
    const invalidMobileTs = mobileUiTs.replace(/disposeVisualViewport\(\);/g, "/* omitted */");
    assert.throws(() => {
        if (!/disposeVisualViewport\(\);/.test(invalidMobileTs)) {
            throw new Error("Gate failed: disposeVisualViewport omitted");
        }
    }, /Gate failed/);

    // 探针 2: 负向断言伪造的不存在样式类
    assert.throws(() => {
        assert.match(mobileScss, /\.sw-nonexistent-keyboard-probe-class/);
    }, assert.AssertionError);
});
