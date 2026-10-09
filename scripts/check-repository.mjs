import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
const forbidden =
  /(^|\/)(?:node_modules|dist|data|coverage|test-results|\.sites-runtime)(\/|$)|(^|\/)\.env(?:\..*)?$|\.(?:sqlite(?:-.*)?|db(?:-.*)?|pem|key|bak|log)$|(^|\/)Simulation accounts\.txt$|^docs\/(?:MASTER-BRIEF|MASTER-BLUEPRINT|ASSESSMENT|VALIDATION)\.md$/i;
const secrets = [
  /sk-(?:or-v1-)?[A-Za-z0-9_-]{24,}/,
  /AIza[0-9A-Za-z_-]{30,}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
let failed = false;
function inspect(path, bytes, version) {
  if (path !== ".env.example" && forbidden.test(path)) {
    console.error("Private/generated file included: " + path);
    failed = true;
    return;
  }
  if (bytes.includes(0)) return;
  const content = bytes.toString("utf8");
  if (secrets.some((pattern) => pattern.test(content))) {
    console.error(
      "Possible credential in " + version + ": " + path + " (value withheld)",
    );
    failed = true;
  }
  if (
    path === ".env.example" &&
    /^[ \t]*\w*(?:KEY|TOKEN|PASSWORD|SECRET)\w*[ \t]*=[ \t]*[^\s#]+/m.test(
      content,
    )
  ) {
    console.error("Example settings must use blank credential values.");
    failed = true;
  }
}
try {
  const tracked = git("ls-files", "-z").split("\0").filter(Boolean);
  const untracked = git("ls-files", "--others", "--exclude-standard", "-z")
    .split("\0")
    .filter(Boolean);
  if (!tracked.length && !untracked.length)
    throw new Error("No project files found.");
  for (const path of tracked) {
    const bytes = execFileSync("git", ["show", ":" + path], {
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    inspect(path, bytes, "Git index");
  }
  for (const path of new Set([...tracked, ...untracked])) {
    try {
      inspect(path, readFileSync(path), "working tree");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  if (failed) process.exitCode = 1;
  else
    console.log(
      "Repository check passed: " +
        new Set([...tracked, ...untracked]).size +
        " files checked; no blocked paths or recognised credentials found.",
    );
} catch {
  console.error(
    "Repository check could not complete. Run it inside the project Git repository and check Git is installed.",
  );
  process.exitCode = 1;
}
