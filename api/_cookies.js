const IS_PRODUCTION = globalThis.process?.env?.NODE_ENV === "production";

/**
 * Serialise a Set-Cookie header value.
 * @param {string} name
 * @param {string} value  (will be URI-encoded)
 * @param {{ maxAge?: number }} [options]
 * @returns {string}
 */
export function serializeCookie(name, value, { maxAge } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
  ];
  if (IS_PRODUCTION) parts.push("Secure");
  if (maxAge != null) parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

/**
 * Serialise a Set-Cookie header that expires a cookie immediately.
 * @param {string} name
 * @returns {string}
 */
export function expireCookie(name) {
  const parts = [
    `${name}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ];
  if (IS_PRODUCTION) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Read a URI-encoded cookie value from the request.
 * @param {import("http").IncomingMessage & { cookies?: Record<string,string> }} req
 * @param {string} name
 * @returns {string | null}
 */
export function readCookie(req, name) {
  const raw = req.cookies?.[name];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}
