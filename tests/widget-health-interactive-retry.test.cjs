"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.join(__dirname, "..");
const tsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
const jsSource = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));

test("T-7505: second-panel-ui.ts 与 second-panel-ui.js 支持双击异常单元格就地重试", () => {
    assert.match(
        tsSource,
        /cell\.addEventListener\("dblclick",\s*\(event:\s*MouseEvent\)\s*=>\s*\{[\s\S]*?cell\.dataset\.swHealth === "failed" \|\| cell\.dataset\.swHealth === "offline" \|\| cell\.dataset\.swHealth === "stale"[\s\S]*?controller\.refresh\(inst\.config,\s*\{force:\s*true\}\)/,
        "TS 文件必须包含双击异常状态卡片就地重试处理",
    );
    assert.match(
        jsSource,
        /cell\.addEventListener\("dblclick",\s*\(event\)\s*=>\s*\{[\s\S]*?cell\.dataset\.swHealth === "failed" \|\| cell\.dataset\.swHealth === "offline" \|\| cell\.dataset\.swHealth === "stale"[\s\S]*?controller\.refresh\(inst\.config,\s*\{ force:\s*true \}\)/,
        "JS 镜像必须同步包含双击异常状态卡片就地重试处理",
    );
});

test("T-7505: 编辑态聚焦卡片支持按 R 键就地单卡强制刷新", () => {
    assert.match(
        tsSource,
        /if \(key\.key === "r" \|\| key\.key === "R"\) \{[\s\S]*?void controller\.refresh\(inst\.config,\s*\{force:\s*true\}\);/,
        "TS 文件必须支持卡片焦点下按 R 键强制刷新",
    );
    assert.match(
        jsSource,
        /if \(key\.key === "r" \|\| key\.key === "R"\) \{[\s\S]*?void controller\.refresh\(inst\.config,\s*\{ force:\s*true \}\);/,
        "JS 镜像必须同步支持卡片焦点下按 R 键强制刷新",
    );
});
