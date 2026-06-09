import { useState, useMemo } from "react";
import { getIsoWeekInfo, getMondayOfWeek } from "../week";

const MEMBER_COLORS = {
  Papa: "#4a90d9",
  Mama: "#e8739a",
  Inga: "#7bc67e",
  Kevin: "#f4a261",
};

// Proteins/categories to watch for repetition, in priority order
const VARIETY_RULES = [
  { label: "kip",      keywords: ["kip", "chicken", "kipfilet", "kipstuk"],       threshold: 3 },
  { label: "rund",     keywords: ["rund", "beef", "steak", "gehakt", "biefstuk", "boeuf"], threshold: 3 },
  { label: "vis",      keywords: ["vis", "zalm", "tonijn", "zalmfilet"],           threshold: 3 },
  { label: "garnalen", keywords: ["garnalen", "shrimp", "garnaal"],               threshold: 2 },
  { label: "pasta",    keywords: ["pasta", "spaghetti", "lasagne", "penne", "tagliatelle", "vermicelli"], threshold: 2 },
  { label: "rijst",    keywords: ["rijst", "sushirijst", "risotto", "jasmijnrijst"], threshold: 3 },
];

const NL_MONTHS = [
  "januari","februari","maart","april","mei","juni",
  "juli","augustus","september","oktober","november","december",
];

function formatWeekRange(offset) {
  const monday = getMondayOfWeek(offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const d1 = monday.getDate();
  const d2 = sunday.getDate();
  const m1 = NL_MONTHS[monday.getMonth()];
  const m2 = NL_MONTHS[sunday.getMonth()];
  const y = sunday.getFullYear();

  if (monday.getMonth() === sunday.getMonth()) {
    return `${d1} — ${d2} ${m1} ${y}`;
  }
  return `${d1} ${m1} — ${d2} ${m2} ${y}`;
}

function getWeekLabel(offset) {
  const { week, year } = getIsoWeekInfo(offset);
  return `Week ${week} · ${year}`;
}

// Get the date for a specific day index (0=Mon) within the offset week
function getDayDate(offset, dayIndex) {
  const monday = getMondayOfWeek(offset);
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayIndex);
  return d.getDate();
}

function computeWarnings(days, weekPlan, recipes) {
  // Count how many unique recipe-days contain each category
  const categoryCounts = {}; // label -> Set of days
  const categoryDays = {};   // label -> [day names]

  days.forEach((day) => {
    // Collect unique recipe IDs planned this day (across all members)
    const dayRecipeIds = new Set(
      Object.values(weekPlan[day] ?? {}).filter(Boolean)
    );

    dayRecipeIds.forEach((id) => {
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe) return;
      const searchText = [recipe.name, ...(recipe.tags ?? [])].join(" ").toLowerCase();

      VARIETY_RULES.forEach(({ label, keywords }) => {
        if (keywords.some((kw) => searchText.includes(kw))) {
          if (!categoryCounts[label]) { categoryCounts[label] = new Set(); categoryDays[label] = []; }
          if (!categoryCounts[label].has(day)) {
            categoryCounts[label].add(day);
            categoryDays[label].push(day);
          }
        }
      });
    });
  });

  return VARIETY_RULES
    .filter(({ label, threshold }) => (categoryCounts[label]?.size ?? 0) >= threshold)
    .map(({ label, threshold }) => {
      const affectedDays = categoryDays[label];
      // Suggest swapping the last occurrence
      const swapDay = affectedDays[affectedDays.length - 1];
      return {
        label,
        count: categoryCounts[label].size,
        threshold,
        swapDay,
      };
    });
}

export default function WeekPlanner({ days, family, weekPlan, weekOffset, onWeekChange, recipes, onAssign, onClear, saveFailed, onReloadWeekPlan }) {
  const [selecting, setSelecting] = useState(null);

  const getRecipe = (id) => recipes.find((r) => r.id === id);

  const handleSelect = (recipeId) => {
    if (!selecting) return;
    onAssign(selecting.day, selecting.member, recipeId);
    setSelecting(null);
  };

  const warnings = useMemo(
    () => computeWarnings(days, weekPlan, recipes),
    [days, weekPlan, recipes]
  );

  return (
    <div className="week-planner">
      {/* Week selector */}
      <div className="week-nav">
        <button className="week-arrow" onClick={() => onWeekChange(weekOffset - 1)} title="Vorige week">‹</button>
        <div className="week-label-group">
          <span className="week-relative">{getWeekLabel(weekOffset)}</span>
          <span className="week-dates">{formatWeekRange(weekOffset)}</span>
        </div>
        <button className="week-arrow" onClick={() => onWeekChange(weekOffset + 1)} title="Volgende week">›</button>
        {weekOffset !== 0 && (
          <button className="week-today-btn" onClick={() => onWeekChange(0)}>Vandaag</button>
        )}
      </div>

      {/* Save conflict notice */}
      {saveFailed && (
        <div className="save-failed-banner" role="alert">
          <span className="warning-icon">⚠️</span>
          <span>
            <strong>Niet opgeslagen</strong> — iemand anders wijzigde deze week tegelijk. Je wijziging staat nog op het scherm maar is niet bewaard.
          </span>
          {onReloadWeekPlan && (
            <button className="save-failed-reload" onClick={onReloadWeekPlan}>
              Laad de laatste versie
            </button>
          )}
        </div>
      )}

      {/* Variety warnings */}
      {warnings.length > 0 && (
        <div className="variety-warnings">
          {warnings.map((w) => (
            <div key={w.label} className="variety-warning">
              <span className="warning-icon">⚠️</span>
              <span>
                <strong>Veel {w.label} deze week</strong> ({w.count}×) —{" "}
                overweeg iets anders op <strong>{w.swapDay}</strong>
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="hint">Klik op een vakje om een maaltijd te kiezen voor elk gezinslid.</p>

      <div className="planner-grid">
        <div className="grid-header">
          <div className="corner-cell"></div>
          {family.map((m) => (
            <div key={m} className="member-header" style={{ borderBottom: `3px solid ${MEMBER_COLORS[m]}` }}>
              <span className="member-emoji">{memberEmoji(m)}</span> {m}
            </div>
          ))}
        </div>

        {days.map((day, idx) => (
          <div key={day} className="grid-row">
            <div className="day-label">
              <span className="day-name">{day}</span>
              <span className="day-date">{getDayDate(weekOffset, idx)}</span>
            </div>
            {family.map((member) => {
              const dayPlan = weekPlan?.[day] ?? {};
              const recipeId = dayPlan[member] ?? null;
              const recipe = recipeId ? getRecipe(recipeId) : null;
              const isSelecting = selecting?.day === day && selecting?.member === member;

              return (
                <div
                  key={member}
                  className={`meal-cell ${isSelecting ? "selecting" : ""} ${recipe ? "filled" : "empty"}`}
                  style={{ borderColor: isSelecting ? MEMBER_COLORS[member] : undefined }}
                  onClick={() => setSelecting({ day, member })}
                >
                  {recipe ? (
                    <div className="meal-tag">
                      <span>{recipe.emoji}</span>
                      <span className="meal-name">{recipe.name}</span>
                      <button
                        className="clear-btn"
                        onClick={(e) => { e.stopPropagation(); onClear(day, member); }}
                        title="Verwijder"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span className="add-hint">+ Kies maaltijd</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selecting && (
        <div className="recipe-picker-overlay" onClick={() => setSelecting(null)}>
          <div className="recipe-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>
                Kies maaltijd voor <strong>{selecting.member}</strong> op <strong>{selecting.day}</strong>
              </h3>
              <button className="close-btn" onClick={() => setSelecting(null)}>×</button>
            </div>
            <div className="picker-grid">
              {recipes.filter((r) => !r.archived).map((r) => (
                <button
                  key={r.id}
                  className="picker-card"
                  onClick={() => handleSelect(r.id)}
                >
                  <span className="picker-emoji">{r.emoji}</span>
                  <span className="picker-name">{r.name}</span>
                  <div className="picker-tags">
                    {r.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function memberEmoji(name) {
  return { Papa: "👨", Mama: "👩", Inga: "👧", Kevin: "👦" }[name] ?? "👤";
}
