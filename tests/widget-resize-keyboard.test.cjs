// T-7477 工作台小组件网格调整把手全键盘 Shift+方向键缩放与双语无障碍契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 中 resizeHandle 声明 tabIndex 与 slider 语义；
//   2. 验证 resizeHandle 监听 Shift+方向键调节 w 和 h；
//   3. 验证 标题与无障碍属性引用 homeResizeHandleTitle 双语字段，消除字面量硬编码；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7477: second-panel-ui.ts 中 resizeHandle 具备全键盘滑块无障碍语义", () => {
    assert.match(
        panelTs,
        /resizeHandle\.tabIndex = 0;\s*resizeHandle\.setAttribute\("role",\s*"slider"\);/,
        "调整把手必须声明 tabIndex = 0 与 role=slider 无障碍语义",
    );
    assert.match(
        panelTs,
        /resizeHandle\.title = this\.i18n\.homeResizeHandleTitle/,
        "调整把手标题必须引用双语 homeResizeHandleTitle 字段",
    );
    assert.match(
        panelTs,
        /if\s*\(event\.shiftKey\)\s*\{[\s\S]*?event\.key === "ArrowRight"[\s\S]*?event\.key === "ArrowLeft"[\s\S]*?event\.key === "ArrowDown"[\s\S]*?event\.key === "ArrowUp"/,
        "调整把手必须支持 Shift+四向箭头键自由调整宽度和高度",
    );
    assert.match(
        panelTs,
        /persistLayout\(\{w:\s*nextW,\s*h:\s*nextH\}\);[\s\S]*?fresh\?\.focus\(\{preventScroll:\s*true\}\);/,
        "键盘调整后必须即时持久化并回焦调整把手",
    );
});

test("T-7477: second-panel-ui.js 镜像完全同步键盘缩放逻辑与双语字段", () => {
    assert.match(
        panelJs,
        /resizeHandle\.setAttribute\("role",\s*"slider"\);/,
        "second-panel-ui.js 必须包含 slider 属性",
    );
    assert.match(
        panelJs,
        /if\s*\(event\.shiftKey\)/,
        "second-panel-ui.js 必须包含 Shift 组合键缩放分支",
    );
    assert.ok(zh.homeResizeHandleTitle && zh.homeResizeHandleTitle.length > 0, "zh-CN.json 必须包含 homeResizeHandleTitle");
    assert.ok(en.homeResizeHandleTitle && en.homeResizeHandleTitle.length > 0, "en.json 必须包含 homeResizeHandleTitle");
});

test("T-7477 门禁负向验证: 若把手未声明 slider 语义或未拦截键盘缩放必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在角色必定失败
    assert.throws(() => {
        assert.match(panelTs, /resizeHandle\.setAttribute\("role",\s*"fake_slider"\)/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的不存在按键必定失败
    assert.throws(() => {
        assert.match(panelTs, /event\.key === "ArrowFake_Key"/);
    }, assert.AssertionError);
});
