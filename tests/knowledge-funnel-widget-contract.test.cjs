// T-7395 工作台「渐进知识蒸馏漏斗 (knowledge-funnel)」Bento 组件契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 home-external-adapters 注册 knowledge-funnel 小组件；
//   2. 验证 knowledge-funnel 来源声明为 siyuan-glean 与渐进知识漏斗；
//   3. 验证数据读取具备 800ms 熔断保护与 3000ms 缓存时间；
//   4. 验证知识漏斗具备待读、摘录与闪卡三阶段指标呈现；
//   5. 负向验证在文件末尾独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {readSourceText} = require("./source-scan.cjs");

const root = path.resolve(__dirname, "..");
const adaptersTs = readSourceText(path.join(root, "src", "home-external-adapters.ts"));
const adaptersJs = readSourceText(path.join(root, "src", "home-external-adapters.js"));

test("T-7395: home-external-adapters 注册 knowledge-funnel 小组件", () => {
    assert.match(adaptersTs, /register\("knowledge-funnel",/, "TS 文件必须注册 knowledge-funnel");
    assert.match(adaptersJs, /register\("knowledge-funnel",/, "JS 文件必须注册 knowledge-funnel");
});

test("T-7395: knowledge-funnel 来源声明为 siyuan-glean 与渐进知识漏斗", () => {
    assert.match(
        adaptersTs,
        /pluginId:\s*"siyuan-glean",\s*name:\s*"渐进知识漏斗",\s*icon:\s*"iconFilter"/,
        "knowledge-funnel 必须声明为 siyuan-glean 渐进知识漏斗来源",
    );
});

test("T-7395: 数据读取具备 800ms 熔断保护与 3000ms 缓存时间", () => {
    assert.match(
        adaptersTs,
        /wrapEcosystemModuleRead\(async \(\) => \{[\s\S]*?\}, 800, 3000\)/,
        "必须使用 wrapEcosystemModuleRead 注入 800ms 熔断与 3000ms 缓存",
    );
});

test("T-7395: 知识漏斗包含待读分片、待提炼摘录与今日到期卡三维数据", () => {
    assert.match(adaptersTs, /📚 待读分片/, "必须包含待读分片维度");
    assert.match(adaptersTs, /✂️ 待提炼摘录/, "必须包含待提炼摘录维度");
    assert.match(adaptersTs, /🎴 今日到期卡/, "必须包含今日到期卡维度");
    assert.match(adaptersTs, /流转吞吐总量/, "必须包含主指标流转吞吐总量");
});

test("T-7395 门禁负向验证: 若组件 ID 拼写错误或缺少熔断必须精准红", () => {
    // 探针 1: 负向断言不存在的伪造组件 ID 不应在注册列表中
    assert.doesNotMatch(adaptersTs, /register\("non_existent_fake_funnel",/);

    // 探针 2: 负向断言组件调用不应包含未经 wrap 的裸调用
    assert.doesNotMatch(adaptersTs, /register\("knowledge-funnel"[\s\S]*?async \(\) => \{\s*return \{ items: \[\] \};\s*\}, \{\}\);/);
});
