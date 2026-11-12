// T-7537 第二面板工作台小组件卡片标题栏状态徽标悬停手势与语义颜色高亮加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 _06-widgets-store.scss 为 .sw__home-source-health 声明 hover 微浮动与阴影；
//   2. 验证 _06-widgets-store.scss 为 is-fresh / is-cached / is-stale 声明语义色微底色；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const scss = readSourceText(path.join(root, "src", "styles", "_06-widgets-store.scss"));

test("T-7537: _06-widgets-store.scss 为 .sw__home-source-health 声明 hover 微浮动与三色语义背景高亮", () => {
    assert.match(
        scss,
        /\.sw__home-source-health\s*\{[\s\S]*?&:hover\s*\{[\s\S]*?transform:\s*translateY\(-1px\);[\s\S]*?box-shadow:\s*0 2px 6px rgba\(0,\s*0,\s*0,\s*0\.08\);/,
        "健康状态胶囊必须包含 hover 上浮微动效与柔和阴影",
    );
    assert.match(
        scss,
        /&\.is-fresh\s*\{[\s\S]*?&:hover\s*\{\s*background:\s*color-mix\(in srgb,\s*#3b9861 10%,\s*transparent\);\s*\}/,
        "is-fresh 必须包含悬浮微底色",
    );
    assert.match(
        scss,
        /&\.is-cached\s*\{[\s\S]*?&:hover\s*\{\s*background:\s*color-mix\(in srgb,\s*#4f79bd 10%,\s*transparent\);\s*\}/,
        "is-cached 必须包含悬浮微底色",
    );
    assert.match(
        scss,
        /&\.is-stale\s*\{[\s\S]*?&:hover\s*\{\s*background:\s*color-mix\(in srgb,\s*#d58932 10%,\s*transparent\);\s*\}/,
        "is-stale 必须包含悬浮微底色",
    );
});

test("T-7537 门禁负向验证: 若状态胶囊缺少 hover 动效必定精准红", () => {
    const fakeScss = scss.replace(
        /&:hover\s*\{\s*transform:\s*translateY\(-1px\);[\s\S]*?box-shadow:[^;]+;\s*\}/,
        "/* removed hover */",
    );
    assert.doesNotMatch(
        fakeScss,
        /\.sw__home-source-health\s*\{[^}]*?&:hover\s*\{\s*transform:\s*translateY\(-1px\);/,
        "负向注入验证：缺少 hover 浮动时断言必须拦截失败",
    );
});
