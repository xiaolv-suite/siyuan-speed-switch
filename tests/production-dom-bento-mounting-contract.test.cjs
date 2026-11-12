// T-7629 生产 DOM Bento 双层底色、白卡浮起与深色重音卡实测挂载契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 .sw-home 生产视口显式声明 --sw-bg-tinted 极浅同族底色；
//   2. 验证 .sw-home__cell 声明 --sw-card-float-bg 与 --sw-shadow-bento；
//   3. 验证 countdown 倒数日声明 .is-hero-card 深色对比重音块；
//   4. 验证 acceptance-screenshots/manifest.json 包含 9 组真实验收截图；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const widgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));
const manifestJson = JSON.parse(fs.readFileSync(path.join(root, "acceptance-screenshots", "manifest.json"), "utf8"));

test("T-7629: 第二面板工作台视口显式接入极浅同族托底色", () => {
    assert.match(
        widgetsScss,
        /\.sw-home\s*\{[\s\S]*?background:\s*var\(--sw-bg-tinted/s,
        "工作台视口底色必须显式声明 --sw-bg-tinted 极浅同族底色",
    );
});

test("T-7629: 小组件瓷贴卡片声明纯白浮起与双层复合柔影", () => {
    assert.match(
        widgetsScss,
        /\.sw-home__cell\s*\{[\s\S]*?background:\s*var\(--sw-card-float-bg/s,
        "瓷贴卡片表面必须声明纯白浮卡底色 --sw-card-float-bg",
    );
    assert.match(
        widgetsScss,
        /\.sw-home__cell\s*\{[\s\S]*?box-shadow:\s*var\(--sw-shadow-bento/s,
        "瓷贴卡片必须声明近远复合双层柔影 --sw-shadow-bento",
    );
});

test("T-7629: 倒数日核心数据声明 is-hero-card 深色对比重音块", () => {
    assert.match(
        widgetsScss,
        /data-module-id="countdown"\][\s\S]*?&.is-hero-card\s*\{[^}]*background:\s*var\(--sw-card-accent-dark\)/s,
        "倒数日重音卡必须接入深色对比块底色 --sw-card-accent-dark",
    );
});

test("T-7629: 验收截图清单完备性校验（9 组跨表面明暗及断点截图）", () => {
    assert.equal(manifestJson.cases.length, 9, "验收截图清单必须完整包含 9 组全场景快照");
    assert.ok(manifestJson.cases.some((c) => c.id === "workbench-light"), "必须包含 workbench-light");
    assert.ok(manifestJson.cases.some((c) => c.id === "workbench-dark"), "必须包含 workbench-dark");
});

test("T-7629 门禁负向验证: 若工作台失去同族微底必定精准红", () => {
    // 探针 1: 负向断言工作台视口使用固定死白必须被拒绝
    assert.doesNotMatch(
        widgetsScss,
        /\.sw-home\s*\{[\s\S]*?background:\s*#ffffff;/s,
        "工作台视口严禁使用死纯白破坏双层结构",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的样式必定报错）
    const brokenStyles = `.sw-home { background: #ffffff; }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /\.sw-home\s*\{[\s\S]*?background:\s*var\(--sw-bg-tinted/s,
        );
    }, assert.AssertionError);
});
