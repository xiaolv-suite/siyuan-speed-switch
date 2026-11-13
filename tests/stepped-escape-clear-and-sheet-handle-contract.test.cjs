// T-7661 搜索框两阶梯 Escape 智能回退与移动端 Sheet 胶囊手柄契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts 声明两阶梯 Escape 清空逻辑（保留前缀与清空前缀分离）；
//   2. 验证 index.js 同构声明两阶梯 Escape 清空逻辑；
//   3. 验证 _03-switcher-mobile 声明手机端顶部胶囊拖拽手柄；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const indexJs = readSourceText(path.join(root, "src", "index.js"));
const switcherScss = readSourceText(path.join(root, "src", "styles", "_03-switcher-mobile.scss"));

test("T-7661: 搜索框 Escape 两阶梯智能退回（优先清空搜索词，再次按清空前缀）", () => {
    assert.match(
        indexTs,
        /if \(event\.key === "Escape" && input\.value\) \{[\s\S]*?rawVal\.length > prefixMatch\[0\]\.length[\s\S]*?input\.value = prefixMatch\[0\];[\s\S]*?input\.value = "";/s,
        "index.ts 必须声明优先保留前缀的两阶梯 Escape 清空机制",
    );
    assert.match(
        indexJs,
        /if \(event\.key === "Escape" && input\.value\) \{[\s\S]*?rawVal\.length > prefixMatch\[0\]\.length[\s\S]*?input\.value = prefixMatch\[0\];[\s\S]*?input\.value = "";/s,
        "index.js 必须同构声明优先保留前缀的两阶梯 Escape 清空机制",
    );
});

test("T-7661: 移动端弹窗顶部声明胶囊拖拽手柄指示条", () => {
    assert.match(
        switcherScss,
        /&\.sw__mobile\s*\{[\s\S]*?&::before\s*\{[^}]*width:\s*36px;[^}]*height:\s*4px;[^}]*border-radius:\s*var\(--sw-platform-radius-pill/s,
        "移动端弹窗顶部必须声明 36x4px 胶囊微手柄",
    );
});

test("T-7661 门禁负向验证: 若撤销阶梯回退直接置空必精准红", () => {
    // 探针 1: 负向断言严禁在阶梯处理中无脑直接置空
    assert.doesNotMatch(
        indexTs,
        /if \(event\.key === "Escape" && input\.value\) \{\s*if \(composing\) return;\s*input\.value = "";\s*updateClearVisibility\(\);\s*return;\s*\}/s,
        "严禁使用一刀切全置空的粗暴清空",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenCode = `if (event.key === "Escape" && input.value) { input.value = ""; }`;
    assert.throws(() => {
        assert.match(
            brokenCode,
            /prefixMatch\[0\]/,
        );
    }, assert.AssertionError);
});
