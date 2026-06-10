import { useState } from "react";
import { tagClass } from "../utils/tagColors";

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
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
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
        <h2>Receptenbibliotheek</h2>
        <button className="btn-add-recipe" onClick={() => setEditingRecipe(newRecipeTemplate())}>
          + Nieuw recept
        </button>
      </div>

      {saveFailed && (
        <div className="save-failed-banner" role="alert">
          <span className="warning-icon">⚠️</span>
          <span>
            <strong>Niet opgeslagen</strong> — er ging iets mis bij het bewaren.
            Ververs de pagina om de laatste versie te laden.
          </span>
        </div>
      )}

      <div className="library-controls">
        <input
          className="search-input"
          type="text"
          placeholder="🔍 Zoek recept..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="tag-filters">
          <button
            className={`tag-filter ${!activeTag ? "active" : ""}`}
            onClick={() => setActiveTag(null)}
          >
            Alle
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-filter ${activeTag === tag ? "active" : ""}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Active recipe grid */}
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
            archiveBtn={{ label: "📦", title: "Naar archief" }}
          />
        ))}
        {filtered.length === 0 && (
          <p className="no-results">Geen recepten gevonden.</p>
        )}
      </div>

      {/* Archive section */}
      {archivedRecipes.length > 0 && (
        <div className="archive-section">
          <button className="archive-toggle" onClick={() => setArchiveOpen((o) => !o)}>
            <span>📦 Archief</span>
            <span className="archive-count">{archivedRecipes.length} recepten</span>
            <span className="archive-chevron">{archiveOpen ? "▲" : "▼"}</span>
          </button>
          {archiveOpen && (
            <div className="archive-body">
              <p className="archive-hint">
                Seizoensrecepten en tijdelijk verborgen gerechten. Ze verschijnen niet in de weekplanner. Klik op 🔄 om een recept te herstellen.
              </p>
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
                    archiveBtn={{ label: "🔄", title: "Herstellen" }}
                    dimmed
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editingRecipe && (
        <EditRecipeModal
          recipe={editingRecipe}
          isNew={!recipes.some((r) => r.id === editingRecipe.id)}
          onSave={handleSaveEdit}
          onClose={() => setEditingRecipe(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmId && confirmRecipe && (
        <div className="confirm-overlay" onClick={handleCancel}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="confirm-emoji">{confirmRecipe.emoji}</span>
            <h3>Recept verwijderen?</h3>
            <p>
              Weet je zeker dat je <strong>{confirmRecipe.name}</strong> wilt
              verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={handleCancel}>Annuleren</button>
              <button className="btn-delete" onClick={handleConfirm}>Ja, verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared recipe card ────────────────────────────────────────────────────────
function RecipeCard({ recipe, expanded, onToggle, onEdit, onArchive, onDelete, archiveBtn, dimmed }) {
  return (
    <div
      className={`recipe-card ${expanded ? "expanded" : ""} ${dimmed ? "recipe-card--archived" : ""}`}
      onClick={onToggle}
    >
      <div className="recipe-card-top">
        <span className="recipe-big-emoji">{recipe.emoji}</span>
        <div className="recipe-info">
          <h3>{recipe.name}</h3>
          <div className="recipe-meta">⏱ {recipe.cookTime} · {recipe.servings} pers.</div>
          <div className="recipe-tags">
            {recipe.tags.map((t) => <span key={t} className={`tag ${tagClass(t)}`}>{t}</span>)}
          </div>
        </div>
        <div className="card-actions">
          <button className="card-action-btn" title={archiveBtn.title} onClick={onArchive}>
            {archiveBtn.label}
          </button>
          <button className="card-action-btn" title="Bewerk recept" onClick={onEdit}>
            ✏️
          </button>
          <button className="card-action-btn" title="Verwijder recept" onClick={onDelete}>
            🗑️
          </button>
          <span className="expand-icon">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="recipe-expanded-body">
          <div className="recipe-ingredients">
            <h4>Ingrediënten ({recipe.servings} personen)</h4>
            <ul>
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>
                  <span className="ing-amount">{ing.amount} {ing.unit}</span>
                  <span className="ing-name">{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
          {recipe.instructions?.length > 0 && (
            <div className="recipe-instructions">
              <h4>Bereidingswijze</h4>
              <ol>
                {recipe.instructions.map((step, i) => (
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

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditRecipeModal({ recipe, onSave, onClose, isNew }) {
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
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      ingredients: ingredients.filter((i) => i.name.trim()),
      instructions: instructions.map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="edit-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h3>{isNew ? "➕ Nieuw recept" : "✏️ Recept bewerken"}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form className="edit-form" onSubmit={handleSubmit}>
          {/* Row 1: emoji + name */}
          <div className="edit-field-group">
            <div className="edit-field edit-field--emoji">
              <label>Emoji</label>
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
            </div>
            <div className="edit-field edit-field--grow">
              <label>Naam</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>

          {/* Row 2: cookTime + servings + addedBy */}
          <div className="edit-field-group">
            <div className="edit-field">
              <label>Bereidingstijd</label>
              <input value={cookTime} onChange={(e) => setCookTime(e.target.value)} placeholder="25 min" />
            </div>
            <div className="edit-field edit-field--narrow">
              <label>Personen</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                min={1}
                max={20}
              />
            </div>
            <div className="edit-field">
              <label>Toegevoegd door</label>
              <input value={addedBy} onChange={(e) => setAddedBy(e.target.value)} />
            </div>
          </div>

          {/* Tags */}
          <div className="edit-field">
            <label>
              Tags <span className="edit-label-hint">(kommagescheiden)</span>
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="kip, gezond, oven"
            />
          </div>

          {/* Ingredients */}
          <div className="edit-field">
            <label>Ingrediënten</label>
            <div className="ingredients-edit-list">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="ingredient-edit-row">
                  <input
                    className="ing-edit-amount"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                    placeholder="Hoev."
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
                    placeholder="Naam ingrediënt"
                  />
                  <button
                    type="button"
                    className="ing-remove-btn"
                    onClick={() => removeIngredient(idx)}
                    title="Verwijder rij"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="ing-add-btn" onClick={addIngredient}>
                + Ingrediënt toevoegen
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="edit-field">
            <label>Bereidingswijze <span className="edit-label-hint">(optioneel)</span></label>
            <div className="instructions-edit-list">
              {instructions.map((step, idx) => (
                <div key={idx} className="instruction-edit-row">
                  <span className="instruction-step-num">{idx + 1}</span>
                  <textarea
                    className="ins-edit-text"
                    value={step}
                    onChange={(e) => updateInstruction(idx, e.target.value)}
                    placeholder={`Stap ${idx + 1}…`}
                    rows={2}
                  />
                  <button
                    type="button"
                    className="ing-remove-btn"
                    onClick={() => removeInstruction(idx)}
                    title="Verwijder stap"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="ing-add-btn" onClick={addInstruction}>
                + Stap toevoegen
              </button>
            </div>
          </div>

          <div className="edit-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Annuleren</button>
            <button type="submit" className="btn-save">Opslaan</button>
          </div>
        </form>
      </div>
    </div>
  );
}
