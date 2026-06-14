import { timingSafeEqual } from "node:crypto";
import { serializeCookie } from "./_cookies.js";

const USERS = {
  papa: "Papa",
  mama: "Mama",
  inga: "Inga",
  kevin: "Kevin",
};

// 7 days in seconds
const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

const encoder = new TextEncoder();

const equalsSafe = (a, b) => {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "").trim().toLowerCase();

  if (!username || !password || !USERS[username]) {
    res.status(401).json({ message: "Ongeldige gebruikersnaam of wachtwoord" });
    return;
  }

  if (!equalsSafe(username, password)) {
    res.status(401).json({ message: "Ongeldige gebruikersnaam of wachtwoord" });
    return;
  }

  const user = USERS[username];
  res.setHeader("Set-Cookie", serializeCookie("auth_user", user, { maxAge: AUTH_COOKIE_MAX_AGE }));
  res.status(200).json({ ok: true, user });
}
