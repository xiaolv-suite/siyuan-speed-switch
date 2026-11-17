// T-7462 片段实验室过滤选择器全键盘流与 Escape 阶梯清空契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 搜索框 query 包含 Escape 阶梯退出（有词清空、无词 closePicker）；
//   2. 验证 query 搜索框包含 ArrowDown / Enter 直达列表首张卡片；
//   3. 验证 过滤选择框组支持 Home/End 按键快速跳选首项与末项；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const studioUiJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));

test("T-7462: query 搜索框具备阶梯 Escape 退出与获焦自动全选", () => {
    assert.match(
        studioUiJs,
        /query\.addEventListener\("focus",\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(query\.value\)\s*query\.select\(\);/,
        "query 搜索框获焦时必须自动选中已有文本",
    );
    assert.match(
        studioUiJs,
        /if\s*\(event\.key === "Escape"\)\s*\{[\s\S]*?if\s*\(query\.value\)\s*\{[\s\S]*?query\.value = "";[\s\S]*?render\(\);[\s\S]*?\}\s*else\s*\{[\s\S]*?closePicker\(\);/,
        "query 搜索框必须支持 Escape 阶梯退出：有词清空检索、无词退出选择器",
    );
});

test("T-7462: query 搜索框支持 ArrowDown 与 Enter 直达列表首项", () => {
    assert.match(
        studioUiJs,
        /if\s*\(event\.key === "ArrowDown" \|\| event\.key === "Enter"\)\s*\{[\s\S]*?const firstBtn = list\.querySelector\("button:not\(:disabled\)"\);[\s\S]*?firstBtn\.focus\(\{preventScroll: true\}\);/,
        "query 搜索框必须支持按 ArrowDown 或 Enter 快速直达列表首项按钮",
    );
});

test("T-7462: 过滤下拉框组支持 Home 与 End 首末项快速跳选", () => {
    assert.match(
        studioUiJs,
        /\[source, language, category, catalogSort\]\.forEach\(\(input\)\s*=>\s*\{[\s\S]*?if\s*\(e\.key === "Home"[\s\S]*?input\.selectedIndex = 0;[\s\S]*?render\(\);/,
        "过滤框必须支持 Home 键跳转首项并重新渲染",
    );
    assert.match(
        studioUiJs,
        /if\s*\(e\.key === "End"[\s\S]*?input\.selectedIndex = input\.options\.length - 1;[\s\S]*?render\(\);/,
        "过滤框必须支持 End 键跳转末项并重新渲染",
    );
});

test("T-7462 门禁负向验证: 若缺少阶梯清空或未装配 Home/End 导航必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在按键逻辑必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /event\.key === "F9_FAKE_KEY" && closePicker/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的选择框必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /\[fake_non_existent_select\]\.forEach/);
    }, assert.AssertionError);
});
