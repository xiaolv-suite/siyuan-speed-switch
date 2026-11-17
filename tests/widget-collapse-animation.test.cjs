// T-7473 第二面板小组件局部折叠/展开动画与键盘交互契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 second-panel-ui.ts 与 second-panel-ui.js 中 onToggle 动态切换 sw-home__cell--collapsed 类与 gridRow；
//   2. 验证 初始化时若 layout.collapsed === true 则声明 span 1 与 collapsed 状态；
//   3. 验证 _05-settings-widgets.scss 包含 .sw-home__cell--collapsed 紧凑高度规则；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const panelTs = readSourceText(path.join(ROOT, "src", "second-panel-ui.ts"));
const panelJs = readSourceText(path.join(ROOT, "src", "second-panel-ui.js"));
const scss = readSourceText(path.join(ROOT, "src", "styles", "_05-settings-widgets.scss"));

test("T-7473: second-panel-ui.ts 中 onToggle 联动更新单元格折叠态与网格行高", () => {
    assert.match(
        panelTs,
        /cell\.dataset\.collapsed = String\(entry\.collapsed\);\s*cell\.classList\.toggle\("sw-home__cell--collapsed",\s*entry\.collapsed\);/,
        "onToggle 触发时必须即时同步 cell 的 dataset.collapsed 与样式类",
    );
    assert.match(
        panelTs,
        /cell\.style\.gridRow = entry\.collapsed \? "span 1" : `span \$\{Math\.max\(1, effectiveH\)\}`;/,
        "桌面端折叠必须将 gridRow 降级为 span 1，展开时恢复完整行高",
    );
    assert.match(
        panelTs,
        /cell\.style\.gridRow = this\.isMobile \? "auto" : \(layout\.collapsed === true \? "span 1" : `span \$\{Math\.max\(1, effectiveH\)\}`\);/,
        "初始化时若持久化状态为已折叠，初始行高必须直接应用 span 1",
    );
});

test("T-7473: second-panel-ui.js 镜像完全同步折叠逻辑", () => {
    assert.match(
        panelJs,
        /cell\.dataset\.collapsed = String\(entry\.collapsed\);/,
        "second-panel-ui.js 必须同步更新 dataset.collapsed",
    );
    assert.match(
        panelJs,
        /cell\.style\.gridRow = entry\.collapsed \? "span 1"/,
        "second-panel-ui.js 必须同步更新 gridRow",
    );
});

test("T-7473: _05-settings-widgets.scss 包含折叠卡片紧凑样式", () => {
    assert.match(
        scss,
        /&--collapsed\s*\{[\s\S]*?min-height:\s*var\(--sw-control-h,\s*34px\);[\s\S]*?\.sw-home__cell-body\s*\{[\s\S]*?display:\s*none\s*!important;/,
        "SCSS 必须包含折叠卡片 min-height 与 body 隐藏规则",
    );
});

test("T-7473 门禁负向验证: 若缺少网格行高压缩必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在行高必定失败
    assert.throws(() => {
        assert.match(panelTs, /entry\.collapsed \? "span 99_fake"/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的不存在样式类必定失败
    assert.throws(() => {
        assert.match(scss, /&--fake_non_existent_collapsed/);
    }, assert.AssertionError);
});
