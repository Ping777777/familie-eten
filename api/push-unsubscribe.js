import { list, del } from "@vercel/blob";

function endpointKey(endpoint) {
  return "push-subscriptions/" + Buffer.from(endpoint).toString("base64url").slice(0, 64) + ".json";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { endpoint } = req.body ?? {};
  if (!endpoint) return res.status(400).json({ message: "Missing endpoint" });

  const prefix = endpointKey(endpoint);
  const { blobs } = await list({ prefix });
  for (const blob of blobs) await del(blob.url);

  res.status(200).json({ ok: true });
}
