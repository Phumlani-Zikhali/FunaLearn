import { test, after } from "node:test";
import assert from "node:assert/strict";
const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
});
const args = { context: "Plant lesson", prompt: "Explain simply" };
async function adapter(name) {
  process.env.AI_PROVIDER = "auto";
  process.env.GEMINI_API_KEY = "google-test-secret";
  process.env.OPENROUTER_API_KEY = "router-test-secret";
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  return import("../server/ai.mjs?test=" + name);
}
test("Gemini receives system instructions, separate credentials and returns readable text", async () => {
  const { generateWithMetadata } = await adapter("google");
  globalThis.fetch = async (url, options) => {
    assert.match(url, /generativelanguage.googleapis.com/);
    assert.equal(options.headers["x-goog-api-key"], "google-test-secret");
    assert.equal(options.headers.Authorization, undefined);
    const body = JSON.parse(options.body);
    assert.match(body.systemInstruction.parts[0].text, /patient educational/);
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: "Private reasoning", thought: true },
                { text: "Plants make food." },
              ],
            },
          },
        ],
      }),
    };
  };
  assert.deepEqual(await generateWithMetadata(args), {
    text: "Plants make food.",
    provider: "Gemini",
  });
});
test("offline requests fall back to Llama with no cloud credentials and skip failed clouds briefly", async () => {
  const { generateWithMetadata } = await adapter("offline");
  let calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url.startsWith("https:")) throw new TypeError("No internet");
    assert.equal(url, "http://127.0.0.1:11434/api/chat");
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers["x-goog-api-key"], undefined);
    assert.equal(JSON.parse(options.body).model, "llama3.2:latest");
    assert.equal(JSON.parse(options.body).stream, false);
    return {
      ok: true,
      json: async () => ({ message: { content: "Local explanation" } }),
    };
  };
  assert.match((await generateWithMetadata(args)).provider, /Llama 3.2/);
  assert.equal(calls.length, 3);
  await generateWithMetadata(args);
  assert.equal(calls.length, 4);
});
test("cloud quota failure can use OpenRouter before the local fallback", async () => {
  const { generateWithMetadata } = await adapter("quota");
  globalThis.fetch = async (url, options) =>
    url.includes("googleapis")
      ? { ok: false, status: 429 }
      : {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "Backup reply" } }],
          }),
        };
  assert.equal((await generateWithMetadata(args)).provider, "OpenRouter");
});
test("a safety refusal does not retry another service", async () => {
  const { generateWithMetadata } = await adapter("refusal");
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    return {
      ok: true,
      json: async () => ({ promptFeedback: { blockReason: "SAFETY" } }),
    };
  };
  assert.match((await generateWithMetadata(args)).text, /cannot help/);
  assert.equal(count, 1);
});
test("local-only mode never sends an internet request; all failures are safely reported", async () => {
  const { generateWithMetadata } = await adapter("local");
  process.env.AI_PROVIDER = "ollama";
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).hostname, "127.0.0.1");
    throw new Error("private provider diagnostics");
  };
  await assert.rejects(
    () => generateWithMetadata(args),
    (e) => e.status === 503 && !e.message.includes("private"),
  );
});
