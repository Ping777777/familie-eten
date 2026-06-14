import PicnicClient from "picnic-api";
import { serializeCookie, expireCookie, readCookie } from "./_cookies.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  // Read the temporary authKey from the HttpOnly cookie set during picnic-login.
  const authKey = readCookie(req, "picnic_auth_key_temp");
  const code = String(req.body?.code || "").trim();

  if (!authKey) {
    res.status(400).json({ message: "Geen actieve Picnic-sessie gevonden. Log opnieuw in." });
    return;
  }

  if (!code) {
    res.status(400).json({ message: "Verificatiecode is vereist" });
    return;
  }

  try {
    const client = new PicnicClient({ countryCode: "NL", authKey });
    const verifyResult = await client.auth.verify2FACode(code);
    const userDetails = await client.user.getUserDetails();
    const name = `${userDetails.firstname} ${userDetails.lastname}`.trim();

    // Promote the verified authKey to the permanent cookie and clear the temp one.
    res.setHeader("Set-Cookie", [
      serializeCookie("picnic_auth_key", verifyResult.authKey),
      expireCookie("picnic_auth_key_temp"),
    ]);
    res.status(200).json({
      ok: true,
      name,
    });
  } catch (err) {
    const message = err?.message || "2FA verificatie mislukt";
    res.status(401).json({ message });
  }
}
