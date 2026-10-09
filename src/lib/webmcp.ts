export function registerLearningTools() {
  const context = (
    document as Document & {
      modelContext?: {
        registerTool: (tool: unknown, options: unknown) => Promise<void>;
      };
    }
  ).modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  // Read-only tools use the same authorised API as the visible learning screens.
  const tools = [
    {
      name: "read_learning_progress",
      title: "Read my learning progress",
      description:
        "Read the signed-in learner’s saved progress. Does not complete activities or award XP.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      async execute(input: unknown) {
        if (!input || typeof input !== "object" || Object.keys(input).length)
          throw new Error("No inputs are accepted.");
        const r = await fetch("/api/state");
        if (!r.ok) throw new Error("Sign in to read learning progress.");
        const s = await r.json();
        return {
          xp: s.progress.xp,
          completedLessons: s.progress.completed,
          streak: s.progress.streak,
          dueCards: s.decks.reduce(
            (n: number, d: { due: number }) => n + d.due,
            0,
          ),
        };
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  }
  return () => lifecycle.abort();
}
