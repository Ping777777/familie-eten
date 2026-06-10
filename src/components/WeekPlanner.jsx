import { useState, useMemo } from "react";
import { getIsoWeekInfo, getMondayOfWeek } from "../week";
import { tagClass, PICKER_FILTERS, matchesFilter } from "../utils/tagColors";

const SPECIAL_MEALS = [
  { id: -1, name: "Restjes",             emoji: "🍱", tags: [], ingredients: [] },
  { id: -2, name: "Afhalen / Bezorging", emoji: "🥡", tags: [], ingredients: [] },
  { id: -3, name: "Uiteten",             emoji: "🍽️", tags: [], ingredients: [] },
];

const MEMBER_COLORS = {
  Papa: "#4a90d9",
  Mama: "#e8739a",
  Inga: "#7bc67e",
  Kevin: "#f4a261",
};

const NL_MONTHS = [
  "januari","februari","maart","april","mei","juni",
  "juli","augustus","september","oktober","november","december",
];

function computeWarnings(days, weekPlan, recipes) {
  const warningFilters = PICKER_FILTERS.filter((f) => f.threshold != null);
  const counts = {};
  const dayLists = {};
  days.forEach((day) => {
    const dayRecipeIds = new Set(Object.values(weekPlan[day] ?? {}).filter(Boolean));
    dayRecipeIds.forEach((id) => {
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe) return;
      warningFilters.forEach(({ key }) => {
        if (matchesFilter(recipe, key)) {
          if (!counts[key]) { counts[key] = new Set(); dayLists[key] = []; }
          if (!counts[key].has(day)) { counts[key].add(day); dayLists[key].push(day); }
        }
      });
    });
  });
  return warningFilters
    .filter(({ key, threshold }) => (counts[key]?.size ?? 0) >= threshold)
    .map(({ key, label }) => ({
      label,
      count: counts[key].size,
      swapDay: dayLists[key][dayLists[key].length - 1],
    }));
}

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

function getDayDate(offset, dayIndex) {
  const monday = getMondayOfWeek(offset);
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayIndex);
  return d.getDate();
}

export default function WeekPlanner({ days, family, weekPlan, weekOffset, onWeekChange, recipes, onAssign, onClear, saveFailed, onReloadWeekPlan, onViewRecipe }) {
  const [selecting, setSelecting] = useState(null);
  const [pickerFilter, setPickerFilter] = useState(null);

  const getRecipe = (id) =>
    recipes.find((r) => r.id === id) ?? SPECIAL_MEALS.find((s) => s.id === id) ?? null;

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
              const isDayLocked = !recipe && family.some((m) => m !== member && (dayPlan[m] ?? null));
              const isSelecting = selecting?.day === day && selecting?.member === member;

              return (
                <div
                  key={member}
                  className={`meal-cell ${isSelecting ? "selecting" : ""} ${recipe ? "filled" : isDayLocked ? "locked" : "empty"}`}
                  style={{ borderColor: isSelecting ? MEMBER_COLORS[member] : undefined }}
                  onClick={isDayLocked ? undefined : () => {
                    if (recipe && recipe.id > 0) {
                      onViewRecipe(recipe.id, day, member);
                    } else {
                      setSelecting({ day, member });
                    }
                  }}
                >
                  {recipe ? (
                    <div className="meal-tag">
                      <span>{recipe.emoji}</span>
                      <span className="meal-name">{recipe.name}</span>
                      <button
                        className="clear-btn"
                        onClick={(e) => { e.stopPropagation(); onClear(day, member); }}
                        title="Verwijder maaltijd"
                      >
                        ×
                      </button>
                      <button
                        className="meal-edit-btn"
                        title="Andere maaltijd kiezen"
                        onClick={(e) => { e.stopPropagation(); setSelecting({ day, member }); }}
                      >✎</button>
                    </div>
                  ) : isDayLocked ? null : (
                    <span className="add-hint">+ Kies maaltijd</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selecting && (() => {
        const currentId = weekPlan?.[selecting.day]?.[selecting.member] ?? null;
        const isReplacing = Boolean(currentId && getRecipe(currentId));
        const visibleRecipes = recipes
          .filter((r) => !r.archived)
          .filter((r) => matchesFilter(r, pickerFilter));
        return (
          <div className="recipe-picker-overlay" onClick={() => setSelecting(null)}>
            <div className="recipe-picker" onClick={(e) => e.stopPropagation()}>
              <div className="picker-header">
                <h3>
                  {isReplacing ? "Vervang maaltijd" : "Kies maaltijd"}{" "}
                  voor <strong>{selecting.day}</strong>
                </h3>
                <button className="close-btn" onClick={() => setSelecting(null)}>×</button>
              </div>

              <div className="picker-specials">
                {SPECIAL_MEALS.map((s) => {
                  const isCurrent = s.id === currentId;
                  return (
                    <button
                      key={s.id}
                      className={`picker-special-btn${isCurrent ? " picker-special-btn--current" : ""}`}
                      onClick={() => handleSelect(s.id)}
                    >
                      <span className="picker-special-emoji">{s.emoji}</span>
                      <span className="picker-special-name">{s.name}</span>
                      {isCurrent && <span className="picker-current-label">✓ Huidig</span>}
                    </button>
                  );
                })}
              </div>

              <div className="picker-filters">
                {PICKER_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`picker-filter-btn ${pickerFilter === f.key ? "active" : ""}`}
                    onClick={() => setPickerFilter(pickerFilter === f.key ? null : f.key)}
                  >
                    {f.emoji} {f.label}
                  </button>
                ))}
              </div>

              <div className="picker-grid">
                {visibleRecipes.length === 0 && (
                  <p className="picker-empty">Geen recepten in deze categorie.</p>
                )}
                {visibleRecipes.map((r) => {
                  const isCurrent = r.id === currentId;
                  return (
                    <button
                      key={r.id}
                      className={`picker-card ${isCurrent ? "picker-card--current" : ""}`}
                      onClick={() => handleSelect(r.id)}
                    >
                      <span className="picker-emoji">{r.emoji}</span>
                      <span className="picker-name">{r.name}</span>
                      {isCurrent && <span className="picker-current-label">✓ Huidig</span>}
                      <div className="picker-tags">
                        {r.tags.map((t) => (
                          <span key={t} className={`tag ${tagClass(t)}`}>{t}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function memberEmoji(name) {
  return { Papa: "👨", Mama: "👩", Inga: "👧", Kevin: "👦" }[name] ?? "👤";
}
