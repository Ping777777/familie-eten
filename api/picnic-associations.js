import { put, get, BlobPreconditionFailedError } from "@vercel/blob";

const PICNIC_ASSOCIATIONS_PATH =
  globalThis.process?.env?.PICNIC_ASSOCIATIONS_BLOB_PATH || "picnic/associations.json";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      res.setHeader("Cache-Control", "no-store");
      const result = await get(PICNIC_ASSOCIATIONS_PATH, { access: "private" });
      if (!result) return res.status(404).json({ message: "No Picnic associations found" });
      if (result.statusCode !== 200 || !result.stream) {
        throw new Error("No blob stream available");
      }
      const text = await new Response(result.stream).text();
      const associations = JSON.parse(text);
      res.status(200).json({ associations, etag: result.blob?.etag ?? null });
    } catch (error) {
      console.error("[picnic-associations] GET failed", error?.message);
      if (error?.status === 404) {
        res.status(404).json({ message: "No Picnic associations found" });
      } else {
        res.status(500).json({ message: "Failed to read Picnic associations" });
      }
    }
  } else if (req.method === "PUT") {
    const { associations, etag } = req.body ?? {};
    if (!associations || typeof associations !== "object" || Array.isArray(associations)) {
      return res.status(400).json({ message: "associations object is required" });
    }
    try {
      const options = {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      };
      if (etag) options.ifMatch = etag;
      const result = await put(PICNIC_ASSOCIATIONS_PATH, JSON.stringify(associations), options);
      res.status(200).json({ ok: true, etag: result.etag });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) {
        let latestAssociations = null;
        let latestEtag = null;
        try {
          const latest = await get(PICNIC_ASSOCIATIONS_PATH, { access: "private" });
          if (latest?.statusCode === 200 && latest.stream) {
            latestAssociations = JSON.parse(await new Response(latest.stream).text());
            latestEtag = latest.blob?.etag ?? null;
          }
        } catch (readErr) {
          console.error("[picnic-associations] conflict reread failed", readErr?.message);
        }
        if (!latestEtag) {
          return res
            .status(503)
            .json({ message: "Conflict detected but latest Picnic associations could not be read" });
        }
        return res.status(412).json({ conflict: true, associations: latestAssociations, etag: latestEtag });
      }
      console.error("[picnic-associations] PUT failed", error?.message);
      res.status(500).json({ message: "Failed to save Picnic associations" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
