import { useState, useMemo, useRef } from "react";
import { getMondayOfWeek } from "../week";
import { tagClass, PICKER_FILTERS, matchesFilter } from "../utils/tagColors";
import { useLanguage } from "../useLanguage";
import { getRecipeName, translateTag } from "../utils/recipeTranslation";

const MEMBER_COLORS = {
  Papa: "#2a9d8f",
  Mama: "#fc7600",
  Inga: "#5cb85c",
  Kevin: "#e8c247",
};

const MEMBER_INITIALS = { Papa: "N", Mama: "L", Inga: "I", Kevin: "K" };

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
    .map(({ key }) => ({
      key,
      count: counts[key].size,
      swapDay: dayLists[key][dayLists[key].length - 1],
    }));
}

export default function WeekPlanner({ days, family, weekPlan, weekOffset, onWeekChange, recipes, onAssign, onClear, saveFailed, onReloadWeekPlan, onViewRecipe }) {
  const { t, tDay, lang } = useLanguage();
  const [selecting, setSelecting] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const months = t("months");
  const monday = getMondayOfWeek(weekOffset);

  const SPECIAL_MEALS = [
    { id: -1, name: t("specialMeal1"), emoji: "🍱", tags: [], ingredients: [] },
    { id: -2, name: t("specialMeal2"), emoji: "🥡", tags: [], ingredients: [] },
    { id: -3, name: t("specialMeal3"), emoji: "🍽️", tags: [], ingredients: [] },
  ];

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

  const swipeRef = useRef(null);
  const swipeStartX = useRef(0);

  const onTouchStart = (e) => { swipeStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    if (Math.abs(dx) > 60) onWeekChange(weekOffset + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="week-planner" ref={swipeRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="week-nav">
        <span className="week-month-label">{months[monday.getMonth()]}</span>
      </div>

      {saveFailed && (
        <div className="save-failed-banner" role="alert">
          <span className="warning-icon">⚠️</span>
          <span>
            <strong>{t("notSaved")}</strong> — {t("conflictMsg")}
          </span>
          {onReloadWeekPlan && (
            <button className="save-failed-reload" onClick={onReloadWeekPlan}>
              {t("loadLatest")}
            </button>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="variety-warnings">
          {warnings.map((w) => (
            <div key={w.key} className="variety-warning">
              <span className="warning-icon">⚠️</span>
              <span>
                <strong>{t("varietyWarning", { label: t("filter_" + w.key) })}</strong> ({w.count}×) —{" "}
                {t("varietyHint", { day: tDay(w.swapDay) })}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="planner-grid">
        <div className="grid-header" style={{ gridTemplateColumns: `40px repeat(${family.length}, 1fr)` }}>
          <div className="corner-cell"></div>
          {family.map((m) => (
            <div key={m} className="member-header" style={{ borderBottom: `3px solid ${MEMBER_COLORS[m]}` }}>
              {MEMBER_INITIALS[m] || m[0]}
            </div>
          ))}
        </div>

        {days.map((day, idx) => {
          const cellDate = new Date(monday);
          cellDate.setDate(monday.getDate() + idx);
          return (
          <div key={day} className="grid-row" style={{ gridTemplateColumns: `40px repeat(${family.length}, 1fr)` }}>
            <div className="day-letter">
              <span className="day-abbr">{tDay(day).slice(0, 2)}</span>
              <span className="day-num">{cellDate.getDate()}</span>
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
                    <>
                      <button
                        className="clear-btn"
                        onClick={(e) => { e.stopPropagation(); onClear(day, member); }}
                        title={t("removeMeal")}
                      >×</button>
                      <div className="meal-tag">
                        <span>{recipe.emoji}</span>
                        <span className="meal-name">{getRecipeName(recipe, lang)}</span>
                      </div>
                    </>
                  ) : isDayLocked ? null : (
                    <span className="add-hint">+</span>
                  )}
                </div>
              );
            })}
          </div>
          );
        })}
      </div>

      {selecting && (() => {
        const currentId = weekPlan?.[selecting.day]?.[selecting.member] ?? null;
        const isReplacing = Boolean(currentId && getRecipe(currentId));
        const q = pickerSearch.toLowerCase();
        const visibleRecipes = recipes
          .filter((r) => !r.archived)
          .filter((r) => !q || getRecipeName(r, lang).toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)))
          .sort((a, b) => (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0));
        return (
          <div className="recipe-picker-overlay" onClick={() => setSelecting(null)}>
            <div className="recipe-picker" onClick={(e) => e.stopPropagation()}>
              <div className="picker-header">
                <h3>
                  {isReplacing ? t("replaceMeal") : t("chooseMeal")}{" "}
                  {t("mealFor", { day: tDay(selecting.day) })}
                </h3>
                <button className="close-btn" onClick={() => setSelecting(null)}>×</button>
              </div>

              <div className="picker-search">
                <input
                  type="text"
                  className="picker-search-input"
                  placeholder={t("search") + "..."}
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="picker-grid">
                {SPECIAL_MEALS.filter((s) => !q || s.name.toLowerCase().includes(q)).map((s) => {
                  const isCurrent = s.id === currentId;
                  return (
                    <button key={s.id} className={`picker-card${isCurrent ? " picker-card--current" : ""}`} onClick={() => handleSelect(s.id)}>
                      <span className="picker-emoji">{s.emoji}</span>
                      <span className="picker-name">{s.name}</span>
                      {isCurrent && <span className="picker-current-label">{t("currentLabel")}</span>}
                    </button>
                  );
                })}
                {visibleRecipes.map((r) => {
                  const isCurrent = r.id === currentId;
                  return (
                    <button key={r.id} className={`picker-card${isCurrent ? " picker-card--current" : ""}`} onClick={() => handleSelect(r.id)}>
                      <span className="picker-emoji">{r.emoji}</span>
                      <span className="picker-name">{getRecipeName(r, lang)}</span>
                      {isCurrent && <span className="picker-current-label">{t("currentLabel")}</span>}
                    </button>
                  );
                })}
                {visibleRecipes.length === 0 && SPECIAL_MEALS.filter((s) => !q || s.name.toLowerCase().includes(q)).length === 0 && (
                  <p className="picker-empty">{t("noRecipesCategory")}</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

