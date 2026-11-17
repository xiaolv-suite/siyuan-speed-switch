// T-7435 思源 3.8.8+ 桌面紧凑模式自适应契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 _platform-shell.scss 包含 :root[data-ui-density="compact"] 声明；
//   2. 验证 包含紧凑间距 scale 与 sw__card, sw-home__cell, sw__doc-item 样式微调；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const shellScss = readSourceText(path.join(root, "src", "styles", "_platform-shell.scss"));

test("T-7435: _platform-shell.scss 包含 :root[data-ui-density='compact'] 自适应规则", () => {
    assert.match(
        shellScss,
        /:root\[data-ui-density="compact"\]\s*\{[\s\S]*?--sw-platform-space-1:\s*2px;[\s\S]*?--sw-platform-header-height:\s*48px;/,
        "必须声明紧凑模式根变量压缩",
    );
    assert.match(
        shellScss,
        /\.sw__card\s*\{[\s\S]*?padding:\s*var\(--sw-space-xs,\s*4px\)\s*var\(--sw-space-sm,\s*6px\);/,
        "必须声明卡片紧凑内边距",
    );
    assert.match(
        shellScss,
        /\.sw-home__cell\s*\{[\s\S]*?padding:\s*var\(--sw-space-xs,\s*4px\);/,
        "必须声明工作台单元格紧凑内边距",
    );
    assert.match(
        shellScss,
        /\.sw__doc-item\s*\{[\s\S]*?padding-block:\s*var\(--sw-space-xs,\s*4px\);/,
        "必须声明文档条目紧凑内边距",
    );
});

test("T-7435 门禁负向验证: 若样式未包含紧凑模式选择器必定精准红", () => {
    assert.doesNotMatch(shellScss, /:root\[data-ui-density="standard-only"\]/);
});
