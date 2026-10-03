import type { NextFunction, Request, Response } from "express";

const ALLOWED_ORIGINS = new Set([
  "https://gamer-09.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
    if (u.protocol === "https:" && (u.hostname.endsWith(".github.io") || u.hostname.endsWith(".onrender.com"))) return true;
  } catch {
    return false;
  }
  return false;
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.removeHeader("X-Powered-By");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}

const buckets = new Map<string, { n: number; t: number }>();

export function rateLimit(max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") ||
      req.ip ||
      "unknown";
    const now = Date.now();
    const row = buckets.get(ip);
    if (!row || now - row.t > windowMs) {
      buckets.set(ip, { n: 1, t: now });
      next();
      return;
    }
    row.n += 1;
    if (row.n > max) {
      res.status(429).json({ error: "Too many requests. Slow down." });
      return;
    }
    next();
  };
}

export function sanitizeChatMessages(
  raw: unknown,
): { role: "user" | "assistant"; content: string }[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 24) return null;
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const role = (row as { role?: string }).role;
    const content = (row as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const text = content.trim().slice(0, 4000);
    if (!text) continue;
    out.push({ role, content: text });
  }
  return out.length ? out : null;
}

export function sanitizeExtraContext(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim().slice(0, 800);
}
