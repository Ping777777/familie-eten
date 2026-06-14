import PicnicClient from "picnic-api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const authKey = String(req.body?.authKey || "").trim();
  const query = String(req.body?.query || "").trim();

  if (!authKey || !query) {
    res.status(400).json({ message: "authKey and query are required" });
    return;
  }

  try {
    const client = new PicnicClient({ countryCode: "NL", authKey });
    const results = await client.catalog.search(query);
    const seen = new Set();
    const matches = [];

    for (const result of results ?? []) {
      if (!result?.id || seen.has(result.id)) continue;
      seen.add(result.id);
      matches.push({
        id: String(result.id),
        name: String(result.name || ""),
        unitQuantity: String(result.unit_quantity || ""),
        displayPrice: Number.isFinite(result.display_price) ? result.display_price : null,
      });
      if (matches.length >= 12) break;
    }

    res.status(200).json({ results: matches });
  } catch (err) {
    const message = err?.message || "Picnic zoeken mislukt";
    res.status(401).json({ message });
  }
}
