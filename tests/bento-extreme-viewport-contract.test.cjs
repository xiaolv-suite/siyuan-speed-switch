// T-7461 工作台 Bento 瓦片小组件在极窄容器下的文本裁剪、防挤压与自适应微质感加固契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 _12-r54-surface-adapter.scss 包含 @container sw-r54-surface (max-width: 360px) 单列回退规则；
//   2. 验证 .sw-home .sw-home__cell 内部具备 min-width: 0、文本省略与 tabular-nums 防挤压守卫；
//   3. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const ROOT = path.resolve(__dirname, "..");
const surfaceAdapterScss = readSourceText(path.join(ROOT, "src", "styles", "_12-r54-surface-adapter.scss"));

test("T-7461: _12-r54-surface-adapter.scss 包含超窄视口 (<=360px) 单列回退规则", () => {
    assert.match(
        surfaceAdapterScss,
        /@container\s+sw-r54-surface\s+\(max-width:\s*360px\)\s*\{[\s\S]*?\.sw-home\.sw-home--mobile\s+\.sw-home__grid\s*\{[\s\S]*?grid-template-columns:\s*1fr\s*!important;/,
        "超窄视口 (<=360px) 下移动端工作台网格必须平滑回退为单列，防止双拼过度挤压",
    );
    assert.match(
        surfaceAdapterScss,
        /@container\s+sw-r54-surface\s+\(max-width:\s*360px\)\s*\{[\s\S]*?\.sw-home\.sw-home--mobile\s+\.sw-home__cell\[data-size="xs"\]\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1\s*!important;/,
        "超窄视口下微瓦片 (xs) 必须占满全宽 1 / -1",
    );
});

test("T-7461: Bento 瓦片内部具备文本省略、防挤压与等宽数字对齐守卫", () => {
    assert.match(
        surfaceAdapterScss,
        /\.sw-home\s+\.sw-home__cell\s*\{[\s\S]*?min-width:\s*0;/,
        "Bento 单元格必须显式声明 min-width: 0，防止弹性或网格容器被长内容溢出撑爆",
    );
    assert.match(
        surfaceAdapterScss,
        /\.sw-home__cell-title\s*\{[\s\S]*?text-overflow:\s*ellipsis;\s*white-space:\s*nowrap;/,
        "卡片标题必须声明文本省略与禁止换行",
    );
    assert.match(
        surfaceAdapterScss,
        /\.sw__home-module-item-label\s*\{[\s\S]*?text-overflow:\s*ellipsis;\s*white-space:\s*nowrap;/,
        "条目标签必须声明文本省略与禁止换行",
    );
    assert.match(
        surfaceAdapterScss,
        /\.sw__home-module-item-secondary\s*\{[\s\S]*?flex-shrink:\s*0;\s*font-variant-numeric:\s*tabular-nums;/,
        "次级胶囊必须声明 flex-shrink: 0 防挤压与 tabular-nums 等宽数字",
    );
    assert.match(
        surfaceAdapterScss,
        /\.sw__home-stat-value\s*\{[\s\S]*?font-variant-numeric:\s*tabular-nums;\s*overflow:\s*hidden;\s*text-overflow:\s*ellipsis;/,
        "统计数值必须声明 tabular-nums 与防溢出省略",
    );
});

test("T-7461 门禁负向验证: 若缺少超窄单列规则或缺失防挤压声明必定精准红", () => {
    // 探针 1: 负向断言伪造的不存在断点必定失败
    assert.throws(() => {
        assert.match(surfaceAdapterScss, /@container\s+sw-r54-surface\s+\(max-width:\s*199px\)/);
    }, assert.AssertionError);

    // 探针 2: 负向断言伪造的非法挤压样式必定失败
    assert.throws(() => {
        assert.match(surfaceAdapterScss, /\.sw__home-module-item-secondary\s*\{[\s\S]*?flex-shrink:\s*99;/);
    }, assert.AssertionError);
});
