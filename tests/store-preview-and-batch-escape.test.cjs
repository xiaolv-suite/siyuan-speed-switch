// T-7416 组件商店预览弹窗 Escape 回焦与批量模式 Escape 阶梯退出契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-store-ui.ts 与 home-store-ui.js 在 openStoreWidgetPreview 声明 Escape 键关闭；
//   2. 验证 home-store-ui.ts 与 home-store-ui.js 在 onStoreKeydown 声明 storeBatchMode 拦截 Escape 阶梯退回；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const storeTs = readSourceText(path.join(root, "src", "home-store-ui.ts"));
const storeJs = readSourceText(path.join(root, "src", "home-store-ui.js"));

test("T-7416: openStoreWidgetPreview 显式处理 Escape 关闭预览", () => {
    assert.match(
        storeTs,
        /const onPreviewKeydown = \(event: KeyboardEvent\) => \{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?dialog\.destroy\(\);/,
        "TS 文件必须绑定 onPreviewKeydown Escape 关闭",
    );
    assert.match(
        storeJs,
        /const onPreviewKeydown = \(event\) => \{[\s\S]*?if \(event\.key === "Escape"\) \{[\s\S]*?dialog\.destroy\(\);/,
        "JS 文件必须绑定 onPreviewKeydown Escape 关闭",
    );
});

test("T-7416: onStoreKeydown 在批量模式下按 Escape 阶梯退出", () => {
    assert.match(
        storeTs,
        /if \(event\.key === "Escape" && storeBatchMode\) \{[\s\S]*?storeBatchMode = false;[\s\S]*?renderStore\(\);/,
        "TS 文件必须在批量模式按 Escape 退出批量态",
    );
    assert.match(
        storeJs,
        /if \(event\.key === "Escape" && storeBatchMode\) \{[\s\S]*?storeBatchMode = false;[\s\S]*?renderStore\(\);/,
        "JS 文件必须在批量模式按 Escape 退出批量态",
    );
});

test("T-7416 门禁负向验证: 若批量模式 Escape 缺少 storeBatchMode 判定必定精准红", () => {
    assert.doesNotMatch(storeTs, /if \(event\.key === "Escape"\) \{\s*storeBatchMode = false;\s*renderStore/);
});
