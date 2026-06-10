import { useMemo, useState, useEffect } from "react";
import { isPantryByDefault } from "../data/pantryStaples";

const LS_OVERRIDES = "familie-eten:pantryOverrides";
const STAPLE_CATEGORIES = ["Ontbijt", "Lunch", "Tussendoor", "Overig"];

const loadOverrides = () => {
  try { return new Set(JSON.parse(localStorage.getItem(LS_OVERRIDES)) ?? []); }
  catch { return new Set(); }
};

export default function ShoppingList({ weekPlan, recipes, family, days, staples = [], onUpdateStaples }) {
  const [checked, setChecked] = useState({});
  const [picnicMsg, setPicnicMsg] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [overrides, setOverrides] = useState(loadOverrides);
  const [staplesEditMode, setStaplesEditMode] = useState(false);
  const [nameEdits, setNameEdits] = useState({});
  const [activeListTab, setActiveListTab] = useState("maaltijden");

  useEffect(() => {
    localStorage.setItem(LS_OVERRIDES, JSON.stringify([...overrides]));
  }, [overrides]);

  const ingredientMap = useMemo(() => {
    const map = {};
    days.forEach((day) => {
      family.forEach((member) => {
        const recipeId = weekPlan[day][member];
        if (!recipeId) return;
        const recipe = recipes.find((r) => r.id === recipeId);
        if (!recipe) return;
        recipe.ingredients.forEach(({ name, amount, unit }) => {
          const key = name.toLowerCase();
          if (!map[key]) map[key] = { name, amounts: [], meals: new Set() };
          map[key].amounts.push(unit ? `${amount} ${unit}` : amount);
          map[key].meals.add(recipe.name);
        });
      });
    });
    return map;
  }, [weekPlan, recipes, family, days]);

  const items = Object.values(ingredientMap).sort((a, b) => a.name.localeCompare(b.name));

  const isPantry = (name) => {
    const key = name.toLowerCase();
    const defaultPantry = isPantryByDefault(name);
    return overrides.has(key) ? !defaultPantry : defaultPantry;
  };

  const toggleOverride = (e, name) => {
    e.stopPropagation();
    const key = name.toLowerCase();
    setOverrides((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const freshItems = items.filter((i) => !isPantry(i.name));
  const pantryItems = items.filter((i) => isPantry(i.name));

  const totalPlanned = days.reduce(
    (acc, day) => acc + family.filter((m) => {
      const id = weekPlan[day]?.[m];
      return Boolean(id) && recipes.some((r) => r.id === id);
    }).length,
    0
  );

  const toggleCheck = (key) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleStaple = (id) => toggleCheck(`s:${id}`);

  const uncheckedFresh  = freshItems.filter((i) => !checked[i.name.toLowerCase()]);
  const checkedFresh    = freshItems.filter((i) =>  checked[i.name.toLowerCase()]);
  const uncheckedPantry = pantryItems.filter((i) => !checked[i.name.toLowerCase()]);
  const checkedPantry   = pantryItems.filter((i) =>  checked[i.name.toLowerCase()]);
  const checkedStaples  = staples.filter((s) =>  checked[`s:${s.id}`]);

  const mealCheckedCount   = checkedFresh.length + checkedPantry.length;
  const stapleCheckedCount = checkedStaples.length;

  const clearMealChecks   = () => setChecked((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) =>  k.startsWith("s:"))));
  const clearStapleChecks = () => setChecked((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith("s:"))));

  const copyList = () => {
    const lines = ["🛒 Boodschappenlijst", ""];
    if (freshItems.length > 0) {
      if (staples.length > 0) lines.push("📦 Maaltijdingrediënten:");
      freshItems.forEach((i) => lines.push(`• ${i.name} — ${i.amounts.join(", ")}`));
    }
    if (pantryItems.length > 0) {
      lines.push("", "🗄 Controleer in de kast:");
      pantryItems.forEach((i) => lines.push(`• ${i.name} — ${i.amounts.join(", ")}`));
    }
    if (staples.length > 0) {
      lines.push("", "🏡 Vaste boodschappen:");
      STAPLE_CATEGORIES.forEach((cat) => {
        const catItems = staples.filter((s) => s.category === cat);
        if (catItems.length === 0) return;
        lines.push(`${cat}:`);
        catItems.forEach((s) => lines.push(`• ${s.name}`));
      });
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Staple edit handlers
  const addStaple = (category, name) =>
    onUpdateStaples([...staples, { id: Date.now(), category, name }]);

  const removeStaple = (id) =>
    onUpdateStaples(staples.filter((s) => s.id !== id));

  const saveRename = (item) => {
    const next = nameEdits[item.id];
    if (next !== undefined) {
      const trimmed = next.trim();
      if (trimmed && trimmed !== item.name)
        onUpdateStaples(staples.map((s) => s.id === item.id ? { ...s, name: trimmed } : s));
      setNameEdits((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
    }
  };

  return (
    <div className="shopping-list">
      {/* Tab bar */}
      <div className="shopping-tabs">
        <button
          className={`shopping-tab${activeListTab === "maaltijden" ? " active" : ""}`}
          onClick={() => setActiveListTab("maaltijden")}
        >
          🛒 Boodschappenlijst
        </button>
        <button
          className={`shopping-tab${activeListTab === "staples" ? " active" : ""}`}
          onClick={() => setActiveListTab("staples")}
        >
          🏡 Vaste boodschappen
        </button>
      </div>

      {/* ── Tab 1: Maaltijden ── */}
      {activeListTab === "maaltijden" && (
        <>
          <div className="shopping-header">
            <h2>Boodschappenlijst</h2>
            <div className="shopping-meta">
              <span>{totalPlanned} maaltijden · {items.length} ingrediënten</span>
              {mealCheckedCount > 0 && (
                <button className="clear-checks-btn" onClick={clearMealChecks}>Alles uitvinken</button>
              )}
            </div>
          </div>

          <div className="shopping-actions">
            <button className="btn-copy" onClick={copyList}>
              {copied ? "✅ Gekopieerd!" : "📋 Kopieer lijst"}
            </button>
            <button className="btn-picnic" onClick={() => setPicnicMsg(true)}>
              🛵 Stuur naar Picnic
            </button>
          </div>

          {picnicMsg && (
            <div className="picnic-banner">
              <span>🚧 Komt binnenkort — Picnic integratie in ontwikkeling</span>
              <button className="picnic-close" onClick={() => setPicnicMsg(false)}>×</button>
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(mealCheckedCount / items.length) * 100}%` }} />
              </div>
              <p className="progress-label">{mealCheckedCount} van {items.length} afgevinkt</p>
            </>
          )}

          {mealCheckedCount > 0 && (
            <div className="checked-section">
              <h4>✅ In winkelwagentje ({mealCheckedCount})</h4>
              <IngredientList
                items={[...checkedFresh, ...checkedPantry]}
                onCheck={toggleCheck}
                onTogglePantry={toggleOverride}
                isPantry={false}
                done
              />
            </div>
          )}

          {totalPlanned === 0 ? (
            <div className="meal-empty-notice">
              <p>Geen maaltijden gepland voor deze week.</p>
              <p>Ga naar de <strong>Weekplanner</strong> om maaltijden toe te voegen.</p>
            </div>
          ) : (
            <>
              <IngredientList
                items={uncheckedFresh}
                onCheck={toggleCheck}
                onTogglePantry={toggleOverride}
                isPantry={false}
              />
              {pantryItems.length > 0 && (
                <div className="pantry-section">
                  <button className="pantry-toggle" onClick={() => setPantryOpen((o) => !o)}>
                    <span>🗄 Controleer in de kast</span>
                    <span className="pantry-count">{uncheckedPantry.length} ingrediënten</span>
                    <span className="pantry-chevron">{pantryOpen ? "▲" : "▼"}</span>
                  </button>
                  {pantryOpen && (
                    <div className="pantry-body">
                      <p className="pantry-hint">
                        Heb je dit al in huis? Laat het staan. Toch nodig? Vink het aan — dan gaat het naar je boodschappenlijst.
                      </p>
                      <IngredientList
                        items={uncheckedPantry}
                        onCheck={toggleCheck}
                        onTogglePantry={toggleOverride}
                        isPantry={true}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Tab 2: Vaste boodschappen ── */}
      {activeListTab === "staples" && (
        <>
          <div className="shopping-header">
            <h2>Vaste boodschappen</h2>
            <div className="shopping-meta">
              <span>{staples.length} items</span>
              {stapleCheckedCount > 0 && (
                <button className="clear-checks-btn" onClick={clearStapleChecks}>Alles uitvinken</button>
              )}
              <button
                className={`staples-edit-btn${staplesEditMode ? " active" : ""}`}
                onClick={() => {
                  if (staplesEditMode) setNameEdits({});
                  setStaplesEditMode((e) => !e);
                }}
              >
                {staplesEditMode ? "Klaar" : "✏️ Bewerken"}
              </button>
            </div>
          </div>

          {staples.length > 0 && (
            <>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(stapleCheckedCount / staples.length) * 100}%` }} />
              </div>
              <p className="progress-label">{stapleCheckedCount} van {staples.length} afgevinkt</p>
            </>
          )}

          {stapleCheckedCount > 0 && (
            <div className="checked-section">
              <h4>✅ In winkelwagentje ({stapleCheckedCount})</h4>
              <ul className="ingredient-list">
                {checkedStaples.map((s) => (
                  <li key={s.id} className="ingredient-item done" onClick={() => toggleStaple(s.id)}>
                    <span className="check-box">☑</span>
                    <div className="ingredient-details">
                      <span className="ingredient-name">{s.name}</span>
                      <span className="ingredient-amounts staple-category-badge">{s.category}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {STAPLE_CATEGORIES.map((cat) => {
            const catItems = staples.filter((s) => s.category === cat);
            const uncheckedCatItems = catItems.filter((s) => !checked[`s:${s.id}`]);
            if (!staplesEditMode && uncheckedCatItems.length === 0) return null;
            return (
              <div key={cat} className="staples-category">
                <h4 className="staples-category-title">{cat}</h4>
                <ul className="staples-list">
                  {(staplesEditMode ? catItems : uncheckedCatItems).map((item) => (
                    <li
                      key={item.id}
                      className={`staples-item${staplesEditMode ? " editing" : ""}`}
                      onClick={staplesEditMode ? undefined : () => toggleStaple(item.id)}
                    >
                      {!staplesEditMode && <span className="check-box">☐</span>}
                      {staplesEditMode ? (
                        <input
                          className="staples-rename-input"
                          value={nameEdits[item.id] ?? item.name}
                          onChange={(e) => setNameEdits((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          onBlur={() => saveRename(item)}
                        />
                      ) : (
                        <span className="staples-item-name">{item.name}</span>
                      )}
                      {staplesEditMode && (
                        <button className="staples-remove-btn" onClick={() => removeStaple(item.id)} title="Verwijder item">×</button>
                      )}
                    </li>
                  ))}
                </ul>
                {staplesEditMode && <AddStapleRow onAdd={(name) => addStaple(cat, name)} />}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function IngredientList({ items, onCheck, onTogglePantry, isPantry, done = false }) {
  if (items.length === 0) return null;
  return (
    <ul className="ingredient-list">
      {items.map((item) => {
        const key = item.name.toLowerCase();
        return (
          <li key={key} className={`ingredient-item${done ? " done" : ""}`} onClick={() => onCheck(key)}>
            <span className="check-box">{done ? "☑" : "☐"}</span>
            <div className="ingredient-details">
              <span className="ingredient-name">{item.name}</span>
              <span className="ingredient-amounts">{item.amounts.join(", ")}</span>
              {!done && item.meals && (
                <span className="ingredient-meals">{[...item.meals].join(" · ")}</span>
              )}
            </div>
            {!done && !isPantry && (
              <button className="pantry-move-btn" title="Naar kast" onClick={(e) => onTogglePantry(e, item.name)}>
                🗄
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AddStapleRow({ onAdd }) {
  const [name, setName] = useState("");
  const submit = () => {
    if (name.trim()) { onAdd(name.trim()); setName(""); }
  };
  return (
    <div className="staples-add-row">
      <input
        className="staples-add-input"
        placeholder="Item toevoegen..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
      />
      <button className="staples-add-btn" onClick={submit} disabled={!name.trim()}>+</button>
    </div>
  );
}
