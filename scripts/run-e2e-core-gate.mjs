/* 真实思源核心路径发版门禁（2026-10-31 方向收敛第一件）：
   本机存在思源内核时，发版门禁（verify:release）强制在隔离工作区跑完核心用户路径 E2E：
   呼出切换器、过滤页签、搜索打开文档、收藏、误关恢复、今日日记、工作台全部默认组件
   真实数据（0 失败态）、片段实验室启用/停用与缩放防截断，并同步生成真实宿主截图。 */
import {spawnSync} from "node:child_process";
import path from "node:path";
import {resolveInstall} from "./e2e/lib.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");

spawnSync("node", [path.join(repoRoot, "scripts", "cleanup-e2e-artifacts.cjs")], {stdio: "ignore"});

let install = null;
try {
    install = resolveInstall();
} catch (error) {
    if (process.env.CI === "true" && process.env.SWSS_REQUIRE_REAL_SIYUAN !== "1") {
        console.log(`[e2e:core] CI 环境未安装思源内核，跳过真机门禁：${error.message}`);
        process.exit(0);
    }
    console.error(`[e2e:core] 本机发版门禁必须具备真实思源内核：${error.message}`);
    process.exit(1);
}

console.log(`[e2e:core] 使用真实思源内核执行核心路径门禁：${install.kernel}`);
const specs = [
    "core-paths",
    "full-interactive-browser-audit",
    "user-experience-full-journey",
    "ecosystem-features-browser-audit",
    "smoke-desktop",
    "open-flow",
    "split-open",
    "first-open",
    "surface-close",
    "favorites-flow",
    "recent-closed-flow",
    "doc-preview-layout",
    "home-health-diagnostics",
    "t7144-widgets",
    "workbench-information",
    "store-inline-preview",
    "panel-interaction-layout",
    "snippet-studio-entry",
];

const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "playwright", "test", "--config", "playwright.e2e.config.mjs", ...specs],
    {cwd: repoRoot, stdio: "inherit", shell: process.platform === "win32"},
);

process.exit(result.status ?? 1);
