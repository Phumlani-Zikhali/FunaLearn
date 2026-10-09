import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["server/index.mjs"], { stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
  }),
];
for (const c of children)
  c.on("exit", () => {
    for (const other of children) if (other !== c) other.kill();
  });
process.on("SIGINT", () => {
  for (const c of children) c.kill();
  process.exit();
});
