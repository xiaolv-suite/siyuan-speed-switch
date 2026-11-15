// T-7782~T-7785: 悬浮球更多操作面板 Bento 白卡浮起、选项微位移与管理胶囊契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw__floating-ball-more-search 声明白卡底色、10px 圆角与 focus-glow 焦点环；
//   2. 验证 .sw__floating-ball-action.is-more-item 声明独立白卡浮起、hover 1.5px 横向位移与 active 按压缩放；
//   3. 验证 .sw__floating-ball-more-manage 声明全圆角软胶囊规范、白卡底色与 --sw-rim-light 微反光边缘；
//   4. 包含三重破坏性负向验证探针，拦截丢失微位移、丢失白卡底色或破坏胶囊规格违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const moreScss = readSourceText(path.join(root, "src", "styles", "_floating-ball-more.scss"));

test("T-7782: 悬浮球更多操作搜索框 Bento 白卡底色与发光焦点环升级", () => {
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-search\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "搜索输入框必须声明白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-search\s*\{[^}]*border-radius:\s*var\(--sw-radius-control,\s*10px\);/s,
        "搜索输入框必须统合为 10px 控件级圆角",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-search\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "搜索输入框必须声明精微低层级阴影 --sw-shadow-xs",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-search\s*\{[\s\S]*?&:focus\s*\{[^}]*box-shadow:\s*var\(--sw-focus-glow\);/s,
        "搜索输入框聚焦态必须声明主题色发光微环 --sw-focus-glow",
    );
});

test("T-7783: 更多动作卡片条目 Bento 独立白卡浮起与横向微位移加固", () => {
    assert.match(
        moreScss,
        /\.sw__floating-ball-action\.is-more-item\s*\{[^}]*background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        "动作条目必须声明白卡浮起底色 --sw-card-float-bg",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-action\.is-more-item\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "动作条目必须声明常态精微阴影 --sw-shadow-xs",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-action\.is-more-item\s*\{[\s\S]*?&:hover:not\(:disabled\)\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        "动作条目悬停必须声明 1.5px 平滑横向微位移",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-action\.is-more-item\s*\{[\s\S]*?&:hover:not\(:disabled\)\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-sm\);/s,
        "动作条目悬停必须声明阴影扩展 --sw-shadow-sm",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-action\.is-more-item\s*\{[\s\S]*?&:active:not\(:disabled\)\s*\{[^}]*transform:\s*translateX\(1\.5px\)\s*scale\(0\.98\);/s,
        "动作条目按下必须声明 scale(0.98) 物理触感反馈",
    );
});

test("T-7784: 悬浮球快捷动作管理按钮全圆角胶囊与微反光边缘加固", () => {
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-manage\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "管理按钮必须声明全圆角软胶囊规范",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-manage\s*\{[^}]*background:\s*var\(--sw-card-float-bg,\s*var\(--b3-theme-surface\)\);/s,
        "管理按钮必须声明白卡浮起底色",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-manage\s*\{[^}]*color:\s*var\(--sw-color-accent,\s*var\(--b3-theme-primary\)\);/s,
        "管理按钮前景色必须绑定主题主色",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-manage\s*\{[\s\S]*?&:hover\s*\{[^}]*box-shadow:\s*var\(--sw-rim-light/s,
        "管理按钮悬停态必须保持 --sw-rim-light 微反光边缘",
    );
});

test("T-7785 破坏性负向验证探针：若条目丢失微位移或管理按钮丢失胶囊规格必定精准拦截", () => {
    // 探针 1: 模拟若动作条目丢失了 hover translateX(1.5px) 位移动效
    const brokenItemShiftScss = moreScss.replace(
        /(\.sw__floating-ball-action\.is-more-item\s*\{[\s\S]*?&:hover:not\(:disabled\)\s*\{[^}]*transform:\s*)translateX\(1\.5px\);/,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenItemShiftScss,
            /\.sw__floating-ball-action\.is-more-item\s*\{[\s\S]*?&:hover:not\(:disabled\)\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s,
        );
    }, assert.AssertionError, "动作条目丢失横向微位移时断言必须失败");

    // 探针 2: 模拟若搜索框丢失了 var(--sw-card-float-bg)
    const brokenSearchBgScss = moreScss.replace(
        /(\.sw__floating-ball-more-search\s*\{[^}]*background:\s*)var\(--sw-card-float-bg,\s*var\(--b3-theme-background\)\);/,
        "$1transparent;",
    );
    assert.throws(() => {
        assert.match(
            brokenSearchBgScss,
            /\.sw__floating-ball-more-search\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        );
    }, assert.AssertionError, "搜索框丢失白卡底色时断言必须失败");

    // 探针 3: 模拟若管理按钮丢失了胶囊规格
    const brokenManagePillScss = moreScss.replace(
        /(\.sw__floating-ball-more-manage\s*\{[^}]*border-radius:\s*)var\(--sw-platform-radius-pill,\s*999px\);/,
        "$10;",
    );
    assert.throws(() => {
        assert.match(
            brokenManagePillScss,
            /\.sw__floating-ball-more-manage\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        );
    }, assert.AssertionError, "管理按钮丢失胶囊规格时断言必须失败");
});
