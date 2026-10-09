import { test, after } from "node:test";
import assert from "node:assert/strict";
import { generate } from "../server/ai.mjs";
const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
});
test("OpenAI adapter keeps instructions and credentials server-side and parses text blocks", async () => {
  process.env.AI_PROVIDER = "openai";
  process.env.AI_MODEL = "test-model";
  process.env.OPENAI_API_KEY = "test-only-secret";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.headers.Authorization, "Bearer test-only-secret");
    const payload = JSON.parse(options.body);
    assert.equal(payload.store, false);
    assert.match(payload.instructions, /short, clear/);
    assert.match(payload.input[0].content, /Teacher material/);
    return {
      ok: true,
      json: async () => ({
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "An explanation." }],
          },
        ],
      }),
    };
  };
  assert.equal(
    await generate({
      context: "Teacher material: water",
      prompt: "Explain",
      preferences: { readingFocus: true },
    }),
    "An explanation.",
  );
});
test("compatible provider changes transport without changing the learning contract", async () => {
  process.env.AI_PROVIDER = "compatible";
  process.env.AI_BASE_URL = "http://localhost:11434/v1";
  process.env.AI_MODEL = "test-local";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "http://localhost:11434/v1/chat/completions");
    assert.equal(JSON.parse(options.body).messages[0].role, "system");
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Local explanation." } }],
      }),
    };
  };
  assert.equal(
    await generate({ context: "A lesson", prompt: "Explain" }),
    "Local explanation.",
  );
});
test("provider failure exposes no raw credentials and never creates a fake answer", async () => {
  globalThis.fetch = async () => {
    throw new Error("provider error with secret");
  };
  await assert.rejects(
    () => generate({ context: "A lesson", prompt: "Explain" }),
    (e) => e.status === 503 && !e.message.includes("secret"),
  );
});
