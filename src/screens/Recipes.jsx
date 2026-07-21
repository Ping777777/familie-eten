import { useMemo, useState } from "react";
import { useLang, recipeName, ingredientName, instructions, trTag, trUnit, trCookTime, weekTitle } from "../lib/i18n";
import { DAYS, CATEGORIES, matchesCategory, parseIngredient, formatIngredientLine } from "../lib/food";
import { getMondayOfWeek, getIsoWeekInfo } from "../week";
import { Screen, NavBtn, List, Row, Sheet, SwipeRow, Icons } from "../ios/ui";

export default function RecipesScreen({ user, recipes, saveRecipes, recipesLoaded, favorites, onToggleFavorite, plan, assign, weekOffset, setWeekOffset, planLoaded, openRecipeId, onOpenRecipe, onCloseRecipe, onOpenSettings, toast }) {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [editing, setEditing] = useState(null); // recipe object or "new"
  const [menuOpen, setMenuOpen] = useState(false);

  const active = recipes.filter((r) => !r.archived);
  const archived = recipes.filter((r) => r.archived);
  const ql = q.toLowerCase();
  const visible = (showArchive ? archived : active)
    .filter((r) => !favOnly || favorites.has(r.id))
    .filter((r) => matchesCategory(r, cat))
    .filter((r) => !ql || (recipeName(r, lang) ?? r.name).toLowerCase().includes(ql) || r.tags?.some((x) => x.toLowerCase().includes(ql)))
    .sort((a, b) => (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0) || (recipeName(a, lang) ?? "").localeCompare(recipeName(b, lang) ?? ""));

  // saveRecipes refuses to write (returns false) if the list hasn't actually
  // loaded — e.g. a network blip during load, or a load that came back
  // without a usable etag. Surface that instead of pretending it worked.
  const trySave = (next) => {
    const saved = saveRecipes(next);
    if (!saved) toast(t.notLoadedYet);
    return saved;
  };
  const patch = (id, changes) => trySave(recipes.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  const detail = recipes.find((r) => r.id === openRecipeId);

  const doImport = async (file) => {
    if (!recipesLoaded) return toast(t.notLoadedYet);
    try {
      const raw = JSON.parse(await file.text());
      const entries = Array.isArray(raw) ? raw : [raw];
      const names = new Set(recipes.map((r) => (r.name || "").toLowerCase()));
      const taken = new Set(recipes.map((r) => r.id));
      let nextId = recipes.reduce((m, r) => (typeof r.id === "number" && r.id > m ? r.id : m), 0);
      const merged = [...recipes];
      let ok = 0, dup = 0, bad = 0;
      for (const e of entries) {
        const nameValid = e && typeof e === "object" && typeof e.name === "string" && e.name.trim();
        const ingValid = !e?.ingredients || (Array.isArray(e.ingredients) && e.ingredients.every((i) => i && typeof i.name === "string"));
        if (!nameValid || !ingValid) { bad++; continue; }
        if (names.has(e.name.toLowerCase())) { dup++; continue; }
        let id = e.id;
        if (typeof id !== "number" || taken.has(id)) { nextId += 1; id = nextId; }
        taken.add(id); names.add(e.name.toLowerCase());
        merged.push({ ...e, id });
        ok++;
      }
      if (ok && !trySave(merged)) return;
      toast(t.imported(ok) + (dup || bad ? ` · ${t.importSkipped(dup, bad)}` : ""));
    } catch { toast("⚠️ JSON"); }
  };
  const doExport = () => {
    const blob = new Blob([JSON.stringify(recipes, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `familie-eten-recepten-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <Screen
        title={showArchive ? t.archive : t.recipes}
        sub={`${(showArchive ? archived : active).length} ${t.recipes.toLowerCase()}`}
        left={showArchive
          ? <NavBtn icon={Icons.chevL} onClick={() => setShowArchive(false)} label={t.close} />
          : <NavBtn icon={Icons.gear} onClick={onOpenSettings} label={t.settings} />}
        right={
          <>
            <NavBtn icon={Icons.dots} onClick={() => setMenuOpen(true)} label={t.recipes} />
            <NavBtn icon={Icons.plus} onClick={() => (recipesLoaded ? setEditing("new") : toast(t.notLoadedYet))} label={t.newRecipe} />
          </>
        }
      >
        <div className="search">
          <Icons.search size={17} weight={2.2} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchRecipes} />
        </div>
        <div className="chips">
          <button className={`chip sm${cat === null ? " on" : ""}`} onClick={() => setCat(null)}>{t.all}</button>
          <button className={`chip sm${favOnly ? " on" : ""}`} onClick={() => setFavOnly((v) => !v)}>{t.favorites}</button>
          {CATEGORIES.map((c) => (
            <button key={c.key} className={`chip sm${cat === c.key ? " on" : ""}`} onClick={() => setCat(cat === c.key ? null : c.key)}>
              {c.emoji} {trTag(c.key, lang)}
            </button>
          ))}
        </div>
        <List>
          {visible.map((r) => (
            <SwipeRow key={r.id} actions={
              showArchive
                ? [{ label: t.restore, color: "teal", icon: Icons.boxUp, onClick: () => patch(r.id, { archived: false }) }]
                : [
                    { label: "♥", color: "gray", icon: favorites.has(r.id) ? Icons.starFill : Icons.star, onClick: () => onToggleFavorite(r.id) },
                    { label: t.archive, color: "red", icon: Icons.boxDown, onClick: () => patch(r.id, { archived: true }) },
                  ]
            }>
              <Row
                lead={<span className="emoji-tile">{r.emoji}</span>} sep="68px"
                title={recipeName(r, lang) ?? r.name}
                sub={r.tags?.map((x) => trTag(x, lang)).slice(0, 3).join(" · ")}
                trail={favorites.has(r.id) ? <span style={{ color: "var(--yellow)" }}><Icons.starFill size={16} /></span> : null}
                onClick={() => onOpenRecipe(r.id)}
                chevron
              />
            </SwipeRow>
          ))}
          {visible.length === 0 && <div className="empty"><div className="big">🍳</div><div className="t-sub">—</div></div>}
        </List>
      </Screen>

      {detail && (
        <RecipeDetail
          recipe={detail}
          user={user}
          plan={plan}
          assign={assign}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          planLoaded={planLoaded}
          onClose={onCloseRecipe}
          onEdit={() => setEditing(detail)}
          isFavorite={favorites.has(detail.id)}
          onToggleFavorite={() => onToggleFavorite(detail.id)}
          onDelete={() => { if (trySave(recipes.filter((r) => r.id !== detail.id))) onCloseRecipe(); }}
        />
      )}

      <RecipeEditor
        open={!!editing}
        recipe={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSave={(data) => {
          // edited in the current language? we edit the Dutch base fields
          const saved = editing === "new"
            ? trySave([...recipes, { ...data, id: recipes.reduce((m, r) => (typeof r.id === "number" && r.id > m ? r.id : m), 0) + 1, archived: false }])
            : patch(editing.id, data);
          if (saved) setEditing(null);
        }}
      />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={t.recipes}
        rightAction={<button className="nav-txt-btn" style={{ padding: 0 }} onClick={() => setMenuOpen(false)}>{t.done}</button>}>
        <List>
          <Row lead={<Icons.boxDown size={20} />} title={t.archive} trail={archived.length || null} chevron
            onClick={() => { setShowArchive(true); setMenuOpen(false); }} />
          <Row lead={<Icons.boxUp size={20} />} title={t.exportRecipes} onClick={() => { doExport(); setMenuOpen(false); }} />
          <Row lead={<Icons.plus size={20} />} title={t.importRecipes} onClick={() => {
            const input = document.createElement("input");
            input.type = "file"; input.accept = "application/json,.json";
            input.onchange = () => { if (input.files?.[0]) doImport(input.files[0]); setMenuOpen(false); };
            input.click();
          }} />
        </List>
        <div style={{ height: 16 }} />
      </Sheet>
    </>
  );
}

function RecipeDetail({ recipe, user, plan, assign, weekOffset, setWeekOffset, planLoaded, onClose, onEdit, isFavorite, onToggleFavorite, onDelete }) {
  const { t, lang } = useLang();
  const [done, setDone] = useState({});
  const [scrolled, setScrolled] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const steps = instructions(recipe, lang);
  const monday = getMondayOfWeek(weekOffset);

  const plannedDays = DAYS.filter((d) => plan?.[d]?.[user] === recipe.id);
  // Any day that already has a meal (by anyone, incl. your own other recipe)
  // is greyed out (issue #145); change it via Wissel in the planner instead.
  const lockedDays = DAYS.filter((d) => Object.values(plan?.[d] ?? {}).some(Boolean));

  return (
    <div className="push" onScroll={(e) => setScrolled(e.target.scrollTop > 110)}>
      <div className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-side">
          <NavBtn icon={Icons.chevL} onClick={onClose} label={t.close} />
        </div>
        <span className="nav-inline">{recipeName(recipe, lang)}</span>
        <div className="nav-side right">
          <NavBtn icon={isFavorite ? Icons.starFill : Icons.star} onClick={onToggleFavorite} label={t.favorites} />
          <NavBtn icon={Icons.pencil} onClick={onEdit} label={t.edit} />
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
        <div style={{ fontSize: 64 }}>{recipe.emoji}</div>
        <h1 className="t-title2" style={{ marginTop: 6 }}>{recipeName(recipe, lang)}</h1>
        <div className="t-sub muted" style={{ marginTop: 4 }}>
          {[recipe.servings && `${recipe.servings} ${t.persons}`, trCookTime(recipe.cookTime, lang), ...(recipe.tags ?? []).map((x) => trTag(x, lang))]
            .filter(Boolean).join(" · ")}
        </div>
      </div>

      <List header={t.plan}
        headerAction={
          <span className="week-step">
            <button onClick={() => setWeekOffset(weekOffset - 1)} aria-label={t.prevWeek}><Icons.chevL size={14} weight={2.6} /></button>
            <span className="week-step-lb">{weekTitle(weekOffset, t, getIsoWeekInfo(weekOffset).week)}</span>
            <button onClick={() => setWeekOffset(weekOffset + 1)} aria-label={t.nextWeek}><Icons.chevR size={14} weight={2.6} /></button>
          </span>
        }>
        <div className="row static" style={{ display: "block" }}>
          <div className="day-chips" style={planLoaded ? undefined : { opacity: 0.4, pointerEvents: "none" }}>
            {DAYS.map((d, i) => {
              const date = new Date(monday); date.setDate(monday.getDate() + i);
              const on = plannedDays.includes(d);
              const locked = !on && lockedDays.includes(d);
              return (
                <button key={d} className={`day-chip${on ? " on" : ""}`} disabled={locked}
                  onClick={() => assign(d, user, on ? null : recipe.id)}>
                  <div className="d">{t.days[d].slice(0, 2)}</div>
                  <div className="n">{date.getDate()}</div>
                </button>
              );
            })}
          </div>
        </div>
      </List>

      <List header={t.ingredients}>
        {recipe.ingredients?.map((ing, i) => (
          <Row key={i} className="static" sep="92px"
            lead={<span className="t-sub muted" style={{ width: 64, textAlign: "right" }}>{[ing.amount, trUnit(ing.unit, lang)].filter(Boolean).join(" ")}</span>}
            title={ingredientName(recipe, i, lang)} />
        ))}
      </List>

      {steps.length > 0 && (
        <List header={`${t.steps} · ${Object.values(done).filter(Boolean).length}/${steps.length}`}>
          <div style={{ padding: "2px 16px" }}>
            {steps.map((s, i) => (
              <button key={i} className={`step${done[i] ? " done" : ""}`} style={{ width: "100%", textAlign: "left" }}
                onClick={() => setDone((p) => ({ ...p, [i]: !p[i] }))}>
                <span className="step-n">{done[i] ? "✓" : i + 1}</span>
                <span className="step-t">{s}</span>
              </button>
            ))}
          </div>
        </List>
      )}

      {!confirmDel ? (
        <List>
          <button className="row" style={{ justifyContent: "center", color: "var(--red)", fontWeight: 600 }}
            onClick={() => setConfirmDel(true)}>{t.deleteRecipe}</button>
        </List>
      ) : (
        <List header={t.confirmDelete}>
          <button className="row" style={{ justifyContent: "center", color: "var(--red)", fontWeight: 600 }}
            onClick={onDelete}>{t.deleteRecipe}</button>
          <button className="row" style={{ justifyContent: "center", color: "var(--tint)" }}
            onClick={() => setConfirmDel(false)}>{t.cancel}</button>
        </List>
      )}
    </div>
  );
}

function RecipeEditor({ open, recipe, onClose, onSave }) {
  const { t } = useLang();
  const [form, setForm] = useState(null);
  const cur = useMemo(() => {
    if (!open) return null;
    return {
      name: recipe?.name ?? "",
      emoji: recipe?.emoji ?? "🍽️",
      tags: recipe?.tags?.join(", ") ?? "",
      servings: recipe?.servings ?? 4,
      ingredients: recipe?.ingredients?.map(formatIngredientLine).join("\n") ?? "",
      instructions: recipe?.instructions?.join("\n") ?? "",
    };
  }, [open, recipe]);
  const f = form ?? cur;
  if (!open || !f) return null;
  const set = (k, v) => setForm({ ...f, [k]: v });

  const submit = () => {
    if (!f.name.trim()) return;
    onSave({
      name: f.name.trim(),
      emoji: f.emoji.trim() || "🍽️",
      tags: f.tags.split(",").map((x) => x.trim()).filter(Boolean),
      servings: Number(f.servings) || 4,
      ingredients: f.ingredients.split("\n").map(parseIngredient).filter(Boolean),
      instructions: f.instructions.split("\n").map((x) => x.trim()).filter(Boolean),
    });
    setForm(null);
  };

  return (
    <Sheet open onClose={() => { setForm(null); onClose(); }}
      title={recipe ? t.edit : t.newRecipe}
      leftAction={<button className="nav-txt-btn" style={{ padding: 0 }} onClick={() => { setForm(null); onClose(); }}>{t.cancel}</button>}
      rightAction={<button className="nav-txt-btn" style={{ padding: 0, fontWeight: 600 }} onClick={submit}>{t.save}</button>}
    >
      <div className="field-lb">{t.name}</div>
      <input className="field" value={f.name} onChange={(e) => set("name", e.target.value)} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 90 }}>
          <div className="field-lb">{t.emoji}</div>
          <input className="field" value={f.emoji} onChange={(e) => set("emoji", e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="field-lb">{t.servings}</div>
          <input className="field" type="number" value={f.servings} onChange={(e) => set("servings", e.target.value)} />
        </div>
      </div>
      <div className="field-lb">{t.tags}</div>
      <input className="field" value={f.tags} onChange={(e) => set("tags", e.target.value)} />
      <div className="field-lb">{t.ingredients} — {t.ingredientsHint}</div>
      <textarea className="field" rows={6} value={f.ingredients} onChange={(e) => set("ingredients", e.target.value)} />
      <div className="field-lb">{t.steps} — {t.stepsHint}</div>
      <textarea className="field" rows={7} value={f.instructions} onChange={(e) => set("instructions", e.target.value)} />
      <div style={{ height: 24 }} />
    </Sheet>
  );
}
