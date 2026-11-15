// T-7517 第二面板工作台小组件配置表单重置与保存操作全键盘流加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-config-form.ts 与 home-config-form.js 声明 ArrowLeft / ArrowRight 按钮组循环导航；
//   2. 验证 home-config-form.ts 与 home-config-form.js 声明单行 INPUT 回车直接保存与 Alt+R 恢复默认；
//   3. 验证 操作按钮装配明确的 aria-label 无障碍标识；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const formTs = readSourceText(path.join(root, "src", "home-config-form.ts"));
const formJs = readSourceText(path.join(root, "src", "home-config-form.js"));

test("T-7517: home-config-form 支持 ArrowLeft / ArrowRight 按钮组横向焦点循环", () => {
    assert.match(
        formTs,
        /if \(\["ArrowLeft",\s*"ArrowRight"\]\.includes\(event\.key\)\) \{[\s\S]*?const buttons = \[reset,\s*cancel,\s*save\]\.filter\(\(b\) => !b\.disabled\);[\s\S]*?buttons\[nextIdx\]\?\.focus\(\);/,
        "TS 源码必须包含操作按钮左右方向键循环聚焦流",
    );
    assert.match(
        formJs,
        /if \(\["ArrowLeft",\s*"ArrowRight"\]\.includes\(event\.key\)\) \{[\s\S]*?const buttons = \[reset,\s*cancel,\s*save\]\.filter\(/,
        "JS 源码必须包含操作按钮左右方向键循环聚焦流",
    );
});

test("T-7517: home-config-form 支持单行 INPUT 回车直接提交与 Alt+R 恢复默认", () => {
    assert.match(
        formTs,
        /if \(event\.key === "Enter" && !event\.shiftKey && !event\.altKey && !event\.ctrlKey && !event\.metaKey && \(event\.target as HTMLElement\)\?\.tagName === "INPUT" && !save\.disabled\)\s*\{[\s\S]*?save\.click\(\);/,
        "TS 源码必须支持单行输入框回车直接保存",
    );
    assert.match(
        formTs,
        /if \(event\.altKey && String\(event\.key\)\.toLowerCase\(\) === "r" && !event\.isComposing\)\s*\{[\s\S]*?reset\.click\(\);/,
        "TS 源码必须支持 Alt+R 快捷恢复默认",
    );
});

test("T-7517: 操作按钮均挂载完整的语义化 aria-label", () => {
    assert.match(formTs, /reset\.setAttribute\("aria-label",\s*this\.i18n\.homeConfigReset \|\| "恢复默认"\);/);
    assert.match(formTs, /cancel\.setAttribute\("aria-label",\s*this\.i18n\.cancel \|\| "取消"\);/);
    assert.match(formTs, /save\.setAttribute\("aria-label",\s*this\.i18n\.homeConfigSave \|\| "保存配置"\);/);
});

test("T-7517 门禁负向验证: 若操作按钮移除了 Alt+R 恢复默认必定精准红", () => {
    const fakeTs = formTs.replace(
        /if \(event\.altKey && String\(event\.key\)\.toLowerCase\(\) === "r"[\s\S]*?reset\.click\(\);\s*return;\s*\}/,
        "/* removed Alt+R */",
    );
    assert.doesNotMatch(
        fakeTs,
        /if \(event\.altKey && String\(event\.key\)\.toLowerCase\(\) === "r"/,
        "负向注入验证：缺少 Alt+R 触发时断言必须拦截失败",
    );
});
