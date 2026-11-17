/* 只读实例 E2E 配置（T-6833）：复用可写通道准备的同一测试工作区，另起 --readonly 内核。 */
import {defineConfig} from "@playwright/test";
import path from "node:path";

const artifactDir = path.resolve(process.env.SWSS_E2E_ARTIFACT_DIR || ".artifacts/e2e");

export default defineConfig({
    testDir: "./tests/e2e/readonly",
    testMatch: "**/*.spec.mjs",
    globalSetup: path.resolve(import.meta.dirname, "tests/e2e/readonly/global-setup.mjs"),
    timeout: 120000,
    workers: 1,
    retries: 1,
    fullyParallel: false,
    outputDir: path.join(artifactDir, "test-results"),
    reporter: [["list"], ["json", {outputFile: path.join(artifactDir, "results-readonly.json")}]],
    use: {
        // channel:"chromium" 用完整 Chromium（GUI 子系统）跑 headless；缺省会启动
        // chrome-headless-shell.exe（控制台子系统），在无控制台父进程下会被系统新开黑窗。
        headless: true,
        channel: "chromium",
        viewport: {width: 1440, height: 900},
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
});
