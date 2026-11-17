// tests/floating-ball-bento-and-keycap-contract.test.cjs
// 契约测试：悬浮球首层动作 Bento 软影、更多面板 18px 大圆角与数字槽物理机械键帽（T-7726~T-7729）
// 1. 验证 .sw__floating-ball-action 声明 var(--sw-card-float-bg)、14px 圆角与 var(--sw-shadow-bento)；
// 2. 验证 .sw__floating-ball-more 声明 var(--sw-radius-panel, 18px) 与 var(--sw-shadow-bento)；
// 3. 验证 .sw__floating-ball-more-row[data-digit]::before 声明 2px 物理键帽底边、线性渐变与等宽数字；
// 4. 负向验证探针：若破坏动作卡片 Bento 软影或数字键帽物理底边，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const fabScss = fs.readFileSync(path.join(ROOT, "src/styles/_04-fab-fullscreen-soft.scss"), "utf8");
const moreScss = fs.readFileSync(path.join(ROOT, "src/styles/_floating-ball-more.scss"), "utf8");

test("T-7726: 悬浮球首层动作白卡浮起、14px 圆角与 Bento 软影加固", () => {
    assert.match(
        fabScss,
        /\.sw__floating-ball-action\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        ".sw__floating-ball-action 必须声明 var(--sw-card-float-bg) 白卡浮起"
    );
    assert.match(
        fabScss,
        /\.sw__floating-ball-action\s*\{[\s\S]*?border-radius:\s*var\(--sw-radius-card,\s*14px\);/s,
        ".sw__floating-ball-action 必须统合为 14px 卡片级圆角"
    );
    assert.match(
        fabScss,
        /\.sw__floating-ball-action\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s,
        ".sw__floating-ball-action 必须声明 var(--sw-shadow-bento) 深度软影"
    );
    assert.match(
        fabScss,
        /\.sw__floating-ball-action\s*\{[\s\S]*?&:hover[\s\S]*?transform:\s*translateY\(-1px\);/s,
        ".sw__floating-ball-action hover 态必须声明 translateY(-1px) 轻微抬升"
    );
});

test("T-7727: 更多动作面板 18px 大圆角与 Bento 深度毛玻璃微光切面", () => {
    assert.match(
        moreScss,
        /\.sw-fab-root\.sw__fab\s+\.sw__floating-ball-more\s*\{[\s\S]*?border-radius:\s*var\(--sw-radius-panel,\s*18px\);/s,
        ".sw__floating-ball-more 必须声明 18px 面板级大圆角"
    );
    assert.match(
        moreScss,
        /\.sw-fab-root\.sw__fab\s+\.sw__floating-ball-more\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\)/s,
        ".sw__floating-ball-more 必须接入 var(--sw-shadow-bento)"
    );
});

test("T-7728: 更多面板 1~9 数字直达槽立体机械键帽标准统合", () => {
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-row\[data-digit\]\s*\{[\s\S]*?&::before\s*\{[\s\S]*?border-bottom:\s*2px solid/s,
        "数字槽芯片必须声明下沉微凸 2px 物理键帽底边框"
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-row\[data-digit\]\s*\{[\s\S]*?&::before\s*\{[\s\S]*?linear-gradient/s,
        "数字槽芯片必须声明线性渐变键帽背景"
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-row\[data-digit\]\s*\{[\s\S]*?&::before\s*\{[\s\S]*?font-variant-numeric:\s*tabular-nums;/s,
        "数字槽芯片必须声明 font-variant-numeric: tabular-nums 等宽数字"
    );
});

test("T-7729 负向验证探针：若破坏动作卡片 Bento 软影或数字键帽物理底边必精准拦截", () => {
    // 探针 1：验证动作卡片 Bento 软影
    function checkFabActionBento(css) {
        return /\.sw__floating-ball-action\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s.test(css);
    }
    assert.equal(checkFabActionBento(fabScss), true);

    assert.throws(() => {
        const brokenCss = fabScss.replace("box-shadow: var(--sw-shadow-bento);", "box-shadow: none;");
        if (!checkFabActionBento(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_FAB_ACTION_BENTO: 悬浮球首层动作丢失 var(--sw-shadow-bento) 软影");
        }
    }, /PROBE_DETECTED_MISSING_FAB_ACTION_BENTO/, "破坏性负向探针必须精准捕获悬浮球卡片软影丢失缺陷");

    // 探针 2：验证数字槽机械键帽 2px 物理底边
    function checkKeycapBottom(css) {
        return /\.sw__floating-ball-more-row\[data-digit\]\s*\{[\s\S]*?&::before\s*\{[\s\S]*?border-bottom:\s*2px solid/s.test(css);
    }
    assert.equal(checkKeycapBottom(moreScss), true);

    assert.throws(() => {
        const brokenCss = moreScss.replace("border-bottom: 2px solid", "border-bottom: 1px solid");
        if (!checkKeycapBottom(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_KEYCAP_BOTTOM: 数字槽芯片丢失 2px 物理机械键帽底边");
        }
    }, /PROBE_DETECTED_MISSING_KEYCAP_BOTTOM/, "破坏性负向探针必须精准捕获数字键帽物理底边丢失缺陷");
});
