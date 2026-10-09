import { Search } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import type { User } from "../lib/types";
import { Empty, Heading, useApp } from "../shared";
export interface AdminData {
  users: (User & { active: number })[];
  classes: { id: string; name: string; teacher: string; teacher_id: string }[];
  members: { class_id: string; user_id: string }[];
  stats: { learners: number; activities: number; resources: number };
}
export function AdminUsers({
  data,
  reload,
}: {
  data: AdminData;
  reload: () => Promise<void>;
}) {
  const { s, notify } = useApp();
  const [query, setQuery] = useState("");
  return (
    <>
      <Heading title="People, with the right access.">
        New accounts start as learners. Role changes end existing sessions and
        never alter earned progress.
      </Heading>
      <label className="search">
        <Search />
        <input
          aria-label="Find a person"
          placeholder="Find a person…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="hub-list">
        {data.users
          .filter((u) =>
            (u.name + " " + u.email)
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((u) => (
            <form
              className="panel user-row"
              key={u.id}
              onSubmit={async (e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  await api("/admin/users", {
                    id: u.id,
                    role: f.role,
                    active: f.active === "true",
                  });
                  await reload();
                  notify("Account permissions saved. Existing sessions ended.");
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <div>
                <h2>{u.name}</h2>
                <p className="muted">{u.email}</p>
              </div>
              <label>
                Role
                <select
                  name="role"
                  defaultValue={u.role}
                  disabled={u.id === s.user.id}
                >
                  <option value="student">Learner</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
              <label>
                Status
                <select
                  name="active"
                  defaultValue={String(!!u.active)}
                  disabled={u.id === s.user.id}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <button disabled={u.id === s.user.id}>Save access</button>
            </form>
          ))}
      </div>
    </>
  );
}
export function AdminClasses({
  data,
  reload,
}: {
  data: AdminData;
  reload: () => Promise<void>;
}) {
  const { notify } = useApp();
  async function submit(e: React.FormEvent<HTMLFormElement>, path: string) {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await api(path, Object.fromEntries(new FormData(form)));
      await reload();
      form.reset();
      notify("Class details saved.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <Heading title="Give learning a place to happen.">
        Create a class, assign its teacher, and enrol learners.
      </Heading>
      <div className="two-col">
        <form className="panel" onSubmit={(e) => submit(e, "/admin/classes")}>
          <h2>Create a class</h2>
          <label>
            Class name
            <input name="name" required maxLength={120} />
          </label>
          <label>
            Teacher
            <select name="teacherId" required>
              {data.users
                .filter((u) => u.role === "teacher" && u.active)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="primary">Create class</button>
        </form>
        <form className="panel" onSubmit={(e) => submit(e, "/admin/members")}>
          <h2>Enrol a learner</h2>
          <label>
            Class
            <select name="classId" required>
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Learner
            <select name="userId" required>
              {data.users
                .filter((u) => u.role === "student" && u.active)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="primary" disabled={!data.classes.length}>
            Enrol learner
          </button>
        </form>
      </div>
      <div className="hub-list section">
        {data.classes.map((c) => (
          <section className="panel" key={c.id}>
            <h2>{c.name}</h2>
            <p className="muted">Teacher: {c.teacher}</p>
            {data.members
              .filter((m) => m.class_id === c.id)
              .map((m) => (
                <div className="spread history" key={m.user_id}>
                  <span>
                    {data.users.find((u) => u.id === m.user_id)?.name}
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        await api("/admin/members", {
                          classId: c.id,
                          userId: m.user_id,
                          remove: true,
                        });
                        await reload();
                        notify(
                          "Learner removed from this class. Saved progress is preserved.",
                        );
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  >
                    Unenrol
                  </button>
                </div>
              ))}
          </section>
        ))}
      </div>
    </>
  );
}
export function AdminResources() {
  const { s, refresh, notify } = useApp();
  return (
    <>
      <Heading title="Keep shared material useful.">
        Review teacher resources. Hiding material removes it from learners and
        AI grounding without deleting it.
      </Heading>
      <div className="hub-list">
        {s.resources.map((r) => (
          <section className="panel" key={r.id}>
            <p className="eyebrow">
              {r.approved ? "VISIBLE TO CLASS" : "HIDDEN"} · {r.subject}
            </p>
            <h2>{r.title}</h2>
            <p className="muted">Shared by {r.author}</p>
            <details>
              <summary>Review material</summary>
              <div
                className="reading-block"
                tabIndex={0}
                style={{ whiteSpace: "pre-wrap" }}
              >
                {r.body}
              </div>
            </details>
            <button
              onClick={async () => {
                try {
                  await api("/admin/moderate", {
                    id: r.id,
                    approved: !r.approved,
                  });
                  await refresh();
                  notify(
                    r.approved
                      ? "Resource hidden from learners."
                      : "Resource restored to learners.",
                  );
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              {r.approved ? "Hide resource" : "Restore resource"}
            </button>
          </section>
        ))}
      </div>
      {!s.resources.length && (
        <Empty>No teacher resources to review yet.</Empty>
      )}
    </>
  );
}
