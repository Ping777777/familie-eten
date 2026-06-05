import { useMemo, useState } from "react";

export default function ShoppingList({ weekPlan, recipes, family, days }) {
  const [checked, setChecked] = useState({});

  const ingredientMap = useMemo(() => {
    const map = {};

    days.forEach((day) => {
      family.forEach((member) => {
        const recipeId = weekPlan[day][member];
        if (!recipeId) return;
        const recipe = recipes.find((r) => r.id === recipeId);
        if (!recipe) return;

        recipe.ingredients.forEach(({ name, amount }) => {
          const key = name.toLowerCase();
          if (!map[key]) {
            map[key] = { name, amounts: [], meals: new Set() };
          }
          map[key].amounts.push(amount);
          map[key].meals.add(recipe.name);
        });
      });
    });

    return map;
  }, [weekPlan, recipes, family, days]);

  const items = Object.values(ingredientMap).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const totalPlanned = days.reduce(
    (acc, day) => acc + family.filter((m) => weekPlan[day][m]).length,
    0
  );

  const toggleCheck = (key) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const clearAll = () => setChecked({});

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

  const unchecked = items.filter((item) => !checked[item.name.toLowerCase()]);
  const checkedItems = items.filter((item) => checked[item.name.toLowerCase()]);

  return (
    <div className="shopping-list">
      <div className="shopping-header">
        <h2>🛒 Boodschappenlijst</h2>
        <div className="shopping-meta">
          <span>{totalPlanned} maaltijden gepland</span>
          <span>{items.length} ingrediënten</span>
          {checkedItems.length > 0 && (
            <button className="clear-checks-btn" onClick={clearAll}>
              Alles uitvinken
            </button>
          )}
        </div>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(checkedItems.length / items.length) * 100}%` }}
        />
      </div>
      <p className="progress-label">
        {checkedItems.length} van {items.length} afgevinkt
      </p>

      <ul className="ingredient-list">
        {unchecked.map((item) => {
          const key = item.name.toLowerCase();
          return (
            <li key={key} className="ingredient-item" onClick={() => toggleCheck(key)}>
              <span className="check-box">☐</span>
              <div className="ingredient-details">
                <span className="ingredient-name">{item.name}</span>
                <span className="ingredient-amounts">{item.amounts.join(", ")}</span>
                <span className="ingredient-meals">
                  {[...item.meals].join(" · ")}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {checkedItems.length > 0 && (
        <div className="checked-section">
          <h4>✅ In winkelwagentje ({checkedItems.length})</h4>
          <ul className="ingredient-list checked">
            {checkedItems.map((item) => {
              const key = item.name.toLowerCase();
              return (
                <li key={key} className="ingredient-item done" onClick={() => toggleCheck(key)}>
                  <span className="check-box">☑</span>
                  <div className="ingredient-details">
                    <span className="ingredient-name">{item.name}</span>
                    <span className="ingredient-amounts">{item.amounts.join(", ")}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
