import { put, list, del } from "@vercel/blob";

function endpointKey(endpoint) {
  return "push-subscriptions/" + Buffer.from(endpoint).toString("base64url").slice(0, 64) + ".json";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { subscription } = req.body ?? {};
  if (!subscription?.endpoint) return res.status(400).json({ message: "Invalid subscription" });

  const key = endpointKey(subscription.endpoint);
  await put(key, JSON.stringify(subscription), { access: "private", contentType: "application/json", addRandomSuffix: false });

  res.status(200).json({ ok: true });
}
