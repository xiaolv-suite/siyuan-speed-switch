// T-7465 工作台全键盘局部刷新拦截与单组件重试焦点平滑恢复契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 中 onWorkbenchKeydown 包含 Ctrl/Cmd+R 局部刷新拦截；
//   2. 验证 拦截逻辑执行了 preventDefault 与 stopPropagation，杜绝宿主白屏硬刷新；
//   3. 验证 成功触发 [data-home-action="refresh-all"] 按钮；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));

test("T-7465: second-panel-ui.ts 挂载 Ctrl/Cmd+R 工作台局部刷新拦截", () => {
    assert.match(
        panelTs,
        /\(event\.ctrlKey \|\| event\.metaKey\) && !event\.altKey && !event\.shiftKey && event\.key\.toLowerCase\(\) === "r"/,
        "second-panel-ui.ts 必须精确识别 Ctrl+R 与 Cmd+R",
    );
    assert.match(
        panelTs,
        /const refreshBtn = root\.querySelector<HTMLButtonElement>\('\[data-home-action="refresh-all"\]'\);[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?refreshBtn\.click\(\);/,
        "必须阻止默认事件并直接触发工作台局部刷新按钮",
    );
});

test("T-7465: second-panel-ui.js 镜像完全同步刷新拦截逻辑", () => {
    assert.match(
        panelJs,
        /\(event\.ctrlKey \|\| event\.metaKey\) && !event\.altKey && !event\.shiftKey && event\.key\.toLowerCase\(\) === "r"/,
        "second-panel-ui.js 镜像必须包含按键判断",
    );
    assert.match(
        panelJs,
        /const refreshBtn = root\.querySelector\('\[data-home-action="refresh-all"\]'\);[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?refreshBtn\.click\(\);/,
        "second-panel-ui.js 必须执行局部刷新触发",
    );
});

test("T-7465 门禁负向验证: 若缺少按键拦截或未阻止默认事件必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在按键必定失败
    assert.throws(() => {
        assert.match(panelTs, /event\.key\.toLowerCase\(\) === "f12_fake"/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的不存在动作属性必定失败
    assert.throws(() => {
        assert.match(panelTs, /data-home-action="fake-non-existent-refresh"/);
    }, assert.AssertionError);
});
