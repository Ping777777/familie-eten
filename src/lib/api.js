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
export function useBlob(user, path, bodyKey, initial) {
  const [value, setValue] = useState(initial);
  const [loadedFor, setLoadedFor] = useState(null);
  const etag = useRef(null);
  const loaded = loadedFor === user;
  useEffect(() => {
    if (!user) return;
    let live = true;
    fetch(path, { cache: "no-store" })
      .then((r) => {
        if (r.status === 404) { etag.current = null; return null; }
        return json(r);
      })
      .then((d) => {
        if (live && d) { etag.current = d.etag ?? null; setValue(d[bodyKey] ?? initial); }
      })
      .catch(() => {})
      .finally(() => { if (live) setLoadedFor(user); });
    return () => { live = false; };
  }, [user, path, bodyKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = useCallback((next) => {
    setValue(next);
    putWithEtag(path, bodyKey, next, etag, setValue);
  }, [path, bodyKey]);
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
      const next = { ...prev, [day]: { ...(prev[day] ?? {}), [member]: recipeId } };
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
