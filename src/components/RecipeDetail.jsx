import { useState } from "react";
import { tagClass } from "../utils/tagColors";
import { useLanguage } from "../useLanguage";
import { getRecipeName, getIngredientName, getInstructions, translateTag, translateUnit } from "../utils/recipeTranslation";

const MEMBER_COLORS = {
  Neil: "#4a90d9",
  Larisa: "#e8739a",
  Inga: "#7bc67e",
  Kevin: "#f4a261",
};

export default function RecipeDetail({ recipe, day, member, onBack }) {
  const { t, tDay, lang } = useLanguage();
  const [doneSteps, setDoneSteps] = useState({});

  if (!recipe) return null;

  const toggleStep = (idx) =>
    setDoneSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const steps = getInstructions(recipe, lang);
  const doneCount = Object.values(doneSteps).filter(Boolean).length;

  return (
    <div className="recipe-detail">
      <div className="detail-topbar">
        <button className="detail-back" onClick={onBack}>
          {t("backToPlanner")}
        </button>
        <div className="detail-ctx">
          <span className="detail-ctx-day">{tDay(day)}</span>
          <span className="detail-ctx-sep">·</span>
          <span
            className="detail-ctx-member"
            style={{ color: MEMBER_COLORS[member] ?? "inherit" }}
          >
            {member}
          </span>
        </div>
      </div>

      <div className="detail-scroll">
        <div className="detail-hero">
          <span className="detail-hero-emoji">{recipe.emoji}</span>
          <h1 className="detail-title">{getRecipeName(recipe, lang)}</h1>
          <div className="detail-meta-row">
            {recipe.cookTime && <span>⏱ {recipe.cookTime}</span>}
            {recipe.cookTime && <span className="detail-meta-dot">·</span>}
            <span>👥 {t("persons", { n: recipe.servings })}</span>
            {recipe.addedBy && (
              <>
                <span className="detail-meta-dot">·</span>
                <span>✍ {recipe.addedBy}</span>
              </>
            )}
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
            <h2 className="detail-section-title">{t("sectionIngredients")}</h2>
            <ul className="detail-ing-list">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="detail-ing-row">
                  {(ing.amount || ing.unit) && (
                    <span className="detail-ing-amount">
                      {ing.amount}{ing.unit ? ` ${translateUnit(ing.unit, lang)}` : ""}
                    </span>
                  )}
                  <span className="detail-ing-name">{getIngredientName(recipe, i, lang)}</span>
                </li>
              ))}
            </ul>
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
