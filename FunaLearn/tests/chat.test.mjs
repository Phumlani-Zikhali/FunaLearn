import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("open chat remembers follow-ups, saves only private history and hides provider metadata", async () => {
  const folder = mkdtempSync(join(tmpdir(), "funalearn-chat-"));
  const requests = [];
  const mock = createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    requests.push(JSON.parse(body));
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                "A helpful reply to " + requests.at(-1).messages.at(-1).content,
            },
          },
        ],
      }),
    );
  });
  await new Promise((r) => mock.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:4322";
  const child = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      PORT: "4322",
      DB_PATH: join(folder, "test.sqlite"),
      AI_PROVIDER: "compatible",
      AI_MODEL: "mock",
      AI_BASE_URL: "http://127.0.0.1:" + mock.address().port,
    },
    stdio: "ignore",
  });
  const call = async (path, body, cookie) => {
    const r = await fetch(origin + "/api" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  };
  try {
    let ready = false;
    for (let n = 0; n < 80; n++) {
      try {
        if ((await call("/health")).status === 200) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready);
    const register = (name) =>
      call("/auth/register", {
        name,
        email: name + "@test.local",
        password: "Testing-long-password-123",
      });
    await register("owner");
    const a = await register("learner"),
      b = await register("other");
    const first = await call(
      "/ai",
      { prompt: "How do volcanoes form?" },
      a.cookie,
    );
    assert.equal(first.status, 200);
    assert.deepEqual(Object.keys(first.data), ["reply"]);
    await call(
      "/ai",
      { prompt: "Now help me write a poem instead." },
      a.cookie,
    );
    assert.ok(
      requests[1].messages.some((m) => m.content === "How do volcanoes form?"),
    );
    assert.ok(requests[1].messages.some((m) => m.role === "assistant"));
    assert.match(requests[0].messages[1].content, /No fixed lesson/);
    assert.equal(
      (await call("/ai/history", undefined, a.cookie)).data.length,
      4,
    );
    assert.equal(
      (await call("/ai/history", undefined, b.cookie)).data.length,
      0,
    );
    assert.equal(
      (await call("/ai/generate", { kind: "deck" }, a.cookie)).status,
      400,
    );
  } finally {
    const closed = new Promise((r) => child.once("exit", r));
    child.kill();
    await closed;
    await new Promise((r) => mock.close(r));
    rmSync(folder, { recursive: true, force: true });
  }
});
