import { put, get, BlobPreconditionFailedError } from "@vercel/blob";

const WEEK_PLAN_PREFIX =
  globalThis.process?.env?.WEEK_PLAN_BLOB_PREFIX
  || globalThis.process?.env?.WEEK_PLAN_BLOB_PATH?.replace(/\.json$/i, "")
  || "week-plan";
const ISO_WEEK_KEY_PATTERN = /^\d{4}-W\d{2}$/;

function getWeekPlanPath(weekKey) {
  return `${WEEK_PLAN_PREFIX}/${weekKey}.json`;
}

function getWeekKey(req) {
  const weekKey = req.query?.weekKey;
  return typeof weekKey === "string" && ISO_WEEK_KEY_PATTERN.test(weekKey) ? weekKey : null;
}

export default async function handler(req, res) {
  const weekKey = getWeekKey(req);
  if (!weekKey) {
    return res.status(400).json({ message: "Valid ISO weekKey is required (YYYY-Www)" });
  }

  const weekPlanPath = getWeekPlanPath(weekKey);

  if (req.method === "GET") {
    try {
      res.setHeader("Cache-Control", "no-store");
      const result = await get(weekPlanPath, { access: "private" });
      if (!result) return res.status(404).json({ message: "No week plan found" });
      if (result.statusCode !== 200 || !result.stream) {
        throw new Error("No blob stream available");
      }
      const text = await new Response(result.stream).text();
      const weekPlan = JSON.parse(text);
      // Return the ETag so the client can make conditional writes against this exact version.
      res.status(200).json({ weekPlan, etag: result.blob?.etag ?? null });
    } catch (error) {
      console.error("[week-plan] GET failed", error?.message);
      if (error?.status === 404) {
        res.status(404).json({ message: "No week plan found" });
      } else {
        res.status(500).json({ message: "Failed to read week plan" });
      }
    }
  } else if (req.method === "PUT") {
    const weekPlan = req.body?.weekPlan;
    const etag = req.body?.etag;
    if (!weekPlan || typeof weekPlan !== "object") {
      return res.status(400).json({ message: "weekPlan is required" });
    }
    try {
      const options = {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      };
      // Optimistic concurrency: only overwrite if the blob still matches the version the
      // client last saw. Omit ifMatch on first write (no prior version).
      if (etag) options.ifMatch = etag;
      const result = await put(weekPlanPath, JSON.stringify(weekPlan), options);
      res.status(200).json({ ok: true, etag: result.etag });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) {
        // Another writer changed the blob since the client last read it. Return the
        // current version so the client can rebase its change and retry.
        let latestPlan = null;
        let latestEtag = null;
        try {
          const latest = await get(weekPlanPath, { access: "private" });
          if (latest?.statusCode === 200 && latest.stream) {
            latestPlan = JSON.parse(await new Response(latest.stream).text());
            latestEtag = latest.blob?.etag ?? null;
          }
        } catch (readError) {
          console.error("[week-plan] conflict reread failed", readError?.message);
        }
        if (!latestEtag) {
          return res.status(503).json({ message: "Conflict detected but latest version could not be read" });
        }
        return res.status(412).json({ conflict: true, weekPlan: latestPlan, etag: latestEtag });
      console.error("[week-plan] PUT failed", error?.message);
      res.status(500).json({ message: "Failed to save week plan" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
