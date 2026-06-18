import PicnicClient from "picnic-api";
import { getPicnicAuthKey } from "./_picnicAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const authKey = getPicnicAuthKey(req);
  const query = String(req.body?.query || "").trim();

  if (!authKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  if (!query) {
    res.status(400).json({ message: "query is required" });
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
        imageId: String(result.image_id || ""),
        maxCount: typeof result.max_count === "number" ? result.max_count : null,
      });
      if (matches.length >= 12) break;
    }

    res.status(200).json({ results: matches });
  } catch (err) {
    const message = err?.message || "Picnic zoeken mislukt";
    res.status(500).json({ message });
  }
}
