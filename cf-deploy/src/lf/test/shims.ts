// Test stand-ins for D1 and R2: D1 over Node's built-in SQLite (same SQL dialect as D1), R2 over a Map.
// Only for tests; in production the real bindings are used.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import type { D1Database, D1PreparedStatement, D1Result, R2Bucket, R2ObjectBody } from "../worker/types.ts";

const clean = (v: unknown) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);

export function makeD1(migrationPaths: string | string[]): D1Database & { raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  for (const p of Array.isArray(migrationPaths) ? migrationPaths : [migrationPaths]) raw.exec(readFileSync(p, "utf8"));
  const stmt = (sql: string, args: unknown[] = []): D1PreparedStatement & { exec(): D1Result } => ({
    bind: (...a: unknown[]) => stmt(sql, a.map(clean)),
    first: async <T>() => (raw.prepare(sql).get(...(args as never[])) as T) ?? null,
    all: async <T>() => ({ results: raw.prepare(sql).all(...(args as never[])) as T[], success: true, meta: {} }),
    run: async () => stmt(sql, args).exec(),
    exec: () => {
      const r = raw.prepare(sql).run(...(args as never[]));
      return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  return {
    raw,
    prepare: (sql: string) => stmt(sql),
    batch: async (list: D1PreparedStatement[]) => {
      raw.exec("BEGIN");
      try {
        const out = list.map(s => (s as ReturnType<typeof stmt>).exec());
        raw.exec("COMMIT");
        return out;
      } catch (e) { raw.exec("ROLLBACK"); throw e; }
    },
  };
}

export function makeR2(): R2Bucket & { store: Map<string, { data: Uint8Array; type?: string }> } {
  const store = new Map<string, { data: Uint8Array; type?: string }>();
  return {
    store,
    async put(key, value, options) {
      const data = value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBuffer);
      store.set(key, { data, type: options?.httpMetadata?.contentType });
      return { size: data.byteLength };
    },
    async get(key, options) {
      const o = store.get(key);
      if (!o) return null;
      let d = o.data;
      const r = options?.range;
      if (r) d = d.slice(r.offset ?? 0, r.length != null ? (r.offset ?? 0) + r.length : undefined);
      return { size: o.data.byteLength, httpMetadata: { contentType: o.type }, body: new Response(d as unknown as BodyInit).body! } as R2ObjectBody;
    },
    async head(key) { const o = store.get(key); return o ? { size: o.data.byteLength } : null; },
    async delete(key) { for (const k of Array.isArray(key) ? key : [key]) store.delete(k); },
  };
}
