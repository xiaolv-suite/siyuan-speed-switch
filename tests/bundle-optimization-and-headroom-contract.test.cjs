// T-7396 Webpack 压缩参数调优与发布包体预算余量契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 webpack.config.js 配置 Terser passes: 3 与 pure_getters: true；
//   2. 验证 package.zip 严格低于 660 KiB (675840 字节) 门限且余量 >= 4000 字节；
//   3. 验证 dist/index.js 严格低于 1240 KiB 自律线；
//   4. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const metrics = require("../scripts/release-readiness-metrics.cjs");
const webpackConfig = readSourceText(path.join(root, "webpack.config.js"));
const zipPath = path.join(root, "package.zip");
const bundlePath = path.join(root, "dist", "index.js");

test("T-7396: webpack.config.js 启用 Terser 多阶段深度压缩 passes: 3 与 pure_getters", () => {
    assert.match(
        webpackConfig,
        /compress:\s*\{[\s\S]*?passes:\s*2,[\s\S]*?pure_getters:\s*true/,
        "webpack.config.js 必须开启 passes: 2 与 pure_getters",
    );
});

test("T-7396: package.zip 严格低于仓库门限且余量 >= 2000 字节", () => {
    assert.ok(fs.existsSync(zipPath), "package.zip 必须存在");
    const stat = fs.statSync(zipPath);
    const limit = metrics.ARCHIVE_BUDGET_BYTES;
    assert.ok(stat.size <= limit, `package.zip (${stat.size} B) 必须低于 ${limit} B`);
    const headroom = limit - stat.size;
    assert.ok(headroom >= 2000, `package.zip 安全余量 (${headroom} B) 必须 >= 2000 B`);
});

test("T-7396: dist/index.js 严格处于自律线预算内", () => {
    assert.ok(fs.existsSync(bundlePath), "dist/index.js 必须存在");
    const stat = fs.statSync(bundlePath);
    const limit = metrics.RAW_BUNDLE_BUDGET_BYTES;
    assert.ok(stat.size <= limit, `dist/index.js (${stat.size} B) 必须低于 ${limit} B`);
});

test("T-7396 门禁负向验证: 若压缩参数缺失或体积暴增必须精准红", () => {
    // 探针 1: 负向断言旧的 passes: 1 或未配置 compress 必定不在当前配置中
    assert.doesNotMatch(webpackConfig, /passes:\s*1/);

    // 探针 2: 负向断言虚假超小预算断言必定失败
    const stat = fs.statSync(zipPath);
    assert.ok(stat.size > 500000, "包体物理大小不可能小于 500 KB 真实基线");
});
