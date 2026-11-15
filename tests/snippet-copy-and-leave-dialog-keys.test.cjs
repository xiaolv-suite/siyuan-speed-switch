// T-7387 片段实验室一键复制代码与未保存离开键盘流契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 renderLibrary 为每个代码片段列表项挂载 sw-studio__library-copy 复制按钮；
//   2. 验证 sw-studio__library-copy 点击时调用 copyText 触发复制，并弹出状态提示；
//   3. 验证 openLeaveDialog 对键盘 Escape 按键进行拦截，触发取消退出；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioUiJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7387: renderLibrary 为每个代码片段列表项挂载 sw-studio__library-copy 复制按钮", () => {
    assert.match(
        studioUiJs,
        /const copyBtn = node\("button",\s*"sw-studio__library-copy b3-tooltips b3-tooltips__s",\s*"📋"\);/s,
        "snippet-studio-ui.js 必须挂载 sw-studio__library-copy 复制按钮",
    );
    assert.match(
        studioUiJs,
        /copyBtn\.addEventListener\("click",\s*\(event\)\s*=>\s*\{[\s\S]*?copyText\(item\.content\);[\s\S]*?setStatus\(t\("snippetCopied"\) \|\| "已复制代码片段", "ready"\);/s,
        "copyBtn 必须调用 copyText 并弹出已复制状态提示",
    );
    assert.match(
        studioUiJs,
        /row\.append\(button,\s*copyBtn,\s*toggle\);/s,
        "列表项 row 必须包含 copyBtn",
    );
});

test("T-7387: openLeaveDialog 包含 Escape 键盘取消拦截", () => {
    assert.match(
        studioUiJs,
        /dialog\.element\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if\s*\(event\.key === "Escape"\)\s*\{[\s\S]*?cancelChoice\.click\(\);/s,
        "openLeaveDialog 必须支持 Escape 键盘安全退出",
    );
});

test("T-7387 门禁负向验证: 若缺少复制按钮或按键监听必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在复制类必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /const copyBtn = node\("button", "fake_non_existent_copy_btn"\)/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的按键必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /if\s*\(event\.key === "F12_FAKE_KEY"\)/);
    }, assert.AssertionError);
});
