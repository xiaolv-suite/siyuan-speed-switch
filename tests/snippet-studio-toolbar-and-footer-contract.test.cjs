// T-7806~T-7809: 代码片段实验室主顶栏工具项与状态底栏 Bento 现代化契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-studio__header-actions .sw-studio__button 声明软胶囊规范、白卡底色与 active scale(0.96)；
//   2. 验证 .sw-studio__footer 声明微底托盘、微光边框与 .sw-studio__status 等宽排版及状态小圆点；
//   3. 验证 .sw-studio__header 与 .sw-studio__section-bar 声明微底与柔和下边线；
//   4. 包含三重破坏性负向验证探针，拦截丢失胶囊规格、丢失等宽排版或破坏底栏微底违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioScss = readSourceText(path.join(root, "src", "styles", "_snippet-studio.scss"));
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7806: 实验室顶部主操作按钮全圆角软胶囊与弹性触觉加固", () => {
    assert.match(
        studioScss,
        /&__header-actions\s+\.sw-studio__button\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "顶栏操作按钮必须统合为全圆角软胶囊规范",
    );
    assert.match(
        studioScss,
        /&__header-actions\s+\.sw-studio__button\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "顶栏操作按钮必须声明白卡浮起底色",
    );
    assert.match(
        studioScss,
        /&__header-actions\s+\.sw-studio__button\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "顶栏操作按钮必须声明标准低层级柔影",
    );
    assert.match(
        studioScss,
        /&__header-actions\s+\.sw-studio__button\s*\{[\s\S]*?&:active:not\(:disabled\)\s*\{[^}]*transform:\s*scale\(0\.96\);/s,
        "顶栏操作按钮按下必须声明 scale(0.96) 物理触感反馈",
    );
    assert.match(
        studioScss,
        /&__button\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "通用按钮基类必须声明白卡浮起底色",
    );
    assert.match(
        studioScss,
        /&__button\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "通用按钮基类必须声明低层级柔影",
    );
    assert.match(
        polishScss,
        /\.sw-studio__header-actions\s+\.sw-studio__button\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        "最终抛光层顶栏操作按钮必须对齐软胶囊规范",
    );
});

test("T-7807: 实验室状态底栏 Bento 微底质感、边框与等宽状态文本加固", () => {
    assert.match(
        studioScss,
        /&__footer\s*\{[^}]*background:\s*var\(--sw-bg-tinted/s,
        "状态底栏必须声明微底托盘 --sw-bg-tinted",
    );
    assert.match(
        studioScss,
        /&__footer\s*\{[^}]*border-top:\s*1px solid var\(--sw-color-line-soft/s,
        "状态底栏顶部必须声明柔和边线",
    );
    assert.match(
        studioScss,
        /&__status\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        "状态信息文本必须声明 tabular-nums 等宽排版",
    );
    assert.match(
        studioScss,
        /&__status\s*\{[^}]*font-family:\s*var\(--sw-font-mono/s,
        "状态信息文本必须接入平台等宽字体 --sw-font-mono",
    );
    assert.match(
        studioScss,
        /&__status\s*\{[\s\S]*?&::before\s*\{[^}]*width:\s*6px;[^}]*height:\s*6px;[^}]*border-radius:\s*50%;/s,
        "状态指示文本必须具备 6px 呼吸色点第二通道",
    );
});

test("T-7808: 顶部标题栏与分段标题条微底微光边框对齐升级", () => {
    assert.match(
        studioScss,
        /&__header\s*\{[^}]*background:\s*var\(--sw-bg-tinted/s,
        "顶栏容器必须声明微底托盘 --sw-bg-tinted",
    );
    assert.match(
        studioScss,
        /&__header\s*\{[^}]*border-bottom:\s*1px solid var\(--sw-color-line-soft/s,
        "顶栏容器底部必须声明柔和分割线",
    );
    assert.match(
        studioScss,
        /&__section-bar\s*\{[^}]*border-bottom:\s*1px solid var\(--sw-color-line-soft/s,
        "分段标题条必须声明柔和分割细线",
    );
});

test("T-7809 破坏性负向验证探针：若顶栏按钮丢失胶囊、状态丢失等宽或底栏丢失微底必精确报错", () => {
    // 探针 1: 模拟若顶栏按钮丢失了软胶囊规格
    const brokenHeaderBtnPillScss = studioScss.replace(
        /(&__header-actions\s+\.sw-studio__button\s*\{[^}]*border-radius:\s*)var\(--sw-platform-radius-pill,\s*999px\);/,
        "$10;",
    );
    assert.throws(() => {
        assert.match(
            brokenHeaderBtnPillScss,
            /&__header-actions\s+\.sw-studio__button\s*\{[^}]*border-radius:\s*var\(--sw-platform-radius-pill,\s*999px\);/s,
        );
    }, assert.AssertionError, "顶栏操作按钮丢失胶囊规格时断言必须失败");

    // 探针 2: 模拟若状态底栏文本丢失了 tabular-nums
    const brokenStatusTabularScss = studioScss.replace(
        /(&__status\s*\{[^}]*font-variant-numeric:\s*)tabular-nums;/,
        "$1normal;",
    );
    assert.throws(() => {
        assert.match(
            brokenStatusTabularScss,
            /&__status\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/s,
        );
    }, assert.AssertionError, "状态信息文本丢失 tabular-nums 等宽排版时断言必须失败");

    // 探针 3: 模拟若状态底栏丢失了 var(--sw-bg-tinted)
    const brokenFooterBgScss = studioScss.replace(
        /(&__footer\s*\{[^}]*background:\s*)var\(--sw-bg-tinted/s,
        "$1var(--sw-broken-bg",
    );
    assert.throws(() => {
        assert.match(
            brokenFooterBgScss,
            /&__footer\s*\{[^}]*background:\s*var\(--sw-bg-tinted/s,
        );
    }, assert.AssertionError, "状态底栏丢失微底底色时断言必须失败");

    // 无障碍减动效覆盖验证
    assert.match(
        polishScss,
        /\.sw-studio__header-actions\s+\.sw-studio__button\s*\{[^}]*transform:\s*none\s*!important;/s,
        "减动效媒体查询必须完整覆盖顶栏操作按钮",
    );
});
