const {readdirSync} = require("node:fs");
const {join, relative} = require("node:path");
const {spawnSync} = require("node:child_process");

const rootDir = join(__dirname, "..");
const testDirectories = [__dirname, join(__dirname, "host")];
const testFiles = testDirectories.flatMap((directory) =>
    readdirSync(directory, {withFileTypes: true})
        .filter((entry) => entry.isFile() && entry.name.endsWith(".test.cjs"))
        .map((entry) => relative(rootDir, join(directory, entry.name)).replace(/\\/g, "/")),
).sort();

if (testFiles.length === 0) {
    console.error("No test files were found.");
    process.exit(1);
}

const concurrency = Number(process.env.SWSS_TEST_CONCURRENCY || 4);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    console.error("SWSS_TEST_CONCURRENCY must be an integer from 1 to 8.");
    process.exit(1);
}
const CHUNK_SIZE = 40;
const ordinaryFiles = testFiles.filter((f) => !f.endsWith("serve-isolated.test.cjs"));
const standaloneFiles = testFiles.filter((f) => f.endsWith("serve-isolated.test.cjs"));

for (let i = 0; i < ordinaryFiles.length; i += CHUNK_SIZE) {
    const chunk = ordinaryFiles.slice(i, i + CHUNK_SIZE);
    const result = spawnSync(
        process.execPath,
        ["--require", join(__dirname, "ts-register.cjs"), "--test", "--test-concurrency=" + concurrency, ...chunk],
        {stdio: "inherit", cwd: rootDir},
    );
    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

for (const file of standaloneFiles) {
    const result = spawnSync(
        process.execPath,
        ["--require", join(__dirname, "ts-register.cjs"), "--test", file],
        {stdio: "inherit", cwd: rootDir},
    );
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}
process.exit(0);
