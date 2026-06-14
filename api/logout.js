import { expireCookie } from "./_cookies.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  res.setHeader("Set-Cookie", [
    expireCookie("auth_user"),
    expireCookie("picnic_auth_key"),
    expireCookie("picnic_auth_key_temp"),
  ]);
  res.status(200).json({ ok: true });
}
