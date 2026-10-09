import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const checker = resolve("scripts/check-repository.mjs");
test("repository guard checks staged secrets even after the working file is cleaned", () => {
  const folder = mkdtempSync(join(tmpdir(), "funalearn-repo-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: folder, stdio: "ignore" });
  const check = () =>
    spawnSync(process.execPath, [checker], { cwd: folder, encoding: "utf8" });
  try {
    git("init");
    writeFileSync(join(folder, "safe.txt"), "safe");
    git("add", "safe.txt");
    assert.equal(check().status, 0);
    const token = ["sk", "or", "v1"].join("-") + "-" + "a".repeat(64);
    writeFileSync(join(folder, "safe.txt"), token);
    git("add", "safe.txt");
    writeFileSync(join(folder, "safe.txt"), "safe again");
    const result = check();
    assert.equal(result.status, 1);
    assert.ok(!result.stderr.includes(token));
    git("add", "safe.txt");
    writeFileSync(join(folder, ".env"), "PRIVATE_VALUE=example");
    git("add", ".env");
    assert.equal(check().status, 1);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
