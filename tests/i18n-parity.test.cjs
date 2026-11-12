"use strict";

/**
 * R21 i18n parity 契约（雷切走 readSourceText 合规读取）：
 * zh-CN.json / en.json（嵌套）展平键集严格一致；源码 i18n.<prop> 属性访问引用必须可命中 zh。
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");

function flatten(obj, prefix = "", out = new Set()) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object") flatten(v, key, out);
        else out.add(key);
    }
    return out;
}

const zh = flatten(JSON.parse(readSourceText(path.join(root, "src", "i18n", "zh-CN.json"))));
const en = flatten(JSON.parse(readSourceText(path.join(root, "src", "i18n", "en.json"))));

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (["node_modules", "dist", "build", "release"].includes(e.name)) continue;
            walk(p, out);
        } else if (/\.(ts|svelte)$/.test(e.name)) out.push(p);
    }
    return out;
}

test("雷切 · zh/en i18n 键集严格一致 (R21)", () => {
    const zhOnly = [...zh].filter(k => !en.has(k));
    const enOnly = [...en].filter(k => !zh.has(k));
    assert.deepEqual(zhOnly, [], `en.json 缺失 zh-CN 键: ${zhOnly.slice(0, 10).join(", ")}`);
    assert.deepEqual(enOnly, [], `zh-CN.json 缺失 en 键: ${enOnly.slice(0, 10).join(", ")}`);
});

test("雷切 · 源码 i18n.<prop> 引用闭环 (R21)", () => {
    const missing = new Set();
    for (const f of walk(path.join(root, "src"))) {
        if (f.split(path.sep).includes("i18n")) continue;
        const src = readSourceText(f);
        for (const m of src.matchAll(/\bi18n\.([A-Za-z_$][\w$]*)/g)) {
            if (!zh.has(m[1])) missing.add(`${path.relative(root, f)}: ${m[1]}`);
        }
    }
    assert.deepEqual([...missing], [], `i18n 属性引用存在未登记键: ${[...missing].slice(0, 10).join("; ")}`);
});
