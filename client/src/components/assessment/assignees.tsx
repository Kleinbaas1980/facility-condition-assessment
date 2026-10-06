"use client";
import { useEffect, useState } from "react";
import { request } from "@/api/http";

type Row = {
  userId: string;
  name: string;
  email: string;
  profession: string | null;
};

export default function ProjectAssignees({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await request<Row[]>(`/api/projects/${projectId}/assignments`);
    if (r.ok) setRows(await r.json());
  }
  useEffect(() => {
    void load();
  }, [projectId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await request(`/api/projects/${projectId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) {
      setMsg(((await r.json()) as any).error || "Could not assign.");
      return;
    }
    setEmail("");
    setMsg("");
    void load();
  }
  async function remove(userId: string) {
    await request(`/api/projects/${projectId}/assignments/${userId}`, {
      method: "DELETE",
    });
    void load();
  }

  return (
    <div className="m-4" style={{ marginTop: 14 }}>
      <h3>Assigned assessors</h3>
      {rows.map((r) => (
        <div className="actions mb-4" key={r.userId}>
          <span>
            {r.name} · {r.email} {r.profession && `· ${r.profession}`}
          </span>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void remove(r.userId)}
          >
            Remove
          </button>
        </div>
      ))}
      {!rows.length && <p className="muted">No assessors assigned yet.</p>}
      <form className="actions" onSubmit={add}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Assessor email"
        />
        <button className="btn outline">Assign</button>
      </form>
      {msg && (
        <p className="error-text" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
