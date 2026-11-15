"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {spawnSync} = require("node:child_process");

const isWin = process.platform === "win32";
const repoRoot = path.resolve(__dirname, "..");
const tmpE2eDir = path.join(repoRoot, ".tmp", "e2e");

function cleanupOrphanProcesses() {
    if (!isWin) return;
    try {
        // 回收孤儿浏览器进程及测试内核进程。
        // 覆盖 chrome.exe、msedge.exe 以及专属于测试工作区的 SiYuan-Kernel.exe
        const psCmd = `Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe' OR Name='SiYuan-Kernel.exe'" | Where-Object { $_.CommandLine -match '小驴雷切|\\.tmp|SiYuan-SpeedSwitch-E2E' } | Select-Object -ExpandProperty ProcessId`;
        const res = spawnSync("powershell", ["-NoProfile", "-Command", psCmd], {
            encoding: "utf8",
            windowsHide: true,
        });
        if (res.stdout) {
            const lines = res.stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^\d+$/.test(l));
            for (const pidStr of lines) {
                const pid = Number(pidStr);
                if (pid > 0 && pid !== process.pid) {
                    try {
                        process.kill(pid, "SIGKILL");
                    } catch (_) {}
                }
            }
        }
    } catch (_) {}
}

function cleanupTmpE2eDir() {
    try {
        if (fs.existsSync(tmpE2eDir)) {
            fs.rmSync(tmpE2eDir, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
        }
    } catch (_) {}
}

cleanupOrphanProcesses();
cleanupTmpE2eDir();
