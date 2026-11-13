"use strict";

/**
 * R24 无障碍动效契约：凡声明 scroll-behavior: smooth 的样式文件，
 * 必须同文件包含 prefers-reduced-motion 降级块（平滑滚动对运动敏感用户也应退化为 auto）。
 * 雷切走 readSourceText 合规读取。
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (["node_modules", "dist", "build", "release"].includes(e.name)) continue;
            walk(p, out);
        } else if (/\.(scss|css)$/.test(e.name)) out.push(p);
    }
    return out;
}

test("雷切 · scroll-behavior:smooth 必须同文件携带 prefers-reduced-motion 降级 (R24)", () => {
    const offenders = [];
    for (const file of walk(path.join(root, "src", "styles"))) {
        const src = readSourceText(file);
        if (!/scroll-behavior:\s*smooth/.test(src)) continue;
        if (!/prefers-reduced-motion/.test(src)) offenders.push(path.relative(root, file));
    }
    assert.deepEqual(offenders, [], `以下文件平滑滚动缺 reduced-motion 降级: ${offenders.join(", ")}`);
});
