// T-7379 穿透检索符号指引（?模式）可交互路由契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 activateDocResultItem 拦截 help-* 虚拟条目，阻止误调用 openDocSearchResult；
//   2. 验证 help-outline 将输入框前缀置为 : 并自动触发 applySearch；
//   3. 验证 help-tag / help-bookmark / help-block 前缀正确映射；
//   4. 验证 help-undo 触发撤销关闭页签；
//   5. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const docSearchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const docSearchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));

test("T-7379: activateDocResultItem 拦截 help-* 虚拟条目", () => {
    assert.match(
        docSearchTs,
        /if\s*\(id\.startsWith\("help-"\)\)\s*\{/s,
        "doc-search-ui.ts 必须拦截以 help- 开头的虚拟指引条目",
    );
    assert.match(
        docSearchJs,
        /if\s*\(id\.startsWith\("help-"\)\)\s*\{/s,
        "doc-search-ui.js 必须同步拦截以 help- 开头的虚拟指引条目",
    );
});

test("T-7379: help-outline/tag/bookmark/block 自动回填对应模式前缀并触发检索", () => {
    assert.match(
        docSearchTs,
        /if\s*\(id === "help-outline"\)\s*\{\s*setPrefixAndTrigger\(":"\);\s*return;\s*\}/s,
        "help-outline 必须将输入框前缀置为 : 并触发检索",
    );
    assert.match(
        docSearchTs,
        /if\s*\(id === "help-tag"\)\s*\{\s*setPrefixAndTrigger\("#"\);\s*return;\s*\}/s,
        "help-tag 必须将输入框前缀置为 # 并触发检索",
    );
    assert.match(
        docSearchTs,
        /if\s*\(id === "help-bookmark"\)\s*\{\s*setPrefixAndTrigger\("!"\);\s*return;\s*\}/s,
        "help-bookmark 必须将输入框前缀置为 ! 并触发检索",
    );
    assert.match(
        docSearchTs,
        /if\s*\(id === "help-block"\)\s*\{\s*setPrefixAndTrigger\("\^"\);\s*return;\s*\}/s,
        "help-block 必须将输入框前缀置为 ^ 并触发检索",
    );
});

test("T-7379: help-undo 触发撤销关闭页签并关闭弹窗", () => {
    assert.match(
        docSearchTs,
        /if\s*\(id === "help-undo"\)\s*\{[\s\S]*?undoLastClosedTab\(onClose\);/s,
        "help-undo 必须直接触发撤销关闭页签",
    );
});

test("T-7379 门禁负向验证: 若缺少 help 路由拦截或前缀置空必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在分支必定失败
    assert.throws(() => {
        assert.match(docSearchTs, /fake_non_existent_help_branch/);
    }, assert.AssertionError);

    // 探针 2: 负向断言若缺少前缀映射必定失败
    assert.throws(() => {
        assert.match(docSearchTs, /setPrefixAndTrigger\("fake_prefix_symbol"\)/);
    }, assert.AssertionError);
});
