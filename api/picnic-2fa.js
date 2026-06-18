import PicnicClient from "picnic-api";
import { getPicnicAuthKey, setPicnicAuthCookie } from "./_picnicAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const authKey = getPicnicAuthKey(req);
  const code = String(req.body?.code || "").trim();

  if (!authKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  if (!code) {
    res.status(400).json({ message: "code is vereist" });
    return;
  }

  try {
    const client = new PicnicClient({ countryCode: "NL", authKey });
    const verifyResult = await client.auth.verify2FACode(code);
    const userDetails = await client.user.getUserDetails();
    const name = `${userDetails.firstname} ${userDetails.lastname}`.trim();

    setPicnicAuthCookie(res, verifyResult.authKey);
    res.status(200).json({ ok: true, name });
  } catch (err) {
    const message = err?.message || "2FA verificatie mislukt";
    res.status(401).json({ message });
  }
}
