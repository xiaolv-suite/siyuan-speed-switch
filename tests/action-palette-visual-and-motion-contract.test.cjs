// tests/action-palette-visual-and-motion-contract.test.cjs
// 契约测试：动作画板外壳 Bento 阴影、选中条目位移流转与键帽按压反馈（T-7706~T-7709）
// 1. 验证 .sw__palette 声明 var(--sw-shadow-bento) 与 var(--sw-card-float-bg)；
// 2. 验证 .sw__palette-item.is-selected 声明 transform: translateX(1.5px)；
// 3. 验证选中条目图标声明 transform: scale(1.08)，键帽 :active 声明物理下沉；
// 4. 负向验证探针：若破坏选中平滑位移或使用字面量阴影，必精准拦截报错。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const polishScss = fs.readFileSync(path.join(ROOT, "src/styles/_11-ui-polish.scss"), "utf8");

test("T-7706: 动作画板外壳容器阴影收敛至 Bento 软影与浮层微反光", () => {
    assert.match(
        polishScss,
        /\.sw__palette\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento\);/s,
        ".sw__palette 必须统一消费 var(--sw-shadow-bento)"
    );
    assert.match(
        polishScss,
        /\.sw__palette\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        ".sw__palette 背景必须引用 var(--sw-card-float-bg)"
    );
    assert.match(
        polishScss,
        /\.sw__palette-search\s*\{[\s\S]*?border-bottom:\s*1px solid var\(--sw-color-line-soft/s,
        "画板搜索区底部分隔线必须采用柔和半透明线 var(--sw-color-line-soft)"
    );
});

test("T-7707: 动作条目键盘选中光标平滑微位移与流转动效加固", () => {
    assert.match(
        polishScss,
        /\.sw__palette-item\s*\{[\s\S]*?transition:[^;]*transform \$sw-dur-fast \$sw-ease/s,
        ".sw__palette-item 过渡动画必须包含 transform $sw-dur-fast $sw-ease"
    );
    assert.match(
        polishScss,
        /&\.is-selected\s*\{[\s\S]*?transform:\s*translateX\(1\.5px\);/s,
        "选中项 is-selected 必须声明 transform: translateX(1.5px) 增强移动连续性感官"
    );
});

test("T-7708: 选中条目图标主题色联动与键帽物理按下反馈", () => {
    assert.match(
        polishScss,
        /\.sw__palette-item\.is-selected\s+\.sw__palette-item-icon\s+svg\s*\{[\s\S]*?transform:\s*scale\(1\.08\);/s,
        "选中条目图标必须声明 transform: scale(1.08) 微动效联动"
    );
    assert.match(
        polishScss,
        /\.sw__palette-item-shortcut\s*\{[\s\S]*?&:active\s*\{[^}]*transform:\s*translateY\(1px\);/s,
        "机械键帽在 :active 态必须声明 transform: translateY(1px) 物理下沉按压手感"
    );
});

test("T-7709 负向验证探针：若破坏选中平滑位移或使用字面量阴影必精准拦截", () => {
    // 探针 1：验证光标平滑位移
    function checkCursorShift(css) {
        return /&\.is-selected\s*\{[^}]*transform:\s*translateX\(1\.5px\);/s.test(css);
    }
    assert.equal(checkCursorShift(polishScss), true);

    assert.throws(() => {
        const brokenCss = polishScss.replace(
            /(&\.is-selected\s*\{[^}]*transform:\s*)translateX\(1\.5px\);/s,
            "$1none;"
        );
        if (!checkCursorShift(brokenCss)) {
            throw new Error("PROBE_DETECTED_MISSING_SELECTION_TRANSLATE: 画板选中项平滑位移丢失");
        }
    }, /PROBE_DETECTED_MISSING_SELECTION_TRANSLATE/, "破坏性负向探针必须准确捕获选中平移丢失缺陷");

    // 探针 2：验证画板不可退回字面量阴影 0 16px 40px
    function checkLiteralShadow(css) {
        return /\.sw__palette\s*\{[\s\S]*?box-shadow:\s*0 16px 40px/s.test(css);
    }
    assert.equal(checkLiteralShadow(polishScss), false, "当前源码不应含有字面量 0 16px 40px");

    assert.throws(() => {
        const injectedCss = polishScss.replace(
            /(\.sw__palette\s*\{[\s\S]*?)box-shadow:\s*var\(--sw-shadow-bento\);/,
            "$1box-shadow: 0 16px 40px rgba(0, 0, 0, 0.24);"
        );
        if (checkLiteralShadow(injectedCss)) {
            throw new Error("PROBE_DETECTED_LITERAL_PALETTE_SHADOW: 画板外壳退回字面量阴影");
        }
    }, /PROBE_DETECTED_LITERAL_PALETTE_SHADOW/, "破坏性负向探针必须准确拦截退回字面量阴影的违规");
});
