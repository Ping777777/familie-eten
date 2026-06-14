import { readCookie } from "./_cookies.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const user = readCookie(req, "auth_user");
  if (!user) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  res.status(200).json({ user });
}
