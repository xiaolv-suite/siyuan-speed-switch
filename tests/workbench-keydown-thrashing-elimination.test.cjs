// T-7569 消除工作台全局 Keydown 的 Layout Thrashing 与计算优化契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 onWorkbenchKeydown 优先判定 target 隶属范围，非工作台目标立即短路返回；
//   2. 验证 isTopmostDialog 移除了 .filter().sort() 中对 getComputedStyle 的反复调用；
//   3. 验证 isTopmostDialog 在 containers.length <= 1 时实现零计算极速短路；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(root, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(root, "src", "second-panel-ui.js"));

test("T-7569: onWorkbenchKeydown 优先执行 target 容器隶属检查，实现零计算提前短路", () => {
    // TS 文件：必须先判定 (!dialog.element.contains(target) && !openerElement?.contains(target)) 再判定 !isTopmostDialog()
    assert.match(
        panelTs,
        /if \(!target \|\| \(!dialog\.element\.contains\(target\) && !openerElement\?\.contains\(target\)\) \|\| !isTopmostDialog\(\)\)\s*return;/,
        "TS 文件必须先执行 target 范围判定再执行 isTopmostDialog",
    );

    // JS 文件
    assert.match(
        panelJs,
        /if \(!target \|\| \(!dialog\.element\.contains\(target\) && !openerElement\?\.contains\(target\)\) \|\| !isTopmostDialog\(\)\)\s*return;/,
        "JS 文件必须先执行 target 范围判定再执行 isTopmostDialog",
    );
});

test("T-7569: isTopmostDialog 实现单次 O(N) 扫描与容器数量 <= 1 极速返回", () => {
    // TS 文件
    assert.match(
        panelTs,
        /const containers = Array\.from\(ownerDocument\.querySelectorAll<HTMLElement>\("\.b3-dialog__container"\)\);[\s\S]*?if \(containers\.length <= 1\)\s*return true;[\s\S]*?let highestZ = -Infinity;/,
        "TS isTopmostDialog 必须实现 <= 1 极速返回与单次 O(N) 遍历",
    );

    // JS 文件
    assert.match(
        panelJs,
        /const containers = Array\.from\(ownerDocument\.querySelectorAll\("\.b3-dialog__container"\)\);[\s\S]*?if \(containers\.length <= 1\)\s*return true;[\s\S]*?let highestZ = -Infinity;/,
        "JS isTopmostDialog 必须实现 <= 1 极速返回与单次 O(N) 遍历",
    );
});

test("T-7569 门禁负向验证: 若倒置 target 与 isTopmostDialog 或残留 sort 比较器计算必被拦截", () => {
    // 负向 1：倒置执行顺序判定必定失败
    assert.throws(() => {
        assert.match(panelTs, /if \(!target \|\| !isTopmostDialog\(\) \|\| \(!dialog\.element\.contains/);
    }, assert.AssertionError);

    // 负向 2：确认旧版的 .sort((left, right) => ... getComputedStyle) 彻底被清除
    assert.doesNotMatch(panelTs, /\.sort\(\(left, right\) => \{[\s\S]*?getComputedStyle\(element\)/);
});
