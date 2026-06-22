import { useState, useEffect, useRef } from "react";
import { recipes as defaultRecipes } from "./data/recipes";

// Bump this string whenever recipe content (translations, instructions, ingredients) changes.
// The migration will push the updated data to the blob on the next app load.
const RECIPE_BUNDLE_VERSION = "2026-06-12";
import { defaultStaples } from "./data/defaultStaples";
import RecipeLibrary from "./components/RecipeLibrary";
import WeekPlanner from "./components/WeekPlanner";
import ShoppingList from "./components/ShoppingList";
import RecipeDetail from "./components/RecipeDetail";
import { getIsoWeekKey } from "./week";
import { useLanguage } from "./useLanguage";
import "./App.css";

const LANGUAGES = [
  { code: "nl", img: "https://flagcdn.com/w40/nl.png", label: "Nederlands" },
  { code: "en", img: "https://flagcdn.com/w40/gb.png", label: "English" },
  { code: "ru", img: "https://flagcdn.com/w40/ru.png", label: "Русский" },
];

const MEMBER_COLORS = { Neil: "#2a9d8f", Larisa: "#fc7600", Inga: "#5cb85c", Kevin: "#e8c247" };
const MEMBER_EMOJI  = { Neil: "👱🏼‍♂️", Larisa: "👩🏽", Inga: "👧🏽", Kevin: "👦🏼" };

function SideMenu({ open, onClose, onLogout, currentUser, picnicUser, onPicnicLogin, onPicnicVerify2FA, onPicnicLogout, visibleMembers, onToggleMember, tab, onTabChange }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const [picnicFormOpen, setPicnicFormOpen] = useState(false);
  const [picnicForm, setPicnicForm] = useState({ username: "", password: "" });
  const [picnicError, setPicnicError] = useState("");
  const [picnicBusy, setPicnicBusy] = useState(false);
  const [picnicOtp, setPicnicOtp] = useState({ open: false, code: "" });

  const handlePicnicSubmit = async (e) => {
    e.preventDefault();
    setPicnicError("");
    setPicnicBusy(true);
    try {
      const result = await onPicnicLogin(picnicForm.username, picnicForm.password);
      if (result?.requiresTwoFactor) {
        setPicnicOtp({ open: true, code: "" });
      } else {
        setPicnicForm({ username: "", password: "" });
        setPicnicFormOpen(false);
      }
    } catch (err) {
      setPicnicError(err?.message || t("picnicLoginFailed"));
    } finally {
      setPicnicBusy(false);
    }
  };

  const handlePicnicOtpSubmit = async (e) => {
    e.preventDefault();
    setPicnicError("");
    setPicnicBusy(true);
    try {
      await onPicnicVerify2FA(picnicOtp.code);
      setPicnicForm({ username: "", password: "" });
      setPicnicFormOpen(false);
      setPicnicOtp({ open: false, code: "" });
    } catch (err) {
      setPicnicError(err?.message || t("picnic2faFailed"));
    } finally {
      setPicnicBusy(false);
    }
  };

  const resetPicnicForm = () => {
    setPicnicFormOpen(false);
    setPicnicOtp({ open: false, code: "" });
    setPicnicError("");
    setPicnicForm({ username: "", password: "" });
  };

  return (
    <>
      {open && <div className="menu-overlay" onClick={onClose} />}
      <aside className={`side-menu${open ? " side-menu--open" : ""}`} onClick={(e) => e.stopPropagation()}>
        {settingsOpen ? (
          <>
            <div className="side-menu-top">
              <button className="side-menu-back" onClick={() => setSettingsOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button className="side-menu-close" onClick={() => { setSettingsOpen(false); onClose(); }}>✕</button>
            </div>

            <div className="side-menu-section">
              <p className="side-menu-label">{t("languageSection")}</p>
              <div className="side-menu-flag-group">
                {LANGUAGES.map(({ code, img, label }) => (
                  <button key={code} className={`side-menu-flag-btn${lang === code ? " active" : ""}`} onClick={() => setLang(code)} title={label}>
                    <img src={img} alt={label} className="side-menu-flag-img" />
                  </button>
                ))}
              </div>
            </div>

            <div className="side-menu-section">
              <p className="side-menu-label">{t("familySection")}</p>
              <div className="member-toggle-grid">
                {FAMILY.map((name) => {
                  const on = visibleMembers.includes(name);
                  return (
                    <button
                      key={name}
                      className={`member-toggle-btn${on ? " member-toggle-btn--on" : ""}`}
                      style={on ? { borderColor: MEMBER_COLORS[name], color: MEMBER_COLORS[name] } : {}}
                      onClick={() => onToggleMember(name)}
                      disabled={on && visibleMembers.length === 1}
                    >
                      <span>{name}</span>
                      {on && <span className="member-toggle-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>}
                    </button>
                  );
                })}
              </div>
            </div>

          </>
        ) : (
          <>
            <div className="side-menu-top">
              <button className="side-menu-dots" onClick={() => setSettingsOpen(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
              </button>
              <button className="side-menu-close" onClick={onClose}>✕</button>
            </div>

            <div className="side-menu-section">
              {picnicUser ? (
                <>
                  <div className="side-menu-picnic-user">
                    <span className="side-menu-user-label">{t("picnicLoggedInAs")}</span>
                    <strong className="side-menu-user-name">{picnicUser.name}</strong>
                  </div>
                  <button className="side-menu-picnic-logout" onClick={() => { onPicnicLogout(); }}>
                    {t("picnicLogout")}
                  </button>
                </>
              ) : picnicOtp.open ? (
                <form className="side-menu-picnic-form" onSubmit={handlePicnicOtpSubmit}>
                  <p className="side-menu-picnic-2fa-hint">{t("picnic2faHint")}</p>
                  <input
                    className="side-menu-picnic-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={t("picnic2faPlaceholder")} aria-label={t("picnic2faPlaceholder")}
                    value={picnicOtp.code}
                    onChange={(e) => setPicnicOtp((p) => ({ ...p, code: e.target.value }))}
                    required
                  />
                  {picnicError && <p className="side-menu-picnic-error">{picnicError}</p>}
                  <div className="side-menu-picnic-actions">
                    <button type="submit" className="side-menu-picnic-btn" disabled={picnicBusy}>
                      {picnicBusy ? t("picnic2faBusy") : t("picnic2faBtn")}
                    </button>
                    <button type="button" className="side-menu-picnic-cancel" onClick={resetPicnicForm}>
                      {t("cancel")}
                    </button>
                  </div>
                </form>
              ) : picnicFormOpen ? (
                <form className="side-menu-picnic-form" onSubmit={handlePicnicSubmit}>
                  <input
                    className="side-menu-picnic-input"
                    type="email"
                    placeholder={t("picnicLoginUsername")} aria-label={t("picnicLoginUsername")}
                    value={picnicForm.username}
                    onChange={(e) => setPicnicForm((p) => ({ ...p, username: e.target.value }))}
                    autoComplete="email"
                    required
                  />
                  <input
                    className="side-menu-picnic-input"
                    type="password"
                    placeholder={t("picnicLoginPassword")} aria-label={t("picnicLoginPassword")}
                    value={picnicForm.password}
                    onChange={(e) => setPicnicForm((p) => ({ ...p, password: e.target.value }))}
                    autoComplete="current-password"
                    required
                  />
                  {picnicError && <p className="side-menu-picnic-error">{picnicError}</p>}
                  <div className="side-menu-picnic-actions">
                    <button type="submit" className="side-menu-picnic-btn" disabled={picnicBusy}>
                      {picnicBusy ? t("picnicLoginBusy") : t("picnicLoginBtn")}
                    </button>
                    <button type="button" className="side-menu-picnic-cancel" onClick={resetPicnicForm}>
                      {t("cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <button className="side-menu-picnic-login-btn" onClick={() => setPicnicFormOpen(true)}>
                  {t("picnicLogin")}
                </button>
              )}
            </div>

            {currentUser && (
              <div className="side-menu-footer">
                <button className="side-menu-logout" onClick={() => { onLogout(); onClose(); }}>
                  {t("logout")}
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}

const FAMILY = ["Neil", "Larisa", "Inga", "Kevin"];
const VISIBLE_MEMBERS_KEY = "familie-eten:visible-members";
const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const AUTH_USER_KEY = "familie-eten:user";
const PICNIC_USER_KEY = "familie-eten:picnic-user";
const PICNIC_ASSOC_KEY = "familie-eten:picnic-associations";
const MAX_WEEK_PLAN_WRITE_RETRIES = 3;

const emptyWeek = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = FAMILY.reduce((a, m) => { a[m] = null; return a; }, {});
    return acc;
  }, {});

export default function App() {
  const { t } = useLanguage();
  const [tab, setTab] = useState("planner");
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [recipeSearchOpen, setRecipeSearchOpen] = useState(false);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState("");
  const [libraryViewRecipe, setLibraryViewRecipe] = useState(null);
  const [libraryEditKey, setLibraryEditKey] = useState(0);
  const [recipeEditListMode, setRecipeEditListMode] = useState(false);
  const [recipeDotsOpen, setRecipeDotsOpen] = useState(false);
  const [recipeAddKey, setRecipeAddKey] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const recipeDotsRef = useRef(null);
  const [shoppingPicnicSendKey, setShoppingPicnicSendKey] = useState(0);
  const [shoppingPicnicCartKey, setShoppingPicnicCartKey] = useState(0);
  const [shoppingListTab, setShoppingListTab] = useState("maaltijden");
  const [staplesEditMode, setStaplesEditMode] = useState(false);
  const [shoppingEditMode, setShoppingEditMode] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => setDarkMode(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (recipeDotsRef.current && !recipeDotsRef.current.contains(e.target)) {
        setRecipeDotsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [visibleMembers, setVisibleMembers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(VISIBLE_MEMBERS_KEY)) ?? FAMILY; }
    catch { return FAMILY; }
  });
  const toggleMember = (name) => {
    setVisibleMembers(prev => {
      if (prev.includes(name)) {
        if (prev.length === 1) return prev;
        const next = prev.filter(m => m !== name);
        localStorage.setItem(VISIBLE_MEMBERS_KEY, JSON.stringify(next));
        return next;
      }
      const next = FAMILY.filter(m => prev.includes(m) || m === name);
      localStorage.setItem(VISIBLE_MEMBERS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const [weekOffset, setWeekOffset] = useState(0);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem(AUTH_USER_KEY));
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // Picnic state — persisted in localStorage so it survives page refreshes
  const [picnicUser, setPicnicUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PICNIC_USER_KEY)) ?? null; }
    catch { return null; }
  });

  const handlePicnicLogin = async (username, password) => {
    const response = await fetch("/api/picnic-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || t("picnicLoginFailed"));
    }
    if (data.requiresTwoFactor) {
      return { requiresTwoFactor: true };
    }
    const user = { name: data.name };
    localStorage.setItem(PICNIC_USER_KEY, JSON.stringify(user));
    setPicnicUser(user);
    return { requiresTwoFactor: false };
  };

  const handlePicnicVerify2FA = async (code) => {
    const response = await fetch("/api/picnic-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || t("picnic2faFailed"));
    }
    const user = { name: data.name };
    localStorage.setItem(PICNIC_USER_KEY, JSON.stringify(user));
    setPicnicUser(user);
  };

  const handlePicnicLogout = async () => {
    const response = await fetch("/api/picnic-login", { method: "DELETE" }).catch(() => null);
    if (!response?.ok) return;
    localStorage.removeItem(PICNIC_USER_KEY);
    setPicnicUser(null);
  };

  const handlePicnicSessionExpired = () => {
    localStorage.removeItem(PICNIC_USER_KEY);
    setPicnicUser(null);
  };

  // Week plan state
  const [selectedWeekPlan, setSelectedWeekPlan] = useState(() => emptyWeek());
  const [weekPlanLoaded, setWeekPlanLoaded] = useState(() => !localStorage.getItem(AUTH_USER_KEY));
  const [weekPlanSaveFailed, setWeekPlanSaveFailed] = useState(false);
  const selectedWeekPlanRef = useRef(selectedWeekPlan);
  const weekPlanMutationQueueRef = useRef(Promise.resolve());
  const weekPlanBaseRef = useRef(selectedWeekPlan);
  const weekPlanEtagRef = useRef(null);
  const weekPlanWriteSeqRef = useRef(0);
  const activeWeekKey = getIsoWeekKey(weekOffset);
  const activeWeekKeyRef = useRef(activeWeekKey);

  // Recipe state
  const [recipeList, setRecipeList] = useState(defaultRecipes);
  const [recipesLoaded, setRecipesLoaded] = useState(() => !localStorage.getItem(AUTH_USER_KEY));
  const [recipesSaveFailed, setRecipesSaveFailed] = useState(false);
  const recipesEtagRef = useRef(null);

  // Recipe detail view
  const [recipeView, setRecipeView] = useState(null); // { recipeId, day, member }

  // Staples state
  const [staplesList, setStaplesList] = useState(defaultStaples);
  const [staplesLoaded, setStaplesLoaded] = useState(() => !localStorage.getItem(AUTH_USER_KEY));
  const staplesEtagRef = useRef(null);
  const [picnicAssociations, setPicnicAssociations] = useState({});
  const [picnicAssociationsLoaded, setPicnicAssociationsLoaded] = useState(() => !localStorage.getItem(AUTH_USER_KEY));
  const [picnicAssocSaveFailed, setPicnicAssocSaveFailed] = useState(false);
  const picnicAssociationsRef = useRef({});
  const picnicAssociationsEtagRef = useRef(null);

  // ── Ref sync ──────────────────────────────────────────────────────────────
  useEffect(() => { selectedWeekPlanRef.current = selectedWeekPlan; }, [selectedWeekPlan]);
  useEffect(() => { activeWeekKeyRef.current = activeWeekKey; }, [activeWeekKey]);
  useEffect(() => { picnicAssociationsRef.current = picnicAssociations; }, [picnicAssociations]);

  // ── Week plan API ─────────────────────────────────────────────────────────
  const fetchWeekPlan = async (weekKey) => {
    const response = await fetch(`/api/week-plan?weekKey=${encodeURIComponent(weekKey)}`, {
      cache: "no-store",
    });
    if (response.status === 404) return { weekPlan: emptyWeek(), etag: null };
    if (!response.ok) throw new Error("Failed to load week plan");
    const data = await response.json();
    return { weekPlan: data.weekPlan ?? emptyWeek(), etag: data.etag ?? null };
  };

  const persistWeekPlan = async (weekKey, nextWeekPlan, etag) => {
    const response = await fetch(`/api/week-plan?weekKey=${encodeURIComponent(weekKey)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekPlan: nextWeekPlan, etag }),
    });
    if (response.status === 412) {
      const data = await response.json().catch(() => ({}));
      return { conflict: true, weekPlan: data.weekPlan ?? null, etag: data.etag ?? null };
    }
    if (!response.ok) throw new Error("Failed to save week plan");
    const data = await response.json().catch(() => ({}));
    return { conflict: false, etag: data.etag ?? null };
  };

  const updateSelectedWeekPlan = (day, member, recipeId) => {
    if (!currentUser) return;
    const weekKey = activeWeekKeyRef.current;
    const applyUpdater = (base) => ({
      ...base,
      [day]: { ...(base[day] ?? {}), [member]: recipeId },
    });
    const seq = (weekPlanWriteSeqRef.current += 1);

    const optimistic = applyUpdater(selectedWeekPlanRef.current ?? emptyWeek());
    selectedWeekPlanRef.current = optimistic;
    setSelectedWeekPlan(optimistic);

    weekPlanMutationQueueRef.current = weekPlanMutationQueueRef.current
      .catch(() => {})
      .then(async () => {
        if (activeWeekKeyRef.current !== weekKey) return;

        let base = weekPlanBaseRef.current ?? emptyWeek();
        let etag = weekPlanEtagRef.current;
        let next = applyUpdater(base);

        for (let attempt = 0; attempt < MAX_WEEK_PLAN_WRITE_RETRIES; attempt += 1) {
          const result = await persistWeekPlan(weekKey, next, etag).catch(() => null);
          if (!result) return;

          if (!result.conflict) {
            weekPlanBaseRef.current = next;
            weekPlanEtagRef.current = result.etag;
            if (seq === weekPlanWriteSeqRef.current && activeWeekKeyRef.current === weekKey) {
              selectedWeekPlanRef.current = next;
              setSelectedWeekPlan(next);
              setWeekPlanSaveFailed(false);
            }
            return;
          }

          if (!result.etag) {
            if (seq === weekPlanWriteSeqRef.current && activeWeekKeyRef.current === weekKey) {
              setWeekPlanSaveFailed(true);
            }
            return;
          }
          base = result.weekPlan ?? base;
          etag = result.etag;
          next = applyUpdater(base);
        }

        if (seq === weekPlanWriteSeqRef.current && activeWeekKeyRef.current === weekKey) {
          setWeekPlanSaveFailed(true);
        }
      });
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchWeekPlan(activeWeekKey)
      .then(({ weekPlan, etag }) => {
        weekPlanBaseRef.current = weekPlan;
        weekPlanEtagRef.current = etag;
        selectedWeekPlanRef.current = weekPlan;
        setSelectedWeekPlan(weekPlan);
        setWeekPlanSaveFailed(false);
      })
      .catch(() => {})
      .finally(() => { setWeekPlanLoaded(true); });
  }, [activeWeekKey, currentUser]);

  const reloadWeekPlanFromServer = () => {
    const weekKey = activeWeekKeyRef.current;
    fetchWeekPlan(weekKey)
      .then(({ weekPlan, etag }) => {
        if (activeWeekKeyRef.current !== weekKey) return;
        weekPlanBaseRef.current = weekPlan;
        weekPlanEtagRef.current = etag;
        selectedWeekPlanRef.current = weekPlan;
        setSelectedWeekPlan(weekPlan);
        setWeekPlanSaveFailed(false);
      })
      .catch(() => {});
  };

  // ── Recipe API ────────────────────────────────────────────────────────────
  const saveRecipesToBlob = async (nextRecipes) => {
    const MAX_RETRIES = 3;
    let etag = recipesEtagRef.current;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("/api/recipes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipes: nextRecipes, etag }),
        });
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          recipesEtagRef.current = data.etag ?? null;
          setRecipesSaveFailed(false);
          return;
        }
        if (response.status !== 412) { setRecipesSaveFailed(true); return; }
        const data = await response.json().catch(() => ({}));
        if (!data.etag) { setRecipesSaveFailed(true); return; }
        // Got 412 — update to latest etag and retry with our version
        etag = data.etag;
        recipesEtagRef.current = etag;
      } catch {
        setRecipesSaveFailed(true);
        return;
      }
    }
    setRecipesSaveFailed(true);
  };

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/recipes", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          // No blob yet — seed it with bundled recipes
          recipesEtagRef.current = null;
          setRecipeList(defaultRecipes);
          saveRecipesToBlob(defaultRecipes);
          return;
        }
        if (!response.ok) throw new Error("Failed to load recipes");
        const data = await response.json();
        // One-time migration: if blob still has bag/zakje units, overwrite with fixed bundled data
        const BAD_UNITS = ["zakje", "zakjes", "zak", "bag", "doosjes"];
        const needsMigration = (data.recipes ?? []).some((r) =>
          r.ingredients?.some((i) => BAD_UNITS.includes((i.unit ?? "").toLowerCase()))
        );
        if (needsMigration) {
          recipesEtagRef.current = null; // unconditional overwrite — skip ETag check
          setRecipeList(defaultRecipes);
          saveRecipesToBlob(defaultRecipes);
          return;
        }
        // Migration: sync recipe content from bundle to blob when version changes
        const applyMigration = (blobRecipes) => {
          const patched = blobRecipes.map((blobR) => {
            const def = defaultRecipes.find((d) => d.id === blobR.id);
            if (!def) return blobR;
            const needsSync = blobR._bundleVersion !== RECIPE_BUNDLE_VERSION;
            let updated = blobR;
            if (needsSync || (def.instructions?.length > 0 && !(blobR.instructions?.length > 0))) {
              updated = { ...updated, instructions: def.instructions };
            }
            if (needsSync || (def.translations && !blobR.translations)) {
              updated = { ...updated, translations: def.translations };
            }
            if (needsSync) {
              updated = { ...updated, _bundleVersion: RECIPE_BUNDLE_VERSION };
            }
            return updated;
          });
          const ids = new Set(blobRecipes.map((r) => r.id));
          const newOnes = defaultRecipes.filter((r) => !ids.has(r.id));
          return [...patched, ...newOnes];
        };

        const migrated = applyMigration(data.recipes ?? []);
        const needsMigrate = migrated.some(
          (r, i) => r !== (data.recipes ?? [])[i]
        ) || migrated.length !== (data.recipes ?? []).length;

        if (needsMigrate) {
          recipesEtagRef.current = data.etag ?? null;
          setRecipeList(migrated);
          // Migration save: unconditional write (etag: null) so ETag mismatches can't block it
          (async () => {
            try {
              const r = await fetch("/api/recipes", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipes: migrated, etag: null }),
              });
              if (r.ok) {
                const d = await r.json().catch(() => ({}));
                recipesEtagRef.current = d.etag ?? null;
              }
            } catch {
              // silent — migration will retry on next load
            }
          })();
          return;
        }
        recipesEtagRef.current = data.etag ?? null;
        setRecipeList(data.recipes ?? defaultRecipes);
      })
      .catch(() => {
        // Network error — fall back to bundled recipes silently
        setRecipeList(defaultRecipes);
      })
      .finally(() => { setRecipesLoaded(true); });
  }, [currentUser]);

  // ── Staples API ───────────────────────────────────────────────────────────
  const saveStaplesToBlob = async (nextStaples) => {
    try {
      const response = await fetch("/api/staples", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staples: nextStaples, etag: staplesEtagRef.current }),
      });
      if (response.status === 412) {
        const data = await response.json().catch(() => ({}));
        if (data.staples && data.etag) {
          staplesEtagRef.current = data.etag;
          setStaplesList(data.staples);
        }
        return;
      }
      if (!response.ok) return;
      const data = await response.json().catch(() => ({}));
      staplesEtagRef.current = data.etag ?? null;
    } catch {
      // silent — staples are not critical path
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/staples", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          staplesEtagRef.current = null;
          setStaplesList(defaultStaples);
          saveStaplesToBlob(defaultStaples);
          return;
        }
        if (!response.ok) throw new Error("Failed to load staples");
        const data = await response.json();
        staplesEtagRef.current = data.etag ?? null;
        setStaplesList(data.staples ?? defaultStaples);
      })
      .catch(() => { setStaplesList(defaultStaples); })
      .finally(() => { setStaplesLoaded(true); });
  }, [currentUser]);

  // ── Recipe mutations ──────────────────────────────────────────────────────
  const deleteRecipe = (id) => {
    const next = recipeList.filter((r) => r.id !== id);
    setRecipeList(next);
    saveRecipesToBlob(next);
  };

  const updateRecipe = (updated) => {
    const next = recipeList.map((r) => r.id === updated.id ? updated : r);
    setRecipeList(next);
    saveRecipesToBlob(next);
  };

  const addRecipe = (newRecipe) => {
    const next = [...recipeList, newRecipe];
    setRecipeList(next);
    saveRecipesToBlob(next);
  };

  const reloadRecipes = () => {
    fetch("/api/recipes", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.recipes) {
          recipesEtagRef.current = data.etag ?? null;
          setRecipeList(data.recipes);
        }
        setRecipesSaveFailed(false);
      })
      .catch(() => setRecipesSaveFailed(false));
  };

  const updateStaples = (nextStaples) => {
    setStaplesList(nextStaples);
    saveStaplesToBlob(nextStaples);
  };

  const persistPicnicAssociations = async (nextAssociations, etag) => {
    const response = await fetch("/api/picnic-associations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ associations: nextAssociations, etag }),
    });
    if (response.status === 412) {
      const data = await response.json().catch(() => ({}));
      return { conflict: true, associations: data.associations ?? {}, etag: data.etag ?? null };
    }
    if (!response.ok) throw new Error("Failed to save Picnic associations");
    const data = await response.json().catch(() => ({}));
    return { conflict: false, etag: data.etag ?? null };
  };

  const updatePicnicAssociation = async (itemKey, association) => {
    const next = { ...(picnicAssociationsRef.current ?? {}) };
    if (association) next[itemKey] = association;
    else delete next[itemKey];

    const etag = picnicAssociationsEtagRef.current;
    picnicAssociationsRef.current = next;
    setPicnicAssociations(next);
    try { localStorage.setItem(PICNIC_ASSOC_KEY, JSON.stringify(next)); } catch { /* ignore */ }

    try {
      const result = await persistPicnicAssociations(next, etag);
      if (result.conflict) {
        setPicnicAssocSaveFailed(true);
        return;
      }
      picnicAssociationsEtagRef.current = result.etag;
    } catch {
      // Network error: local state is already updated; silent failure
    }
  };

  const reloadPicnicAssociations = () => {
    setPicnicAssocSaveFailed(false);
    const loadLocalAssociations = () => {
      try {
        const stored = localStorage.getItem(PICNIC_ASSOC_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch { return {}; }
    };
    fetch("/api/picnic-associations", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          picnicAssociationsEtagRef.current = null;
          picnicAssociationsRef.current = {};
          setPicnicAssociations({});
          return;
        }
        if (!response.ok) throw new Error("Failed to reload");
        const data = await response.json();
        const associations = data.associations ?? {};
        picnicAssociationsEtagRef.current = data.etag ?? null;
        picnicAssociationsRef.current = associations;
        setPicnicAssociations(associations);
        try { localStorage.setItem(PICNIC_ASSOC_KEY, JSON.stringify(associations)); } catch { /* ignore */ }
      })
      .catch(() => {
        const local = loadLocalAssociations();
        picnicAssociationsRef.current = local;
        setPicnicAssociations(local);
      });
  };

  useEffect(() => {
    if (!currentUser) return;
    const loadLocalAssociations = () => {
      try {
        const stored = localStorage.getItem(PICNIC_ASSOC_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch { return {}; }
    };
    fetch("/api/picnic-associations", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          picnicAssociationsEtagRef.current = null;
          const local = loadLocalAssociations();
          picnicAssociationsRef.current = local;
          setPicnicAssociations(local);
          return;
        }
        if (!response.ok) throw new Error("Failed to load Picnic associations");
        const data = await response.json();
        const associations = data.associations ?? {};
        picnicAssociationsEtagRef.current = data.etag ?? null;
        picnicAssociationsRef.current = associations;
        setPicnicAssociations(associations);
        try { localStorage.setItem(PICNIC_ASSOC_KEY, JSON.stringify(associations)); } catch { /* ignore */ }
      })
      .catch(() => {
        const local = loadLocalAssociations();
        picnicAssociationsRef.current = local;
        setPicnicAssociations(local);
      })
      .finally(() => { setPicnicAssociationsLoaded(true); });
  }, [currentUser]);

  // ── Week plan helpers ─────────────────────────────────────────────────────
  const selectedWeekPlanData = selectedWeekPlan ?? emptyWeek();

  const assignMeal = (day, member, recipeId) => {
    updateSelectedWeekPlan(day, member, recipeId);
  };

  const clearMeal = (day, member) => assignMeal(day, member, null);

  const handleWeekChange = (nextWeekOffset) => {
    if (nextWeekOffset === weekOffset) return;
    setWeekPlanLoaded(false);
    setWeekOffset(nextWeekOffset);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginError(data?.message || t("loginFailed"));
        return;
      }
      setWeekPlanLoaded(false);
      setRecipesLoaded(false);
      setStaplesLoaded(false);
      setPicnicAssociationsLoaded(false);
      setCurrentUser(data.user);
      localStorage.setItem(AUTH_USER_KEY, data.user);
      setLoginForm({ username: "", password: "" });
    } catch {
      setLoginError(t("serverUnreachable"));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setWeekPlanLoaded(true);
    setSelectedWeekPlan(emptyWeek());
    weekPlanBaseRef.current = emptyWeek();
    weekPlanEtagRef.current = null;
    setRecipesLoaded(true);
    setRecipeList(defaultRecipes);
    recipesEtagRef.current = null;
    setRecipesSaveFailed(false);
    setStaplesLoaded(true);
    setStaplesList(defaultStaples);
    staplesEtagRef.current = null;
    setPicnicAssociationsLoaded(true);
    setPicnicAssociations({});
    setPicnicAssocSaveFailed(false);
    picnicAssociationsRef.current = {};
    picnicAssociationsEtagRef.current = null;
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(PICNIC_ASSOC_KEY);
    setLoginError("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className={`app login-screen${darkMode ? " dark" : ""}`}>
        <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} onLogout={handleLogout} currentUser={null} picnicUser={picnicUser} onPicnicLogin={handlePicnicLogin} onPicnicVerify2FA={handlePicnicVerify2FA} onPicnicLogout={handlePicnicLogout} visibleMembers={visibleMembers} onToggleMember={toggleMember} tab={tab} onTabChange={setTab} />
        <button className="header-dots-btn header-dots-btn--login" onClick={() => setMenuOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </button>
        <main className="login-card">
          <img src="/logo.png" alt="Familie Eten" className="app-logo-img" />
          <p className="subtitle">{t("loginSubtitle")}</p>
          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="username">{t("username")}</label>
            <input
              id="username"
              value={loginForm.username}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
              autoComplete="username"
              required
            />
            <label htmlFor="password">{t("password")}</label>
            <input
              id="password"
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              autoComplete="current-password"
              required
            />
            {loginError && <p className="login-error">{loginError}</p>}
            <button type="submit" disabled={loginBusy}>
              {loginBusy ? t("loginBusy") : t("loginBtn")}
            </button>
          </form>
        </main>
      </div>
    );
  }

  if (!weekPlanLoaded || !recipesLoaded || !staplesLoaded || !picnicAssociationsLoaded) {
    return (
      <div className={`app login-screen${darkMode ? " dark" : ""}`}>
        <main className="login-card">
          <img src="/logo.png" alt="Familie Eten" className="app-logo-img" />
          <p className="subtitle">{t("loading")}</p>
        </main>
      </div>
    );
  }

  return (
    <div className={`app${darkMode ? " dark" : ""}`}>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} onLogout={handleLogout} currentUser={currentUser} picnicUser={picnicUser} onPicnicLogin={handlePicnicLogin} onPicnicVerify2FA={handlePicnicVerify2FA} onPicnicLogout={handlePicnicLogout} visibleMembers={visibleMembers} onToggleMember={toggleMember} tab={tab} onTabChange={setTab} />
      <header className="app-header">
        {tab === "recipes" && (libraryViewRecipe || showArchived) ? (
          <button className="header-dots-btn header-dots-btn--back" onClick={() => { setLibraryViewRecipe(null); if (!libraryViewRecipe) setShowArchived(false); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        ) : (
          <button className="header-dots-btn" onClick={() => setMenuOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
        )}
        {tab === "recipes" && libraryViewRecipe && (
          <span className="header-recipe-title">{libraryViewRecipe.name}</span>
        )}
        {tab === "recipes" && !libraryViewRecipe && showArchived && (
          <span className="header-recipe-title">Archief</span>
        )}
        {tab === "planner" && (
          <div className="header-pill-group">
            <button className="header-pill-btn" title={t("search")}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className="header-pill-btn" onClick={() => handleWeekChange(0)} title={t("today")}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </button>
          </div>
        )}
        {tab === "shopping" && (
          <div className="header-pill-group">
            <button className="header-pill-btn" title={t("search")}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            {shoppingListTab === "staples" ? (
              <button className="header-pill-btn" onClick={() => setStaplesEditMode((e) => !e)} title={staplesEditMode ? t("doneEditing") : t("editMode")}>
                {staplesEditMode
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                }
              </button>
            ) : (
              <button className="header-pill-btn" onClick={() => setShoppingEditMode((e) => !e)} title={shoppingEditMode ? t("doneEditing") : t("editMode")}>
                {shoppingEditMode
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                }
              </button>
            )}
            <button className="header-pill-btn" onClick={() => setShoppingPicnicSendKey((k) => k + 1)} title={t("sendPicnic")}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fc7600" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h16l-1.5 9a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 10z"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><line x1="9" y1="13" x2="9" y2="17"/><line x1="12" y1="13" x2="12" y2="17"/><line x1="15" y1="13" x2="15" y2="17"/></svg>
            </button>
            {picnicUser && (
              <button className="header-pill-btn" onClick={() => setShoppingPicnicCartKey((k) => k + 1)} title={t("picnicViewCart")}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              </button>
            )}
          </div>
        )}
        {tab === "recipes" && (
          libraryViewRecipe ? (
            libraryViewRecipe.archived ? (
              <div className="header-pill-group">
                <button className="header-pill-btn" title="Herstellen" onClick={() => { updateRecipe({ ...libraryViewRecipe, archived: false }); setLibraryViewRecipe(null); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5.18"/></svg>
                </button>
                <button className="header-pill-btn" title="Verwijder" onClick={() => { if (window.confirm(`"${libraryViewRecipe.name}" permanent verwijderen?`)) { deleteRecipe(libraryViewRecipe.id); setLibraryViewRecipe(null); } }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            ) : (
              <div className="header-pill-group">
                <button className="header-pill-btn" title="Bewerk recept" onClick={() => setLibraryEditKey((k) => k + 1)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button className="header-pill-btn" title="Archiveer" onClick={() => { updateRecipe({ ...libraryViewRecipe, archived: true }); setLibraryViewRecipe(null); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                </button>
              </div>
            )
          ) : showArchived ? (
            <div className="header-pill-group">
              <button className="header-pill-btn" onClick={() => setRecipeEditListMode((e) => !e)} title={recipeEditListMode ? t("doneEditing") : t("editMode")}>
                {recipeEditListMode
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                }
              </button>
            </div>
          ) : (
            recipeSearchOpen ? (
              <div className="header-search-bar">
                <input
                  className="header-search-input"
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={recipeSearchQuery}
                  onChange={(e) => setRecipeSearchQuery(e.target.value)}
                  autoFocus
                />
                <button className="header-pill-btn" onClick={() => { setRecipeSearchOpen(false); setRecipeSearchQuery(""); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <div className="header-pill-group">
                <button className="header-pill-btn" onClick={() => setRecipeSearchOpen(true)} title={t("search")}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>
                <button className="header-pill-btn" onClick={() => setRecipeAddKey((k) => k + 1)} title={t("addRecipe")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button className="header-pill-btn" onClick={() => setRecipeEditListMode((e) => !e)} title={recipeEditListMode ? t("doneEditing") : t("editMode")}>
                  {recipeEditListMode
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  }
                </button>
                <button className="header-pill-btn" onClick={() => setShowArchived(true)} title="Archief">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                </button>
              </div>
            )
          )
        )}
      </header>


      <main className="app-main">
        {tab === "planner" && (
          <WeekPlanner
            days={DAYS}
            family={visibleMembers}
            weekPlan={selectedWeekPlanData}
            weekOffset={weekOffset}
            onWeekChange={handleWeekChange}
            recipes={recipeList}
            onAssign={assignMeal}
            onClear={clearMeal}
            saveFailed={weekPlanSaveFailed}
            onReloadWeekPlan={reloadWeekPlanFromServer}
            onViewRecipe={(recipeId, day, member) => setRecipeView({ recipeId, day, member })}
          />
        )}
        {tab === "recipes" && (
          <RecipeLibrary
            recipes={recipeList}
            onAdd={addRecipe}
            onDelete={deleteRecipe}
            onUpdate={updateRecipe}
            saveFailed={recipesSaveFailed}
            onDismissSaveFailed={reloadRecipes}
            searchQuery={recipeSearchQuery}
            editListMode={recipeEditListMode}
            showArchived={showArchived}
            newRecipeKey={recipeAddKey}
            viewRecipe={libraryViewRecipe}
            onViewRecipe={setLibraryViewRecipe}
            editViewedKey={libraryEditKey}
          />
        )}
        {tab === "shopping" && (
          <ShoppingList
            weekPlan={selectedWeekPlanData}
            recipes={recipeList}
            family={visibleMembers}
            days={DAYS}
            staples={staplesList}
            onUpdateStaples={updateStaples}
            picnicUser={picnicUser}
            picnicAssociations={picnicAssociations}
            onUpdatePicnicAssociation={updatePicnicAssociation}
            picnicAssocSaveFailed={picnicAssocSaveFailed}
            onReloadPicnicAssociations={reloadPicnicAssociations}
            onPicnicSessionExpired={handlePicnicSessionExpired}
            picnicSendKey={shoppingPicnicSendKey}
            picnicCartKey={shoppingPicnicCartKey}
            activeListTab={shoppingListTab}
            onActiveListTabChange={setShoppingListTab}
            staplesEditMode={staplesEditMode}
            onStaplesEditModeChange={setStaplesEditMode}
            shoppingEditMode={shoppingEditMode}
            onShoppingEditModeChange={setShoppingEditMode}
          />
        )}
      </main>

      <nav className="bottom-nav">
        {[
          {
            key: "planner", label: "Planner",
            icon: <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
          },
          {
            key: "shopping", label: "Boodschappen",
            icon: <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
          },
          {
            key: "recipes", label: "Recepten",
            icon: <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
          },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            className={`bottom-nav-btn${tab === key ? " active" : ""}`}
            onClick={() => setTab(key)}
          >
            <span className="bottom-nav-icon">{icon}</span>
            <span className="bottom-nav-label">{label}</span>
          </button>
        ))}
      </nav>

      {recipeView && (
        <RecipeDetail
          recipe={recipeList.find((r) => r.id === recipeView.recipeId)}
          day={recipeView.day}
          member={recipeView.member}
          onBack={() => setRecipeView(null)}
        />
      )}
    </div>
  );
}
