// @ts-check
const assert = require("node:assert/strict");
const path = require("node:path");
const {readSourceText} = require("./source-scan.cjs");

console.log("Starting task-horizon-adapter tests...");

const srcAdapters = readSourceText("src/home-external-adapters.ts");
const srcIndex = readSourceText("src/index.ts");
const bridgeKit = readSourceText("src/api/ecosystem-bridge-kit.ts");

// 1. 检查 ecosystem-bridge-kit.ts 是否包含 Task Horizon
assert.ok(
    bridgeKit.includes("taskHorizon: [\"TaskHorizon\", \"taskHorizon\", \"siyuanTaskHorizon\"]"),
    "ecosystem-bridge-kit.ts must include Task Horizon in BRIDGE_ALIASES"
);
assert.ok(
    bridgeKit.includes("interface TaskHorizonBridgeApi"),
    "ecosystem-bridge-kit.ts must export TaskHorizonBridgeApi interface"
);

// 2. 检查 home-external-adapters.ts 中 task-horizon-today 组件登记
assert.ok(
    srcAdapters.includes('"task-horizon-today"'),
    "home-external-adapters.ts must register task-horizon-today component"
);
assert.ok(
    srcAdapters.includes('source: "task-horizon"'),
    "task-horizon-today component rows must include source: 'task-horizon'"
);
assert.ok(
    srcAdapters.includes("typeof bridge.getTodayTasks !== \"function\""),
    "task-horizon-today component must check getTodayTasks function"
);

// 3. 检查 index.ts 中的 toggleHomeTaskBlock 是否调用 Task Horizon 官方写入队列
assert.ok(
    srcIndex.includes('source === "task-horizon"'),
    "toggleHomeTaskBlock must check source === 'task-horizon'"
);
assert.ok(
    srcIndex.includes("th.setTaskStatus(blockId, targetStatus)"),
    "toggleHomeTaskBlock must delegate status update to th.setTaskStatus"
);

console.log("✓ 雷切 Task Horizon 小组件与直接打勾回调契约断言全部通过！");
