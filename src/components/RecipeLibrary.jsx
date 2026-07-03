import { useState, useEffect, useCallback, useRef } from "react";
import { tagClass } from "../utils/tagColors";
import { useLanguage } from "../useLanguage";
import { getRecipeName, getIngredientName, getInstructions, translateTag, translateUnit } from "../utils/recipeTranslation";

const UNIT_OPTIONS = [
  { value: "g",        nl: "gram",     en: "gram",    ru: "г"          },
  { value: "kg",       nl: "kg",       en: "kg",      ru: "кг"         },
  { value: "ml",       nl: "ml",       en: "ml",      ru: "мл"         },
  { value: "dl",       nl: "dl",       en: "dl",      ru: "дл"         },
  { value: "l",        nl: "l",        en: "l",       ru: "л"          },
  { value: "el",       nl: "el",       en: "tbsp",    ru: "ст.л."      },
  { value: "tl",       nl: "tl",       en: "tsp",     ru: "ч.л."       },
  { value: "mespunt",  nl: "mespunt",  en: "pinch",   ru: "щепотка"    },
  { value: "scheutje", nl: "scheutje", en: "dash",    ru: "немного"    },
  { value: "stuks",    nl: "stuks",    en: "pcs",     ru: "шт."        },
  { value: "blik",     nl: "blik",     en: "can",     ru: "банка"      },
  { value: "pakje",    nl: "pakje",    en: "packet",  ru: "пачка"      },
  { value: "potje",    nl: "potje",    en: "jar",     ru: "банка"      },
  { value: "kuipje",   nl: "kuipje",   en: "tub",     ru: "стак."      },
  { value: "teen",     nl: "teen",     en: "clove",   ru: "зубчик"     },
  { value: "bos",      nl: "bos",      en: "bunch",   ru: "пучок"      },
  { value: "krop",     nl: "krop",     en: "head",    ru: "кочан"      },
  { value: "plak",     nl: "plak",     en: "slice",   ru: "ломтик"     },
];

const FOOD_EMOJIS = [
  "🥩","🍗","🐟","🦐","🥚","🥓",
  "🧀","🥛","🧄","🧅","🥦","🥕",
  "🍅","🥔","🌽","🥑","🍋","🫒",
  "🍝","🍜","🍚","🍳","🥘","🫕",
  "🍔","🍣","🥧","🫙","🥗","🍱",
  "🍽️","🥡","🍤","🍄","🥖","🧆",
];

function unitLabel(u, lang) {
  return lang === "en" ? u.en : lang === "ru" ? u.ru : u.nl;
}

function newRecipeTemplate() {
  return {
    id: Date.now(),
    name: "",
    emoji: "🍽️",
    addedBy: "",
    servings: 4,
    cookTime: "",
    tags: [],
    ingredients: [{ name: "", amount: "", unit: "" }],
    instructions: [],
    archived: false,
  };
}

export default function RecipeLibrary({ recipes, onAdd, onDelete, onUpdate, saveFailed, onDismissSaveFailed, searchQuery = "", editListMode, showArchived, newRecipeKey, viewRecipe, onViewRecipe, editViewedKey, days, plannedDays, lockedDays, onPlanRecipe }) {
  const { t, tDay, lang } = useLanguage();
  const [confirmId, setConfirmId] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);

  useEffect(() => {
    if (newRecipeKey > 0) setEditingRecipe(newRecipeTemplate());
  }, [newRecipeKey]);

  useEffect(() => {
    if (editViewedKey > 0 && viewRecipe) setEditingRecipe(viewRecipe);
  }, [editViewedKey]);

  const activeRecipes = recipes.filter((r) => !r.archived);
  const archivedRecipes = recipes.filter((r) => r.archived);

  const filtered = activeRecipes.filter((r) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) ||
      getRecipeName(r, lang).toLowerCase().includes(q) ||
      r.tags.some((tag) => tag.toLowerCase().includes(q) || translateTag(tag, lang).toLowerCase().includes(q));
  }).sort((a, b) => (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0));

  const confirmRecipe = recipes.find((r) => r.id === confirmId);

  const handleDeleteClick = (e, id) => { e.stopPropagation(); setConfirmId(id); };
  const handleConfirm = (e) => {
    e.stopPropagation();
    onDelete(confirmId);
    setConfirmId(null);
  };
  const handleCancel = (e) => { e.stopPropagation(); setConfirmId(null); };

  const handleSaveEdit = (updated) => {
    const isNew = !recipes.some((r) => r.id === updated.id);
    if (isNew) onAdd(updated);
    else onUpdate(updated);
    setEditingRecipe(null);
  };

  if (viewRecipe) {
    return (
      <LibraryRecipeDetail
        recipe={recipes.find((r) => r.id === viewRecipe.id) ?? viewRecipe}
        lang={lang}
        t={t}
        tDay={tDay}
        editingRecipe={editingRecipe}
        onEdit={() => setEditingRecipe(viewRecipe)}
        onSaveEdit={handleSaveEdit}
        onCloseEdit={() => setEditingRecipe(null)}
        days={days}
        plannedDays={plannedDays}
        lockedDays={lockedDays}
        onPlanRecipe={onPlanRecipe}
      />
    );
  }

  return (
    <div className="recipe-library">
      {saveFailed && (
        <div className="save-failed-banner" role="alert">
          <span className="warning-icon">⚠️</span>
          <span>
            <strong>{t("notSaved")}</strong> — {t("conflictMsg")}
          </span>
          <button className="save-failed-reload" onClick={onDismissSaveFailed}>{t("refresh")}</button>
        </div>
      )}


      {showArchived ? (
        <div className="recipe-grid">
          {archivedRecipes.length === 0 && (
            <p className="no-results">{t("noArchivedRecipes")}</p>
          )}
          {archivedRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggle={() => onViewRecipe(recipe)}
              onEdit={(e) => { e.stopPropagation(); setEditingRecipe(recipe); }}
              onDelete={(e) => handleDeleteClick(e, recipe.id)}
              onRestore={() => onUpdate({ ...recipe, archived: false })}
              dimmed
              editMode={editListMode}
            />
          ))}
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onToggle={() => onViewRecipe(recipe)}
              onEdit={(e) => { e.stopPropagation(); setEditingRecipe(recipe); }}
              onDelete={() => onUpdate({ ...recipe, archived: true })}
              onFavourite={() => onUpdate({ ...recipe, favourite: !recipe.favourite })}
              editMode={editListMode}
            />
          ))}
          {filtered.length === 0 && (
            <p className="no-results">{t("noRecipesFound")}</p>
          )}
        </div>
      )}

      {editingRecipe && (
        <EditRecipeModal
          recipe={editingRecipe}
          isNew={!recipes.some((r) => r.id === editingRecipe.id)}
          onSave={handleSaveEdit}
          onClose={() => setEditingRecipe(null)}
        />
      )}

      {confirmId && confirmRecipe && (
        <div className="confirm-overlay" onClick={handleCancel}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="confirm-emoji">{confirmRecipe.emoji}</span>
            <h3>{t("deleteTitle")}</h3>
            <p>{t("deleteMsg", { name: confirmRecipe.name })}</p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={handleCancel}>{t("cancel")}</button>
              <button className="btn-delete" onClick={handleConfirm}>{t("confirmDelete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LibraryRecipeDetail({ recipe, lang, t, tDay, editingRecipe, onSaveEdit, onCloseEdit, days, plannedDays, lockedDays, onPlanRecipe }) {
  const [doneSteps, setDoneSteps] = useState({});
  const steps = getInstructions(recipe, lang);
  const doneCount = Object.values(doneSteps).filter(Boolean).length;
  const toggleStep = (idx) => setDoneSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <div className="lib-detail">
      <div className="lib-detail-hero">
        <span className="lib-detail-emoji">{recipe.emoji}</span>
        <div className="lib-detail-meta">
          {recipe.cookTime && <span>⏱ {recipe.cookTime}</span>}
          {recipe.cookTime && <span className="lib-detail-dot">·</span>}
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: "-2px", marginRight: "3px"}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>{recipe.servings} pers.</span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="lib-detail-tags">
            {recipe.tags.map((tag) => <span key={tag} className={`tag ${tagClass(tag)}`}>{translateTag(tag, lang)}</span>)}
          </div>
        )}
      </div>

      {days && onPlanRecipe && (
        <section className="lib-detail-plan">
          <h2 className="lib-detail-section-title">{t("planForDay")}</h2>
          <div className="lib-detail-day-chips">
            {days.map((day) => {
              const active = plannedDays?.includes(day);
              // Same rule as the planner grid: a day claimed by another family
              // member is locked — you can only unassign your own choice.
              const locked = !active && lockedDays?.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  className={`lib-detail-day-chip${active ? " lib-detail-day-chip--active" : ""}`}
                  disabled={locked}
                  onClick={() => onPlanRecipe(day, active ? null : recipe.id)}
                >
                  {tDay(day).slice(0, 2)}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="lib-detail-body">
        <section className="lib-detail-section">
          <h2 className="lib-detail-section-title">{t("sectionIngredients")}</h2>
          <ul className="lib-detail-ing-list">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="lib-detail-ing-row">
                {(ing.amount || ing.unit) && <span className="lib-detail-ing-amount">{ing.amount}{ing.unit ? ` ${translateUnit(ing.unit, lang)}` : ""}</span>}
                <span className="lib-detail-ing-name">{getIngredientName(recipe, i, lang)}</span>
              </li>
            ))}
          </ul>
        </section>

        {steps.length > 0 && (
          <section className="lib-detail-section">
            <div className="lib-detail-steps-header">
              <h2 className="lib-detail-section-title">{t("sectionInstructions")}</h2>
              <span className="lib-detail-progress">
                {doneCount}/{steps.length}
              </span>
            </div>
            <ol className="lib-detail-steps">
              {steps.map((step, idx) => {
                const done = !!doneSteps[idx];
                return (
                  <li key={idx} className={`lib-detail-step${done ? " lib-detail-step--done" : ""}`} onClick={() => toggleStep(idx)}>
                    <div className="lib-detail-step-badge">
                      {done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : idx + 1}
                    </div>
                    <p className="lib-detail-step-text">{step}</p>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>

      {editingRecipe && (
        <EditRecipeModal recipe={editingRecipe} isNew={false} onSave={onSaveEdit} onClose={onCloseEdit} />
      )}
    </div>
  );
}

function RecipeCard({ recipe, onToggle, onEdit, onDelete, onFavourite, onRestore, dimmed, editMode }) {
  const { t, lang } = useLanguage();
  return (
    <div className={`recipe-card${dimmed ? " recipe-card--archived" : ""}${editMode ? " recipe-card--edit-mode" : ""}`}>
      {editMode && (
        <button className="rc-minus-btn" onClick={(e) => { e.stopPropagation(); onDelete(e); }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#c0392b" fillOpacity="0.5" stroke="none"/><line x1="8" y1="12" x2="16" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg></button>
      )}
      <div className="rc-card-body" onClick={(e) => { if (editMode) onEdit(e); else onToggle(); }}>
        <div className="rc-header">
          <span className="rc-emoji">{recipe.emoji}</span>
          <span className="rc-title">{getRecipeName(recipe, lang)}</span>
          {!dimmed && onFavourite && (
            <button
              className={`rc-fav-btn${recipe.favourite ? " rc-fav-btn--on" : ""}`}
              onClick={(e) => { e.stopPropagation(); onFavourite(); }}
              title={recipe.favourite ? "Verwijder favoriet" : "Favoriet"}
            >
              {recipe.favourite ? "★" : "☆"}
            </button>
          )}
          {dimmed && onRestore && (
            <button
              className="rc-fav-btn"
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              title={t("restoreRecipe")}
            >
              ↺
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="emoji-picker-wrap">
      <button
        type="button"
        className="emoji-picker-trigger"
        onClick={() => setOpen((o) => !o)}
        title="Choose emoji"
      >
        <span className="emoji-picker-current">{value}</span>
        <span className="emoji-picker-caret">▾</span>
      </button>
      {open && (
        <div className="emoji-picker-grid">
          {FOOD_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              className={`emoji-option${value === em ? " selected" : ""}`}
              onClick={() => { onChange(em); setOpen(false); }}
            >
              {em}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EditRecipeModal({ recipe, onSave, onClose, isNew }) {
  const { t, lang } = useLanguage();
  const [name, setName] = useState(recipe.name);
  const [emoji, setEmoji] = useState(recipe.emoji);
  const [cookTime, setCookTime] = useState(recipe.cookTime);
  const [servings, setServings] = useState(String(recipe.servings));
  const [addedBy, setAddedBy] = useState(recipe.addedBy ?? "");
  const [tags, setTags] = useState(recipe.tags.join(", "));
  const [ingredients, setIngredients] = useState(recipe.ingredients.map((i) => ({ ...i })));
  const [instructions, setInstructions] = useState(recipe.instructions ?? []);

  // Refs for Enter-to-advance
  const nameRef = useRef(null);
  const cookTimeRef = useRef(null);
  const servingsRef = useRef(null);
  const addedByRef = useRef(null);
  const tagsRef = useRef(null);
  const ingNameRefs = useRef([]);
  const ingUnitRefs = useRef([]);
  const ingAmountRefs = useRef([]);

  // Auto-focus name on open
  useEffect(() => { nameRef.current?.focus(); }, []);

  const advance = (ref) => (e) => {
    if (e.key === "Enter") { e.preventDefault(); ref?.current?.focus(); }
  };

  const updateIngredient = (idx, field, value) =>
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );

  const addIngredient = useCallback(() => {
    setIngredients((prev) => {
      const next = [...prev, { name: "", amount: "", unit: "" }];
      // Focus the new name field after render
      setTimeout(() => ingNameRefs.current[next.length - 1]?.focus(), 0);
      return next;
    });
  }, []);

  const removeIngredient = (idx) =>
    setIngredients((prev) => prev.filter((_, i) => i !== idx));

  const addInstruction = () => setInstructions((prev) => [...prev, ""]);
  const updateInstruction = (idx, value) =>
    setInstructions((prev) => prev.map((s, i) => (i === idx ? value : s)));
  const removeInstruction = (idx) =>
    setInstructions((prev) => prev.filter((_, i) => i !== idx));

  // Enter on amount of last row → add new ingredient row
  const onAmountEnter = (idx) => (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (idx === ingredients.length - 1) addIngredient();
      else ingNameRefs.current[idx + 1]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { nameRef.current?.focus(); return; }
    onSave({
      ...recipe,
      name: name.trim(),
      emoji,
      cookTime: cookTime.trim(),
      servings: Math.max(1, parseInt(servings, 10) || recipe.servings),
      addedBy: addedBy.trim(),
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      ingredients: ingredients.filter((i) => i.name.trim()),
      instructions: instructions.map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="edit-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h3>{isNew ? t("newRecipeModal") : t("editRecipeModal")}</h3>
          <button className="close-btn" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        <form className="edit-form" onSubmit={handleSubmit}>
          <div className="edit-field-group">
            <div className="edit-field edit-field--emoji">
              <label>{t("fieldEmoji")}</label>
              <EmojiPicker value={emoji} onChange={setEmoji} />
            </div>
            <div className="edit-field edit-field--grow">
              <label>{t("fieldName")}</label>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => advance(cookTimeRef)(e)}
                placeholder={t("recipeNamePlaceholder")}
              />
            </div>
          </div>

          <div className="edit-field-group">
            <div className="edit-field">
              <label>{t("fieldCookTime")}</label>
              <input
                ref={cookTimeRef}
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                onKeyDown={(e) => advance(servingsRef)(e)}
                placeholder="25 min"
              />
            </div>
            <div className="edit-field edit-field--narrow">
              <label>{t("fieldServings")}</label>
              <input
                ref={servingsRef}
                type="text"
                inputMode="numeric"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                onKeyDown={(e) => advance(addedByRef)(e)}
              />
            </div>
            <div className="edit-field">
              <label>{t("fieldAddedBy")}</label>
              <input
                ref={addedByRef}
                value={addedBy}
                onChange={(e) => setAddedBy(e.target.value)}
                onKeyDown={(e) => advance(tagsRef)(e)}
              />
            </div>
          </div>

          <div className="edit-field">
            <label>
              {t("fieldTags")} <span className="edit-label-hint">{t("tagHint")}</span>
            </label>
            <input
              ref={tagsRef}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); ingNameRefs.current[0]?.focus(); }
              }}
              placeholder="kip, gezond, oven"
            />
          </div>

          <div className="edit-field">
            <label>{t("fieldIngredients")}</label>
            <div className="ingredients-edit-list">
              <div className="ingredient-edit-header">
                <span>{t("ingredientPlaceholder")}</span>
                <span>{t("unitHeader")}</span>
                <span>{t("amountPlaceholder")}</span>
              </div>
              {ingredients.map((ing, idx) => (
                <div key={idx} className="ingredient-edit-row">
                  <input
                    ref={(el) => (ingNameRefs.current[idx] = el)}
                    className="ing-edit-name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ingUnitRefs.current[idx]?.focus(); } }}
                    placeholder={t("ingredientPlaceholder")}
                  />
                  <select
                    ref={(el) => (ingUnitRefs.current[idx] = el)}
                    className="ing-edit-unit"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ingAmountRefs.current[idx]?.focus(); } }}
                  >
                    <option value="">—</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u.value} value={u.value}>{unitLabel(u, lang)}</option>
                    ))}
                  </select>
                  <input
                    ref={(el) => (ingAmountRefs.current[idx] = el)}
                    className="ing-edit-amount"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                    onKeyDown={onAmountEnter(idx)}
                    placeholder="0"
                    inputMode="decimal"
                  />
                  <button
                    type="button"
                    className="ing-remove-btn"
                    onClick={() => removeIngredient(idx)}
                    title={t("removeRow")}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="ing-add-btn" onClick={addIngredient}>
                {t("addIngredient")}
              </button>
            </div>
          </div>

          <div className="edit-field">
            <label>{t("fieldInstructions")} <span className="edit-label-hint">{t("instructionsHint")}</span></label>
            <div className="instructions-edit-list">
              {instructions.map((step, idx) => (
                <div key={idx} className="instruction-edit-row">
                  <span className="instruction-step-num">{idx + 1}</span>
                  <textarea
                    className="ins-edit-text"
                    value={step}
                    onChange={(e) => updateInstruction(idx, e.target.value)}
                    placeholder={t("stepPlaceholder", { n: idx + 1 })}
                    rows={2}
                  />
                  <button
                    type="button"
                    className="ing-remove-btn"
                    onClick={() => removeInstruction(idx)}
                    title={t("removeStep")}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="ing-add-btn" onClick={addInstruction}>
                {t("addStep")}
              </button>
            </div>
          </div>

          <div className="edit-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>{t("cancel")}</button>
            <button type="submit" className="btn-save">{t("save")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
