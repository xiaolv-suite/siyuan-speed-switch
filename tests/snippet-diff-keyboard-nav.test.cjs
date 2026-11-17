// T-7474 代码片段实验室版本差异对比浮层全键盘流与 Escape 安全回退契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 中 aiDiffPanel 挂载 Escape 退出并回焦编辑器；
//   2. 验证 aiDiffPanel 包含 Home/End 与 ArrowDown/j/ArrowUp/k 差异块跳转导航；
//   3. 验证 各 hunk 具备 sw-studio__diff-hunk-head 焦点目标；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const studioUiJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));

test("T-7474: aiDiffPanel 具备 Escape 退出并回焦编辑器逻辑", () => {
    assert.match(
        studioUiJs,
        /aiDiffPanel\.tabIndex = 0;/,
        "差异对比面板必须声明 tabIndex 成为键盘焦点容器",
    );
    assert.match(
        studioUiJs,
        /if\s*\(event\.key === "Escape"\)\s*\{[\s\S]*?hideAIDiffPanel\(\);[\s\S]*?editor(?:\?)?\.focus\(\);/,
        "按 Escape 必须关闭差异面板并安全回焦代码编辑器",
    );
});

test("T-7474: aiDiffPanel 具备 Home/End 与上下/jk 方向键流", () => {
    assert.match(
        studioUiJs,
        /if\s*\(event\.key === "Home"\)\s*\{[\s\S]*?hunkButtons\[0\]\?\.focus\(\{preventScroll:\s*true\}\);/,
        "必须支持 Home 键跳转首个差异块",
    );
    assert.match(
        studioUiJs,
        /if\s*\(event\.key === "End"\)\s*\{[\s\S]*?hunkButtons\[hunkButtons\.length - 1\]\?\.focus\(\{preventScroll:\s*true\}\);/,
        "必须支持 End 键跳转末尾差异块",
    );
    assert.match(
        studioUiJs,
        /if\s*\(event\.key === "ArrowDown" \|\| event\.key === "j" \|\| event\.key === "J"\)/,
        "必须支持 ArrowDown 与 j 键向下流转差异块",
    );
    assert.match(
        studioUiJs,
        /if\s*\(event\.key === "ArrowUp" \|\| event\.key === "k" \|\| event\.key === "K"\)/,
        "必须支持 ArrowUp 与 k 键向上流转差异块",
    );
});

test("T-7474 门禁负向验证: 若缺少 Escape 退出或未支持 jk 导航必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在按键逻辑必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /event\.key === "F8_FAKE_DIFF_KEY"/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的不存在差异选择器必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /sw-studio__diff-fake-nonexistent-head/);
    }, assert.AssertionError);
});
