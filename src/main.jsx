import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Keep the installed PWA from getting stuck on an old build. The service
// worker uses skipWaiting + clientsClaim, so a new worker takes control as
// soon as it installs; when it does, reload once to pick up the new code.
// Check for updates on launch, when the app is refocused, and every minute.
if ("serviceWorker" in navigator) {
  // Only reload for an actual update — not the first-ever worker claiming
  // an uncontrolled page (which would reload every fresh install).
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    window.location.reload();
  });
  navigator.serviceWorker.ready.then((reg) => {
    const check = () => reg.update().catch(() => {});
    check();
    setInterval(check, 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
  });
}
