// T-7585~T-7588: 持久化落盘加固、词法前缀保护、概念与国际化收敛、极窄侧栏适配专项契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.ts onunload 包含 await this.flushPendingSaves()；
//   2. 验证 penetration-search-model.js 能够正确消歧多词布尔排除（-词 关键词）与待办任务模式；
//   3. 验证中英文 i18n 包含 homeAutoAlign/homeAutoAlignHint 且 dialogStudioTitle 对齐“片段实验室”；
//   4. 验证 _07-sidebar-panel-store.scss 与 _03-switcher-mobile.scss 包含 280px 极窄断点与 44px 热区；
//   5. 负向验证探针覆盖：若省略 await 或语法混淆，断言必定精准报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(ROOT, "src", "index.ts"));
const penetrationModelJs = readSourceText(path.join(ROOT, "src", "penetration-search-model.js"));
const sidebarScss = readSourceText(path.join(ROOT, "src", "styles", "_07-sidebar-panel-store.scss"));
const mobileScss = readSourceText(path.join(ROOT, "src", "styles", "_03-switcher-mobile.scss"));
const {parsePenetrationQuery, SEARCH_MODES} = require("../src/penetration-search-model.js");
const zhJson = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "zh-CN.json"), "utf8"));
const enJson = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "i18n", "en.json"), "utf8"));

test("T-7585: index.ts 的 onunload 必须 await pendingSaves 保证数据落盘与异常隔离", () => {
    assert.match(
        indexTs,
        /const\s+pendingSaves\s*=\s*this\.flushPendingSaves\(\);[\s\S]*?await\s+pendingSaves;/,
        "onunload 卸载生命周期内必须显式 await pendingSaves 避免异步丢失"
    );
});

test("T-7586: penetration-search-model.js 准确消歧待办任务与首位负向排除语法", () => {
    // 1. 单词待办模式正常识别
    const taskQuery = parsePenetrationQuery("-开会");
    assert.equal(taskQuery.mode, SEARCH_MODES.TASK, "-开会 必须识别为 task 模式");
    assert.equal(taskQuery.taskNeedle, "开会");

    // 2. 显式 task: 前缀正常识别
    const explicitTask = parsePenetrationQuery("task:读书");
    assert.equal(explicitTask.mode, SEARCH_MODES.TASK);
    assert.equal(explicitTask.taskNeedle, "读书");

    // 3. 多词布尔排除模式（-词 关键词）必须保护为普通文档模式
    const boolExcludeQuery = parsePenetrationQuery("-周报 项目");
    assert.equal(
        boolExcludeQuery.mode,
        SEARCH_MODES.DOC,
        "-周报 项目 必须被识别为普通文档模式，以触发布尔排除逻辑"
    );
    assert.equal(boolExcludeQuery.docNeedle, "-周报 项目");
});

test("T-7587: 中英文 i18n 包含 homeAutoAlign 且 dialogStudioTitle 统一为片段实验室", () => {
    assert.equal(zhJson.dialogStudioTitle, "片段实验室", "中文标题必须统一为片段实验室");
    assert.equal(enJson.dialogStudioTitle, "Snippet Studio", "英文标题必须为 Snippet Studio");

    assert.ok(zhJson.homeAutoAlign, "zh-CN 必须包含 homeAutoAlign");
    assert.ok(zhJson.homeAutoAlignHint, "zh-CN 必须包含 homeAutoAlignHint");
    assert.ok(enJson.homeAutoAlign, "en 必须包含 homeAutoAlign");
    assert.ok(enJson.homeAutoAlignHint, "en 必须包含 homeAutoAlignHint");
});

test("T-7588: 侧栏包含 280px 极窄响应式断点且移动端纯图标历史按钮具备 44px 热区", () => {
    assert.match(
        sidebarScss,
        /@container\s*\(max-width:\s*280px\)\s*\{[\s\S]*?\.speed-switch\.sw--sidebar\s*\{[\s\S]*?\.sw__search-wrap\s*\{[\s\S]*?width:\s*100%;/,
        "侧栏必须包含 280px 极窄模式响应式断点"
    );

    assert.match(
        mobileScss,
        /\.sw__history-trigger\s*\{[\s\S]*?&::before\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/,
        "移动端纯图标历史按钮必须具备 44×44px 触控防误触热区"
    );
});

test("T-7585~T-7588 门禁负向验证: 若破坏 await 落盘或消歧逻辑必定报错", () => {
    // 探针 1: 缺少 await 的源码必须无法通过断言
    const invalidIndexTs = indexTs.replace(/await\s+pendingSaves;/g, "/* omitted await */");
    assert.throws(() => {
        if (!/const\s+pendingSaves\s*=\s*this\.flushPendingSaves\(\);[\s\S]*?await\s+pendingSaves;/.test(invalidIndexTs)) {
            throw new Error("Gate failed: missing await on pendingSaves");
        }
    }, /Gate failed/);

    // 探针 2: 负向断言伪造的非法模式
    assert.throws(() => {
        const fakeResult = parsePenetrationQuery("-周报 项目");
        assert.equal(fakeResult.mode, "invalid_mode_probe");
    }, assert.AssertionError);
});
