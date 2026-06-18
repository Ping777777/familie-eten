import PicnicClient from "picnic-api";
import { getPicnicAuthKey } from "./_picnicAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const authKey = getPicnicAuthKey(req);
  const productId = String(req.body?.productId || "").trim();

  if (!authKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  if (!productId) {
    res.status(400).json({ message: "productId is required" });
    return;
  }

  try {
    const client = new PicnicClient({ countryCode: "NL", authKey });
    const details = await client.catalog.getProductDetails(productId);
    res.status(200).json({
      description: details.description ?? null,
      imageIds: details.imageIds ?? [],
    });
  } catch (err) {
    const message = err?.message || "Picnic product details ophalen mislukt";
    res.status(500).json({ message });
  }
}
