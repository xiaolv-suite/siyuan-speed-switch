// T-7685 平台表面导航圆角背景块化与外壳双层微底分层契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-platform-surface-nav__item.is-active 声明背景块 --sw-platform-accent-soft 与 --sw-shadow-xs；
//   2. 验证 .sw-platform-surface-nav__item.is-active 彻底清除了 inset 0 -2px 0 底边实线；
//   3. 验证 .sw-platform-shell 声明 --sw-bg-tinted 极浅同族微底色；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const shellScss = readSourceText(path.join(root, "src", "styles", "_platform-shell.scss"));

test("T-7685: 平台导航激活项声明背景块而非下划线，且内描边清零", () => {
    assert.match(
        shellScss,
        /\.sw-platform-surface-nav__item\.is-active\s*\{[\s\S]*?background:\s*var\(--sw-platform-accent-soft\);/s,
        "导航项激活态必须声明圆润背景块高光",
    );
    assert.match(
        shellScss,
        /\.sw-platform-surface-nav__item\.is-active\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-xs\);/s,
        "导航项激活态必须声明标准微抬升柔影",
    );
    assert.doesNotMatch(
        shellScss,
        /\.sw-platform-surface-nav__item\.is-active\s*\{[\s\S]*?box-shadow:\s*inset\s*0\s*-2px\s*0/s,
        "导航项激活态严禁使用粗暴的 inset -2px 底横线",
    );
});

test("T-7685: 平台应用外壳声明极浅同族底色托底", () => {
    assert.match(
        shellScss,
        /\.sw-platform-shell\s*\{[\s\S]*?background:\s*var\(--sw-bg-tinted/s,
        "平台外壳容器必须声明 --sw-bg-tinted 极浅同族微底色",
    );
});

test("T-7685 门禁负向验证: 若导航项回退为底边内描边必精准红", () => {
    // 探针 1: 负向断言严禁在导航项声明 inset 0 -2px 0
    assert.doesNotMatch(
        shellScss,
        /box-shadow:\s*inset\s*0\s*-2px\s*0\s*var\(--sw-platform-accent\);/,
        "严禁使用老旧的 inset -2px 底边实线",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenStyles = `.sw-platform-surface-nav__item.is-active { box-shadow: inset 0 -2px 0 red; }`;
    assert.throws(() => {
        assert.doesNotMatch(
            brokenStyles,
            /box-shadow:\s*inset\s*0\s*-2px\s*0/,
        );
    }, assert.AssertionError);
});
