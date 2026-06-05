import { useState, useEffect } from "react";
import { recipes } from "./data/recipes";
import RecipeLibrary from "./components/RecipeLibrary";
import WeekPlanner from "./components/WeekPlanner";
import ShoppingList from "./components/ShoppingList";
import RoadmapModal from "./components/RoadmapModal";
import "./App.css";

const FAMILY = ["Papa", "Mama", "Inga", "Kevin"];
const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

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
  // allWeekPlans: { [weekOffset]: weekPlan }
  const [allWeekPlans, setAllWeekPlans] = useState(() => load("familie-eten:allWeekPlans", { 0: emptyWeek() }));
  const [recipeList, setRecipeList] = useState(() => load("familie-eten:recipes", recipes));

  // Migrate old single-week plan if it exists
  useEffect(() => {
    const old = localStorage.getItem("familie-eten:weekPlan");
    if (old) {
      try {
        const parsed = JSON.parse(old);
        setAllWeekPlans((prev) => ({ ...prev, 0: parsed }));
        localStorage.removeItem("familie-eten:weekPlan");
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("familie-eten:allWeekPlans", JSON.stringify(allWeekPlans));
  }, [allWeekPlans]);

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍽️ Familie Eten</h1>
        <p className="subtitle">Maaltijdplanner voor het hele gezin</p>
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
