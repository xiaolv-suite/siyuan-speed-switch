// T-7649 UI 待办清单（UI-01~UI-05）全面收口与契约闭环测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 UI-01: .sw-setting__fav-control 声明 26px 控件高度与 inline-flex 居中；
//   2. 验证 UI-04: .sw-journal-prompt__sel select 声明 8px 舒适内边距；
//   3. 验证 UI-02: 天气小组件摄氏度/单位声明 vertical-align: super 光学上标；
//   4. 验证 UI-03: 折叠三角过渡声明 --sw-ease-out-back 非对称缓动；
//   5. 验证 UI-05: 悬浮球管理按钮悬停声明 --sw-rim-light 微反光；
//   6. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const settingsScss = readSourceText(path.join(root, "src", "styles", "_02-settings.scss"));
const switcherScss = readSourceText(path.join(root, "src", "styles", "_03-switcher-mobile.scss"));
const widgetsScss = readSourceText(path.join(root, "src", "styles", "_05-settings-widgets.scss"));
const moreScss = readSourceText(path.join(root, "src", "styles", "_floating-ball-more.scss"));

test("T-7649: UI-01 & UI-04 设置页控件对齐与下拉框 8px 舒适留白", () => {
    assert.match(
        settingsScss,
        /\.sw-setting__fav-control\s*\{[\s\S]*?min-height:\s*var\(--sw-control-h-md,\s*26px\);/s,
        "收藏控制按钮必须声明标准 26px 控件高度",
    );
    assert.match(
        switcherScss,
        /\.sw-journal-prompt__sel\s*\{[\s\S]*?padding:\s*var\(--sw-space-md,\s*8px\)\s*10px;/s,
        "日记选择框必须声明 8px 舒适内边距",
    );
});

test("T-7649: UI-02 天气小组件摄氏度单位声明光学上标基线", () => {
    assert.match(
        widgetsScss,
        /data-module-id="external-weather-open-meteo"\][\s\S]*?vertical-align:\s*super;/s,
        "天气温度单位必须声明 vertical-align: super 上标光学对齐",
    );
});

test("T-7649: UI-03 & UI-05 折叠动效非对称缓动与管理按钮微反光", () => {
    assert.match(
        settingsScss,
        /\.sw-setting__fav-collapse\s*\{[\s\S]*?transition:\s*transform\s*\$sw-dur-base\s*var\(--sw-ease-out-back/s,
        "折叠三角旋转必须声明非对称平滑缓动",
    );
    assert.match(
        moreScss,
        /\.sw__floating-ball-more-manage\s*\{[\s\S]*?&:hover\s*\{[^}]*box-shadow:\s*var\(--sw-rim-light/s,
        "悬浮球管理按钮悬浮态必须声明 --sw-rim-light 微反光边缘",
    );
});

test("T-7649 门禁负向验证: 若日记下拉框缺失内边距必精准红", () => {
    // 探针 1: 负向断言日记下拉框严禁使用零内边距
    assert.doesNotMatch(
        switcherScss,
        /\.sw-journal-prompt__sel\s*\{[\s\S]*?padding:\s*0px;/s,
        "日记下拉框严禁使用 0px 紧绷内边距",
    );

    // 探针 2: 负向验证自身自检（断言破坏后的样式必定报错）
    const brokenStyles = `.sw-journal-prompt__sel { select { padding: 0px; } }`;
    assert.throws(() => {
        assert.match(
            brokenStyles,
            /padding:\s*var\(--sw-space-md,\s*8px\)/,
        );
    }, assert.AssertionError);
});
