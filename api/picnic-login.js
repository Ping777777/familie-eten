import PicnicClient from "picnic-api";

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
    const userDetails = await client.user.getUserDetails();
    const name = `${userDetails.firstname} ${userDetails.lastname}`.trim();

    res.status(200).json({
      ok: true,
      authKey: loginResult.authKey,
      name,
    });
  } catch (err) {
    const message = err?.message || "Picnic inloggen mislukt";
    res.status(401).json({ message });
  }
}
