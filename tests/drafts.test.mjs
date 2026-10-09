import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDraft } from "../server/validation.mjs";
test("generated material is validated before the editor or database sees it", () => {
  assert.throws(() =>
    validateDraft("quiz", [
      { prompt: "Question", options: null, answer: 0, explanation: "Why" },
    ]),
  );
  assert.throws(() =>
    validateDraft("quiz", [
      {
        prompt: "Question",
        options: ["A", "B"],
        answer: 4,
        explanation: "Why",
      },
    ]),
  );
  assert.throws(() => validateDraft("deck", [null]));
  assert.deepEqual(
    validateDraft("deck", [{ front: " What? ", back: " Answer. " }]),
    [{ front: "What?", back: "Answer." }],
  );
});
