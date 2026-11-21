// Small response helpers.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const SEC_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...SEC_HEADERS, ...extra },
  });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof ApiError) return json({ error: e.message }, e.status);
  console.error("learning-features error", e);
  return json({ error: "server error" }, 500);
}

export async function readJson(req: Request, limitBytes = 256 * 1024): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get("Content-Length") || "0");
  if (len > limitBytes) throw new ApiError(413, "request too large");
  const text = await req.text();
  if (text.length > limitBytes) throw new ApiError(413, "request too large");
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch { /* fall through */ }
  throw new ApiError(400, "body must be a JSON object");
}

export function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export function num(v: unknown, min: number, max: number, dflt = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
