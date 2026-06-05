import { useMemo, useState, useEffect } from "react";
import { isPantryByDefault } from "../data/pantryStaples";

const LS_OVERRIDES = "familie-eten:pantryOverrides";

const loadOverrides = () => {
  try { return new Set(JSON.parse(localStorage.getItem(LS_OVERRIDES)) ?? []); }
  catch { return new Set(); }
};

export default function ShoppingList({ weekPlan, recipes, family, days }) {
  const [checked, setChecked] = useState({});
  const [picnicMsg, setPicnicMsg] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);
  // overrides: keys that have been *flipped* from their default category
  const [overrides, setOverrides] = useState(loadOverrides);

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

  const items = Object.values(ingredientMap).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

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
    (acc, day) => acc + family.filter((m) => weekPlan[day][m]).length,
    0
  );

  const toggleCheck = (key) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const clearAll = () => setChecked({});

  const copyList = () => {
    const lines = [
      "🛒 Boodschappenlijst",
      "",
      ...freshItems.map((i) => `• ${i.name} — ${i.amounts.join(", ")}`),
      ...(pantryItems.length
        ? ["", "🗄 Controleer in de kast:", ...pantryItems.map((i) => `• ${i.name} — ${i.amounts.join(", ")}`)]
        : []),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (totalPlanned === 0) {
    return (
      <div className="shopping-list empty-shopping">
        <h2>🛒 Boodschappenlijst</h2>
        <div className="empty-state">
          <p>Je hebt nog geen maaltijden gepland.</p>
          <p>Ga naar de <strong>Weekplanner</strong> om maaltijden toe te voegen.</p>
        </div>
      </div>
    );
  }

  const uncheckedFresh = freshItems.filter((i) => !checked[i.name.toLowerCase()]);
  const checkedFresh = freshItems.filter((i) => checked[i.name.toLowerCase()]);
  const uncheckedPantry = pantryItems.filter((i) => !checked[i.name.toLowerCase()]);
  const checkedPantry = pantryItems.filter((i) => checked[i.name.toLowerCase()]);
  const totalChecked = checkedFresh.length + checkedPantry.length;

  return (
    <div className="shopping-list">
      <div className="shopping-header">
        <h2>🛒 Boodschappenlijst</h2>
        <div className="shopping-meta">
          <span>{totalPlanned} maaltijden gepland</span>
          <span>{freshItems.length} vers · {pantryItems.length} in de kast</span>
          {totalChecked > 0 && (
            <button className="clear-checks-btn" onClick={clearAll}>Alles uitvinken</button>
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

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(totalChecked / items.length) * 100}%` }}
        />
      </div>
      <p className="progress-label">{totalChecked} van {items.length} afgevinkt</p>

      {/* Fresh / main list */}
      <IngredientList
        items={uncheckedFresh}
        onCheck={toggleCheck}
        onTogglePantry={toggleOverride}
        isPantry={false}
      />

      {checkedFresh.length > 0 && (
        <div className="checked-section">
          <h4>✅ In winkelwagentje ({checkedFresh.length})</h4>
          <IngredientList items={checkedFresh} onCheck={toggleCheck} onTogglePantry={toggleOverride} isPantry={false} done />
        </div>
      )}

      {/* Pantry staples — collapsible */}
      {pantryItems.length > 0 && (
        <div className="pantry-section">
          <button className="pantry-toggle" onClick={() => setPantryOpen((o) => !o)}>
            <span>🗄 Controleer in de kast</span>
            <span className="pantry-count">{pantryItems.length} ingrediënten</span>
            <span className="pantry-chevron">{pantryOpen ? "▲" : "▼"}</span>
          </button>

          {pantryOpen && (
            <div className="pantry-body">
              <p className="pantry-hint">
                Zit dit al in de kast? Vink het af. Klik op 🛒 om een ingredient naar de hoofdlijst te verplaatsen.
              </p>
              <IngredientList
                items={uncheckedPantry}
                onCheck={toggleCheck}
                onTogglePantry={toggleOverride}
                isPantry={true}
              />
              {checkedPantry.length > 0 && (
                <div className="checked-section">
                  <h4>✅ In huis ({checkedPantry.length})</h4>
                  <IngredientList items={checkedPantry} onCheck={toggleCheck} onTogglePantry={toggleOverride} isPantry={true} done />
                </div>
              )}
            </div>
          )}
        </div>
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
            <button
              className="pantry-move-btn"
              title={isPantry ? "Naar boodschappenlijst" : "Naar kast"}
              onClick={(e) => onTogglePantry(e, item.name)}
            >
              {isPantry ? "🛒" : "🗄"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
