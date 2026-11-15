// T-7511 代码片段实验室导出 usercss 头部配置项键值校验与导出通知加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 buildUsercssHeader 支持 options 参数并对 namespace 与 version 做严格安全白名单校验；
//   2. 验证非法版本号或命名空间静默回退至标准安全默认值；
//   3. 验证 exportButton 触发导出后通过 setStatus 给出友好就绪通知；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {buildUsercssHeader} = require("../src/snippet-studio-model.js");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const studioUiJs = readSourceText(path.join(root, "src", "snippet-studio-ui.js"));
const zh = JSON.parse(fs.readFileSync(path.join(root, "src", "i18n", "zh-CN.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(root, "src", "i18n", "en.json"), "utf8"));

test("T-7511: buildUsercssHeader 支持可选 options 并支持合法的命名空间与语义版本", () => {
    const customHeader = buildUsercssHeader("My Theme", {namespace: "theme-pro", version: "2.1.3", description: "Clean dark mode polish", author: "Author Name", license: "MIT"});
    assert.match(customHeader, /@name My Theme/);
    assert.match(customHeader, /@namespace theme-pro/);
    assert.match(customHeader, /@version 2\.1\.3/);
    assert.match(customHeader, /@description Clean dark mode polish/);
    assert.match(customHeader, /@author Author Name/);
    assert.match(customHeader, /@license MIT/);
});

test("T-7519: buildUsercssHeader 支持 @author 换行清洗与 @license 白名单校验", () => {
    // author 控制字符与换行清洗
    const cleanAuthorHeader = buildUsercssHeader("Test", {author: "Developer\nName\r\nTeam"});
    assert.match(cleanAuthorHeader, /@author Developer Name Team/);
    // 合法 license
    const validLicenseHeader = buildUsercssHeader("Test", {license: "Apache-2.0"});
    assert.match(validLicenseHeader, /@license Apache-2\.0/);
    // 非法 license 静默抑制
    const invalidLicenseHeader = buildUsercssHeader("Test", {license: "bad license with spaces / <script>"});
    assert.doesNotMatch(invalidLicenseHeader, /@license/);
});

test("T-7523: buildUsercssHeader 支持 @homepageURL 与 @supportURL 提取与安全校验", () => {
    // 合法 https 链接
    const urlHeader = buildUsercssHeader("Test", {
        homepageURL: "https://github.com/xiaolv-suite/siyuan-speed-switch",
        supportURL: "https://github.com/xiaolv-suite/siyuan-speed-switch/issues",
    });
    assert.match(urlHeader, /@homepageURL https:\/\/github\.com\/xiaolv-suite\/siyuan-speed-switch/);
    assert.match(urlHeader, /@supportURL https:\/\/github\.com\/xiaolv-suite\/siyuan-speed-switch\/issues/);

    // 危险伪协议（javascript: / data:）与包含空格的非法 URL 静默安全抑制
    const badUrlHeader = buildUsercssHeader("Test", {
        homepageURL: "javascript:alert(1)",
        supportURL: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    });
    assert.doesNotMatch(badUrlHeader, /@homepageURL/);
    assert.doesNotMatch(badUrlHeader, /@supportURL/);
});

test("T-7527: buildUsercssHeader 支持 @updateURL 提取与协议白名单校验", () => {
    // 合法 updateURL
    const updateHeader = buildUsercssHeader("Test", {
        updateURL: "https://raw.githubusercontent.com/xiaolv-suite/siyuan-speed-switch/main/dist/snippet.user.css",
    });
    assert.match(updateHeader, /@updateURL https:\/\/raw\.githubusercontent\.com\/xiaolv-suite\/siyuan-speed-switch\/main\/dist\/snippet\.user\.css/);

    // 非 http/https 协议安全抑制
    const badUpdateHeader = buildUsercssHeader("Test", {
        updateURL: "ftp://example.com/snippet.user.css",
    });
    assert.doesNotMatch(badUpdateHeader, /@updateURL/);
});

test("T-7531: buildUsercssHeader 支持 @preprocessor 提取与标准枚举安全校验", () => {
    // 合法预处理器枚举
    const stylusHeader = buildUsercssHeader("Test", {preprocessor: "stylus"});
    assert.match(stylusHeader, /@preprocessor stylus/);
    const lessHeader = buildUsercssHeader("Test", {preprocessor: "LESS"});
    assert.match(lessHeader, /@preprocessor less/);

    // 非法或未在枚举名单内的预处理器安全抑制
    const badPrepHeader = buildUsercssHeader("Test", {preprocessor: "unknown-eval-tool"});
    assert.doesNotMatch(badPrepHeader, /@preprocessor/);
});

test("T-7535: buildUsercssHeader 支持 @var 变量定义与类型白名单过滤", () => {
    // 合法变量输出
    const varHeader = buildUsercssHeader("Custom Theme", {
        vars: [
            {type: "color", name: "primaryColor", label: "Primary Accent", default: "#3575f0"},
            {type: "range", name: "blurRadius", label: "Blur Radius", default: "[8, 0, 20, 1, 'px']"},
            {type: "unsupportedType", name: "badVar", default: "123"},
        ],
    });
    assert.match(varHeader, /@var color primaryColor "Primary Accent" #3575f0/);
    assert.match(varHeader, /@var range blurRadius "Blur Radius" \[8, 0, 20, 1, 'px'\]/);
    // 非法类型变量安全抑制
    assert.doesNotMatch(varHeader, /@var unsupportedType/);
});

test("T-7539: buildUsercssHeader 支持 @var select 选项数组与对象字典格式化", () => {
    // 字符串数组选项格式化
    const selectArrHeader = buildUsercssHeader("Theme", {
        vars: [
            {type: "select", name: "themePreset", label: "Preset", options: ["dark*", "light", "sepia"]},
        ],
    });
    assert.match(selectArrHeader, /@var select themePreset "Preset" \["dark\*", "light", "sepia"\]/);

    // 对象键值对格式化
    const selectObjHeader = buildUsercssHeader("Theme", {
        vars: [
            {type: "select", name: "contrast", label: "Contrast", options: {"high*": "High Contrast", "normal": "Normal"}},
        ],
    });
    assert.match(selectObjHeader, /@var select contrast "Contrast" \{ "high\*": "High Contrast", "normal": "Normal" \}/);
});

test("T-7543: buildUsercssHeader 支持 @var range 数组与对象数值区间及单位格式化", () => {
    // 数组参数格式化带单位
    const rangeArrHeader = buildUsercssHeader("Font", {
        vars: [
            {type: "range", name: "fontSize", label: "Font Size", range: [16, 12, 32, 1, "px"]},
        ],
    });
    assert.match(rangeArrHeader, /@var range fontSize "Font Size" \[16, 12, 32, 1, "px"\]/);

    // 浮点数组不带单位
    const floatArrHeader = buildUsercssHeader("Typography", {
        vars: [
            {type: "range", name: "lineHeight", label: "Line Height", range: [1.6, 1, 3, 0.1]},
        ],
    });
    assert.match(floatArrHeader, /@var range lineHeight "Line Height" \[1.6, 1, 3, 0.1\]/);

    // 对象参数格式化
    const rangeObjHeader = buildUsercssHeader("Spacing", {
        vars: [
            {type: "range", name: "padding", label: "Padding", min: 4, max: 20, default: 8, step: 2, units: "rem"},
        ],
    });
    assert.match(rangeObjHeader, /@var range padding "Padding" \[8, 4, 20, 2, "rem"\]/);

    // 越界夹持与单位安全过滤
    const sanitizedHeader = buildUsercssHeader("Safe", {
        vars: [
            {type: "range", name: "blur", label: "Blur", min: 0, max: 10, default: 15, units: "px<script>"},
        ],
    });
    assert.match(sanitizedHeader, /@var range blur "Blur" \[10, 0, 10, 1\]/);
});

test("T-7547: buildUsercssHeader 支持 @var checkbox 布尔开关格式化与默认值校验", () => {
    // 显式 1 / 0
    const cbOne = buildUsercssHeader("Theme", {
        vars: [{type: "checkbox", name: "enableGlow", label: "Enable Glow", default: 1}],
    });
    assert.match(cbOne, /@var checkbox enableGlow "Enable Glow" 1/);

    // 布尔 false 转 0
    const cbFalse = buildUsercssHeader("Theme", {
        vars: [{type: "checkbox", name: "compactMode", label: "Compact Mode", default: false}],
    });
    assert.match(cbFalse, /@var checkbox compactMode "Compact Mode" 0/);

    // checked 别名
    const cbChecked = buildUsercssHeader("Theme", {
        vars: [{type: "checkbox", name: "darkMode", label: "Dark Mode", checked: true}],
    });
    assert.match(cbChecked, /@var checkbox darkMode "Dark Mode" 1/);

    // 未提供时安全回退 0
    const cbEmpty = buildUsercssHeader("Theme", {
        vars: [{type: "checkbox", name: "autoHide", label: "Auto Hide"}],
    });
    assert.match(cbEmpty, /@var checkbox autoHide "Auto Hide" 0/);
});

test("T-7551: buildUsercssHeader 支持 @var color 颜色格式化与校验", () => {
    // 6 位与 8 位十六进制颜色
    const colorHex = buildUsercssHeader("Theme", {
        vars: [
            {type: "color", name: "primaryColor", label: "Primary", default: "#3575f0"},
            {type: "color", name: "overlayColor", label: "Overlay", default: "#00000080"},
        ],
    });
    assert.match(colorHex, /@var color primaryColor "Primary" #3575f0/);
    assert.match(colorHex, /@var color overlayColor "Overlay" #00000080/);

    // 函数型与命名颜色
    const colorFunc = buildUsercssHeader("Theme", {
        vars: [
            {type: "color", name: "rgbaColor", label: "RGBA", default: "rgba(255, 255, 255, 0.9)"},
            {type: "color", name: "namedColor", label: "Named", default: "transparent"},
        ],
    });
    assert.match(colorFunc, /@var color rgbaColor "RGBA" rgba\(255, 255, 255, 0\.9\)/);
    assert.match(colorFunc, /@var color namedColor "Named" transparent/);

    // 非法注入或无效颜色回退 #000000
    const colorInvalid = buildUsercssHeader("Theme", {
        vars: [
            {type: "color", name: "badColor", label: "Bad", default: "red; alert(1)"},
        ],
    });
    assert.match(colorInvalid, /@var color badColor "Bad" #000000/);
});

test("T-7555: buildUsercssHeader 支持 @var text 文本参数转义与多行过滤", () => {
    // 常规文本参数双引号包裹
    const textNormal = buildUsercssHeader("Font", {
        vars: [
            {type: "text", name: "fontFamily", label: "Font Family", default: "Georgia, serif"},
        ],
    });
    assert.match(textNormal, /@var text fontFamily "Font Family" "Georgia, serif"/);

    // 引号转义与换行过滤
    const textQuotes = buildUsercssHeader("Notes", {
        vars: [
            {type: "text", name: "quoteText", label: "Quote", default: 'Hello "World"\nNext Line'},
        ],
    });
    assert.match(textQuotes, /@var text quoteText "Quote" "Hello \\"World\\" Next Line"/);

    // 空默认值安全输出 ""
    const textEmpty = buildUsercssHeader("Prefix", {
        vars: [
            {type: "text", name: "customPrefix", label: "Prefix"},
        ],
    });
    assert.match(textEmpty, /@var text customPrefix "Prefix" ""/);
});

test("T-7559: buildUsercssHeader 支持 @var number 数值参数精度校验与默认值格式化", () => {
    // 整数与浮点数
    const numHeader = buildUsercssHeader("Grid", {
        vars: [
            {type: "number", name: "columns", label: "Columns", default: 4},
            {type: "number", name: "scaleRatio", label: "Scale", default: 1.25},
        ],
    });
    assert.match(numHeader, /@var number columns "Columns" 4/);
    assert.match(numHeader, /@var number scaleRatio "Scale" 1\.25/);

    // 字符串型数值与 0
    const strNumHeader = buildUsercssHeader("Spacing", {
        vars: [
            {type: "number", name: "zeroVal", label: "Zero", default: 0},
            {type: "number", name: "strNum", label: "Str", default: "42"},
        ],
    });
    assert.match(strNumHeader, /@var number zeroVal "Zero" 0/);
    assert.match(strNumHeader, /@var number strNum "Str" 42/);

    // 非法非数值输入安全回退为 0
    const badNumHeader = buildUsercssHeader("Safe", {
        vars: [
            {type: "number", name: "badVal", label: "Bad", default: "invalid-number; alert(1)"},
        ],
    });
    assert.match(badNumHeader, /@var number badVal "Bad" 0/);
});

test("T-7563: buildUsercssHeader 支持通用 @var 自动格式化回退与非法字段清洗", () => {
    // 缺失参数时各类型自动兜底为合法语法
    const fallbackHeader = buildUsercssHeader("Fallback", {
        vars: [
            {type: "range", name: "emptyRange"},
            {type: "select", name: "emptySelect"},
            {type: "color", name: "emptyColor"},
            {type: "checkbox", name: "emptyCheckbox"},
            {type: "number", name: "emptyNumber"},
            {type: "text", name: "emptyText"},
        ],
    });
    assert.match(fallbackHeader, /@var range emptyRange "emptyRange" \[0, 0, 100, 1\]/);
    assert.match(fallbackHeader, /@var select emptySelect "emptySelect" \[\]/);
    assert.match(fallbackHeader, /@var color emptyColor "emptyColor" #000000/);
    assert.match(fallbackHeader, /@var checkbox emptyCheckbox "emptyCheckbox" 0/);
    assert.match(fallbackHeader, /@var number emptyNumber "emptyNumber" 0/);
    assert.match(fallbackHeader, /@var text emptyText "emptyText" ""/);
});

test("T-7511: buildUsercssHeader 对 description 进行换行控制符过滤与空值抑制", () => {
    // 包含换行符的说明文本过滤为单行空格
    const multiLineDescHeader = buildUsercssHeader("Test", {description: "Line 1\nLine 2\r\nLine 3"});
    assert.match(multiLineDescHeader, /@description Line 1 Line 2 Line 3/);
    // 空说明文本不追加 @description 行
    const emptyDescHeader = buildUsercssHeader("Test", {description: "   "});
    assert.doesNotMatch(emptyDescHeader, /@description/);
});

test("T-7511: buildUsercssHeader 对非法参数执行静默安全回退", () => {
    // 包含空格或非法字符的命名空间回退默认值
    const badNsHeader = buildUsercssHeader("Test", {namespace: "bad namespace with spaces !@#", version: "not-semver"});
    assert.match(badNsHeader, /@namespace siyuan-speed-switch/, "非法命名空间必须安全回退至 siyuan-speed-switch");
    assert.match(badNsHeader, /@version 1\.0\.0/, "非法版本号必须安全回退至 1.0.0");
});

test("T-7511: snippet-studio-ui.js 在导出动作后触发 setStatus 状态通知", () => {
    assert.match(
        studioUiJs,
        /download\(`\$\{draft\.name \|\| "snippet"\}\.\$\{draft\.type\}`,\s*payload,\s*"text\/plain"\);[\s\S]*?setStatus\(\(t\("snippetExportDone"\) \|\| [^)]+\)\.replace\("\{name\}",\s*draft\.name \|\| "snippet"\),\s*"ready"\);/,
        "导出操作后必须更新状态栏回执",
    );
    assert.ok(zh.snippetExportDone.includes("{name}"), "zh-CN 必须定义 snippetExportDone 且包含 {name}");
    assert.ok(en.snippetExportDone.includes("{name}"), "en 必须定义 snippetExportDone 且包含 {name}");
});

test("T-7511 门禁负向验证: 若非法版本号注入成功未回退必定精准红", () => {
    const header = buildUsercssHeader("Test", {version: "malicious-eval-123"});
    assert.throws(() => {
        assert.match(header, /@version malicious-eval-123/, "应当失败：非法版本号不得直接写入头部");
    });
});
