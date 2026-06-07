import { put, head } from "@vercel/blob";

const WEEK_PLAN_PATH = globalThis.process?.env?.WEEK_PLAN_BLOB_PATH || "week-plan.json";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const blobInfo = await head(WEEK_PLAN_PATH);
      const response = await fetch(blobInfo.downloadUrl ?? blobInfo.url);
      if (!response.ok) throw new Error("Failed to fetch blob content");
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      if (error?.status === 404) {
        res.status(404).json({ message: "No week plan found" });
      } else {
        res.status(500).json({ message: "Failed to read week plan" });
      }
    }
  } else if (req.method === "PUT") {
    try {
      await put(WEEK_PLAN_PATH, JSON.stringify(req.body), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      });
      res.status(200).json({ ok: true });
    } catch {
      res.status(500).json({ message: "Failed to save week plan" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
