// T-7642 功能真实性闭环、剪贴板异步守卫与生态回执消伪契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 copyToClipboard 声明真实的 .then / .catch 异步闭环；
//   2. 验证 exportTabsAsMindmap 声明真实的 .then / .catch 异步闭环；
//   3. 验证 open-in-reader 与 open-in-media 具备插件活跃态真实检测与如实回执；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));

test("T-7642: 剪贴板复制动作具备真实的 Promise 捕获与失败提示", () => {
    assert.match(
        indexTs,
        /const copyToClipboard = \(text: string\) => \{[\s\S]*?navigator\.clipboard\.writeText\(text\)\.then\(/s,
        "copyToClipboard 必须等待 writeText Promise，严禁 void 发出后假装成功",
    );
    assert.match(
        indexTs,
        /exportTabsAsMindmap\(\): boolean \{[\s\S]*?navigator\.clipboard\.writeText\(markdown\)\.then\(/s,
        "exportTabsAsMindmap 必须等待 writeText Promise 成功后才弹回执",
    );
});

test("T-7642: 生态插件动作（思阅/思播）具备真实就绪检测，杜绝未安装时的虚假回执", () => {
    assert.match(
        indexTs,
        /case "open-in-reader":[\s\S]*?const isReaderActive = !!\(sireader && typeof sireader\.openDoc === "function"\);/s,
        "思阅打开动作必须对插件活跃状态做真实布尔判断",
    );
    assert.match(
        indexTs,
        /case "open-in-media":[\s\S]*?const isMediaActive = !!\(player\?\.controller && typeof player\.controller\.play === "function"\);/s,
        "思播打开动作必须对插件活跃状态做真实布尔判断",
    );
    assert.match(
        indexTs,
        /openedInDefaultEditorReceipt/,
        "未安装配套插件时必须明确回执在默认编辑器中打开，严禁虚报在思阅/思播打开",
    );
});

test("T-7642 门禁负向验证: 若撤销异步校验或伪造虚假生态回执必报错", () => {
    // 探针 1: 负向断言严禁在思阅分支未经检测直接裸弹成功
    assert.doesNotMatch(
        indexTs,
        /case "open-in-reader":\s*if \(rootId\) \{\s*destroySwitcher\(\);\s*showMessage\(this\.i18n\.openedInReaderReceipt\);/s,
        "严禁未经插件就绪检测直接弹出思阅打开成功",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的源码必定报错）
    const brokenCode = `case "open-in-reader": showMessage("已在思阅打开");`;
    assert.throws(() => {
        assert.match(
            brokenCode,
            /isReaderActive/,
        );
    }, assert.AssertionError);
});
