import PicnicClient from "picnic-api";
import { serializeCookie } from "./_cookies.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "").trim();

  if (!username || !password) {
    res.status(400).json({ message: "Gebruikersnaam en wachtwoord zijn vereist" });
    return;
  }

  try {
    const client = new PicnicClient({ countryCode: "NL" });
    const loginResult = await client.auth.login(username, password);

    if (loginResult.second_factor_authentication_required) {
      await client.auth.generate2FACode("SMS");
      // Store the temporary authKey in an HttpOnly cookie so it is never
      // exposed to client-side JavaScript.
      res.setHeader("Set-Cookie", serializeCookie("picnic_auth_key_temp", loginResult.authKey));
      res.status(200).json({
        ok: true,
        requiresTwoFactor: true,
      });
      return;
    }

    const userDetails = await client.user.getUserDetails();
    const name = `${userDetails.firstname} ${userDetails.lastname}`.trim();

    // Store the final authKey in an HttpOnly cookie.
    res.setHeader("Set-Cookie", serializeCookie("picnic_auth_key", loginResult.authKey));
    res.status(200).json({
      ok: true,
      name,
    });
  } catch (err) {
    const message = err?.message || "Picnic inloggen mislukt";
    res.status(401).json({ message });
  }
}
