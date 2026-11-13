// T-7427 组件配置表单弹窗 ⌘Enter 快捷保存与 Escape 退出闭环契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-config-form.ts 与 home-config-form.js 声明 Escape 退出；
//   2. 验证 home-config-form.ts 与 home-config-form.js 声明 ⌘Enter 快捷提交；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const formTs = readSourceText(path.join(root, "src", "home-config-form.ts"));
const formJs = readSourceText(path.join(root, "src", "home-config-form.js"));

test("T-7427: home-config-form 声明 Escape 退出与 ⌘Enter 快捷保存", () => {
    assert.match(
        formTs,
        /dialog\.element\.addEventListener\("keydown",\s*\(event: KeyboardEvent\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\)[\s\S]*?dialog\.destroy\(\);[\s\S]*?if \(\(event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter" && !save\.disabled\)[\s\S]*?save\.click\(\);/,
        "TS 文件必须包含 Escape 与 ⌘Enter 保存逻辑",
    );
    assert.match(
        formJs,
        /dialog\.element\.addEventListener\("keydown",\s*\(event\)\s*=>\s*\{[\s\S]*?if \(event\.key === "Escape"\)[\s\S]*?dialog\.destroy\(\);[\s\S]*?if \(\(event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter" && !save\.disabled\)[\s\S]*?save\.click\(\);/,
        "JS 文件必须包含 Escape 与 ⌘Enter 保存逻辑",
    );
});

test("T-7427 门禁负向验证: 若 ⌘Enter 缺少 !save.disabled 检查必定精准红", () => {
    assert.doesNotMatch(formTs, /if \(\(event\.ctrlKey \|\| event\.metaKey\) && event\.key === "Enter"\) \{\s*event\.preventDefault\(\);\s*save\.click/);
});
