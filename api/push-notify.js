import webpush from "web-push";
import { list, get, del } from "@vercel/blob";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const PAYLOAD = JSON.stringify({
  title: "Familie Eten 🍽️",
  body: "Vergeet niet de maaltijden voor volgende week te plannen zodat Picnic op tijd kan leveren!",
  url: "/",
});

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { blobs } = await list({ prefix: "push-subscriptions/", mode: "folded" });
  let sent = 0;
  let removed = 0;

  for (const blob of blobs) {
    try {
      const result = await get(blob.pathname, { access: "private" });
      const text = await new Response(result.stream).text();
      const subscription = JSON.parse(text);
      await webpush.sendNotification(subscription, PAYLOAD);
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await del(blob.url);
        removed++;
      } else {
        console.error("push failed:", err.message);
      }
    }
  }

  res.status(200).json({ sent, removed });
}
