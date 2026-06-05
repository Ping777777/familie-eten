import { useState } from "react";

export default function RecipeLibrary({ recipes, onDelete }) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const allTags = [...new Set(recipes.flatMap((r) => r.tags))].sort();

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || r.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setConfirmId(id);
  };

  const handleConfirm = (e) => {
    e.stopPropagation();
    onDelete(confirmId);
    setConfirmId(null);
    if (expanded === confirmId) setExpanded(null);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setConfirmId(null);
  };

  const confirmRecipe = recipes.find((r) => r.id === confirmId);

  return (
    <div className="recipe-library">
      <h2>Receptenbibliotheek</h2>

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

      <div className="recipe-grid">
        {filtered.map((recipe) => (
          <div
            key={recipe.id}
            className={`recipe-card ${expanded === recipe.id ? "expanded" : ""}`}
            onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
          >
            <div className="recipe-card-top">
              <span className="recipe-big-emoji">{recipe.emoji}</span>
              <div className="recipe-info">
                <h3>{recipe.name}</h3>
                <div className="recipe-meta">⏱ {recipe.cookTime} · {recipe.servings} pers.</div>
                <div className="recipe-tags">
                  {recipe.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
              <div className="card-actions">
                <button
                  className="delete-recipe-btn"
                  onClick={(e) => handleDeleteClick(e, recipe.id)}
                  title="Verwijder recept"
                >
                  🗑️
                </button>
                <span className="expand-icon">{expanded === recipe.id ? "▲" : "▼"}</span>
              </div>
            </div>

            {expanded === recipe.id && (
              <div className="recipe-ingredients">
                <h4>Ingrediënten (4 personen)</h4>
                <ul>
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i}>
                      <span className="ing-amount">{ing.amount} {ing.unit}</span>
                      <span className="ing-name">{ing.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="no-results">Geen recepten gevonden.</p>
        )}
      </div>

      {confirmId && confirmRecipe && (
        <div className="confirm-overlay" onClick={handleCancel}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <span className="confirm-emoji">{confirmRecipe.emoji}</span>
            <h3>Recept verwijderen?</h3>
            <p>
              Weet je zeker dat je <strong>{confirmRecipe.name}</strong> wilt verwijderen?
              Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="confirm-actions">
              <button className="btn-cancel" onClick={handleCancel}>
                Annuleren
              </button>
              <button className="btn-delete" onClick={handleConfirm}>
                Ja, verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
