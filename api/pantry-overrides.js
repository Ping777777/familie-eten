import { put, get, BlobPreconditionFailedError } from "@vercel/blob";

const PANTRY_OVERRIDES_PATH =
  globalThis.process?.env?.PANTRY_OVERRIDES_BLOB_PATH || "staples/pantry-overrides.json";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      res.setHeader("Cache-Control", "no-store");
      const result = await get(PANTRY_OVERRIDES_PATH, { access: "private" });
      if (!result) return res.status(404).json({ message: "No pantry overrides found" });
      if (result.statusCode !== 200 || !result.stream) {
        throw new Error("No blob stream available");
      }
      const text = await new Response(result.stream).text();
      const overrides = JSON.parse(text);
      res.status(200).json({ overrides, etag: result.blob?.etag ?? null });
    } catch (error) {
      console.error("[pantry-overrides] GET failed", error?.message);
      if (error?.status === 404) {
        res.status(404).json({ message: "No pantry overrides found" });
      } else {
        res.status(500).json({ message: "Failed to read pantry overrides" });
      }
    }
  } else if (req.method === "PUT") {
    const { overrides, etag } = req.body ?? {};
    if (!Array.isArray(overrides) || !overrides.every((o) => typeof o === "string")) {
      return res.status(400).json({ message: "overrides array of strings is required" });
    }
    try {
      const options = {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      };
      if (etag) options.ifMatch = etag;
      const result = await put(PANTRY_OVERRIDES_PATH, JSON.stringify(overrides), options);
      res.status(200).json({ ok: true, etag: result.etag });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) {
        let latestOverrides = null;
        let latestEtag = null;
        try {
          const latest = await get(PANTRY_OVERRIDES_PATH, { access: "private" });
          if (latest?.statusCode === 200 && latest.stream) {
            latestOverrides = JSON.parse(await new Response(latest.stream).text());
            latestEtag = latest.blob?.etag ?? null;
          }
        } catch (readErr) {
          console.error("[pantry-overrides] conflict reread failed", readErr?.message);
        }
        if (!latestEtag) {
          return res
            .status(503)
            .json({ message: "Conflict detected but latest pantry overrides could not be read" });
        }
        return res.status(412).json({ conflict: true, overrides: latestOverrides, etag: latestEtag });
      }
      console.error("[pantry-overrides] PUT failed", error?.message);
      res.status(500).json({ message: "Failed to save pantry overrides" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
