# Push Notifications Setup

## What this does
Every Saturday at 19:00 NL time, the app sends a push notification to everyone who has the app open on their phone. The notification reminds the family to plan meals for next week so Picnic can deliver on time.

## Before this works, Dad needs to add 3 environment variables in Vercel

1. Go to the **Vercel dashboard** → select the `familie-eten` project → **Settings** → **Environment Variables**.
2. Add these three variables for the **Production** environment:

| Name | Value |
|------|-------|
| `VAPID_PUBLIC_KEY` | Your generated VAPID public key |
| `VAPID_PRIVATE_KEY` | Your generated VAPID private key |
| `VAPID_EMAIL` | A contact email in `mailto:you@example.com` format |

3. If you still need a key pair, generate one locally with:

   ```bash
   npx web-push generate-vapid-keys
   ```

4. Keep the private key out of Git and only store it in Vercel environment variables.
5. After merging this PR, Vercel will automatically redeploy — no manual deploy needed.

## How it works
- When a family member opens the app, the browser asks for notification permission
- If they say yes, their device is registered in Vercel Blob storage
- Every Saturday at 17:00 UTC (= 19:00 Amsterdam time), Vercel runs `/api/push-notify`
- That endpoint sends a push notification to every registered device
- Tapping the notification opens the app

## Files added
- `src/sw.js` — custom service worker that handles push events
- `api/push-subscribe.js` — saves device subscriptions
- `api/push-notify.js` — cron endpoint that sends notifications
- `vercel.json` — tells Vercel to run the cron every Saturday at 17:00 UTC
