"use strict";

/**
 * IME 合成期守卫契约（R18 全生态专项 / R19 固化为回归保护）：
 * 设置区名称创建、二级弹窗提交、重命名三处输入框的 Enter/Escape
 * 必须在 isComposing || keyCode === 229 时让路给输入法 (3 处)。
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");

test("雷切 · 设置区输入框 IME 合成期让路 (R18/R19)", () => {
    const src = readSourceText(path.join(root, "src", "settings-sections.ts"));
    const count = (src.match(/(?:e|event)\.isComposing\s*\|\|\s*(?:e|event)\.keyCode === 229/g) || []).length;
    assert.equal(count, 3, "settings-sections.ts 三处输入 keydown 处理器必须有 IME 守卫");
});
