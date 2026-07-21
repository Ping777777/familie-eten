import { put, get, BlobPreconditionFailedError } from "@vercel/blob";

// Strip weak ETag prefix (W/) and surrounding quotes so the value can be used
// directly as an ifMatch token.
function normalizeEtag(etag) {
  if (!etag) return null;
  return etag.replace(/^W\//, "").replace(/^"|"$/g, "");
}

const USER_SETTINGS_PREFIX =
  globalThis.process?.env?.USER_SETTINGS_BLOB_PREFIX || "user-settings";
// Family usernames only — keep it strict so the value is safe in a blob path.
const USER_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

function getUser(req) {
  const user = req.query?.user;
  return typeof user === "string" && USER_PATTERN.test(user) ? user : null;
}

export default async function handler(req, res) {
  const user = getUser(req);
  if (!user) {
    return res.status(400).json({ message: "Valid user is required" });
  }
  const settingsPath = `${USER_SETTINGS_PREFIX}/${user.toLowerCase()}.json`;

  if (req.method === "GET") {
    try {
      res.setHeader("Cache-Control", "no-store");
      const result = await get(settingsPath, { access: "private" });
      if (!result) return res.status(404).json({ message: "No settings found" });
      if (result.statusCode !== 200 || !result.stream) {
        throw new Error("No blob stream available");
      }
      const text = await new Response(result.stream).text();
      const settings = JSON.parse(text);
      res.status(200).json({ settings, etag: normalizeEtag(result.blob?.etag) });
    } catch (error) {
      console.error("[user-settings] GET failed", error?.message);
      if (error?.status === 404) {
        res.status(404).json({ message: "No settings found" });
      } else {
        res.status(500).json({ message: "Failed to read settings" });
      }
    }
  } else if (req.method === "PUT") {
    const { settings, etag } = req.body ?? {};
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return res.status(400).json({ message: "settings object is required" });
    }
    try {
      const options = {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      };
      // Optimistic concurrency: only overwrite if the blob still matches the
      // version this client last read. Omit ifMatch on first write.
      if (etag) options.ifMatch = etag;
      const result = await put(settingsPath, JSON.stringify(settings), options);
      res.status(200).json({ ok: true, etag: result.etag });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) {
        let latestSettings = null;
        let latestEtag = null;
        try {
          const latest = await get(settingsPath, { access: "private" });
          if (latest?.statusCode === 200 && latest.stream) {
            latestSettings = JSON.parse(await new Response(latest.stream).text());
            latestEtag = normalizeEtag(latest.blob?.etag);
          }
        } catch (readError) {
          console.error("[user-settings] conflict reread failed", readError?.message);
        }
        if (!latestEtag) {
          return res.status(503).json({ message: "Conflict detected but latest settings could not be read" });
        }
        return res.status(412).json({ conflict: true, settings: latestSettings, etag: latestEtag });
      }
      console.error("[user-settings] PUT failed", error?.message);
      res.status(500).json({ message: "Failed to save settings" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
