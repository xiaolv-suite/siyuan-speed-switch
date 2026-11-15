// T-7568 移动端 Sort Sheet 卸载时全页 inert 锁死防御与离开协调器自愈契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 mobile-switcher-ui.ts 在创建 Dialog 立即将 releaseFab 赋予 switcherRelease.fn 杜绝提早销毁时 FAB 泄漏；
//   2. 验证 index.ts 与 index.js onunload 清理浮层时恢复 document.body 兄弟节点的 inert 与 aria-hidden；
//   3. 验证 snippet-studio-ui.js openLeaveDialog 在 destroyCallback 中安全触发 leave.cancel() 消除挂起状态泄漏；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const mobileSwitcherTs = readSourceText(path.join(root, "src", "mobile-switcher-ui.ts"));
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));
const studioUiJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7568: mobile-switcher-ui.ts 早期立即绑定 releaseFab 防御 FAB 泄漏", () => {
    assert.match(
        mobileSwitcherTs,
        /const switcherRelease:\s*\{fn:\s*\(\)\s*=>\s*void\}\s*=\s*\{fn:\s*\(\)\s*=>\s*undefined\};[\s\S]*?const releaseFab = this\.suspendFABForDialog\(\);[\s\S]*?switcherRelease\.fn\s*=\s*\(\)\s*=>\s*\{\s*releaseFab\(\);\s*\};/,
        "mobile-switcher-ui.ts 必须在获取 releaseFab 后立即赋给 switcherRelease.fn",
    );
});

test("T-7568: index.ts 与 index.js 在 onunload 时恢复所有被标记为 inert 的元素", () => {
    // TS
    assert.match(
        indexTs,
        /if \(element\.hasAttribute\("inert"\) && element\.getAttribute\("aria-hidden"\) === "true"\)\s*\{[\s\S]*?element\.removeAttribute\("inert"\);[\s\S]*?element\.removeAttribute\("aria-hidden"\);/,
        "TS 文件 onunload 必须恢复 body 子节点的 inert 与 aria-hidden 属性",
    );

    // JS
    assert.match(
        indexJs,
        /if \(element\.hasAttribute\("inert"\) && element\.getAttribute\("aria-hidden"\) === "true"\)\s*\{[\s\S]*?element\.removeAttribute\("inert"\);[\s\S]*?element\.removeAttribute\("aria-hidden"\);/,
        "JS 文件 onunload 必须恢复 body 子节点的 inert 与 aria-hidden 属性",
    );
});

test("T-7568: snippet-studio-ui.js openLeaveDialog 声明 destroyCallback 取消挂起意图", () => {
    assert.match(
        studioUiJs,
        /function openLeaveDialog\(\)\s*\{[\s\S]*?destroyCallback:\s*\(\)\s*=>\s*\{[\s\S]*?if \(!handled\)\s*\{[\s\S]*?leave\.cancel\(\);/,
        "openLeaveDialog 必须在 destroyCallback 中调用 leave.cancel()",
    );
});

test("T-7568 门禁负向验证: 若 openLeaveDialog 移除 destroyCallback 取消机制必被拦截", () => {
    const fakeStudio = studioUiJs.replace(/destroyCallback:\s*\(\)\s*=>\s*\{[\s\S]*?leave\.cancel\(\);\s*\}\s*\},/, "/* removed */");
    assert.doesNotMatch(fakeStudio, /openLeaveDialog[\s\S]*?destroyCallback:\s*\(\)\s*=>\s*\{[\s\S]*?leave\.cancel\(\);/);
});
