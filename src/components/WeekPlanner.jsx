import { useState, useMemo, useRef } from "react";
import { getMondayOfWeek } from "../week";
import { tagClass, PICKER_FILTERS, matchesFilter } from "../utils/tagColors";
import { useLanguage } from "../useLanguage";
import { getRecipeName, translateTag } from "../utils/recipeTranslation";

const MEMBER_COLORS = {
  Neil: "#2a9d8f",
  Larisa: "#fc7600",
  Inga: "#5cb85c",
  Kevin: "#e8c247",
};

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
  const [pickerSearchOpen, setPickerSearchOpen] = useState(false);

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
    setSelecting(null); setPickerSearchOpen(false); setPickerSearch("");
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>
                {t("varietyWarning", { label: t("filter_" + w.key) })} ({w.count}×) — {t("varietyHint", { day: tDay(w.swapDay) })}
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
              {m}
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
              const isSelecting = selecting?.day === day && selecting?.member === member;

              return (
                <div
                  key={member}
                  className={`meal-cell ${isSelecting ? "selecting" : ""} ${recipe ? "filled" : "empty"}`}
                  style={{ borderColor: isSelecting ? MEMBER_COLORS[member] : undefined }}
                  onClick={() => {
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
                      ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      <div className="meal-tag">
                        <span>{recipe.emoji}</span>
                        <span className="meal-name">{getRecipeName(recipe, lang)}</span>
                      </div>
                    </>
                  ) : (
                    <span className="add-hint">+</span>
                  )}
                </div>
              );
            })}
          </div>
          );
        })}
      </div>

      <div className="week-summary">
        {days.map((day, idx) => {
          const meals = Object.entries(weekPlan?.[day] ?? {})
            .map(([member, id]) => ({ member, recipe: id ? getRecipe(id) : null }))
            .filter((m) => m.recipe);
          if (!meals.length) return null;
          const cellDate = new Date(monday);
          cellDate.setDate(monday.getDate() + idx);
          return (
            <div key={day} className="summary-day">
              <div className="summary-day-label">
                <span className="summary-day-name">{tDay(day)}</span>
                <span className="summary-day-date">{cellDate.getDate()}</span>
              </div>
              {meals.map(({ member, recipe }) => (
                <div key={member} className="summary-meal" onClick={() => recipe.id > 0 ? onViewRecipe(recipe.id, day, member) : null}>
                  <span className="summary-dot" style={{ background: MEMBER_COLORS[member] }} />
                  <span className="summary-emoji">{recipe.emoji}</span>
                  <span className="summary-name">{getRecipeName(recipe, lang)}</span>
                  <span className="summary-member">{member}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {selecting && (() => {
        const currentId = weekPlan?.[selecting.day]?.[selecting.member] ?? null;
        const isReplacing = Boolean(currentId && getRecipe(currentId));
        const usedIds = new Set(days.flatMap((d) => Object.values(weekPlan[d] ?? {})).filter(Boolean));
        const q = pickerSearch.toLowerCase();
        const visibleRecipes = recipes
          .filter((r) => !r.archived)
          .filter((r) => !q || getRecipeName(r, lang).toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)))
          .sort((a, b) => (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0));
        return (
          <div className="recipe-picker-overlay" onClick={() => { setSelecting(null); setPickerSearchOpen(false); setPickerSearch(""); }}>
            <div className="recipe-picker" onClick={(e) => e.stopPropagation()}>
              <div className="picker-header">
                {pickerSearchOpen ? (
                  <div className="header-search-bar" style={{ flex: 1 }}>
                    <svg className="header-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      type="text"
                      className="header-search-input"
                      placeholder={t("search")}
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      autoFocus
                    />
                    <button className="header-search-clear" onClick={() => { setPickerSearchOpen(false); setPickerSearch(""); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <h3>
                      {isReplacing ? t("replaceMeal") : t("chooseMeal")}{" "}
                      {t("mealFor", { day: tDay(selecting.day) })}
                    </h3>
                    <div className="header-pill-group">
                      <button className="header-pill-btn" onClick={() => setPickerSearchOpen(true)} title={t("search")}>
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </button>
                      <button className="header-pill-btn" onClick={() => { setSelecting(null); setPickerSearchOpen(false); setPickerSearch(""); }} title={t("close")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  </>
                )}
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
                  const isUsed = usedIds.has(r.id) && !isCurrent;
                  return (
                    <button key={r.id} className={`picker-card${isCurrent ? " picker-card--current" : ""}${isUsed ? " picker-card--used" : ""}`} onClick={() => handleSelect(r.id)}>
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

