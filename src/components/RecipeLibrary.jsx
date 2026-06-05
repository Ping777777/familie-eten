import { useState } from "react";

export default function RecipeLibrary({ recipes }) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const allTags = [...new Set(recipes.flatMap((r) => r.tags))].sort();

  const filtered = recipes.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || r.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

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
                <div className="recipe-tags">
                  {recipe.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
              <span className="expand-icon">{expanded === recipe.id ? "▲" : "▼"}</span>
            </div>

            {expanded === recipe.id && (
              <div className="recipe-ingredients">
                <h4>Ingrediënten (4 personen)</h4>
                <ul>
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i}>
                      <span className="ing-amount">{ing.amount}</span>
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
    </div>
  );
}
