import { useState, useEffect, useCallback } from "react";
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

export default function RecipeLibrary({ recipes, onAdd, onDelete, onUpdate, saveFailed, onDismissSaveFailed, searchOpen, editListMode, newRecipeKey }) {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);

  useEffect(() => {
    if (newRecipeKey > 0) setEditingRecipe(newRecipeTemplate());
  }, [newRecipeKey]);

  const activeRecipes = recipes.filter((r) => !r.archived);
  const archivedRecipes = recipes.filter((r) => r.archived);

  const allTags = [...new Set(activeRecipes.flatMap((r) => r.tags))].sort();

  const filtered = activeRecipes.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = r.name.toLowerCase().includes(q) ||
      getRecipeName(r, lang).toLowerCase().includes(q);
    const matchTag = !activeTag || r.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  const confirmRecipe = recipes.find((r) => r.id === confirmId);

  const handleDeleteClick = (e, id) => { e.stopPropagation(); setConfirmId(id); };
  const handleConfirm = (e) => {
    e.stopPropagation();
    onDelete(confirmId);
    setConfirmId(null);
    if (expanded === confirmId) setExpanded(null);
  };
  const handleCancel = (e) => { e.stopPropagation(); setConfirmId(null); };

  const handleEditClick = (e, recipe) => { e.stopPropagation(); setEditingRecipe(recipe); };
  const handleSaveEdit = (updated) => {
    const isNew = !recipes.some((r) => r.id === updated.id);
    if (isNew) onAdd(updated);
    else onUpdate(updated);
    setEditingRecipe(null);
  };

  const handleArchive = (e, recipe) => {
    e.stopPropagation();
    onUpdate({ ...recipe, archived: true });
    if (expanded === recipe.id) setExpanded(null);
  };
  const handleRestore = (e, recipe) => {
    e.stopPropagation();
    onUpdate({ ...recipe, archived: false });
  };

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

      {searchOpen && (
        <div className="library-search-panel">
          <div className="wa-search-bar">
            <svg className="wa-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="wa-search-input"
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button className="wa-search-clear" onClick={() => setSearch("")} aria-label="Wis zoekopdracht">
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      <div className="recipe-grid">
        {filtered.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            expanded={expanded === recipe.id}
            onToggle={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
            onEdit={(e) => handleEditClick(e, recipe)}
            onArchive={(e) => handleArchive(e, recipe)}
            onDelete={(e) => handleDeleteClick(e, recipe.id)}
            archiveBtn={{ label: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>, title: t("toArchive") }}
            editMode={editListMode}
          />
        ))}
        {filtered.length === 0 && (
          <p className="no-results">{t("noRecipesFound")}</p>
        )}
      </div>

      {archivedRecipes.length > 0 && (
        <div className="archive-section">
          <button className="archive-toggle" onClick={() => setArchiveOpen((o) => !o)}>
            <span>{t("archiveLabel")}</span>
            <span className="archive-count">{t("archiveCount", { n: archivedRecipes.length })}</span>
            <span className="archive-chevron">{archiveOpen ? "▲" : "▼"}</span>
          </button>
          {archiveOpen && (
            <div className="archive-body">
              <p className="archive-hint">{t("archiveHint")}</p>
              <div className="recipe-grid">
                {archivedRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    expanded={expanded === recipe.id}
                    onToggle={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                    onEdit={(e) => handleEditClick(e, recipe)}
                    onArchive={(e) => handleRestore(e, recipe)}
                    onDelete={(e) => handleDeleteClick(e, recipe.id)}
                    archiveBtn={{ label: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5.18"/></svg>, title: t("restore") }}
                    dimmed
                    editMode={editListMode}
                  />
                ))}
              </div>
            </div>
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

function RecipeCard({ recipe, expanded, onToggle, onEdit, onArchive, onDelete, archiveBtn, dimmed, editMode }) {
  const { t, lang } = useLanguage();
  const showExpanded = expanded && !editMode;
  return (
    <div className={`recipe-card${dimmed ? " recipe-card--archived" : ""}${editMode ? " recipe-card--edit-mode" : ""}`}>
      {editMode && (
        <button className="rc-minus-btn" onClick={(e) => { e.stopPropagation(); onDelete(e); }}>−</button>
      )}
      <div className="rc-card-body" onClick={(e) => { if (editMode) onEdit(e); else onToggle(); }}>
        <div className="rc-header">
          <span className="rc-emoji">{recipe.emoji}</span>
          <span className="rc-title">{getRecipeName(recipe, lang)}</span>
          <div className="rc-header-right">
            {recipe.cookTime && <span className="rc-time">{recipe.cookTime}</span>}
            <span className={`rc-chevron${showExpanded ? " rc-chevron--open" : ""}`}>›</span>
          </div>
        </div>
        <div className="rc-footer">
          <div className="rc-tags">
            {recipe.tags.map((tag) => (
              <span key={tag} className={`tag ${tagClass(tag)}`}>{translateTag(tag, lang)}</span>
            ))}
          </div>
        </div>
        {showExpanded && (
          <div className="recipe-expanded-body">
            <div className="recipe-ingredients">
              <h4>{t("expandedIngredients", { n: recipe.servings })}</h4>
              <ul>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>
                    <span className="ing-amount">{ing.amount} {translateUnit(ing.unit, lang)}</span>
                    <span className="ing-name">{getIngredientName(recipe, i, lang)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {recipe.instructions?.length > 0 && (
              <div className="recipe-instructions">
                <h4>{t("sectionInstructions")}</h4>
                <ol>
                  {getInstructions(recipe, lang).map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            <div className="rc-expanded-actions" onClick={(e) => e.stopPropagation()}>
              <button className="rc-expanded-btn" onClick={onEdit}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> {t("editRecipeBtn")}</button>
              <button className="rc-expanded-btn rc-expanded-btn--muted" onClick={onArchive}>{archiveBtn.label} {archiveBtn.title}</button>
            </div>
          </div>
        )}
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
          <button className="close-btn" onClick={onClose}>×</button>
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
