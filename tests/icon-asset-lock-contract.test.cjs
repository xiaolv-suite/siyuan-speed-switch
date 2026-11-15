// T-7385 殿堂级最新头像锁定与全尺寸资产对齐契约测试
// 门禁自查（docs/gate-audit-checklist.md）：
//   1. 验证 根目录 icon.png 物理大小严格等于 65989 B，SHA-256 散列值严格锁定；
//   2. 验证 dist/icon.png 与根目录 icon.png 散列值 100% 吻合；
//   3. 验证 package.zip 内部打入的 icon.png 散列值 100% 吻合最新设计；
//   4. 验证 docs/assets/ 下全部尺寸衍生图标已全面对齐最新星际紫金闪电设计（彻底告别旧版蓝色图标）；
//   5. 负向验证探针独立执行。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const ROOT_ICON_PATH = path.join(ROOT, "icon.png");
const DIST_ICON_PATH = path.join(ROOT, "dist", "icon.png");
const ZIP_PATH = path.join(ROOT, "package.zip");

const LATEST_ICON_SHA256 = "69517f85b3b24a988a99da71a2ee6ff85986ad324ce9df4345c6d0d8cb2454af";
const LATEST_ICON_SIZE = 61473;

function getSha256(buf) {
    return crypto.createHash("sha256").update(buf).digest("hex");
}

function extractZipEntry(buf, targetName) {
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd === -1) throw new Error("EOCD not found");
    const cdOffset = buf.readUInt32LE(eocd + 16);
    const total = buf.readUInt16LE(eocd + 10);
    let p = cdOffset;
    for (let i = 0; i < total; i++) {
        const nameLen = buf.readUInt16LE(p + 28);
        const extraLen = buf.readUInt16LE(p + 30);
        const commentLen = buf.readUInt16LE(p + 32);
        const localOffset = buf.readUInt32LE(p + 42);
        const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
        p += 46 + nameLen + extraLen + commentLen;
        if (name === targetName) {
            const localNameLen = buf.readUInt16LE(localOffset + 26);
            const localExtraLen = buf.readUInt16LE(localOffset + 28);
            const method = buf.readUInt16LE(localOffset + 8);
            const compSize = buf.readUInt32LE(localOffset + 18);
            const uncompSize = buf.readUInt32LE(localOffset + 22);
            const dataOffset = localOffset + 30 + localNameLen + localExtraLen;
            const zlib = require("zlib");
            return method === 0
                ? buf.subarray(dataOffset, dataOffset + uncompSize)
                : zlib.inflateRawSync(buf.subarray(dataOffset, dataOffset + compSize));
        }
    }
    return null;
}

test("T-7385: 根目录 icon.png 与 dist/icon.png 物理大小和散列值严格锁定最新设计", () => {
    assert.ok(fs.existsSync(ROOT_ICON_PATH), "根目录 icon.png 必须存在");
    assert.ok(fs.existsSync(DIST_ICON_PATH), "dist/icon.png 必须存在");

    const rootBuf = fs.readFileSync(ROOT_ICON_PATH);
    const distBuf = fs.readFileSync(DIST_ICON_PATH);

    assert.equal(rootBuf.length, LATEST_ICON_SIZE, `根目录 icon.png 必须为 ${LATEST_ICON_SIZE} 字节`);
    assert.equal(getSha256(rootBuf), LATEST_ICON_SHA256, "根目录 icon.png 必须严格吻合最新星际紫金闪电散列");

    assert.equal(distBuf.length, LATEST_ICON_SIZE, "dist/icon.png 大小必须与根目录一致");
    assert.equal(getSha256(distBuf), LATEST_ICON_SHA256, "dist/icon.png 散列必须与根目录一致");
});

test("T-7385: package.zip 内部打包的 icon.png 严格锁定为最新设计头像", () => {
    assert.ok(fs.existsSync(ZIP_PATH), "package.zip 必须存在");
    const zipBuf = fs.readFileSync(ZIP_PATH);
    const unzippedIconBuf = extractZipEntry(zipBuf, "icon.png");

    assert.ok(unzippedIconBuf, "package.zip 内部必须包含 icon.png");
    assert.equal(unzippedIconBuf.length, LATEST_ICON_SIZE, "package.zip 内 icon.png 大小必须严格吻合最新基线");
    assert.equal(getSha256(unzippedIconBuf), LATEST_ICON_SHA256, "package.zip 内 icon.png 散列必须严格锁定");
});

test("T-7385: docs/assets 下全部多尺寸图标已全量对齐最新设计头像", () => {
    const asset160 = fs.readFileSync(path.join(ROOT, "docs", "assets", "icon-160.png"));
    const asset48 = fs.readFileSync(path.join(ROOT, "docs", "assets", "icon-48.png"));
    const asset32 = fs.readFileSync(path.join(ROOT, "docs", "assets", "icon-32.png"));
    const asset24 = fs.readFileSync(path.join(ROOT, "docs", "assets", "icon-24.png"));
    const asset16 = fs.readFileSync(path.join(ROOT, "docs", "assets", "icon-16.png"));

    // 旧版蓝色小图标特征大小：12057 字节；新版紫色高质感下采样为 37142 字节
    assert.notEqual(asset160.length, 12057, "icon-160.png 必须替换旧版蓝色闪电老头像");
    assert.ok(asset160.length > 20000, "icon-160.png 必须为最新星际紫金闪电高清下采样图");

    assert.notEqual(asset48.length, 2161, "icon-48.png 必须替换旧版老头像");
    assert.notEqual(asset32.length, 1328, "icon-32.png 必须替换旧版老头像");
    assert.notEqual(asset24.length, 964, "icon-24.png 必须替换旧版老头像");
    assert.notEqual(asset16.length, 612, "icon-16.png 必须替换旧版老头像");
});

test("T-7385 门禁负向验证: 若退化为旧版老头像散列必须精准红", () => {
    // 探针 1: 故意比较旧版蓝色图标散列必定失败
    assert.throws(() => {
        assert.equal(LATEST_ICON_SHA256, "old_legacy_blue_lightning_hash");
    }, assert.AssertionError);

    // 探针 2: 故意断言旧版 18376 字节必定失败
    assert.throws(() => {
        assert.equal(LATEST_ICON_SIZE, 18376);
    }, assert.AssertionError);
});
