import PicnicClient from "picnic-api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const authKey = String(req.body?.authKey || "").trim();
  const productId = String(req.body?.productId || "").trim();

  if (!authKey || !productId) {
    res.status(400).json({ message: "authKey and productId are required" });
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
