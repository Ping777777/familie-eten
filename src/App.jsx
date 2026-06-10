import { useState, useEffect, useRef } from "react";
import { recipes as defaultRecipes } from "./data/recipes";
import { defaultStaples } from "./data/defaultStaples";
import RecipeLibrary from "./components/RecipeLibrary";
import WeekPlanner from "./components/WeekPlanner";
import ShoppingList from "./components/ShoppingList";
import RoadmapModal from "./components/RoadmapModal";
import { getIsoWeekKey } from "./week";
import "./App.css";

const FAMILY = ["Papa", "Mama", "Inga", "Kevin"];
const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const AUTH_USER_KEY = "familie-eten:user";
const MAX_WEEK_PLAN_WRITE_RETRIES = 3;

const emptyWeek = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = FAMILY.reduce((a, m) => { a[m] = null; return a; }, {});
    return acc;
  }, {});

export default function App() {
  const [tab, setTab] = useState("planner");
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem(AUTH_USER_KEY));
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

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

  // Staples state
  const [staplesList, setStaplesList] = useState(defaultStaples);
  const [staplesLoaded, setStaplesLoaded] = useState(() => !localStorage.getItem(AUTH_USER_KEY));
  const staplesEtagRef = useRef(null);

  // ── Ref sync ──────────────────────────────────────────────────────────────
  useEffect(() => { selectedWeekPlanRef.current = selectedWeekPlan; }, [selectedWeekPlan]);
  useEffect(() => { activeWeekKeyRef.current = activeWeekKey; }, [activeWeekKey]);

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
    try {
      const response = await fetch("/api/recipes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipes: nextRecipes, etag: recipesEtagRef.current }),
      });
      if (response.status === 412) {
        const data = await response.json().catch(() => ({}));
        // Another client saved a different version — load theirs
        if (data.recipes && data.etag) {
          recipesEtagRef.current = data.etag;
          setRecipeList(data.recipes);
        }
        setRecipesSaveFailed(true);
        return;
      }
      if (!response.ok) { setRecipesSaveFailed(true); return; }
      const data = await response.json().catch(() => ({}));
      recipesEtagRef.current = data.etag ?? null;
      setRecipesSaveFailed(false);
    } catch {
      setRecipesSaveFailed(true);
    }
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
        // Append new default recipes not yet in blob (picks up newly bundled recipes on deploy)
        const blobIds = new Set((data.recipes ?? []).map((r) => r.id));
        const missing = defaultRecipes.filter((r) => !blobIds.has(r.id));
        if (missing.length > 0) {
          const merged = [...(data.recipes ?? []), ...missing];
          recipesEtagRef.current = data.etag ?? null;
          setRecipeList(merged);
          saveRecipesToBlob(merged);
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

  const updateStaples = (nextStaples) => {
    setStaplesList(nextStaples);
    saveStaplesToBlob(nextStaples);
  };

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
        setLoginError(data?.message || "Inloggen mislukt");
        return;
      }
      setWeekPlanLoaded(false);
      setRecipesLoaded(false);
      setStaplesLoaded(false);
      setCurrentUser(data.user);
      localStorage.setItem(AUTH_USER_KEY, data.user);
      setLoginForm({ username: "", password: "" });
    } catch {
      setLoginError("Kon server niet bereiken");
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
    localStorage.removeItem(AUTH_USER_KEY);
    setLoginError("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="app login-screen">
        <main className="login-card">
          <h1>🍽️ Familie Eten</h1>
          <p className="subtitle">Log in om de planner te openen</p>
          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="username">Gebruikersnaam</label>
            <input
              id="username"
              value={loginForm.username}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
              autoComplete="username"
              required
            />
            <label htmlFor="password">Wachtwoord</label>
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
              {loginBusy ? "Bezig..." : "Inloggen"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  if (!weekPlanLoaded || !recipesLoaded || !staplesLoaded) {
    return (
      <div className="app login-screen">
        <main className="login-card">
          <h1>🍽️ Familie Eten</h1>
          <p className="subtitle">Laden…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍽️ Familie Eten</h1>
        <p className="subtitle">Ingelogd als {currentUser}</p>
        <nav className="tabs">
          {[
            { key: "planner", label: "📅 Weekplanner" },
            { key: "recipes", label: "📖 Recepten" },
            { key: "shopping", label: "🛒 Boodschappen" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`tab-btn ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="logout-btn" onClick={handleLogout}>Uitloggen</button>
      </header>

      <button className="dev-btn" onClick={() => setShowRoadmap(true)} title="Developer roadmap">Dev</button>
      {showRoadmap && <RoadmapModal onClose={() => setShowRoadmap(false)} />}

      <main className="app-main">
        {tab === "planner" && (
          <WeekPlanner
            days={DAYS}
            family={FAMILY}
            weekPlan={selectedWeekPlanData}
            weekOffset={weekOffset}
            onWeekChange={handleWeekChange}
            recipes={recipeList}
            onAssign={assignMeal}
            onClear={clearMeal}
            saveFailed={weekPlanSaveFailed}
            onReloadWeekPlan={reloadWeekPlanFromServer}
          />
        )}
        {tab === "recipes" && (
          <RecipeLibrary
            recipes={recipeList}
            onAdd={addRecipe}
            onDelete={deleteRecipe}
            onUpdate={updateRecipe}
            saveFailed={recipesSaveFailed}
          />
        )}
        {tab === "shopping" && (
          <ShoppingList
            weekPlan={selectedWeekPlanData}
            recipes={recipeList}
            family={FAMILY}
            days={DAYS}
            staples={staplesList}
            onUpdateStaples={updateStaples}
          />
        )}
      </main>
    </div>
  );
}
