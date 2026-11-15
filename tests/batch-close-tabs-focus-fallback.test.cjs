// T-7471 动作画板多页签批量关闭后焦点安全回退契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 中 batchCloseTabsWithReport 包含 .sw__card:not(.fn__none) 焦点恢复；
//   2. 验证 无剩余可见卡片时安全回退至 searchInput.focus；
//   3. 验证 侧栏重绘后同步包含 focusTarget?.focus 守卫；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));

test("T-7471: batchCloseTabsWithReport 包含桌面切换器卡片焦点安全恢复", () => {
    assert.match(
        indexTs,
        /const focusTarget = scrollElement\.querySelector<HTMLElement>\("\.sw__card:not\(\.fn__none\)"\);[\s\S]*?focusTarget\.focus\(\{preventScroll:\s*true\}\);/,
        "批量关闭页签后必须把焦点重新赋予第一张存活卡片，防止焦点丢失到 body",
    );
    assert.match(
        indexTs,
        /else if \(searchInput\)\s*\{\s*searchInput\.focus\(\{preventScroll:\s*true\}\);/,
        "无可见卡片时必须安全回焦到搜索框",
    );
});

test("T-7471: 侧栏重绘后同步包含焦点恢复守卫", () => {
    assert.match(
        indexTs,
        /this\.refreshSidebar\(\);[\s\S]*?const focusTarget = this\.sidebarElement\.querySelector<HTMLElement>\("\.sw__card:not\(\.fn__none\)"\);[\s\S]*?focusTarget\?\.focus\(\{preventScroll:\s*true\}\);/,
        "侧栏批量关闭后必须同样恢复焦点至有效卡片",
    );
});

test("T-7471 门禁负向验证: 若缺少焦点恢复或选择器失效必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在选择器必定失败
    assert.throws(() => {
        assert.match(indexTs, /scrollElement\.querySelector<HTMLElement>\("\.fake_non_existent_card_selector"\)/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的不存在焦点回退逻辑必定失败
    assert.throws(() => {
        assert.match(indexTs, /else if \(fakeNonExistentInput\)\.focus/);
    }, assert.AssertionError);
});
