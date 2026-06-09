import { useState, useEffect, useRef } from "react";
import { recipes } from "./data/recipes";
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

const load = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  const [tab, setTab] = useState("planner");
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next, -1 = last
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem(AUTH_USER_KEY));
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [selectedWeekPlan, setSelectedWeekPlan] = useState(() => emptyWeek());
  const [weekPlanLoaded, setWeekPlanLoaded] = useState(() => !localStorage.getItem(AUTH_USER_KEY));
  // True when an edit could not be saved because another device kept changing the same week.
  const [weekPlanSaveFailed, setWeekPlanSaveFailed] = useState(false);
  const [recipeList, setRecipeList] = useState(() => load("familie-eten:recipes", recipes));
  const selectedWeekPlanRef = useRef(selectedWeekPlan);
  const weekPlanMutationQueueRef = useRef(Promise.resolve());
  // Last server-acknowledged plan + its ETag, used as the base for conditional writes.
  const weekPlanBaseRef = useRef(selectedWeekPlan);
  const weekPlanEtagRef = useRef(null);
  // Monotonic counter so only the most recently queued edit reconciles the UI (avoids flicker).
  const weekPlanWriteSeqRef = useRef(0);
  const activeWeekKey = getIsoWeekKey(weekOffset);
  const activeWeekKeyRef = useRef(activeWeekKey);

  useEffect(() => {
    selectedWeekPlanRef.current = selectedWeekPlan;
  }, [selectedWeekPlan]);

  useEffect(() => {
    activeWeekKeyRef.current = activeWeekKey;
  }, [activeWeekKey]);

  const fetchWeekPlan = async (weekKey) => {
    const response = await fetch(`/api/week-plan?weekKey=${encodeURIComponent(weekKey)}`, {
      cache: "no-store",
    });
    if (response.status === 404) return { weekPlan: emptyWeek(), etag: null };
    if (!response.ok) throw new Error("Failed to load week plan");
    const data = await response.json();
    return { weekPlan: data.weekPlan ?? emptyWeek(), etag: data.etag ?? null };
  };

  // Conditional write. Returns { conflict, weekPlan?, etag } so the caller can rebase on conflict.
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

  const updateSelectedWeekPlan = (updater) => {
    if (!currentUser) return;

    // Capture the target week at enqueue time so a week switch mid-flight can't misroute the write.
    const weekKey = activeWeekKeyRef.current;
    const applyUpdater = (base) => (typeof updater === "function" ? updater(base) : updater);
    const seq = (weekPlanWriteSeqRef.current += 1);

    // Optimistic UI update from current local state for instant feedback.
    const optimistic = applyUpdater(selectedWeekPlanRef.current ?? emptyWeek());
    selectedWeekPlanRef.current = optimistic;
    setSelectedWeekPlan(optimistic);

    weekPlanMutationQueueRef.current = weekPlanMutationQueueRef.current
      .catch(() => {})
      .then(async () => {
        if (activeWeekKeyRef.current !== weekKey) return;

        // Rebase this edit onto the last server-acknowledged version (chains via ETag).
        let base = weekPlanBaseRef.current ?? emptyWeek();
        let etag = weekPlanEtagRef.current;
        let next = applyUpdater(base);

        for (let attempt = 0; attempt < MAX_WEEK_PLAN_WRITE_RETRIES; attempt += 1) {
          // Always guard with the ETag so we never overwrite another device's change.
          const result = await persistWeekPlan(weekKey, next, etag).catch(() => null);

          if (!result) return; // Network error: keep optimistic state; next edit retries.

          if (!result.conflict) {
            weekPlanBaseRef.current = next;
            weekPlanEtagRef.current = result.etag;
            // Only the latest queued edit reconciles the UI, to avoid clobbering pending edits.
            if (seq === weekPlanWriteSeqRef.current && activeWeekKeyRef.current === weekKey) {
              selectedWeekPlanRef.current = next;
              setSelectedWeekPlan(next);
              setWeekPlanSaveFailed(false);
            }
            return;
          }

          // Conflict: another device wrote. Rebase our change onto the latest and retry.
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

        // Retries exhausted while someone else kept editing this week. Cancel the write
        // rather than overwrite their change. Keep the user's attempt on screen and flag
        // it as unsaved so they can decide what to do.
        if (seq === weekPlanWriteSeqRef.current && activeWeekKeyRef.current === weekKey) {
          setWeekPlanSaveFailed(true);
        }
      });
  };

  // Load week plan from blob when user is logged in
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
      .finally(() => {
        setWeekPlanLoaded(true);
      });
  }, [activeWeekKey, currentUser]);

  useEffect(() => {
    localStorage.setItem("familie-eten:recipes", JSON.stringify(recipeList));
  }, [recipeList]);

  // Discard the unsaved local change and load the latest version from the server.
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

  const selectedWeekPlanData = selectedWeekPlan ?? emptyWeek();

  const applySelectedWeekPlanUpdate = (updater) => {
    updateSelectedWeekPlan(updater);
  };

  const deleteRecipe = (id) => {
    setRecipeList((prev) => prev.filter((r) => r.id !== id));
  };

  const assignMeal = (day, member, recipeId) => {
    applySelectedWeekPlanUpdate((prev) => ({
      ...prev,
      [day]: { ...prev[day], [member]: recipeId },
    }));
  };

  const clearMeal = (day, member) => assignMeal(day, member, null);

  const handleWeekChange = (nextWeekOffset) => {
    if (nextWeekOffset === weekOffset) return;
    setWeekPlanLoaded(false);
    setWeekOffset(nextWeekOffset);
  };

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
    localStorage.removeItem(AUTH_USER_KEY);
    setLoginError("");
  };

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

  if (!weekPlanLoaded) {
    return (
      <div className="app login-screen">
        <main className="login-card">
          <h1>🍽️ Familie Eten</h1>
          <p className="subtitle">Weekplanner laden…</p>
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
        {tab === "recipes" && <RecipeLibrary recipes={recipeList} onDelete={deleteRecipe} />}
        {tab === "shopping" && (
          <ShoppingList weekPlan={selectedWeekPlanData} recipes={recipeList} family={FAMILY} days={DAYS} />
        )}
      </main>
    </div>
  );
}
