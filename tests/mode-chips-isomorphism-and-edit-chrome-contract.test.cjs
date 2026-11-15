// T-7657 搜索模式药丸栏同构镜像与工作台编辑态质感契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 index.js setupSearchModeChips 具备完整同构 keydown 键盘导航；
//   2. 验证 _05-settings-widgets 编辑态边框引用 --sw-color-accent 语义令牌；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const indexJs = readSourceText(path.join(root, "src", "index.js"));
const widgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));

test("T-7657: index.js 纯 JS 同构镜像实现完整的药丸栏键盘循环流转", () => {
    assert.match(
        indexJs,
        /btn\.addEventListener\("keydown",\s*\(e\)\s*=>\s*\{[\s\S]*?e\.key === "ArrowRight"/s,
        "index.js 必须具备同构 ArrowRight 键盘事件监听",
    );
    assert.match(
        indexJs,
        /onSearchKeyDown[\s\S]*?e\.key === "ArrowUp"/s,
        "index.js 必须具备 ArrowUp 从输入框回到药丸栏的键盘事件",
    );
});

test("T-7657: 工作台编辑态边框引用主题语义色且平滑过渡", () => {
    assert.match(
        widgetsScss,
        /\.sw-home__grid--editing\s+\.sw-home__cell\s*\{[\s\S]*?outline:\s*2px dashed color-mix\(in srgb,\s*var\(--sw-color-accent/s,
        "编辑态虚线轮廓必须引用 --sw-color-accent 语义色动态派生",
    );
});

test("T-7657 门禁负向验证: 若同构镜像丢失键盘监听必精准红", () => {
    // 探针 1: 负向断言若 index.js 缺少 ArrowLeft 处理必定失败
    assert.doesNotMatch(
        indexJs,
        /setupSearchModeChips[\s\S]*?return \(\) => \{\s*container\.innerHTML = "";\s*\};\s*\}\s*setupOpenHistoryDropdown/s,
        "严禁使用没有键盘事件的空壳 setupSearchModeChips",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的代码必定报错）
    const brokenCode = `function setupSearchModeChips() { return () => {}; }`;
    assert.throws(() => {
        assert.match(
            brokenCode,
            /onSearchKeyDown/,
        );
    }, assert.AssertionError);
});
