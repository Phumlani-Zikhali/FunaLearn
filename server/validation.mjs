import { z } from "zod";
const copy = (max) => z.string().trim().min(1).max(max);
const card = z.object({ front: copy(1000), back: copy(2000) });
const question = z
  .object({
    prompt: copy(1000),
    options: z.array(copy(500)).min(2).max(6),
    answer: z.number().int().nonnegative(),
    explanation: copy(2000),
  })
  .refine((q) => q.answer < q.options.length);
export function validateDraft(kind, items) {
  const result = z
    .array(kind === "deck" ? card : question)
    .min(1)
    .max(30)
    .safeParse(items);
  if (!result.success)
    throw Object.assign(
      new Error(
        "Each practice item needs a clear question, a valid answer, and an explanation for quizzes. Please review the draft.",
      ),
      { status: 400 },
    );
  return result.data;
}
