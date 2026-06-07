import { useState, useEffect } from "react";
import { recipes } from "./data/recipes";
import RecipeLibrary from "./components/RecipeLibrary";
import WeekPlanner from "./components/WeekPlanner";
import ShoppingList from "./components/ShoppingList";
import RoadmapModal from "./components/RoadmapModal";
import "./App.css";

const FAMILY = ["Papa", "Mama", "Inga", "Kevin"];
const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const AUTH_USER_KEY = "familie-eten:user";

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
  // allWeekPlans: { [weekOffset]: weekPlan }
  const [allWeekPlans, setAllWeekPlans] = useState({ 0: emptyWeek() });
  const [weekPlanLoaded, setWeekPlanLoaded] = useState(false);
  const [recipeList, setRecipeList] = useState(() => load("familie-eten:recipes", recipes));

  // Load week plan from blob when user is logged in
  useEffect(() => {
    if (!currentUser) return;

    fetch("/api/week-plan")
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("Failed to load week plan");
        return res.json();
      })
      .then((data) => {
        if (data) setAllWeekPlans(data);
      })
      .catch(() => {})
      .finally(() => {
        setWeekPlanLoaded(true);
      });
  }, [currentUser]);

  // Save week plan to blob when it changes (debounced)
  useEffect(() => {
    if (!currentUser || !weekPlanLoaded) return;

    const timer = setTimeout(() => {
      fetch("/api/week-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allWeekPlans),
      }).catch(() => {});
    }, 1000);

    return () => clearTimeout(timer);
  }, [allWeekPlans, currentUser, weekPlanLoaded]);

  useEffect(() => {
    localStorage.setItem("familie-eten:recipes", JSON.stringify(recipeList));
  }, [recipeList]);

  const weekPlan = allWeekPlans[weekOffset] ?? emptyWeek();

  const setWeekPlan = (updater) => {
    setAllWeekPlans((prev) => ({
      ...prev,
      [weekOffset]: typeof updater === "function" ? updater(prev[weekOffset] ?? emptyWeek()) : updater,
    }));
  };

  const deleteRecipe = (id) => {
    setRecipeList((prev) => prev.filter((r) => r.id !== id));
    setAllWeekPlans((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((offset) => {
        DAYS.forEach((day) => {
          FAMILY.forEach((member) => {
            if (next[offset][day]?.[member] === id) {
              next[offset] = { ...next[offset], [day]: { ...next[offset][day], [member]: null } };
            }
          });
        });
      });
      return next;
    });
  };

  const assignMeal = (day, member, recipeId) => {
    setWeekPlan((prev) => ({
      ...prev,
      [day]: { ...prev[day], [member]: recipeId },
    }));
  };

  const clearMeal = (day, member) => assignMeal(day, member, null);

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
    setWeekPlanLoaded(false);
    setAllWeekPlans({ 0: emptyWeek() });
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
            weekPlan={weekPlan}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
            recipes={recipeList}
            onAssign={assignMeal}
            onClear={clearMeal}
          />
        )}
        {tab === "recipes" && <RecipeLibrary recipes={recipeList} onDelete={deleteRecipe} />}
        {tab === "shopping" && (
          <ShoppingList weekPlan={weekPlan} recipes={recipeList} family={FAMILY} days={DAYS} />
        )}
      </main>
    </div>
  );
}
