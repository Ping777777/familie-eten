// Data layer: same blob endpoints + shapes as the original app, so this
// rebuild reads and writes the family's real data.
import { useEffect, useRef, useState, useCallback } from "react";

export const AUTH_KEY = "familie-eten:user";
export const PICNIC_KEY = "familie-eten:picnic-user";

const json = (r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))));

async function putWithEtag(url, bodyKey, value, etagRef, adoptServer) {
  try {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [bodyKey]: value, etag: etagRef.current }),
    });
    if (r.status === 412) {
      const d = await r.json().catch(() => ({}));
      if (d[bodyKey] && d.etag) { etagRef.current = d.etag; adoptServer(d[bodyKey]); }
      return false;
    }
    if (!r.ok) return false;
    const d = await r.json().catch(() => ({}));
    etagRef.current = d.etag ?? null;
    return true;
  } catch { return false; }
}

// Generic synced blob resource (recipes, staples, overrides).
//
// A failed GET must never look like "confirmed empty" — the PUT handler
// skips its ifMatch precondition when we have no etag (so a first-ever
// write can seed the blob), which means a client that never actually saw
// the real data would otherwise be free to overwrite it with whatever it
// has locally (e.g. []). So `loaded` only flips true on a real success, and
// `update` refuses to write until then; a failed load retries instead.
//
// A 200 response with real data but no etag is the same danger in
// disguise: the client would hold a full, editable list with etag.current
// still null, so any ordinary edit would skip ifMatch and overwrite
// unconditionally. Only a confirmed 404 (genuinely no blob yet) is allowed
// to leave the etag null — anything else without one is treated as a
// failed load, not a loaded-and-safe-to-write state.
export function useBlob(user, path, bodyKey, initial) {
  const [value, setValue] = useState(initial);
  const [loadedFor, setLoadedFor] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const etag = useRef(null);
  const loaded = loadedFor === user;
  useEffect(() => {
    if (!user) return;
    let live = true;
    fetch(path, { cache: "no-store" })
      .then((r) => {
        if (r.status === 404) return { empty: true };
        return json(r);
      })
      .then((d) => {
        if (!live) return;
        if (d.empty) { etag.current = null; setValue(initial); setLoadedFor(user); return; }
        if (!d.etag) throw new Error("load succeeded but returned no etag");
        etag.current = d.etag;
        setValue(d[bodyKey] ?? initial);
        setLoadedFor(user);
      })
      .catch(() => {
        // ponytail: fixed 4s retry, add backoff if this ever hammers the API
        if (live) setTimeout(() => live && setRetryTick((n) => n + 1), 4000);
      });
    return () => { live = false; };
  }, [user, path, bodyKey, retryTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = useCallback((next) => {
    if (!loaded) return false;
    setValue(next);
    putWithEtag(path, bodyKey, next, etag, setValue);
    return true;
  }, [path, bodyKey, loaded]);
  return [value, update, loaded];
}

// Week plan, keyed by ISO week.
export function useWeekPlan(user, weekKey, emptyWeek) {
  const [plan, setPlan] = useState(emptyWeek);
  const [loadedFor, setLoadedFor] = useState(null);
  const etag = useRef(null);
  const loaded = loadedFor === weekKey;
  useEffect(() => {
    if (!user) return;
    let live = true;
    fetch(`/api/week-plan?weekKey=${encodeURIComponent(weekKey)}`, { cache: "no-store" })
      .then((r) => (r.status === 404 ? { weekPlan: null } : json(r)))
      .then((d) => {
        if (!live) return;
        etag.current = d.etag ?? null;
        setPlan(d.weekPlan ?? emptyWeek());
      })
      .catch(() => { if (live) setPlan(emptyWeek()); })
      .finally(() => { if (live) setLoadedFor(weekKey); });
    return () => { live = false; };
  }, [user, weekKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const assign = useCallback((day, member, recipeId) => {
    setPlan((prev) => {
      // One meal per day: assigning replaces whatever anyone had planned,
      // so swapping via the picker never leaves a stale entry behind.
      const next = { ...prev, [day]: { [member]: recipeId } };
      putWithEtag(`/api/week-plan?weekKey=${encodeURIComponent(weekKey)}`, "weekPlan", next, etag, setPlan);
      return next;
    });
  }, [weekKey]);
  return [plan, assign, loaded];
}

// Family auth (same endpoint + storage key as the original).
export async function login(username, password) {
  const r = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error("auth");
  const d = await r.json();
  localStorage.setItem(AUTH_KEY, d.user);
  return d.user;
}

// Picnic (light): session login/2fa/logout + read associations + send to cart.
export async function picnicLogin(username, password) {
  const r = await fetch("/api/picnic-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "picnic");
  if (d.user) localStorage.setItem(PICNIC_KEY, JSON.stringify(d.user));
  return d;
}
export async function picnicVerify(code) {
  const r = await fetch("/api/picnic-2fa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "2fa");
  if (d.user) localStorage.setItem(PICNIC_KEY, JSON.stringify(d.user));
  return d;
}
export async function picnicSearch(query) {
  const r = await fetch("/api/picnic-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { const e = new Error("auth"); e.auth = true; throw e; }
  if (!r.ok) throw new Error(d.message || String(r.status));
  return d.results ?? [];
}
export async function getPicnicCart() {
  const r = await fetch("/api/picnic-cart", { cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { const e = new Error("auth"); e.auth = true; throw e; }
  if (!r.ok) throw new Error(d.message || String(r.status));
  return d;
}
export async function patchPicnicCart(productId, count) {
  const r = await fetch("/api/picnic-cart", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, count }),
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json().catch(() => ({}));
}
export async function picnicProductDetail(productId) {
  const r = await fetch("/api/picnic-product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json().catch(() => ({}));
}
export async function sendToPicnicCart(productIds) {
  const r = await fetch("/api/picnic-cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.message || String(r.status));
  }
  return r.json().catch(() => ({}));
}
