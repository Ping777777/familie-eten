import { useState } from "react";
import { recipes } from "./data/recipes";
import RecipeLibrary from "./components/RecipeLibrary";
import WeekPlanner from "./components/WeekPlanner";
import ShoppingList from "./components/ShoppingList";
import "./App.css";

const FAMILY = ["Papa", "Mama", "Inga", "Kevin"];
const DAYS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

const emptyWeek = () =>
  DAYS.reduce((acc, day) => {
    acc[day] = FAMILY.reduce((a, m) => { a[m] = null; return a; }, {});
    return acc;
  }, {});

export default function App() {
  const [tab, setTab] = useState("planner");
  const [weekPlan, setWeekPlan] = useState(emptyWeek());

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

      <main className="app-main">
        {tab === "planner" && (
          <WeekPlanner
            days={DAYS}
            family={FAMILY}
            weekPlan={weekPlan}
            recipes={recipes}
            onAssign={assignMeal}
            onClear={clearMeal}
          />
        )}
        {tab === "recipes" && <RecipeLibrary recipes={recipes} />}
        {tab === "shopping" && (
          <ShoppingList weekPlan={weekPlan} recipes={recipes} family={FAMILY} days={DAYS} />
        )}
      </main>
    </div>
  );
}
