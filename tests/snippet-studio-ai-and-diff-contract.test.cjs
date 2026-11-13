// T-7802~T-7805: 代码片段实验室 AI 助手面板与代码比对行 Bento 现代化契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-studio__ai 声明微底托盘与柔和边线；
//   2. 验证 .sw-studio__ai-collapse-toggle 声明白卡浮起、低层级阴影、hover scale(1.08) 与 active scale(0.94)；
//   3. 验证 .sw-studio__prompt 与 .sw-studio__ai-result 声明白卡浮起、10px 控件圆角与聚焦外发光环；
//   4. 验证 .sw-studio__diff-hunk-head 声明白卡浮起与全圆角胶囊规格；
//   5. 包含三重破坏性负向验证探针，拦截丢失白卡底色、丢失缩放触觉或破坏胶囊规格违规。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioScss = readSourceText(path.join(root, "src", "styles", "_snippet-studio.scss"));
const polishScss = readSourceText(path.join(root, "src", "styles", "_11-ui-polish.scss"));

test("T-7802: AI 伴侣栏 Bento 浮卡底座与折叠手柄弹性触感升级", () => {
    assert.match(
        studioScss,
        /&__ai\s*\{[^}]*background:\s*var\(--sw-bg-tinted/s,
        "AI 伴侣栏必须声明微底托盘 --sw-bg-tinted",
    );
    assert.match(
        studioScss,
        /&__ai\s*\{[^}]*border-left:\s*1px solid var\(--sw-color-line-soft/s,
        "AI 伴侣栏左侧必须声明柔和边线分割",
    );
    assert.match(
        studioScss,
        /&__ai-collapse-toggle\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "AI 折叠按钮必须声明白卡浮起底色",
    );
    assert.match(
        studioScss,
        /&__ai-collapse-toggle\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "AI 折叠按钮必须声明低层级柔影",
    );
    assert.match(
        studioScss,
        /&__ai-collapse-toggle\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*scale\(1\.08\);/s,
        "AI 折叠按钮悬停必须声明 scale(1.08) 放大指示",
    );
    assert.match(
        studioScss,
        /&__ai-collapse-toggle\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*scale\(0\.94\);/s,
        "AI 折叠按钮按下必须声明 scale(0.94) 物理弹性压缩",
    );
});

test("T-7803: 提示词输入框与结果面板白卡浮起与微光外发光聚焦环加固", () => {
    assert.match(
        studioScss,
        /&__prompt\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "提示词输入框必须声明白卡浮起底色",
    );
    assert.match(
        studioScss,
        /&__prompt\s*\{[^}]*border-radius:\s*var\(--sw-radius-control,\s*10px\);/s,
        "提示词输入框必须统合为 10px 控件圆角",
    );
    assert.match(
        studioScss,
        /&__prompt\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "提示词输入框必须声明标准低层级柔影",
    );
    assert.match(
        studioScss,
        /&__prompt\s*\{[\s\S]*?&:focus\s*\{[^}]*box-shadow:\s*var\(--sw-focus-glow\);/s,
        "提示词输入框聚焦必须激活 --sw-focus-glow 外发光微环",
    );
    assert.match(
        studioScss,
        /&__ai-result\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "AI 结果面板必须声明白卡浮起底色",
    );
    assert.match(
        studioScss,
        /&__ai-result\s*\{[^}]*border-radius:\s*var\(--sw-radius-control,\s*10px\);/s,
        "AI 结果面板必须统合为 10px 控件圆角",
    );
    assert.match(
        studioScss,
        /&__ai-empty\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "AI 空状态占位卡片必须声明白卡浮起底色",
    );
    assert.match(
        polishScss,
        /\.sw-studio__prompt\s*\{[^}]*border-radius:\s*var\(--sw-radius-control,\s*10px\);/s,
        "最终抛光层提示词输入框必须对齐 10px 控件圆角",
    );
});

test("T-7804: 候选对比 Hunk 审查头部白卡胶囊化与对比行等宽触觉加固", () => {
    assert.match(
        studioScss,
        /&__diff-hunk-head\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        "Hunk 审查头部必须声明白卡浮起底色",
    );
    assert.match(
        studioScss,
        /&__diff-hunk-head\s*\{[^}]*border-radius:\s*var\(--studio-radius-pill/s,
        "Hunk 审查头部必须统合为全圆角软胶囊规范",
    );
    assert.match(
        studioScss,
        /&__diff-hunk-head\s*\{[^}]*box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "Hunk 审查头部必须声明标准低层级柔影",
    );
    assert.match(
        studioScss,
        /&__diff-hunk-head\s*\{[\s\S]*?&:active\s*\{[^}]*scale\(0\.96\);/s,
        "Hunk 审查头部按下必须声明 scale(0.96) 物理微反馈",
    );
    assert.match(
        studioScss,
        /&__diff-row\s*\{[^}]*font-family:\s*var\(--sw-font-mono/s,
        "对比代码行必须统一接入平台等宽字体 --sw-font-mono",
    );
    assert.match(
        studioScss,
        /&__diff-row\s*\{[\s\S]*?&:hover\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--studio-accent\)/s,
        "对比代码行悬停必须提供精微背景高光指示",
    );
});

test("T-7805 破坏性负向验证探针：若提示框丢失白卡、折叠按钮丢失缩放或Hunk头丢失胶囊必精确报错", () => {
    // 探针 1: 模拟若提示词输入框丢失了 var(--sw-card-float-bg)
    const brokenPromptBgScss = studioScss.replace(
        /(&__prompt\s*\{[^}]*background:\s*)var\(--sw-card-float-bg/s,
        "$1var(--sw-broken-bg",
    );
    assert.throws(() => {
        assert.match(
            brokenPromptBgScss,
            /&__prompt\s*\{[^}]*background:\s*var\(--sw-card-float-bg/s,
        );
    }, assert.AssertionError, "提示词输入框丢失白卡底色时断言必须失败");

    // 探针 2: 模拟若折叠按钮丢失了 hover scale(1.08)
    const brokenToggleScaleScss = studioScss.replace(
        /(&__ai-collapse-toggle\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*)scale\(1\.08\);/s,
        "$1none;",
    );
    assert.throws(() => {
        assert.match(
            brokenToggleScaleScss,
            /&__ai-collapse-toggle\s*\{[^}]*?&:hover\s*\{[^}]*transform:\s*scale\(1\.08\);/s,
        );
    }, assert.AssertionError, "AI 折叠按钮丢失 hover 放大动效时断言必须失败");

    // 探针 3: 模拟若 Hunk 审查头部丢失了胶囊规格
    const brokenHunkHeadPillScss = studioScss.replace(
        /(&__diff-hunk-head\s*\{[^}]*border-radius:\s*)var\(--studio-radius-pill/s,
        "$10;",
    );
    assert.throws(() => {
        assert.match(
            brokenHunkHeadPillScss,
            /&__diff-hunk-head\s*\{[^}]*border-radius:\s*var\(--studio-radius-pill/s,
        );
    }, assert.AssertionError, "Hunk 审查头部丢失胶囊规格时断言必须失败");

    // 无障碍减动效覆盖验证
    assert.match(
        polishScss,
        /\.sw-studio__ai-collapse-toggle,\s*[\s\S]*?\.sw-studio__diff-hunk-head,\s*[\s\S]*?\.sw-studio__prompt,\s*[\s\S]*?\.sw-studio__ai-result[\s\S]*?\{[^}]*transform:\s*none\s*!important;/s,
        "减动效媒体查询必须完整覆盖 AI 折叠按钮、Hunk 头部、提示词输入框与结果面板",
    );
});
