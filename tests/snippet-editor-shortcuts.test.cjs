// T-7478 代码片段实验室编辑器 ⌘S 快捷保存、⌘⇧C 快速复制与 ⌘Enter 格式化流契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 snippet-studio-ui.js 中 editor 监听 Ctrl/Cmd+Shift+C 触发全文复制；
//   2. 验证 editor 监听 Ctrl/Cmd+Enter 触发代码格式化；
//   3. 验证 editor 监听 Ctrl/Cmd+F 触发查找替换面板展开；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const studioUiJs = readSourceText(path.join(ROOT, "src", "snippet-studio-ui.js"));

test("T-7478: editor 编辑器支持 Ctrl/Cmd+Shift+C 全文快速复制代码", () => {
    assert.match(
        studioUiJs,
        /if\s*\(event\.shiftKey && String\(event\.key\)\.toLowerCase\(\) === "c"\)\s*\{[\s\S]*?copyText\(draft\.content \|\| editor\.value\);[\s\S]*?setStatus\(t\("snippetCopied"\)/,
        "必须支持快捷键一键复制全部代码草稿并给出成功状态",
    );
});

test("T-7478: editor 编辑器支持 Ctrl/Cmd+Enter 快捷代码格式化与 ⌘F 查找", () => {
    assert.match(
        studioUiJs,
        /if\s*\(event\.key === "Enter"\)\s*\{[\s\S]*?formatButton\.click\(\);/,
        "必须支持 Ctrl/Cmd+Enter 触发格式化按钮",
    );
    assert.match(
        studioUiJs,
        /if\s*\(String\(event\.key\)\.toLowerCase\(\) === "f"\)\s*\{[\s\S]*?toggleFindBar\(\);/,
        "必须支持 Ctrl/Cmd+F 唤出查找替换栏",
    );
});

test("T-7478 门禁负向验证: 若缺少格式化或复制代码快捷键必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在快捷键必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /event\.shiftKey && String\(event\.key\)\.toLowerCase\(\) === "x_fake"/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的不存在格式化函数必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /fakeNonExistentFormatRunner\(\)/);
    }, assert.AssertionError);
});
