export async function api<T>(path: string, data?: unknown): Promise<T> {
  const r = await fetch("/api" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await r.json();
  if (!r.ok)
    throw Object.assign(new Error(result.error || "Please try again."), {
      status: r.status,
    });
  return result;
}
