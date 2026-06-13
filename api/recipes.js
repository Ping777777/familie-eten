import { put, get } from "@vercel/blob";

const RECIPES_PATH =
  globalThis.process?.env?.RECIPES_BLOB_PATH || "recipes/recipes.json";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      res.setHeader("Cache-Control", "no-store");
      const result = await get(RECIPES_PATH, { access: "private" });
      if (!result) return res.status(404).json({ message: "No recipes found" });
      if (result.statusCode !== 200 || !result.stream) {
        throw new Error("No blob stream available");
      }
      const text = await new Response(result.stream).text();
      const recipes = JSON.parse(text);
      res.status(200).json({ recipes, etag: result.etag ?? result.blob?.etag ?? null });
    } catch (error) {
      console.error("[recipes] GET failed", error?.message);
      if (error?.status === 404) {
        res.status(404).json({ message: "No recipes found" });
      } else {
        res.status(500).json({ message: "Failed to read recipes" });
      }
    }
  } else if (req.method === "PUT") {
    const { recipes } = req.body ?? {};
    if (!Array.isArray(recipes)) {
      return res.status(400).json({ message: "recipes array is required" });
    }
    try {
      const result = await put(RECIPES_PATH, JSON.stringify(recipes), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      res.status(200).json({ ok: true, etag: result.etag });
    } catch (error) {
      console.error("[recipes] PUT failed", error?.message);
      res.status(500).json({ message: "Failed to save recipes" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
