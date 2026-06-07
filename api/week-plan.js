import { put, get } from "@vercel/blob";

const WEEK_PLAN_PATH = globalThis.process?.env?.WEEK_PLAN_BLOB_PATH || "week-plan.json";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const blob = await get(WEEK_PLAN_PATH, { access: "private" });
      if (!blob) throw new Error("Blob not found");
      const data = JSON.parse(blob.toString());
      res.status(200).json(data);
    } catch (error) {
      console.error("[week-plan] GET failed", {
        path: WEEK_PLAN_PATH,
        name: error?.name,
        message: error?.message,
        status: error?.status,
      });
      if (error?.status === 404) {
        res.status(404).json({ message: "No week plan found" });
      } else {
        res.status(500).json({ message: "Failed to read week plan" });
      }
    }
  } else if (req.method === "PUT") {
    try {
      await put(WEEK_PLAN_PATH, JSON.stringify(req.body), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[week-plan] PUT failed", {
        path: WEEK_PLAN_PATH,
        name: error?.name,
        message: error?.message,
        status: error?.status,
      });
      res.status(500).json({ message: "Failed to save week plan" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
