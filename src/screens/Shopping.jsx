import { useMemo, useState } from "react";
import { useLang, ingredientName, recipeName, trUnit } from "../lib/i18n";
import { DAYS, FAMILY, aisleFor, AISLE_ORDER, pantryByDefault } from "../lib/food";
import { sendToPicnicCart } from "../lib/api";
import { Screen, NavBtn, List, SwipeRow, Icons } from "../ios/ui";
import { PicnicPicker, PicnicCart, AssociationLine, assocFor } from "./Picnic";

const CHECKS_KEY = "familie-eten:checks";
const EXTRAS_KEY = "familie-eten:extras";

const loadJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

export default function ShoppingScreen({ plan, recipes, staples, saveStaples, overrides, toggleOverride, picnicUser, associations, saveAssociations, onPicnicExpired, toast }) {
  const { t, lang } = useLang();
  const [checks, setChecksState] = useState(() => loadJson(CHECKS_KEY, { checked: {}, dismissed: {} }));
  // ponytail: ad-hoc items are device-local for now; upgrade path is a small
  // extras blob endpoint like pantry-overrides if the family wants them synced.
  const [extras, setExtrasState] = useState(() => loadJson(EXTRAS_KEY, []));
  const [newItem, setNewItem] = useState("");
  const [editStaples, setEditStaples] = useState(false);
  const [sending, setSending] = useState(false);
  const [picking, setPicking] = useState(null); // { key, name, searchName }
  const [cartOpen, setCartOpen] = useState(false);

  const setChecks = (next) => { setChecksState(next); localStorage.setItem(CHECKS_KEY, JSON.stringify(next)); };
  const setExtras = (next) => { setExtrasState(next); localStorage.setItem(EXTRAS_KEY, JSON.stringify(next)); };
  const checked = checks.checked;
  const toggle = (id) => setChecks({ ...checks, checked: { ...checked, [id]: !checked[id] } });
  const setMany = (ids, value) => setChecks({ ...checks, checked: { ...checked, ...Object.fromEntries(ids.map((id) => [id, value])) } });

  // aggregate this week's ingredients
  const items = useMemo(() => {
    const map = {};
    DAYS.forEach((day) => FAMILY.forEach((m) => {
      const rid = plan?.[day]?.[m];
      if (!rid) return;
      const r = recipes.find((x) => x.id === rid);
      if (!r) return;
      r.ingredients?.forEach((ing, idx) => {
        const id = ing.name.toLowerCase();
        const qty = [ing.amount, trUnit(ing.unit, lang)].filter(Boolean).join(" ");
        if (!map[id]) map[id] = { id, name: ingredientName(r, idx, lang) ?? ing.name, amounts: [], meals: new Set() };
        if (qty) map[id].amounts.push(qty);
        map[id].meals.add(recipeName(r, lang) ?? r.name);
      });
    }));
    return Object.values(map);
  }, [plan, recipes, lang]);

  const mealsByIngredient = useMemo(() => {
    const m = new Map();
    items.forEach((i) => m.set(i.id, [...i.meals]));
    staples.forEach((s) => m.set(s.name.toLowerCase(), [t.staples]));
    return m;
  }, [items, staples, t]);

  const isPantry = (id) => (overrides.has(id) ? !pantryByDefault(id) : pantryByDefault(id));
  const buyItems = items.filter((i) => !isPantry(i.id));
  const pantryItems = items.filter((i) => isPantry(i.id));

  // group buy items by aisle
  const groups = useMemo(() => {
    const g = {};
    buyItems.forEach((i) => {
      const a = aisleFor(i.id);
      (g[a] ??= []).push(i);
    });
    extras.forEach((e) => (g.extra ??= []).push({ id: `x:${e.id}`, name: e.name, amounts: [], meals: new Set(), extra: e.id }));
    Object.values(g).forEach((arr) => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return g;
  }, [buyItems, extras]);

  const buyIds = [...buyItems.map((i) => i.id), ...extras.map((e) => `x:${e.id}`)];
  const stapleIds = staples.map((s) => `s:${s.id}`);
  const pantryIds = pantryItems.map((i) => i.id);
  const allRows = [...buyIds, ...stapleIds];
  const doneCount = allRows.filter((id) => checked[id]).length;

  const addExtra = () => {
    const name = newItem.trim();
    if (!name) return;
    setExtras([...extras, { id: Date.now(), name }]);
    setNewItem("");
  };

  const sendPicnic = async () => {
    const ids = [];
    let missing = 0;
    allRows.filter((id) => checked[id]).forEach((id) => {
      const key = id.startsWith("s:") ? staples.find((s) => `s:${s.id}` === id)?.name?.toLowerCase() : id;
      const a = key && assocFor(associations, key);
      if (a?.id) ids.push(String(a.id)); else missing++;
    });
    if (!ids.length) { toast(t.noAssociation(missing)); return; }
    setSending(true);
    try {
      await sendToPicnicCart(ids);
      toast(t.sentPicnic(ids.length) + (missing ? ` · ${t.noAssociation(missing)}` : ""));
    } catch { toast("⚠️ Picnic"); }
    setSending(false);
  };

  // Select-all toggle for a set of row ids — mirrors the original app's
  // per-section "select all" affordance.
  const renderSelectAll = (ids) => {
    if (!ids.length) return null;
    const allOn = ids.every((id) => checked[id]);
    return (
      <button className={`select-all-row${allOn ? " on" : ""}`} onClick={() => setMany(ids, !allOn)}>
        <span className="circ">{allOn && <Icons.check size={12} weight={3.4} />}</span>
        {allOn ? t.deselectAll : t.selectAll}
      </button>
    );
  };

  const itemRow = (i, actions) => (
    <SwipeRow key={i.id} actions={actions}>
      <div className="row" style={{ display: "block" }} onClick={() => toggle(i.id)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={`check${checked[i.id] ? " on" : ""}`}>{checked[i.id] && <Icons.check size={13} weight={3} />}</span>
          <div className="row-body">
            <div className={`row-title${checked[i.id] ? " struck" : ""}`}>{i.name}</div>
            {i.meals?.size > 0 && <div className="row-sub">{[...i.meals].join(", ")}</div>}
          </div>
        </div>
        {picnicUser && !i.extra && (
          <AssociationLine item={{ ...i, key: i.id }} association={assocFor(associations, i.id)}
            onOpenPicker={(it) => setPicking({ key: it.id, name: it.name, searchName: it.id })} />
        )}
      </div>
    </SwipeRow>
  );

  const empty = items.length === 0 && extras.length === 0;

  return (
    <>
    <Screen
      title={t.shopping}
      sub={allRows.length ? `${doneCount}/${allRows.length} ${t.checkedOff}` : null}
      right={
        <>
          {doneCount > 0 && (
            <button className="nav-txt-btn" onClick={() => setChecks({ ...checks, checked: {} })}>{t.clearChecked}</button>
          )}
          {picnicUser && <NavBtn icon={Icons.cart} onClick={() => setCartOpen(true)} label={t.picnicCart} />}
        </>
      }
    >
      <div className="search" style={{ marginTop: 8 }}>
        <Icons.plus size={17} weight={2.2} />
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={t.addItem}
          enterKeyHint="done"
          onKeyDown={(e) => e.key === "Enter" && addExtra()} onBlur={addExtra} />
      </div>

      {empty && (
        <div className="empty">
          <div className="big">🧺</div>
          <div className="t-head">{t.nothingToBuy}</div>
          <div className="t-sub muted mt8">{t.planSomething}</div>
        </div>
      )}

      {buyIds.length > 0 && <div className="mt14">{renderSelectAll(buyIds)}</div>}

      {AISLE_ORDER.filter((a) => groups[a]?.length).map((aisle) => (
        <List key={aisle} header={t[`aisle_${aisle}`]}>
          {groups[aisle].map((i) =>
            i.extra
              ? itemRow(i, [{ label: t.remove, color: "red", icon: Icons.trash, onClick: () => setExtras(extras.filter((e) => e.id !== i.extra)) }])
              : itemRow(i, [{ label: t.toPantry, color: "teal", icon: Icons.house, onClick: () => toggleOverride(i.id) }])
          )}
        </List>
      ))}

      {staples.length > 0 && (
        <>
          {renderSelectAll(stapleIds)}
          <List header={t.staples}
            headerAction={<button onClick={() => setEditStaples(!editStaples)}>{editStaples ? t.done : t.edit}</button>}>
            {staples.map((s) => {
              const id = `s:${s.id}`;
              return (
                <SwipeRow key={id} actions={[{ label: t.remove, color: "red", icon: Icons.trash, onClick: () => saveStaples(staples.filter((x) => x.id !== s.id)) }]}>
                  <div className="row" style={{ display: "block" }}
                    onClick={() => (editStaples ? saveStaples(staples.filter((x) => x.id !== s.id)) : toggle(id))}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="row-lead">
                        {editStaples
                          ? <span style={{ color: "var(--red)" }}><Icons.trash size={18} /></span>
                          : <span className={`check${checked[id] ? " on" : ""}`}>{checked[id] && <Icons.check size={13} weight={3} />}</span>}
                      </span>
                      <div className="row-body">
                        <div className={`row-title${!editStaples && checked[id] ? " struck" : ""}`}>{s.name}</div>
                        <div className="row-sub">{s.category}</div>
                      </div>
                    </div>
                    {picnicUser && !editStaples && (
                      <AssociationLine item={{ id, name: s.name, key: s.name.toLowerCase(), amounts: [] }}
                        association={assocFor(associations, s.name.toLowerCase())}
                        onOpenPicker={(it) => setPicking({ key: it.key, name: it.name, searchName: it.key })} />
                    )}
                  </div>
                </SwipeRow>
              );
            })}
            {editStaples && (
              <div className="row static">
                <StapleAdder onAdd={(name) => {
                  const nid = staples.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0) + 1;
                  saveStaples([...staples, { id: nid, category: "Overig", name }]);
                }} placeholder={t.addItem} />
              </div>
            )}
          </List>
        </>
      )}

      {pantryItems.length > 0 && (
        <>
          {renderSelectAll(pantryIds)}
          <List header={t.pantry} footer={`← ${t.toList}: swipe`}>
            {pantryItems.map((i) => (
              <SwipeRow key={i.id} actions={[{ label: t.toList, color: "teal", icon: Icons.cart, onClick: () => toggleOverride(i.id) }]}>
                <div className="row" style={{ display: "block" }} onClick={() => toggle(i.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={`check${checked[i.id] ? " on" : ""}`}>{checked[i.id] && <Icons.check size={13} weight={3} />}</span>
                    <div className="row-body">
                      <div className={`row-title${checked[i.id] ? " struck" : ""}`}><Icons.house size={13} weight={2.2} style={{ verticalAlign: -2, marginRight: 4, color: "var(--label-3)" }} />{i.name}</div>
                      {i.meals?.size > 0 && <div className="row-sub">{[...i.meals].join(", ")}</div>}
                    </div>
                  </div>
                  {picnicUser && (
                    <AssociationLine item={{ ...i, key: i.id }} association={assocFor(associations, i.id)}
                      onOpenPicker={(it) => setPicking({ key: it.id, name: it.name, searchName: it.id })} />
                  )}
                </div>
              </SwipeRow>
            ))}
          </List>
        </>
      )}

      {picnicUser && doneCount > 0 && <div style={{ height: 74 }} />}

      {picking && (
        <PicnicPicker item={picking}
          associations={associations} saveAssociations={saveAssociations}
          onClose={() => setPicking(null)} onExpired={onPicnicExpired} toast={toast} />
      )}
      <PicnicCart open={cartOpen} onClose={() => setCartOpen(false)}
        associations={associations} mealsByIngredient={mealsByIngredient}
        onExpired={onPicnicExpired} toast={toast} />
    </Screen>

    {picnicUser && doneCount > 0 && (
      <button className="action-bar" disabled={sending} onClick={sendPicnic}>
        <Icons.cart size={18} weight={2.2} /> {t.sendPicnic} ({doneCount})
      </button>
    )}
    </>
  );
}

function StapleAdder({ onAdd, placeholder }) {
  const [v, setV] = useState("");
  const commit = () => { if (v.trim()) { onAdd(v.trim()); setV(""); } };
  return (
    <input className="field" style={{ background: "var(--fill-2)" }} value={v} placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      enterKeyHint="done"
      onKeyDown={(e) => e.key === "Enter" && commit()}
      onBlur={commit} />
  );
}
