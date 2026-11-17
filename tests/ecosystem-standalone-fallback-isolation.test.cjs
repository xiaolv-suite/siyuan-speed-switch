"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    getBuiltinActionDefinitions,
    getAvailableActions,
    extractActionContext,
} = require("../src/action-palette-model.js");

const {
    getBridgeSafely,
    callBridge,
    BRIDGE_ALIASES,
} = require("../src/api/ecosystem-bridge-kit.ts");

test("Ecosystem Standalone Fallback & Partial Installation Isolation Drills", async (t) => {
    await t.test("1. 单插件孤岛环境：window 无任何兄弟插件时，getBridgeSafely 安全返回 undefined，零报错", () => {
        const prevWindow = globalThis.window;
        globalThis.window = {}; // 纯空 window，无任何小驴插件

        try {
            for (const key of Object.keys(BRIDGE_ALIASES)) {
                const b = getBridgeSafely(key);
                assert.equal(b, undefined, `未安装插件 ${key} 时，getBridgeSafely 必须安全返回 undefined，不能抛异常`);
            }
        } finally {
            globalThis.window = prevWindow;
        }
    });

    await t.test("2. callBridge 在目标插件缺失时 100% 触发自包含 fallback 保底方案", async () => {
        const prevWindow = globalThis.window;
        globalThis.window = {};

        try {
            let fallbackCalled = false;
            const fallbackResult = { mode: "clipboard", content: "保底文本" };

            const res = await callBridge(
                "cards",
                "cards.create",
                async (bridge) => {
                    return bridge.createCard();
                },
                () => {
                    fallbackCalled = true;
                    return fallbackResult;
                }
            );

            assert.equal(fallbackCalled, true, "目标插件缺失时，必须触发 fallback 保底回调");
            assert.deepEqual(res, fallbackResult, "必须返回保底结果");
        } finally {
            globalThis.window = prevWindow;
        }
    });

    await t.test("3. 部分安装场景：仅安装打卡（缺失管家与闪卡）时各司其职，隔离互不干扰", async () => {
        const prevWindow = globalThis.window;
        // 模拟用户仅安装了小驴打卡
        globalThis.window = {
            siyuanCheckin: {
                whenReady: () => Promise.resolve(true),
                hasCapability: (c) => c === "events.record.batch",
                recordEventsBatch: async () => [{ kind: "recorded" }],
            },
        };

        try {
            // 已安装的打卡：正常执行
            let checkinTriggered = false;
            const checkinRes = await callBridge(
                "checkin",
                "events.record.batch",
                async () => {
                    checkinTriggered = true;
                    return "CHECKIN_OK";
                },
                () => "CHECKIN_FALLBACK"
            );
            assert.equal(checkinTriggered, true);
            assert.equal(checkinRes, "CHECKIN_OK");

            // 未安装的管家：优雅降级到 fallback，绝不报错
            let homeFallbackTriggered = false;
            const homeRes = await callBridge(
                "home",
                "reminders.read",
                async () => "HOME_OK",
                () => {
                    homeFallbackTriggered = true;
                    return "HOME_STANDALONE_FALLBACK";
                }
            );
            assert.equal(homeFallbackTriggered, true);
            assert.equal(homeRes, "HOME_STANDALONE_FALLBACK");
        } finally {
            globalThis.window = prevWindow;
        }
    });

    await t.test("4. 动作画板可用性：无论安装与否，生态动作结构均具备完整语义与图标，不出现 undefined", () => {
        const ctx = extractActionContext({ id: "doc-test", title: "测试文档" });
        const actions = getAvailableActions(ctx, { platform: "desktop" });

        const ecosystemActionIds = [
            "common-snippet",
            "xlc-checkin-quick",
            "xlc-contacts-interaction",
            "task-horizon-today",
            "xlc-home-expiry",
            "xlc-cards-review",
            "xlc-exam-wrongbook",
            "glean-keep-roaming",
        ];

        for (const actionId of ecosystemActionIds) {
            const found = actions.find(a => a.id === actionId);
            assert.ok(found, `动作 ${actionId} 必须存在于可用动作集中`);
            assert.ok(typeof found.label === "string" && found.label.length > 0, `动作 ${actionId} 必须具有可读 label`);
            assert.ok(typeof found.icon === "string" && found.icon.length > 0, `动作 ${actionId} 必须具有合法图标`);
            assert.equal(found.isDestructive, false);
        }
    });
});
