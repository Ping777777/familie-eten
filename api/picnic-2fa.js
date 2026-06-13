import PicnicClient from "picnic-api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const authKey = String(req.body?.authKey || "").trim();
  const code = String(req.body?.code || "").trim();

  if (!authKey || !code) {
    res.status(400).json({ message: "authKey en code zijn vereist" });
    return;
  }

  try {
    const client = new PicnicClient({ countryCode: "NL", authKey });
    const verifyResult = await client.auth.verify2FACode(code);
    const userDetails = await client.user.getUserDetails();
    const name = `${userDetails.firstname} ${userDetails.lastname}`.trim();

    res.status(200).json({
      ok: true,
      authKey: verifyResult.authKey,
      name,
    });
  } catch (err) {
    const message = err?.message || "2FA verificatie mislukt";
    res.status(401).json({ message });
  }
}
