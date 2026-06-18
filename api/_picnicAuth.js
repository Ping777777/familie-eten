const COOKIE_NAME = "picnic_auth";
const SECURE = globalThis.process?.env?.VERCEL || globalThis.process?.env?.NODE_ENV === "production" ? "; Secure" : "";

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
  res.appendHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(authKey)}; HttpOnly; Path=/api; SameSite=Strict${SECURE}`);
}

export function clearPicnicAuthCookie(res) {
  res.appendHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/api; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${SECURE}`);
}

export function isPicnicAuthError(err) {
  const msg = err?.message || "";
  return msg.includes("401") || /unauthorized/i.test(msg);
}
