import { useState } from "react";

const MEMBER_COLORS = {
  Papa: "#4a90d9",
  Mama: "#e8739a",
  Inga: "#7bc67e",
  Kevin: "#f4a261",
};

export default function WeekPlanner({ days, family, weekPlan, recipes, onAssign, onClear }) {
  const [selecting, setSelecting] = useState(null); // { day, member }

  const getRecipe = (id) => recipes.find((r) => r.id === id);

  const handleSelect = (recipeId) => {
    if (!selecting) return;
    onAssign(selecting.day, selecting.member, recipeId);
    setSelecting(null);
  };

  return (
    <div className="week-planner">
      <h2>Weekplanner</h2>
      <p className="hint">Klik op een vakje om een maaltijd te kiezen voor elk gezinslid.</p>

      <div className="planner-grid">
        <div className="grid-header">
          <div className="corner-cell"></div>
          {family.map((m) => (
            <div key={m} className="member-header" style={{ borderBottom: `3px solid ${MEMBER_COLORS[m]}` }}>
              <span className="member-emoji">{memberEmoji(m)}</span> {m}
            </div>
          ))}
        </div>

        {days.map((day) => (
          <div key={day} className="grid-row">
            <div className="day-label">{day}</div>
            {family.map((member) => {
              const recipeId = weekPlan[day][member];
              const recipe = recipeId ? getRecipe(recipeId) : null;
              const isSelecting = selecting?.day === day && selecting?.member === member;

              return (
                <div
                  key={member}
                  className={`meal-cell ${isSelecting ? "selecting" : ""} ${recipe ? "filled" : "empty"}`}
                  style={{ borderColor: isSelecting ? MEMBER_COLORS[member] : undefined }}
                  onClick={() => setSelecting({ day, member })}
                >
                  {recipe ? (
                    <div className="meal-tag">
                      <span>{recipe.emoji}</span>
                      <span className="meal-name">{recipe.name}</span>
                      <button
                        className="clear-btn"
                        onClick={(e) => { e.stopPropagation(); onClear(day, member); }}
                        title="Verwijder"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <span className="add-hint">+ Kies maaltijd</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selecting && (
        <div className="recipe-picker-overlay" onClick={() => setSelecting(null)}>
          <div className="recipe-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>
                Kies maaltijd voor <strong>{selecting.member}</strong> op <strong>{selecting.day}</strong>
              </h3>
              <button className="close-btn" onClick={() => setSelecting(null)}>×</button>
            </div>
            <div className="picker-grid">
              {recipes.map((r) => (
                <button
                  key={r.id}
                  className="picker-card"
                  onClick={() => handleSelect(r.id)}
                >
                  <span className="picker-emoji">{r.emoji}</span>
                  <span className="picker-name">{r.name}</span>
                  <div className="picker-tags">
                    {r.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function memberEmoji(name) {
  return { Papa: "👨", Mama: "👩", Inga: "👧", Kevin: "👦" }[name] ?? "👤";
}
