const COOKIE_NAME = "picnic_auth";

export function getPicnicAuthKey(req) {
  const cookieHeader = req.headers?.cookie || "";
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    if (part.slice(0, eqIdx).trim() === COOKIE_NAME) {
      try {
        return decodeURIComponent(part.slice(eqIdx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function setPicnicAuthCookie(res, authKey) {
  const secure = globalThis.process?.env?.VERCEL || globalThis.process?.env?.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(authKey)}; HttpOnly; Path=/api; SameSite=Strict${secure}`;

  const existing = res.getHeader?.("Set-Cookie");
  const next = existing
    ? (Array.isArray(existing) ? [...existing, cookie] : [String(existing), cookie])
    : cookie;

  res.setHeader("Set-Cookie", next);
}

export function clearPicnicAuthCookie(res) {
  const secure = globalThis.process?.env?.VERCEL || globalThis.process?.env?.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${COOKIE_NAME}=; HttpOnly; Path=/api; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;

  const existing = res.getHeader?.("Set-Cookie");
  const next = existing
    ? (Array.isArray(existing) ? [...existing, cookie] : [String(existing), cookie])
    : cookie;

  res.setHeader("Set-Cookie", next);
}
