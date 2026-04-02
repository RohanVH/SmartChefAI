import admin from "./firebase-admin.js";

export async function parseBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return {};
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
  }

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getPathname(req) {
  return new URL(req.url || "/", "http://localhost").pathname.replace(/\/+$/, "") || "/";
}

export function getQuery(req) {
  const url = new URL(req.url || "/", "http://localhost");
  return Object.fromEntries(url.searchParams.entries());
}

export async function verifyAuth(req) {
  const bearer = req.headers.authorization;
  if (!bearer?.startsWith("Bearer ")) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  if (!admin.apps.length) {
    return { ok: false, error: "Firebase admin is not configured", status: 503 };
  }

  try {
    const decoded = await admin.auth().verifyIdToken(bearer.split("Bearer ")[1]);
    req.user = decoded;
    return { ok: true, user: decoded };
  } catch {
    return { ok: false, error: "Invalid token", status: 401 };
  }
}
