// T-7798~T-7801: 代码片段实验室代码树、分类过滤胶囊与诊断面板 Bento 现代化契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-studio__library-item 声明白卡浮起底色、8px 圆角、hover 1.5px 位移与 active scale(0.98)；
//   2. 验证 .sw-studio__library-filter 声明全圆角软胶囊规范、白卡底色与 active scale(0.96)；
//   3. 验证 .sw-studio__diagnostics 与 .sw-studio__conflict-diff 声明白卡浮起与 Bento 阴影规范；
//   4. 包含三重破坏性负向验证探针，拦截丢失微位移、丢失胶囊规格或破坏控制台白卡底色违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioScss = readSourceText(path.join(root, "src", "styles", "_snippet-studio.scss"));

test("T-7798: 实验室代码片段树条目 Bento 浮卡与触感微位移升级", () => {
    assert.match(
        studioScss,
        /&__library-item\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "代码树列表项必须声明白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        studioScss,
        /&__library-item\s*\{[^}]*border-radius:\s*var\(--sw-radius-md,\s*8px\);/s,
        "代码树列表项必须统合为 8px 中等圆角",
    );
    assert.match(
        studioScss,
        /&__library-item\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "代码树列表项必须声明精微低层级阴影 --sw-shadow-xs",
    );
    assert.match(
        studioScss,
        /&__library-item\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        "代码树列表项悬停必须声明 1.5px 平滑横向微位移",
    );
    assert.match(
        studioScss,
        /&__library-item\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*translateX\(1\.5px\)\s*scale\(0\.98\);/s,
        "代码树列表项按下必须声明 scale(0.98) 物理触感反馈",
    );
    assert.match(
        studioScss,
        /&__library-toggle\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "启用开关必须统合为全圆角软胶囊规范",
    );
    assert.match(
        studioScss,
        /&__library-copy\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*scale\(0\.95\);/s,
        "快捷复制按钮按下必须声明 scale(0.95) 物理弹性压缩",
    );
});

test("T-7799: 实验室过滤分类胶囊软胶囊化与等宽数字排版", () => {
    assert.match(
        studioScss,
        /&__library-filter\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "过滤分类按钮必须统合为全圆角软胶囊规范",
    );
    assert.match(
        studioScss,
        /&__library-filter\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "过滤分类按钮必须声明白卡浮起底色",
    );
    assert.match(
        studioScss,
        /&__library-filter\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*scale\(0\.96\);/s,
        "过滤分类按钮按下必须声明 scale(0.96) 物理触感反馈",
    );
    assert.match(
        studioScss,
        /&__library-count\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        "片段总数计数必须声明 tabular-nums 等宽排版",
    );
});

test("T-7800: 诊断控制台与冲突比对 Bento 浮卡加固", () => {
    assert.match(
        studioScss,
        /\.sw-studio__diagnostics\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "诊断控制台必须声明白卡浮起底色",
    );
    assert.match(
        studioScss,
        /\.sw-studio__diagnostics\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "诊断控制台必须声明标准低层级柔影",
    );
    assert.match(
        studioScss,
        /\.sw-studio__diagnostics-row\s*\{[\s\S]*?&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        "诊断结果行悬停必须声明 1.5px 平滑横向微位移",
    );
    assert.match(
        studioScss,
        /\.sw-studio__conflict-diff\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "冲突比对容器必须声明白卡浮起底色",
    );
    assert.match(
        studioScss,
        /\.sw-studio__conflict-diff\s*\{[^}]*border-radius:\s*var\(--sw-radius-card,\s*14px\);/s,
        "冲突比对容器必须统合为 14px 卡片大圆角",
    );
});

test("T-7801 破坏性负向验证探针：若树条目丢失位移、分类丢失胶囊或控制台丢失白卡必精确报错", () => {
    // 探针 1: 模拟若代码树条目丢失了 hover translateX(1.5px) 位移动效
    const brokenItemShiftScss = studioScss.replace(
        /(&__library-item\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*)translateX\(1\.5px\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenItemShiftScss,
            /&__library-item\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        );
    }, assert.AssertionError, "代码树列表项丢失横向微位移时断言必须失败");

    // 探针 2: 模拟若分类过滤按钮丢失了胶囊规格
    const brokenFilterPillScss = studioScss.replace(
        /(&__library-filter\s*\{[^}]*border-radius:\s*)var\(--sw-platform-radius-pill,\s*999px\);/,
        "$10;",
    );
    assert.throws(() => {
        assert.match(
            brokenFilterPillScss,
            /&__library-filter\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        );
    }, assert.AssertionError, "过滤分类按钮丢失胶囊规格时断言必须失败");

    // 探针 3: 模拟若诊断控制台丢失了 var(--sw-card-float-bg)
    const brokenDiagBgScss = studioScss.replace(
        /(\.sw-studio__diagnostics\s*\{[^}]*background:\s*)var\(--sw-card-float-bg/g,
        "$1var(--sw-broken-bg",
    );
    assert.throws(() => {
        assert.match(
            brokenDiagBgScss,
            /\.sw-studio__diagnostics\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        );
    }, assert.AssertionError, "诊断控制台丢失白卡底色时断言必须失败");
});
