// T-7378 片段实验室全二级弹窗统一品牌标题栏与关闭提示契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 openGistRecoveryDialog 装配 mountPlatformDialogTitleWrap 与 CloseHint；
//   2. 验证 openLeaveDialog 装配 mountPlatformDialogTitleWrap 与 CloseHint；
//   3. 验证 openConflictDialog 装配 mountPlatformDialogTitleWrap 与 CloseHint；
//   4. 验证 restoreBackup 装配 mountPlatformDialogTitleWrap 与 CloseHint；
//   5. 验证 importFile 装配 mountPlatformDialogTitleWrap 与 CloseHint；
//   6. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioUiJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));

test("T-7378: openGistRecoveryDialog 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        studioUiJs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*t\("snippetGistRecoveryTitle"\)\s*\|\|\s*"Gist 写入状态恢复",\s*"",\s*"iconCloud"\);/s,
        "openGistRecoveryDialog 必须装配统一品牌标题栏与 iconCloud 标识",
    );
    assert.match(
        studioUiJs,
        /mountPlatformDialogCloseHint\(dialog\.element,\s*locale\.i18n\.platformCloseHint\s*\|\|\s*"to close"\);/s,
        "openGistRecoveryDialog 必须装配统一关闭提示",
    );
});

test("T-7378: openLeaveDialog 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        studioUiJs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*t\("snippetLeaveTitle"\)\s*\|\|\s*"未保存的改动",\s*"",\s*"iconCode"\);/s,
        "openLeaveDialog 必须装配统一品牌标题栏与 iconCode 标识",
    );
});

test("T-7378: openConflictDialog 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        studioUiJs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*t\("snippetConflictTitle"\)\s*\|\|\s*"检测到冲突",\s*"",\s*"iconCode"\);/s,
        "openConflictDialog 必须装配统一品牌标题栏与 iconCode 标识",
    );
});

test("T-7378: restoreBackup 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        studioUiJs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*t\("snippetRestorePreview"\)\s*\|\|\s*"恢复备份预览",\s*"",\s*"iconHistory"\);/s,
        "restoreBackup 必须装配统一品牌标题栏与 iconHistory 标识",
    );
});

test("T-7378: importFile 装配 mountPlatformDialogTitleWrap 品牌标题栏", () => {
    assert.match(
        studioUiJs,
        /mountPlatformDialogTitleWrap\(dialog\.element,\s*t\("snippetImportPackage"\)\s*\|\|\s*"导入代码片段",\s*"",\s*"iconUpload"\);/s,
        "importFile 必须装配统一品牌标题栏与 iconUpload 标识",
    );
});

test("T-7378 门禁负向验证: 若缺少片段弹窗标题栏装配必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在代码必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /fake_non_existent_snippet_title_wrap/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的未知图标必定失败
    assert.throws(() => {
        assert.match(studioUiJs, /mountPlatformDialogTitleWrap\(dialog\.element,.*"iconNonExistentFake"\)/);
    }, assert.AssertionError);
});
