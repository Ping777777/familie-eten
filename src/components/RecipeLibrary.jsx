import { useState } from "react";
import { tagClass } from "../utils/tagColors";
import { useLanguage } from "../LanguageContext";
import { getRecipeName, getIngredientName, getInstructions, translateTag, translateUnit } from "../utils/recipeTranslation";

const UNIT_OPTIONS = [
  "g", "kg",
  "ml", "dl", "l",
  "el", "tl",
  "mespunt", "snuf", "scheutje",
  "stuks", "stukken",
  "blikje", "blik",
  "pakje", "pakjes",
  "potje", "potjes",
  "kuipje", "kuipjes",
  "kroppen", "teen", "bol", "bos",
  "plak",
];

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

export default function RecipeLibrary({ recipes, onAdd, onDelete, onUpdate, saveFailed }) {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

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
      <div className="library-header">
        <h2>{t("recipeLibrary")}</h2>
        <button className="btn-add-recipe" onClick={() => setEditingRecipe(newRecipeTemplate())}>
          {t("newRecipe")}
        </button>
      </div>

      {saveFailed && (
        <div className="save-failed-banner" role="alert">
          <span className="warning-icon">⚠️</span>
          <span>
            <strong>{t("saveFailedTitle")}</strong> — {t("saveFailedMsg")}
          </span>
        </div>
      )}

      <div className="library-controls">
        <input
          className="search-input"
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="tag-filters">
          <button
            className={`tag-filter ${!activeTag ? "active" : ""}`}
            onClick={() => setActiveTag(null)}
          >
            {t("filterAll")}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-filter ${activeTag === tag ? "active" : ""}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {translateTag(tag, lang)}
            </button>
          ))}
        </div>
      </div>

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
            archiveBtn={{ label: "📦", title: t("toArchive") }}
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
                    archiveBtn={{ label: "🔄", title: t("restore") }}
                    dimmed
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

function RecipeCard({ recipe, expanded, onToggle, onEdit, onArchive, onDelete, archiveBtn, dimmed }) {
  const { t, lang } = useLanguage();
  return (
    <div
      className={`recipe-card ${expanded ? "expanded" : ""} ${dimmed ? "recipe-card--archived" : ""}`}
      onClick={onToggle}
    >
      <div className="recipe-card-top">
        <span className="recipe-big-emoji">{recipe.emoji}</span>
        <div className="recipe-info">
          <h3>{getRecipeName(recipe, lang)}</h3>
          <div className="recipe-meta">⏱ {recipe.cookTime} · {t("perServings", { n: recipe.servings })}</div>
          <div className="recipe-tags">
            {recipe.tags.map((tag) => <span key={tag} className={`tag ${tagClass(tag)}`}>{translateTag(tag, lang)}</span>)}
          </div>
        </div>
        <div className="card-actions">
          <button className="card-action-btn" title={archiveBtn.title} onClick={onArchive}>
            {archiveBtn.label}
          </button>
          <button className="card-action-btn" title={t("editRecipeBtn")} onClick={onEdit}>
            ✏️
          </button>
          <button className="card-action-btn" title={t("deleteRecipeBtn")} onClick={onDelete}>
            🗑️
          </button>
          <span className="expand-icon">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
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
        </div>
      )}
    </div>
  );
}

function EditRecipeModal({ recipe, onSave, onClose, isNew }) {
  const { t } = useLanguage();
  const [name, setName] = useState(recipe.name);
  const [emoji, setEmoji] = useState(recipe.emoji);
  const [cookTime, setCookTime] = useState(recipe.cookTime);
  const [servings, setServings] = useState(String(recipe.servings));
  const [addedBy, setAddedBy] = useState(recipe.addedBy ?? "");
  const [tags, setTags] = useState(recipe.tags.join(", "));
  const [ingredients, setIngredients] = useState(recipe.ingredients.map((i) => ({ ...i })));
  const [instructions, setInstructions] = useState(recipe.instructions ?? []);

  const updateIngredient = (idx, field, value) =>
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );
  const addIngredient = () =>
    setIngredients((prev) => [...prev, { name: "", amount: "", unit: "" }]);
  const removeIngredient = (idx) =>
    setIngredients((prev) => prev.filter((_, i) => i !== idx));

  const addInstruction = () =>
    setInstructions((prev) => [...prev, ""]);
  const updateInstruction = (idx, value) =>
    setInstructions((prev) => prev.map((s, i) => (i === idx ? value : s)));
  const removeInstruction = (idx) =>
    setInstructions((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...recipe,
      name: name.trim() || recipe.name,
      emoji: emoji.trim() || recipe.emoji,
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
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
            </div>
            <div className="edit-field edit-field--grow">
              <label>{t("fieldName")}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>

          <div className="edit-field-group">
            <div className="edit-field">
              <label>{t("fieldCookTime")}</label>
              <input value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="25 min" />
            </div>
            <div className="edit-field edit-field--narrow">
              <label>{t("fieldServings")}</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min={1}
                max={20}
              />
            </div>
            <div className="edit-field">
              <label>{t("fieldAddedBy")}</label>
              <input value={addedBy} onChange={(e) => setAddedBy(e.target.value)} />
            </div>
          </div>

          <div className="edit-field">
            <label>
              {t("fieldTags")} <span className="edit-label-hint">{t("tagHint")}</span>
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="kip, gezond, oven"
            />
          </div>

          <div className="edit-field">
            <label>{t("fieldIngredients")}</label>
            <div className="ingredients-edit-list">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="ingredient-edit-row">
                  <input
                    className="ing-edit-amount"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                    placeholder={t("amountPlaceholder")}
                  />
                  <select
                    className="ing-edit-unit"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, "unit", e.target.value)}
                  >
                    <option value="">—</option>
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    className="ing-edit-name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                    placeholder={t("ingredientPlaceholder")}
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
