import { useState } from "react";
import { api } from "../lib/api";
import { Empty, Heading, LoadState, useApp, useLoad } from "../shared";
export function JoinClass({ onJoined }: { onJoined?: () => void }) {
  const { refresh, notify } = useApp();
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="panel">
      <h2>Join a class</h2>
      <p>
        Enter the class code from your teacher to receive resources, assignments
        and messages.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await api<{ name: string }>("/classes/join", {
              code,
            });
            await refresh();
            setCode("");
            notify("You joined " + result.name + ".");
            onJoined?.();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Class code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={30}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="Code from your teacher"
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Joining…" : "Join class"}
        </button>
      </form>
    </section>
  );
}
export function StudentMessages() {
  const { s } = useApp();
  const { value, error, load } =
    useLoad<{ id: string; sender: string; body: string; created: string }[]>(
      "/messages",
    );
  return (
    <>
      <Heading title="Messages">
        Keep in touch with your learning community.
      </Heading>
      <JoinClass />
      <p className="muted">
        {s.classes.length
          ? "Your classes: " + s.classes.map((c) => c.name).join(", ")
          : "You have not joined a class yet. Ask your teacher for a code."}
      </p>
      <h2>From your teachers</h2>
      {!value ? (
        <LoadState error={error} retry={load} />
      ) : value.length ? (
        value.map((m) => (
          <article key={m.id} className="panel section">
            <h3>{m.sender}</h3>
            <small>{new Date(m.created).toLocaleString()}</small>
            <p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
          </article>
        ))
      ) : (
        <Empty>No messages yet. Messages sent to you will appear here.</Empty>
      )}
      <button onClick={load}>Refresh messages</button>
    </>
  );
}
export function ClassInvites() {
  const { value, error, load } =
    useLoad<{ id: string; name: string; code: string }[]>("/classes/invites");
  return (
    <section className="panel section">
      <h2>Class join codes</h2>
      <p>
        Share a code with your learners. They can enter it after signing in or
        in Messages → Join class.
      </p>
      {!value ? (
        <LoadState error={error} retry={load} />
      ) : value.length ? (
        value.map((c) => (
          <div className="spread history" key={c.id}>
            <strong>{c.name}</strong>
            <code style={{ userSelect: "all", letterSpacing: ".08em" }}>
              {c.code}
            </code>
          </div>
        ))
      ) : (
        <p>No active classes yet.</p>
      )}
      <button onClick={load}>Refresh codes</button>
    </section>
  );
}
