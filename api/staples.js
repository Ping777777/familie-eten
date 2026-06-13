import { put, get, BlobPreconditionFailedError } from "@vercel/blob";

const STAPLES_PATH =
  globalThis.process?.env?.STAPLES_BLOB_PATH || "staples/staples.json";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      res.setHeader("Cache-Control", "no-store");
      const result = await get(STAPLES_PATH, { access: "private" });
      if (!result) return res.status(404).json({ message: "No staples found" });
      if (result.statusCode !== 200 || !result.stream) {
        throw new Error("No blob stream available");
      }
      const text = await new Response(result.stream).text();
      const staples = JSON.parse(text);
      res.status(200).json({ staples, etag: result.blob?.etag ?? null });
    } catch (error) {
      console.error("[staples] GET failed", error?.message);
      if (error?.status === 404) {
        res.status(404).json({ message: "No staples found" });
      } else {
        res.status(500).json({ message: "Failed to read staples" });
      }
    }
  } else if (req.method === "PUT") {
    const { staples, etag } = req.body ?? {};
    if (!Array.isArray(staples)) {
      return res.status(400).json({ message: "staples array is required" });
    }
    try {
      const options = {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      };
      if (etag) options.ifMatch = etag;
      const result = await put(STAPLES_PATH, JSON.stringify(staples), options);
      res.status(200).json({ ok: true, etag: result.etag });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) {
        let latestStaples = null;
        let latestEtag = null;
        try {
          const latest = await get(STAPLES_PATH, { access: "private" });
          if (latest?.statusCode === 200 && latest.stream) {
            latestStaples = JSON.parse(await new Response(latest.stream).text());
            latestEtag = latest.blob?.etag ?? null;
          }
        } catch (readErr) {
          console.error("[staples] conflict reread failed", readErr?.message);
        }
        if (!latestEtag) {
          return res
            .status(503)
            .json({ message: "Conflict detected but latest staples could not be read" });
        }
        return res.status(412).json({ conflict: true, staples: latestStaples, etag: latestEtag });
      }
      console.error("[staples] PUT failed", error?.message);
      res.status(500).json({ message: "Failed to save staples" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
