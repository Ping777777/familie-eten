import { put, get, BlobPreconditionFailedError } from "@vercel/blob";

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
      res.status(200).json({ recipes, etag: result.blob?.etag ?? null });
    } catch (error) {
      console.error("[recipes] GET failed", error?.message);
      if (error?.status === 404) {
        res.status(404).json({ message: "No recipes found" });
      } else {
        res.status(500).json({ message: "Failed to read recipes" });
      }
    }
  } else if (req.method === "PUT") {
    const { recipes, etag } = req.body ?? {};
    if (!Array.isArray(recipes)) {
      return res.status(400).json({ message: "recipes array is required" });
    }
    try {
      const options = {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      };
      if (etag) options.ifMatch = etag;
      const result = await put(RECIPES_PATH, JSON.stringify(recipes), options);
      res.status(200).json({ ok: true, etag: result.etag });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) {
        // Another writer changed the blob — return the current version so the
        // client can see what changed and decide what to do.
        let latestRecipes = null;
        let latestEtag = null;
        try {
          const latest = await get(RECIPES_PATH, { access: "private" });
          if (latest?.statusCode === 200 && latest.stream) {
            latestRecipes = JSON.parse(await new Response(latest.stream).text());
            latestEtag = latest.blob?.etag ?? null;
          }
        } catch (readErr) {
          console.error("[recipes] conflict reread failed", readErr?.message);
        }
        if (!latestEtag) {
          return res
            .status(503)
            .json({ message: "Conflict detected but latest recipes could not be read" });
        }
        return res.status(412).json({ conflict: true, recipes: latestRecipes, etag: latestEtag });
      }
      console.error("[recipes] PUT failed", error?.message);
      res.status(500).json({ message: "Failed to save recipes" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
