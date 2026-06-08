import { put, get } from "@vercel/blob";

const WEEK_PLAN_PATH = globalThis.process?.env?.WEEK_PLAN_BLOB_PATH || "week-plan.json";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await get(WEEK_PLAN_PATH, { access: "private" });
      if (!result) return res.status(404).json({ message: "No week plan found" });
      if (result.statusCode !== 200 || !result.stream) {
        throw new Error("No blob stream available");
      }
      const text = await new Response(result.stream).text();
      const data = JSON.parse(text);
      res.status(200).json(data);
    } catch (error) {
      console.error("[week-plan] GET failed", error?.message);
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
      console.error("[week-plan] PUT failed", error?.message);
      res.status(500).json({ message: "Failed to save week plan" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
