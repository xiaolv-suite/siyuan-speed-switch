"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    getBuiltinActionDefinitions,
    getAvailableActions,
    filterPaletteActions,
    extractActionContext,
} = require("../src/action-palette-model.js");

const {
    computeFrecencyScore,
    rankNavigationItemsByFrecency,
} = require("../src/search-model.js");

test("Station 8: Ecosystem Action Launcher & Frecency Ranking Engine", async (t) => {
    await t.test("1. 8 大插件生态动作直通弹射契约已完备定义 (Ecosystem Launcher Actions)", () => {
        const actions = getBuiltinActionDefinitions();
        const actionIds = new Set(actions.map(a => a.id));

        // 验证 8 大插件专属动作均已纳入内置列表
        assert.ok(actionIds.has("common-snippet"), "小驴常用动作存在");
        assert.ok(actionIds.has("xlc-checkin-quick"), "小驴打卡动作存在");
        assert.ok(actionIds.has("xlc-contacts-interaction"), "小驴人脉动作存在");
        assert.ok(actionIds.has("task-horizon-today"), "小驴雷切/Horizon动作存在");
        assert.ok(actionIds.has("xlc-home-expiry"), "小驴管家动作存在");
        assert.ok(actionIds.has("xlc-cards-review"), "小驴闪卡动作存在");
        assert.ok(actionIds.has("xlc-exam-wrongbook"), "小驴考试动作存在");
        assert.ok(actionIds.has("glean-keep-roaming"), "小驴拾遗动作存在");
    });

    await t.test("2. filterPaletteActions 支持生态关键词与动作快速检索", () => {
        const ctx = extractActionContext({ id: "doc-1", title: "测试文档" });
        const available = getAvailableActions(ctx, { platform: "desktop" });

        // 检索 "打卡" 应命中 checkin 动作
        const checkinMatches = filterPaletteActions(available, "打卡");
        assert.ok(checkinMatches.length > 0);
        assert.ok(checkinMatches.some(a => a.id === "xlc-checkin-quick"));

        // 检索 "考试" 应命中 exam 动作
        const examMatches = filterPaletteActions(available, "考试");
        assert.ok(examMatches.length > 0);
        assert.ok(examMatches.some(a => a.id === "xlc-exam-wrongbook"));

        // 检索 "复习" 应命中 cards 复习动作
        const reviewMatches = filterPaletteActions(available, "复习");
        assert.ok(reviewMatches.length > 0);
        assert.ok(reviewMatches.some(a => a.id === "xlc-cards-review"));
    });

    await t.test("3. computeFrecencyScore 时间半衰期与频次增益数学模型", () => {
        const now = 1762590000000;
        const ONE_HOUR = 3600000;

        // 1 小时内 + 高频使用 (count=10)
        const scoreRecentHigh = computeFrecencyScore(now - ONE_HOUR, 10, now);
        // 1 小时内 + 低频使用 (count=1)
        const scoreRecentLow = computeFrecencyScore(now - ONE_HOUR, 1, now);
        assert.ok(scoreRecentHigh > scoreRecentLow);
        assert.equal(scoreRecentLow, 100); // 100 * (1 + log2(1)) = 100

        // 12 小时前 (24h 阶梯)
        const score12h = computeFrecencyScore(now - 12 * ONE_HOUR, 1, now);
        assert.equal(score12h, 80);

        // 3 天前 (7d 阶梯)
        const score3d = computeFrecencyScore(now - 72 * ONE_HOUR, 1, now);
        assert.equal(score3d, 50);

        // 15 天前 (30d 阶梯)
        const score15d = computeFrecencyScore(now - 360 * ONE_HOUR, 1, now);
        assert.equal(score15d, 20);

        // 2 个月前
        const scoreOld = computeFrecencyScore(now - 1500 * ONE_HOUR, 1, now);
        assert.equal(scoreOld, 5);

        // 边界与异常值安全防御 (零 Bug 保证)
        assert.equal(computeFrecencyScore(now + 100000, 1, now), 100, "未来时间戳自动钳制为当前");
        assert.equal(computeFrecencyScore(now, 0, now), 0, "使用频次为 0 返回 0");
        assert.equal(computeFrecencyScore(now, -5, now), 0, "负数频次返回 0");
        assert.equal(computeFrecencyScore(now, NaN, now), 0, "NaN 返回 0");
    });

    await t.test("4. rankNavigationItemsByFrecency 导航条目热度科学加权排序", () => {
        const now = 1762590000000;
        const ONE_HOUR = 3600000;

        const items = [
            { id: "item-old", title: "陈旧文档", lastUsedAt: now - 500 * ONE_HOUR, useCount: 1 },
            { id: "item-hot", title: "高频热门", lastUsedAt: now - 2 * ONE_HOUR, useCount: 15 },
            { id: "item-recent", title: "近期新鲜", lastUsedAt: now - 3 * ONE_HOUR, useCount: 2 },
        ];

        const ranked = rankNavigationItemsByFrecency(items, now);
        assert.equal(ranked[0].id, "item-hot", "高频热门条目置顶");
        assert.equal(ranked[1].id, "item-recent", "近期新鲜条目次之");
        assert.equal(ranked[2].id, "item-old", "陈旧条目垫底");
    });
});
