import PicnicClient from "picnic-api";
import { getPicnicAuthKey, isPicnicAuthError } from "./_picnicAuth.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const authKey = getPicnicAuthKey(req);
    if (!authKey) {
      res.status(401).json({ message: "Not authenticated" });
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
          const qtyDecorator = Array.isArray(article.decorators)
            ? article.decorators.find((d) => d?.type === "QUANTITY")
            : null;
          const unavailable = Array.isArray(article.decorators)
            && article.decorators.some((d) => d?.type === "UNAVAILABLE");
          items.push({
            id,
            name: String(article.name || ""),
            unitQuantity: String(article.unit_quantity || ""),
            price: typeof article.price === "number" ? article.price : null,
            count: Number(qtyDecorator?.quantity) || 1,
            imageId: String(article.image_ids?.[0] || ""),
            available: !unavailable,
          });
        }
      }

      res.status(200).json({ items, totalPrice: cart?.total_price ?? null });
    } catch (err) {
      if (isPicnicAuthError(err)) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }
      const message = err?.message || "Failed to load Picnic cart";
      res.status(500).json({ message });
    }
    return;
  }

  if (req.method === "POST") {
    const authKey = getPicnicAuthKey(req);
    const productIds = req.body?.productIds;

    if (!authKey) {
      res.status(401).json({ message: "Not authenticated" });
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
      if (isPicnicAuthError(err)) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }
      const message = err?.message || "Failed to add items to Picnic cart";
      res.status(500).json({ message });
    }
    return;
  }

  if (req.method === "PATCH") {
    const authKey = getPicnicAuthKey(req);
    const productId = String(req.body?.productId || "").trim();
    const newCount = Number(req.body?.count);

    if (!authKey) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }
    if (!productId) {
      res.status(400).json({ message: "productId is required" });
      return;
    }
    if (!Number.isInteger(newCount) || newCount < 0) {
      res.status(400).json({ message: "count must be a non-negative integer" });
      return;
    }

    try {
      const client = new PicnicClient({ countryCode: "NL", authKey });

      // Get current quantity from QUANTITY decorator on the article
      const cart = await client.cart.getCart();
      let currentCount = 0;
      outer: for (const line of cart?.items ?? []) {
        for (const article of line?.items ?? []) {
          if (article?.id && String(article.id) === productId) {
            const qtyDecorator = Array.isArray(article.decorators)
              ? article.decorators.find((d) => d?.type === "QUANTITY")
              : null;
            const parsedQty = Number(qtyDecorator?.quantity);
            currentCount = Number.isFinite(parsedQty) ? parsedQty : 1;
            break outer;
          }
        }
      }

      // Both add_product and remove_product are delta operations
      const delta = newCount - currentCount;
      if (delta > 0) {
        await client.cart.addProductToCart(productId, delta);
      } else if (delta < 0) {
        await client.cart.removeProductFromCart(productId, -delta);
      }

      res.status(200).json({ productId, count: newCount });
    } catch (err) {
      if (isPicnicAuthError(err)) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }
      const message = err?.message || "Failed to update Picnic cart item";
      res.status(500).json({ message });
    }
    return;
  }

  res.status(405).json({ message: "Method not allowed" });
}
