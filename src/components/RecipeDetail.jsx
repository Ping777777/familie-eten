import { useState } from "react";
import { tagClass } from "../utils/tagColors";
import { useLanguage } from "../useLanguage";
import { getRecipeName, getIngredientName, getInstructions, translateTag, translateUnit } from "../utils/recipeTranslation";

const MEMBER_COLORS = {
  Papa: "#4a90d9",
  Mama: "#e8739a",
  Inga: "#7bc67e",
  Kevin: "#f4a261",
};

const PORTION_OPTIONS = [2, 4, 6, 8];
const INGREDIENTS_PREVIEW = 5;

function scaleAmount(amount, from, to) {
  if (!amount || from === to) return amount;
  const n = parseFloat(String(amount).replace(",", "."));
  if (isNaN(n)) return amount;
  const scaled = (n * to) / from;
  return scaled % 1 === 0 ? String(scaled) : parseFloat(scaled.toFixed(1)).toString();
}

export default function RecipeDetail({ recipe, day, member, onBack, onEdit }) {
  const { t, tDay, lang } = useLanguage();
  const [doneSteps, setDoneSteps] = useState({});
  const [servings, setServings] = useState(recipe?.servings ?? 4);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);

  if (!recipe) return null;

  const toggleStep = (idx) =>
    setDoneSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const steps = getInstructions(recipe, lang);
  const doneCount = Object.values(doneSteps).filter(Boolean).length;
  const baseServings = recipe.servings ?? 4;
  const ingredients = recipe.ingredients ?? [];
  const showAll = ingredientsExpanded || ingredients.length <= INGREDIENTS_PREVIEW;
  const visibleIngredients = showAll ? ingredients : ingredients.slice(0, INGREDIENTS_PREVIEW);

  return (
    <div className="recipe-detail">
      <div className="detail-topbar">
        <button className="detail-back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="detail-topbar-center">
          <span className="detail-topbar-title">{getRecipeName(recipe, lang)}</span>
          {(day || member) && (
            <span className="detail-topbar-ctx">
              {day && tDay(day)}{day && member && " · "}{member && <span style={{ color: MEMBER_COLORS[member] ?? "inherit" }}>{member}</span>}
            </span>
          )}
        </div>
        {onEdit && (
          <button className="detail-edit-btn" onClick={() => onEdit(recipe)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
        )}
      </div>

      <div className="detail-scroll">
        <div className="detail-hero">
          <span className="detail-hero-emoji">{recipe.emoji}</span>
          <div className="detail-meta-row">
            {recipe.cookTime && <span>⏱ {recipe.cookTime}</span>}
            {recipe.cookTime && recipe.addedBy && <span className="detail-meta-dot">·</span>}
            {recipe.addedBy && <span>✍ {recipe.addedBy}</span>}
          </div>
          {recipe.tags.length > 0 && (
            <div className="detail-tags">
              {recipe.tags.map((tag) => (
                <span key={tag} className={`tag ${tagClass(tag)}`}>{translateTag(tag, lang)}</span>
              ))}
            </div>
          )}
        </div>

        <div className="detail-body">
          <section className="detail-ingredients">
            <div className="detail-section-header">
              <h2 className="detail-section-title">{t("sectionIngredients")}</h2>
              <div className="detail-portions">
                {PORTION_OPTIONS.map((n) => (
                  <button
                    key={n}
                    className={`detail-portion-btn${servings === n ? " detail-portion-btn--active" : ""}`}
                    onClick={() => setServings(n)}
                  >{n}</button>
                ))}
              </div>
            </div>
            <ul className="detail-ing-list">
              {visibleIngredients.map((ing, i) => (
                <li key={i} className="detail-ing-row">
                  {(ing.amount || ing.unit) && (
                    <span className="detail-ing-amount">
                      {scaleAmount(ing.amount, baseServings, servings)}{ing.unit ? ` ${translateUnit(ing.unit, lang)}` : ""}
                    </span>
                  )}
                  <span className="detail-ing-name">{getIngredientName(recipe, i, lang)}</span>
                </li>
              ))}
            </ul>
            {ingredients.length > INGREDIENTS_PREVIEW && (
              <button className="detail-ing-toggle" onClick={() => setIngredientsExpanded((o) => !o)}>
                {ingredientsExpanded
                  ? t("hideIngredients")
                  : t("showAllIngredients", { n: ingredients.length - INGREDIENTS_PREVIEW })}
              </button>
            )}
          </section>

          <section className="detail-instructions">
            <div className="detail-steps-header">
              <h2 className="detail-section-title">{t("sectionInstructions")}</h2>
              {steps.length > 0 && (
                <span className={`detail-steps-progress${doneCount === steps.length ? " detail-steps-progress--done" : ""}`}>
                  {doneCount === steps.length
                    ? t("allDone")
                    : t("stepsProgress", { done: doneCount, total: steps.length })}
                </span>
              )}
            </div>
            {steps.length === 0 ? (
              <p className="detail-no-steps">{t("noSteps")}</p>
            ) : (
              <ol className="detail-steps">
                {steps.map((step, idx) => {
                  const done = !!doneSteps[idx];
                  return (
                    <li
                      key={idx}
                      className={`detail-step${done ? " detail-step--done" : ""}`}
                      onClick={() => toggleStep(idx)}
                    >
                      <div className="detail-step-badge">
                        {done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : idx + 1}
                      </div>
                      <p className="detail-step-text">{step}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
