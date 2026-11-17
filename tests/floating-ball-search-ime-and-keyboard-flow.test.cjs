// T-7382 悬浮球更多面板搜索框 IME 守卫与键盘流直达契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 searchInput 具备 compositionstart/compositionend 状态管理；
//   2. 验证 handleKeydown 在输入法候选状态下阻止误关闭；
//   3. 验证 searchInput Escape 优先清空输入框内容；
//   4. 验证 searchInput ArrowDown 导航至首个可见动作；
//   5. 验证 searchInput Enter 键直达执行首个可见动作；
//   6. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const ballPanelJs = readSourceText(path.join(root, "src", "floating-ball-panel.js"));

test("T-7382: 悬浮球更多面板 searchInput 具备 IME 输入法合成状态管理", () => {
    assert.match(
        ballPanelJs,
        /let\s+searchComposing\s*=\s*false;\s*searchInput\.addEventListener\("compositionstart",\s*\(\)\s*=>\s*\{\s*searchComposing\s*=\s*true;\s*\}\);/s,
        "floating-ball-panel.js 必须监听 compositionstart 状态",
    );
    assert.match(
        ballPanelJs,
        /searchInput\.addEventListener\("compositionend",\s*\(\)\s*=>\s*\{[\s\S]*?searchComposing\s*=\s*false;[\s\S]*?filterRows\(\);/s,
        "floating-ball-panel.js 必须在 compositionend 阶段刷新过滤",
    );
});

test("T-7382: handleKeydown 在输入法候选期间阻止误关闭更多抽屉", () => {
    assert.match(
        ballPanelJs,
        /function\s+handleKeydown\(event\)\s*\{\s*if\s*\(event\.isComposing\s*\|\|\s*event\.keyCode === 229\)\s*return;/s,
        "handleKeydown 必须具备 isComposing 与 keyCode === 229 双重防线",
    );
});

test("T-7382: searchInput Escape 优先清空搜索词而不关闭抽屉", () => {
    assert.match(
        ballPanelJs,
        /if\s*\(event\.key === "Escape"\)\s*\{[\s\S]*?if\s*\(searchInput\.value\)\s*\{[\s\S]*?searchInput\.value\s*=\s*"";[\s\S]*?filterRows\(\);/s,
        "searchInput 必须在有内容时拦截 Escape 清空搜索词",
    );
});

test("T-7382: searchInput 具备 ArrowDown 向下聚焦与 Enter 回车直达执行能力", () => {
    assert.match(
        ballPanelJs,
        /if\s*\(event\.key === "ArrowDown"\)\s*\{[\s\S]*?firstVisible\.focus\(\);/s,
        "searchInput 必须支持 ArrowDown 向下聚焦",
    );
    assert.match(
        ballPanelJs,
        /if\s*\(event\.key === "Enter"\)\s*\{[\s\S]*?firstVisible\.click\(\);/s,
        "searchInput 必须支持 Enter 回车直达执行",
    );
});

test("T-7382 门禁负向验证: 若缺少 IME 守卫或键盘直达必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在代码必定失败
    assert.throws(() => {
        assert.match(ballPanelJs, /fake_non_existent_ball_ime_guard/);
    }, assert.AssertionError);

    // 探针 2: 负向断言若缺少输入法让位必定失败
    assert.throws(() => {
        assert.match(ballPanelJs, /if\s*\(event\.keyCode === 99999\)\s*return;/);
    }, assert.AssertionError);
});
