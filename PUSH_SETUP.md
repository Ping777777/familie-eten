# Push Notifications Setup

## What this does
Every Saturday at 19:00 NL time, the app sends a push notification to everyone who has the app open on their phone. The notification reminds the family to plan meals for next week so Picnic can deliver on time.

## Before this works, Dad needs to add 3 environment variables in Vercel

1. Go to the **Vercel dashboard** → select the `familie-eten` project → **Settings** → **Environment Variables**

2. Add these three variables:

| Name | Value |
|------|-------|
| `VAPID_PUBLIC_KEY` | `BMSCgrysfEzKy1Ft0XJDhQBeBFXVWe2E0tiX7yAM9ppXxmDv9r5W__425-SR21h-RS7A5aUUIhrvLeZyMmrwx34` |
| `VAPID_PRIVATE_KEY` | `j2BrL3Ghl1O67hEJIh1x3aEgsRyN-LN2DqkkL6D7zFo` |
| `VAPID_EMAIL` | `ingaboyd@gmail.com` |

3. Make sure all three are set for **Production** environment.

4. After merging this PR, Vercel will automatically redeploy — no manual deploy needed.

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
