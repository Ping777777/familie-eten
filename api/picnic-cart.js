import PicnicClient from "picnic-api";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const authKey = String(req.query?.authKey || "").trim();
    if (!authKey) {
      res.status(400).json({ message: "authKey is required" });
      return;
    }

    try {
      const client = new PicnicClient({ countryCode: "NL", authKey });
      const cart = await client.cart.getCart();

      const items = [];
      const productIds = new Set();

      for (const line of cart?.items ?? []) {
        for (const article of line?.items ?? []) {
          if (!article?.id) continue;
          const id = String(article.id);
          if (productIds.has(id)) continue;
          productIds.add(id);
          items.push({
            id,
            name: String(article.name || ""),
            unitQuantity: String(article.unit_quantity || ""),
            price: typeof article.price === "number" ? article.price : null,
            count: typeof article.count === "number" ? article.count : 1,
            imageId: String(article.image_ids?.[0] || ""),
          });
        }
      }

      res.status(200).json({ items, totalPrice: cart?.total_price ?? null });
    } catch (err) {
      const message = err?.message || "Failed to load Picnic cart";
      res.status(500).json({ message });
    }
    return;
  }

  if (req.method === "POST") {
    const authKey = String(req.body?.authKey || "").trim();
    const productIds = req.body?.productIds;

    if (!authKey) {
      res.status(400).json({ message: "authKey is required" });
      return;
    }
    if (!Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({ message: "productIds array is required" });
      return;
    }

    try {
      const client = new PicnicClient({ countryCode: "NL", authKey });

      // Get the current cart to find already-added items
      const cart = await client.cart.getCart();
      const alreadyInCart = new Set();
      for (const line of cart?.items ?? []) {
        for (const article of line?.items ?? []) {
          if (article?.id) alreadyInCart.add(String(article.id));
        }
      }

      // Separate new items from already-present ones
      const toAdd = productIds.filter((id) => !alreadyInCart.has(String(id)));
      const skipped = productIds.length - toAdd.length;

      if (toAdd.length > 0) {
        await client.cart.addProductsToCart(
          toAdd.map((id) => ({ productId: String(id), quantity: 1 }))
        );
      }

      res.status(200).json({ added: toAdd.length, skipped });
    } catch (err) {
      const message = err?.message || "Failed to add items to Picnic cart";
      res.status(500).json({ message });
    }
    return;
  }

  res.status(405).json({ message: "Method not allowed" });
}
