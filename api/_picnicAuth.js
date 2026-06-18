const COOKIE_NAME = "picnic_auth";

export function getPicnicAuthKey(req) {
  const cookieHeader = req.headers?.cookie || "";
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    if (part.slice(0, eqIdx).trim() === COOKIE_NAME) {
      return decodeURIComponent(part.slice(eqIdx + 1).trim());
    }
  }
  return null;
}

export function setPicnicAuthCookie(res, authKey) {
  const secure = globalThis.process?.env?.VERCEL || globalThis.process?.env?.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(authKey)}; HttpOnly; Path=/api; SameSite=Strict${secure}`
  );
}

export function clearPicnicAuthCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/api; SameSite=Strict; Max-Age=0`
  );
}
