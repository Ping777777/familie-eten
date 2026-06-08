import { timingSafeEqual } from "node:crypto";

const USERS = {
  papa: "Papa",
  mama: "Mama",
  inga: "Inga",
  kevin: "Kevin",
};

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

  res.status(200).json({ ok: true, user: USERS[username] });
}
