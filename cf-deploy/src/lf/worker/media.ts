// Photos and voice recordings in R2, always through the Worker (never presigned URLs):
// - the browser only ever talks to your own domain, which already works from China;
// - the Worker checks the family session, the type, the size and the file's first bytes before anything is stored;
// - no S3 keys exist anywhere.
//
// R2 key layout:  families/{familyId}/{photo|audio}/{YYYY-MM}/{uploadId}.{ext}
// One prefix per family makes export, backup and "delete everything for this family" a single prefix listing.
import { ApiError, json } from "./http.ts";
import type { D1Database, R2Bucket } from "./types.ts";

export type UploadKind = "photo" | "audio";

export interface MediaLimits { photoMaxBytes: number; audioMaxBytes: number; maxAudioSecs: number }
export const DEFAULT_LIMITS: MediaLimits = { photoMaxBytes: 3 * 1024 * 1024, audioMaxBytes: 4 * 1024 * 1024, maxAudioSecs: 300 };

export const UPLOAD_TYPES: Record<UploadKind, Record<string, string>> = {
  photo: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" },
  audio: { "audio/mp4": "m4a", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/aac": "aac" },
};

const UPLOAD_ID = /^[A-Za-z0-9_-]{16,64}$/;

/** Checks the first bytes, so a page can never be stored and later served as "audio". */
export function looksLike(mime: string, b: Uint8Array): boolean {
  const at = (i: number, ...xs: number[]) => xs.every((x, j) => b[i + j] === x);
  const ascii = (i: number, s: string) => [...s].every((c, j) => b[i + j] === c.charCodeAt(0));
  switch (mime) {
    case "image/jpeg": return at(0, 0xff, 0xd8, 0xff);
    case "image/png": return at(0, 0x89, 0x50, 0x4e, 0x47);
    case "image/webp": return ascii(0, "RIFF") && ascii(8, "WEBP");
    case "audio/webm": return at(0, 0x1a, 0x45, 0xdf, 0xa3);
    case "audio/mp4": return ascii(4, "ftyp");
    case "audio/ogg": return ascii(0, "OggS");
    case "audio/mpeg": return ascii(0, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    case "audio/aac": return b[0] === 0xff && (b[1] & 0xf6) === 0xf0;
    default: return false;
  }
}

async function readCapped(req: Request, max: number): Promise<Uint8Array> {
  const declared = req.headers.get("Content-Length");
  if (declared && Number(declared) > max) throw new ApiError(413, `file is larger than ${Math.round(max / 1024)} KB`);
  if (!req.body) throw new ApiError(400, "empty upload");
  const reader = req.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new ApiError(413, `file is larger than ${Math.round(max / 1024)} KB`);
    }
    parts.push(value);
  }
  if (!total) throw new ApiError(400, "empty upload");
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.byteLength; }
  return out;
}

export function r2Key(familyId: string, kind: UploadKind, at: Date, uploadId: string, ext: string): string {
  return `families/${encodeURIComponent(familyId)}/${kind}/${at.toISOString().slice(0, 7)}/${uploadId}.${ext}`;
}

export interface UploadRow { id: string; family_id: string; kind: UploadKind; r2_key: string; mime: string; bytes: number; secs: number; created_at: string }

/**
 * PUT {prefix}/uploads/{kind}
 * Headers: Content-Type (one of UPLOAD_TYPES), X-Upload-Id (client-made random id, 16-64 of A-Z a-z 0-9 _ -),
 *          optional X-Audio-Secs. Body: the raw file.
 * Sending the same X-Upload-Id again returns the first result, so a retry after a dropped connection is safe.
 */
export async function handleUpload(req: Request, db: D1Database, bucket: R2Bucket, familyId: string, kind: UploadKind,
  limits: MediaLimits, mediaUrl: (id: string) => string, now: Date): Promise<Response> {
  const uploadId = req.headers.get("X-Upload-Id") || "";
  if (!UPLOAD_ID.test(uploadId)) throw new ApiError(400, "X-Upload-Id must be 16-64 letters, digits, _ or -");
  const mime = (req.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  const ext = UPLOAD_TYPES[kind][mime];
  if (!ext) throw new ApiError(415, `unsupported ${kind} type ${mime || "(none)"}`);

  const existing = await db.prepare("SELECT * FROM lf_uploads WHERE id=?").bind(uploadId).first<UploadRow>();
  if (existing) {
    if (existing.family_id !== familyId || existing.kind !== kind) throw new ApiError(409, "upload id already used");
    return json({ id: existing.id, url: mediaUrl(existing.id), bytes: existing.bytes, duplicate: true });
  }

  const data = await readCapped(req, kind === "photo" ? limits.photoMaxBytes : limits.audioMaxBytes);
  if (!looksLike(mime, data)) throw new ApiError(415, `file does not look like ${mime}`);
  const secs = kind === "audio" ? Math.min(limits.maxAudioSecs, Math.max(0, Number(req.headers.get("X-Audio-Secs")) || 0)) : 0;
  const key = r2Key(familyId, kind, now, uploadId, ext);
  await bucket.put(key, data, { httpMetadata: { contentType: mime }, customMetadata: { family: familyId } });
  const res = await db.prepare(
    "INSERT OR IGNORE INTO lf_uploads(id, family_id, kind, r2_key, mime, bytes, secs, created_at) VALUES(?,?,?,?,?,?,?,?)",
  ).bind(uploadId, familyId, kind, key, mime, data.byteLength, secs, now.toISOString()).run();
  if (!res.meta.changes) {
    // Two copies of the same retry raced; the other one won. Same id, same file, so just answer with it.
    const row = await db.prepare("SELECT * FROM lf_uploads WHERE id=?").bind(uploadId).first<UploadRow>();
    if (!row || row.family_id !== familyId) throw new ApiError(409, "upload id already used");
  }
  return json({ id: uploadId, url: mediaUrl(uploadId), bytes: data.byteLength, duplicate: false }, 201);
}

/** Returns the upload if it belongs to this family and is of this kind; throws 400 otherwise. Null stays null. */
export async function ownUpload(db: D1Database, familyId: string, id: unknown, kind: UploadKind): Promise<UploadRow | null> {
  if (id == null || id === "") return null;
  if (typeof id !== "string" || !UPLOAD_ID.test(id)) throw new ApiError(400, `bad ${kind} id`);
  const row = await db.prepare("SELECT * FROM lf_uploads WHERE id=? AND family_id=? AND kind=?").bind(id, familyId, kind).first<UploadRow>();
  if (!row) throw new ApiError(400, `unknown ${kind} upload`);
  return row;
}

/** Parses one "bytes=" range. Returns null for no range, "bad" when it cannot be satisfied. */
export function parseRange(h: string | null, size: number): { offset: number; length: number } | null | "bad" {
  if (!h) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(h.trim());
  if (!m || (m[1] === "" && m[2] === "")) return "bad";
  let start: number, end: number;
  if (m[1] === "") { // suffix: last n bytes
    const n = Number(m[2]);
    if (!n) return "bad";
    start = Math.max(0, size - n); end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || end < start) return "bad";
  return { offset: start, length: end - start + 1 };
}

/**
 * GET or HEAD {prefix}/media/{id}: family-only, with Range support (iPhone Safari will not play audio without it).
 */
export async function handleMedia(req: Request, db: D1Database, bucket: R2Bucket, familyId: string, id: string): Promise<Response> {
  if (!UPLOAD_ID.test(id)) throw new ApiError(404, "not found");
  const row = await db.prepare("SELECT * FROM lf_uploads WHERE id=? AND family_id=?").bind(id, familyId).first<UploadRow>();
  if (!row) throw new ApiError(404, "not found");
  const base: Record<string, string> = {
    "Content-Type": row.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=86400",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Disposition": "inline",
    "ETag": `"${row.id}"`,
  };
  const range = parseRange(req.headers.get("Range"), row.bytes);
  if (range === "bad") return new Response(null, { status: 416, headers: { ...base, "Content-Range": `bytes */${row.bytes}` } });
  if (req.method === "HEAD") return new Response(null, { status: 200, headers: { ...base, "Content-Length": String(row.bytes) } });
  const obj = await bucket.get(row.r2_key, range ? { range } : undefined);
  if (!obj) throw new ApiError(404, "not found");
  if (range) {
    return new Response(obj.body, { status: 206, headers: {
      ...base, "Content-Length": String(range.length),
      "Content-Range": `bytes ${range.offset}-${range.offset + range.length - 1}/${row.bytes}`,
    } });
  }
  return new Response(obj.body, { status: 200, headers: { ...base, "Content-Length": String(row.bytes) } });
}
