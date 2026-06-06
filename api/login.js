import { timingSafeEqual } from "node:crypto";
import { head } from "@vercel/blob";

const USERS = {
  papa: "Papa",
  mama: "Mama",
  inga: "Inga",
  kevin: "Kevin",
};

const CART_PATH = globalThis.process?.env?.CART_BLOB_PATH || "cart.json";
const encoder = new TextEncoder();

const equalsSafe = (a, b) => {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

async function hasBlobAccess() {
  try {
    await head(CART_PATH);
    return true;
  } catch (error) {
    if (error?.status === 404) return true;
    if (error?.status === 403) return false;
    throw error;
  }
}

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

  try {
    const authorized = await hasBlobAccess();
    if (!authorized) {
      res.status(403).json({ message: "Geen toegang tot blob opslag" });
      return;
    }
  } catch {
    res.status(500).json({ message: "Blob controle mislukt" });
    return;
  }

  res.status(200).json({ ok: true, user: USERS[username] });
}
