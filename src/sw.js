import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({ cacheName: "pages", networkTimeoutSeconds: 3 })
);

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Familie Eten", {
      body: data.body || "Vergeet niet de maaltijden voor volgende week te plannen!",
      icon: "/logo.png",
      badge: "/logo.png",
      tag: "weekplanner-reminder",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
