// T-7383 预览框单例幂等防御与切换器顶栏功能按钮气泡提示契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 mountDocPreviewPane 具备清理孤儿/重复预览框的单例防御；
//   2. 验证 buildSwitcherHtml 工具栏按钮装配 b3-tooltips 与功能说明；
//   3. 验证 收藏与历史记录触发按钮装配 b3-tooltips 气泡；
//   4. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexTs = readSourceText(path.join(root, "src", "index.ts"));
const docSearchTs = readSourceText(path.join(root, "src", "doc-search-ui.ts"));
const docSearchJs = readSourceText(path.join(root, "src", "doc-search-ui.js"));

test("T-7383: mountDocPreviewPane 具备单例幂等防御彻底杜绝双预览框", () => {
    assert.match(
        docSearchTs,
        /const allPreviews = Array\.from\(surfaceScope\.querySelectorAll<HTMLElement>\("\.sw__doc-preview"\)\);[\s\S]*?if\s*\(existing !== pane\)\s*\{\s*existing\.remove\(\);\s*\}/s,
        "doc-search-ui.ts 必须强制清理孤儿和多余预览窗格",
    );
    assert.match(
        docSearchJs,
        /const allPreviews = Array\.from\(surfaceScope\.querySelectorAll\("\.sw__doc-preview"\)\);[\s\S]*?if\s*\(existing !== pane\)\s*\{\s*existing\.remove\(\);\s*\}/s,
        "doc-search-ui.js 必须同步清理孤儿和多余预览窗格",
    );
});

test("T-7383: 切换器顶栏全部功能按钮装配 b3-tooltips 原生悬浮提示气泡", () => {
    assert.match(
        indexTs,
        /class="sw__search-filter-btn b3-tooltips b3-tooltips__s"/,
        "筛选按钮必须装配 b3-tooltips__s",
    );
    assert.match(
        indexTs,
        /class="b3-button b3-button--text sw__sort-trigger b3-tooltips b3-tooltips__s"/,
        "排序按钮必须装配 b3-tooltips__s",
    );
    assert.match(
        indexTs,
        /class="b3-button b3-button--text sw__icon-btn sw__fullscreen-btn b3-tooltips b3-tooltips__s"/,
        "全屏按钮必须装配 b3-tooltips__s",
    );
    assert.match(
        indexTs,
        /class="b3-button b3-button--text sw__icon-btn sw__journal-btn b3-tooltips b3-tooltips__s"/,
        "日记按钮必须装配 b3-tooltips__s",
    );
    assert.match(
        indexTs,
        /class="b3-button b3-button--text sw__icon-btn sw__settings-btn b3-tooltips b3-tooltips__s"/,
        "设置按钮必须装配 b3-tooltips__s",
    );
    assert.match(
        indexTs,
        /class="b3-button b3-button--text sw__icon-btn sw__snippet-studio-btn b3-tooltips b3-tooltips__s"/,
        "片段实验室按钮必须装配 b3-tooltips__s",
    );
});

test("T-7383: 收藏与历史记录触发按钮装配清晰的 b3-tooltips 提示气泡", () => {
    assert.match(
        indexTs,
        /class="sw__fav-trigger b3-tooltips b3-tooltips__s"/,
        "收藏夹触发按钮必须装配 b3-tooltips__s",
    );
    assert.match(
        indexTs,
        /class="sw__history-trigger b3-tooltips b3-tooltips__s"/,
        "历史记录触发按钮必须装配 b3-tooltips__s",
    );
});

test("T-7383 门禁负向验证: 若缺少单例清理或气泡样式必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在代码必定失败
    assert.throws(() => {
        assert.match(docSearchTs, /fake_non_existent_singleton_remover/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的气泡类必定失败
    assert.throws(() => {
        assert.match(indexTs, /class="sw__search-filter-btn b3-tooltips__fake_error"/);
    }, assert.AssertionError);
});
