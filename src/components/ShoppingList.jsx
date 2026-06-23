import { useMemo, useState, useEffect, useRef } from "react";
import { isPantryByDefault } from "../data/pantryStaples";
import { useLanguage } from "../useLanguage";
import { getIngredientName, getRecipeName, translateUnit } from "../utils/recipeTranslation";
import { translateStapleName } from "../data/stapleTranslations";

const LS_OVERRIDES = "familie-eten:pantryOverrides";
const STAPLE_CATEGORIES = ["Ontbijt", "Lunch", "Tussendoor", "Overig"];
const CAT_KEY = { Ontbijt: "catBreakfast", Lunch: "catLunch", Tussendoor: "catSnacks", Overig: "catOther" };

const loadOverrides = () => {
  try { return new Set(JSON.parse(localStorage.getItem(LS_OVERRIDES)) ?? []); }
  catch { return new Set(); }
};

// Case-insensitive lookup by the ingredient field stored in each association value.
const getAssociation = (associations, itemId) => {
  if (!associations || !itemId) return undefined;
  const lower = itemId.toLowerCase();
  for (const [, v] of Object.entries(associations)) {
    if (v?.ingredient?.toLowerCase() === lower) return v;
  }
  return undefined;
};

const getStaplePicnicItem = (staple) => ({
  id: `staple:${staple.id}`,
  name: staple.name,
  searchName: staple.name,
});

export default function ShoppingList({
  weekPlan,
  recipes,
  family,
  days,
  staples = [],
  onUpdateStaples,
  picnicUser,
  picnicAssociations = {},
  onUpdatePicnicAssociation,
  picnicAssocSaveFailed = false,
  onReloadPicnicAssociations,
  onPicnicSessionExpired,
  picnicSendKey = 0,
  picnicCartKey = 0,
  activeListTab = "maaltijden",
  onActiveListTabChange,
  staplesEditMode = false,
  onStaplesEditModeChange,
  shoppingEditMode = false,
  onShoppingEditModeChange,
  searchQuery = "",
}) {
  const { t, lang } = useLanguage();
  const [checked, setChecked] = useState({});
  const [dismissed, setDismissed] = useState({});
  const [picnicSend, setPicnicSend] = useState({ busy: false, result: null, error: "" });
  const [picnicCart, setPicnicCart] = useState({ open: false, loading: false, items: [], totalPrice: null, error: "" });
  const [picnicCartUpdating, setPicnicCartUpdating] = useState({});
  const [overrides, setOverrides] = useState(loadOverrides);
  const [nameEdits, setNameEdits] = useState({});
  const [picnicPicker, setPicnicPicker] = useState(null);
  const [picnicSearch, setPicnicSearch] = useState({ loading: false, error: "", results: [] });
  const picnicPickerRef = useRef(null);
  const picnicSearchSeqRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(LS_OVERRIDES, JSON.stringify([...overrides]));
  }, [overrides]);

  useEffect(() => {
    if (!staplesEditMode) setNameEdits({});
  }, [staplesEditMode]);

  useEffect(() => {
    picnicPickerRef.current = picnicPicker;
  }, [picnicPicker]);

  const ingredientMap = useMemo(() => {
    const map = {};
    days.forEach((day) => {
      family.forEach((member) => {
        const recipeId = weekPlan[day][member];
        if (!recipeId) return;
        const recipe = recipes.find((r) => r.id === recipeId);
        if (!recipe) return;
        recipe.ingredients.forEach(({ name, amount, unit }, ingIdx) => {
          const id = name.toLowerCase();
          const displayName = getIngredientName(recipe, ingIdx, lang) ?? name;
          const mealName = getRecipeName(recipe, lang);
          const quantity = unit ? `${amount} ${translateUnit(unit, lang)}` : String(amount);
          if (!map[id]) map[id] = {
            id,
            name: displayName,
            searchName: name,
            amounts: [],
            meals: new Set(),
            usages: [],
          };
          map[id].amounts.push(quantity);
          map[id].meals.add(mealName);
          map[id].usages.push({ mealName, ingredientName: displayName, quantity });
        });
      });
    });
    return map;
  }, [weekPlan, recipes, family, days, lang]);

  const items = Object.values(ingredientMap).sort((a, b) => a.name.localeCompare(b.name));
  const picnicCartAssociations = useMemo(() => {
    const grouped = {};
    items.forEach((ingredient) => {
      const productId = getAssociation(picnicAssociations, ingredient.id)?.id;
      if (!productId || !ingredient.usages?.length) return;
      if (!grouped[productId]) grouped[productId] = [];
      grouped[productId].push(...ingredient.usages);
    });
    return grouped;
  }, [items, picnicAssociations]);

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

  const searchFilter = (i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return i.name.toLowerCase().includes(q) ||
      i.usages?.some((u) => u.recipe?.toLowerCase().includes(q));
  };
  const freshItems = items.filter((i) => !isPantry(i.id) && searchFilter(i));
  const pantryItems = items.filter((i) => isPantry(i.id) && searchFilter(i));

  const totalPlanned = days.reduce(
    (acc, day) => acc + family.filter((m) => {
      const id = weekPlan[day]?.[m];
      return Boolean(id) && recipes.some((r) => r.id === id);
    }).length,
    0
  );

  const toggleCheck = (key) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleDismiss = (key) =>
    setDismissed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleStaple = (id) => toggleCheck(`s:${id}`);

  const uncheckedFresh  = freshItems.filter((i) => !checked[i.id]);
  const checkedFresh    = freshItems.filter((i) =>  checked[i.id]);
  const uncheckedPantry = pantryItems.filter((i) => !checked[i.id]);
  const checkedPantry   = pantryItems.filter((i) =>  checked[i.id]);
  const checkedMealItems = [...checkedFresh, ...checkedPantry];
  const checkedStaples  = staples.filter((s) =>  checked[`s:${s.id}`]);
  const checkedStaplePicnicItems = checkedStaples.map(getStaplePicnicItem);
  const checkedItemsForPicnic = [...checkedMealItems, ...checkedStaplePicnicItems];
  const missingPicnicChoiceItems = checkedItemsForPicnic.filter((item) => !getAssociation(picnicAssociations, item.id));

  const mealCheckedCount   = checkedMealItems.length;
  const stapleCheckedCount = checkedStaples.length;
  const checkedItemCount = mealCheckedCount + stapleCheckedCount;

  const clearStapleChecks = () => setChecked((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith("s:"))));
  const clearAllChecks = () => setChecked({});
  const updatePicnicPickerQuery = (value) => setPicnicPicker((prev) => prev ? { ...prev, query: value } : prev);

  const addStaple = (category, name) => {
    const nextId = staples.reduce((maxId, staple) => {
      const numericId = Number(staple.id);
      return Number.isFinite(numericId) ? Math.max(maxId, numericId) : maxId;
    }, 0) + 1;
    onUpdateStaples([...staples, { id: nextId, category, name }]);
  };

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

  const searchPicnic = async (itemId, query) => {
    const trimmed = query.trim();
    if (!picnicUser || !trimmed) {
      setPicnicSearch({ loading: false, error: "", results: [] });
      return;
    }

    const seq = picnicSearchSeqRef.current + 1;
    picnicSearchSeqRef.current = seq;
    setPicnicSearch({ loading: true, error: "", results: [] });

    try {
      const response = await fetch("/api/picnic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (picnicSearchSeqRef.current !== seq || picnicPickerRef.current?.itemId !== itemId) return;
if (response.status === 401) { setPicnicSearch({ loading: false, error: "", results: [] }); onPicnicSessionExpired?.(); return; }
      if (!response.ok) {
        setPicnicSearch({ loading: false, error: data?.message || t("picnicSearchFailed"), results: [] });
        return;
      }
      setPicnicSearch({ loading: false, error: "", results: data.results ?? [] });
    } catch {
      if (picnicSearchSeqRef.current !== seq || picnicPickerRef.current?.itemId !== itemId) return;
      setPicnicSearch({ loading: false, error: t("picnicSearchFailed"), results: [] });
    }
  };

  const togglePicnicPicker = (item) => {
    if (!picnicUser) return;
    if (picnicPicker?.itemId === item.id) {
      picnicPickerRef.current = null;
      setPicnicPicker(null);
      setPicnicSearch({ loading: false, error: "", results: [] });
      return;
    }
    const query = item.searchName ?? item.name;
    const nextPicker = { itemId: item.id, query };
    picnicPickerRef.current = nextPicker;
    setPicnicPicker(nextPicker);
    searchPicnic(item.id, query);
  };

  const handleSelectPicnicAssociation = (itemId, result) => {
    picnicPickerRef.current = null;
    setPicnicPicker(null);
    setPicnicSearch({ loading: false, error: "", results: [] });
    onUpdatePicnicAssociation(itemId, result ? { ...result, ingredient: itemId } : result);
  };

  const sendToPicnic = async () => {
    if (!picnicUser) {
      setPicnicSend({ busy: false, result: null, error: t("picnicSendNotLoggedIn") });
      return;
    }

    const itemsWithAssociation = checkedItemsForPicnic
      .map((item) => ({ item, association: getAssociation(picnicAssociations, item.id) }))
      .filter(({ association }) => association);
    if (itemsWithAssociation.length === 0) {
      setPicnicSend({ busy: false, result: null, error: t("picnicSendNoAssociations") });
      return;
    }

    const productIds = itemsWithAssociation.map(({ association }) => association.id);
    setPicnicSend({ busy: true, result: null, error: "" });

    // Read current cart before adding
    await openPicnicCart();

    try {
      const response = await fetch("/api/picnic-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });
      const data = await response.json().catch(() => ({}));
if (response.status === 401) { setPicnicSend({ busy: false, result: null, error: t("picnicSendNotLoggedIn") }); onPicnicSessionExpired?.(); return; }
      if (!response.ok) {
        setPicnicSend({ busy: false, result: null, error: data?.message || t("picnicSendFailed") });
        openPicnicCart();
        return;
      }
      setPicnicSend({ busy: false, result: { added: data.added, skipped: data.skipped }, error: "" });
      // Read cart again after adding to show updated contents
      openPicnicCart();
    } catch {
      setPicnicSend({ busy: false, result: null, error: t("picnicSendFailed") });
    }
  };

  const openPicnicCart = async () => {
    if (!picnicUser) return;
    setPicnicCart({ open: true, loading: true, items: [], totalPrice: null, error: "" });

    try {
      const response = await fetch("/api/picnic-cart");
      const data = await response.json().catch(() => ({}));
if (response.status === 401) { setPicnicCart({ open: false, loading: false, items: [], totalPrice: null, error: "" }); onPicnicSessionExpired?.(); return; }
      if (!response.ok) {
        setPicnicCart({ open: true, loading: false, items: [], totalPrice: null, error: data?.message || t("picnicCartFailed") });
        return;
      }
      setPicnicCart({ open: true, loading: false, items: data.items ?? [], totalPrice: data.totalPrice ?? null, error: "" });
    } catch {
      setPicnicCart({ open: true, loading: false, items: [], totalPrice: null, error: t("picnicCartFailed") });
    }
  };

  useEffect(() => {
    if (picnicSendKey > 0) sendToPicnic();
  }, [picnicSendKey]);

  useEffect(() => {
    if (picnicCartKey > 0) openPicnicCart();
  }, [picnicCartKey]);

  const refreshPicnicCart = async () => {
    if (!picnicUser) return;
    try {
      const response = await fetch("/api/picnic-cart");
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { onPicnicSessionExpired?.(); return; }
      if (!response.ok) return;
      setPicnicCart((prev) => ({ ...prev, items: data.items ?? [], totalPrice: data.totalPrice ?? null, error: "" }));
    } catch { /* silent refresh */ }
  };

  const updateCartItemQuantity = async (productId, newCount) => {
    if (!picnicUser) return;
    setPicnicCartUpdating((prev) => ({ ...prev, [productId]: true }));
    try {
      const response = await fetch("/api/picnic-cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, count: newCount }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { onPicnicSessionExpired?.(); return; }
      if (!response.ok) {
        setPicnicCart((prev) => ({ ...prev, error: data?.message || t("picnicCartUpdateFailed") }));
      } else {
        await refreshPicnicCart();
      }
    } catch {
      setPicnicCart((prev) => ({ ...prev, error: t("picnicCartUpdateFailed") }));
    } finally {
      setPicnicCartUpdating((prev) => { const n = { ...prev }; delete n[productId]; return n; });
    }
  };

  const tabBar = (
    <div className="shopping-tabs">
      <button className={`shopping-tab${activeListTab === "maaltijden" ? " active" : ""}`} onClick={() => onActiveListTabChange("maaltijden")}>{t("tabList")}</button>
      <button className={`shopping-tab${activeListTab === "kast" ? " active" : ""}`} onClick={() => onActiveListTabChange("kast")}>{t("tabPantry")}</button>
      <button className={`shopping-tab${activeListTab === "staples" ? " active" : ""}`} onClick={() => onActiveListTabChange("staples")}>{t("tabStaples")}</button>
    </div>
  );

  const activeFresh = freshItems.filter((i) => !dismissed[i.id]);
  const activePantry = pantryItems.filter((i) => !dismissed[i.id]);
  const totalAll = activeFresh.length + activePantry.length;
  const checkedAll = [...activeFresh, ...activePantry].filter((i) => checked[i.id]).length;

  const picnicSendPanel = (
    <>
      {(picnicSend.result || picnicSend.error) && (
        <div className={`picnic-banner${picnicSend.error ? " picnic-banner--error" : ""}`}>
          <span>
            {picnicSend.error
              ? picnicSend.error
              : picnicSend.result.added === 0
                ? t("picnicSendNoneAdded")
                : picnicSend.result.skipped > 0
                  ? t("picnicSendSuccessWithSkipped", { added: picnicSend.result.added, skipped: picnicSend.result.skipped })
                  : t("picnicSendSuccess", { added: picnicSend.result.added })}
          </span>
          <button className="picnic-close" onClick={() => setPicnicSend({ busy: false, result: null, error: "" })}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
      )}

      {picnicCart.open && (
        <div className="picnic-cart-panel">
          <div className="picnic-cart-header">
            <strong>{t("picnicCartTitle")}</strong>
            <button className="picnic-close" onClick={() => setPicnicCart({ open: false, loading: false, items: [], totalPrice: null, error: "" })}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          {picnicCart.loading && <p className="picnic-cart-feedback">{t("picnicCartLoading")}</p>}
          {picnicCart.error && <p className="picnic-cart-feedback picnic-cart-feedback--error">{picnicCart.error}</p>}
          {!picnicCart.loading && !picnicCart.error && picnicCart.items.length === 0 && (
            <p className="picnic-cart-feedback">{t("picnicCartEmpty")}</p>
          )}
          {picnicCart.items.length > 0 && (
            <>
              <ul className="picnic-cart-list">
                {picnicCart.items.map((item) => (
                  <PicnicCartItem
                    key={item.id}
                    item={item}
                    picnicUser={picnicUser}
                    linkedRecipes={picnicCartAssociations[item.id] ?? []}
                    picnicCartUpdating={picnicCartUpdating}
                    updateCartItemQuantity={updateCartItemQuantity}
                    lang={lang}
                  />
                ))}
              </ul>
              {typeof picnicCart.totalPrice === "number" && (
                <p className="picnic-cart-total">
                  {t("picnicCartTotal", {
                    price: new Intl.NumberFormat(
                      lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "nl-NL",
                      { style: "currency", currency: "EUR" }
                    ).format(picnicCart.totalPrice / 100),
                  })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="shopping-list">
      {totalAll > 0 && (
        <div className="progress-bar">
          <div className={`progress-fill${checkedAll === totalAll ? " complete" : ""}`} style={{ width: `${(checkedAll / totalAll) * 100}%` }} />
        </div>
      )}

      {activeListTab === "maaltijden" && (
        <>
          <div className="shopping-top-bar">
            {tabBar}
          </div>
          {freshItems.length > 0 && !shoppingEditMode && (
            <div className="pantry-actions">
              <button className={`select-all-toggle${freshItems.every((item) => checked[item.id]) ? " on" : ""}`} onClick={() => {
                const allChecked = freshItems.every((item) => checked[item.id]);
                freshItems.forEach((item) => {
                  if (allChecked ? checked[item.id] : !checked[item.id]) toggleCheck(item.id);
                });
              }} />
            </div>
          )}

          {picnicSendPanel}

          {picnicAssocSaveFailed && (
            <div className="save-failed-banner" role="alert">
              <span className="warning-icon">⚠️</span>
              <span>
                <strong>{t("notSaved")}</strong> — {t("conflictMsg")}
              </span>
              {onReloadPicnicAssociations && (
                <button className="save-failed-reload" onClick={onReloadPicnicAssociations}>
                  {t("loadLatest")}
                </button>
              )}
            </div>
          )}

          {missingPicnicChoiceItems.length > 0 && (
            <div className="picnic-warning" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{t("picnicMissingChoiceWarning", { n: missingPicnicChoiceItems.length })}</span>
            </div>
          )}



          {totalPlanned === 0 ? (
            <div className="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p>{t("noMealsShort")}</p>
            </div>
          ) : (
            <>
              <IngredientList
                items={freshItems}
                onCheck={toggleCheck}
                checkedIds={checked}
                onTogglePantry={toggleOverride}
                isPantry={false}
                editMode={shoppingEditMode}
                dismissedIds={dismissed}
                onToggleDismiss={toggleDismiss}
                picnicUser={picnicUser}
                picnicAssociations={picnicAssociations}
                picnicPicker={picnicPicker}
                picnicSearch={picnicSearch}
                onTogglePicnicPicker={togglePicnicPicker}
                onPicnicQueryChange={updatePicnicPickerQuery}
                onPicnicSearch={searchPicnic}
                onSelectPicnicAssociation={handleSelectPicnicAssociation}
              />
            </>
          )}
        </>
      )}

      {activeListTab === "staples" && (
        <>
          <div className="shopping-top-bar">
            {tabBar}
          </div>

          {staples.length > 0 && !staplesEditMode && (
            <div className="pantry-actions">
              <button className={`select-all-toggle${staples.every((s) => checked[`s:${s.id}`]) ? " on" : ""}`} onClick={() => {
                const allChecked = staples.every((s) => checked[`s:${s.id}`]);
                staples.forEach((s) => {
                  if (allChecked ? checked[`s:${s.id}`] : !checked[`s:${s.id}`]) toggleStaple(s.id);
                });
              }} />
            </div>
          )}

          {picnicSendPanel}



          {STAPLE_CATEGORIES.map((cat) => {
            const catItems = staples.filter((s) => s.category === cat && (!searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || translateStapleName(s.name, lang).toLowerCase().includes(searchQuery.toLowerCase())));
            if (!staplesEditMode && catItems.length === 0) return null;
            return (
              <div key={cat} className="staples-category">
                <h4 className="staples-category-title">{t(CAT_KEY[cat])}</h4>
                <ul className="staples-list">
                  {catItems.map((item) => {
                    const isChecked = checked[`s:${item.id}`];
                    if (staplesEditMode) {
                      return (
                        <li key={item.id} className="staples-item editing" onClick={() => removeStaple(item.id)}>
                          <span className="check-box dismiss-circle">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#c0392b" fillOpacity="0.5" stroke="none"/><line x1="8" y1="12" x2="16" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                          </span>
                          <div className="ingredient-details">
                            <span className="staples-item-name">{translateStapleName(item.name, lang)}</span>
                          </div>
                        </li>
                      );
                    }
                    return (
                    <li
                      key={item.id}
                      className={`staples-item${isChecked ? " done" : ""}`}
                      onClick={() => toggleStaple(item.id)}
                    >
                      <span className={`check-box${isChecked ? " checked" : ""}`}>{isChecked ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="11" fill="#2a9d8f" stroke="none"/><polyline points="20 6 9 17 4 12" stroke="white"/></svg> : "○"}</span>
                       <div className="ingredient-details">
                         <span className="staples-item-name">{translateStapleName(item.name, lang)}</span>
                         <StaplePicnicAssociation
                           staple={item}
                           picnicAssociations={picnicAssociations}
                           picnicUser={picnicUser}
                           picnicPicker={picnicPicker}
                           picnicSearch={picnicSearch}
                           onTogglePicnicPicker={togglePicnicPicker}
                           onPicnicQueryChange={updatePicnicPickerQuery}
                           onPicnicSearch={searchPicnic}
                           onSelectPicnicAssociation={handleSelectPicnicAssociation}
                         />
                       </div>
                    </li>
                    );
                  })}
                </ul>
                {staplesEditMode && <AddStapleRow onAdd={(name) => addStaple(cat, name)} placeholder={t("addItemPlaceholder")} />}
              </div>
            );
          })}
        </>
      )}

      {activeListTab === "kast" && (
        <>
          <div className="shopping-top-bar">
            {tabBar}
          </div>
          {picnicSendPanel}

          {pantryItems.length > 0 && !shoppingEditMode && (
            <div className="pantry-actions">
              <button className={`select-all-toggle${pantryItems.every((item) => checked[item.id]) ? " on" : ""}`} onClick={() => {
                const allChecked = pantryItems.every((item) => checked[item.id]);
                pantryItems.forEach((item) => {
                  if (allChecked ? checked[item.id] : !checked[item.id]) toggleCheck(item.id);
                });
              }} />
            </div>
          )}
          {pantryItems.length === 0 ? (
            <div className="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p>{t("noMealsShort")}</p>
            </div>
          ) : (
            <IngredientList
              items={pantryItems}
              onCheck={toggleCheck}
              checkedIds={checked}
              onTogglePantry={toggleOverride}
              isPantry={true}
              editMode={shoppingEditMode}
              dismissedIds={dismissed}
              onToggleDismiss={toggleDismiss}
              picnicUser={picnicUser}
              picnicAssociations={picnicAssociations}
              picnicPicker={picnicPicker}
              picnicSearch={picnicSearch}
              onTogglePicnicPicker={togglePicnicPicker}
              onPicnicQueryChange={updatePicnicPickerQuery}
              onPicnicSearch={searchPicnic}
              onSelectPicnicAssociation={handleSelectPicnicAssociation}
            />
          )}
        </>
      )}
    </div>
  );
}

function IngredientList({
  items,
  onCheck,
  onTogglePantry,
  isPantry,
  done = false,
  checkedIds,
  editMode = false,
  dismissedIds = {},
  onToggleDismiss,
  picnicUser,
  picnicAssociations,
  picnicPicker,
  picnicSearch,
  onTogglePicnicPicker,
  onPicnicQueryChange,
  onPicnicSearch,
  onSelectPicnicAssociation,
}) {
  const { t } = useLanguage();
  if (items.length === 0) return null;
  const grouped = {};
  items.forEach((item) => {
    const meal = item.meals ? [...item.meals][0] : "_";
    if (!grouped[meal]) grouped[meal] = [];
    grouped[meal].push(item);
  });
  return (
    <>
      {Object.entries(grouped).map(([meal, groupItems]) => {
        const visibleItems = editMode ? groupItems : groupItems.filter((item) => !dismissedIds[item.id]);
        if (visibleItems.length === 0) return null;
        return (
        <div key={meal} className="staples-category">
          {meal !== "_" && <h4 className="staples-category-title">{meal}</h4>}
          <ul className="ingredient-list">
            {visibleItems.map((item) => {
              const isDone = checkedIds ? checkedIds[item.id] : done;
              const isDismissed = !!dismissedIds[item.id];
              if (editMode) {
                return (
                  <li key={item.id} className={`ingredient-item edit-mode${isDismissed ? " dismissed" : ""}`} onClick={() => onToggleDismiss(item.id)}>
                    <span className="check-box dismiss-circle">
                      {isDismissed
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="none" stroke="#888" strokeWidth="1.5"/><line x1="8" y1="12" x2="16" y2="12" stroke="#888" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="8" x2="12" y2="16" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#c0392b" fillOpacity="0.5" stroke="none"/><line x1="8" y1="12" x2="16" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                      }
                    </span>
                    <div className="ingredient-details">
                      <span className="ingredient-name">{item.name}</span>
                      <span className="ingredient-amounts">{item.amounts.join(", ")}</span>
                    </div>
                    <button className="pantry-move-btn" onClick={(e) => onTogglePantry(e, item.name)} title={isPantry ? "Move to list" : "Move to pantry"}>
                      {isPantry
                        ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l-4-4 4-4"/><path d="M5 10h11a4 4 0 0 1 0 8h-1"/></svg>
                        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      }
                    </button>
                  </li>
                );
              }
              return (
              <li key={item.id} className={`ingredient-item${isDone ? " done" : ""}`} onClick={() => onCheck(item.id)}>
                <span className={`check-box${isDone ? " checked" : ""}`}>{isDone ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="11" fill="#2a9d8f" stroke="none"/><polyline points="20 6 9 17 4 12" stroke="white"/></svg> : "○"}</span>
                <div className="ingredient-details">
                  <span className="ingredient-name">{item.name}</span>
                  <span className="ingredient-amounts">{item.amounts.join(", ")}</span>
                  <PicnicAssociation
              item={item}
              association={getAssociation(picnicAssociations, item.id)}
              picnicUser={picnicUser}
              pickerOpen={picnicPicker?.itemId === item.id}
              pickerQuery={picnicPicker?.itemId === item.id ? picnicPicker.query : ""}
              picnicSearch={picnicSearch}
              onTogglePicker={onTogglePicnicPicker}
              onQueryChange={onPicnicQueryChange}
              onSearch={onPicnicSearch}
              onSelect={onSelectPicnicAssociation}
            />
          </div>
        </li>
              );
            })}
          </ul>
        </div>
        );
      })}
    </>
  );
}

function StaplePicnicAssociation({
  staple,
  picnicAssociations,
  picnicUser,
  picnicPicker,
  picnicSearch,
  onTogglePicnicPicker,
  onPicnicQueryChange,
  onPicnicSearch,
  onSelectPicnicAssociation,
}) {
  const item = getStaplePicnicItem(staple);
  return (
    <PicnicAssociation
      item={item}
      association={getAssociation(picnicAssociations, item.id)}
      picnicUser={picnicUser}
      pickerOpen={picnicPicker?.itemId === item.id}
      pickerQuery={picnicPicker?.itemId === item.id ? picnicPicker.query : ""}
      picnicSearch={picnicSearch}
      onTogglePicker={onTogglePicnicPicker}
      onQueryChange={onPicnicQueryChange}
      onSearch={onPicnicSearch}
      onSelect={onSelectPicnicAssociation}
    />
  );
}

const PICNIC_IMAGE_BASE = "https://storefront-prod.nl.picnicinternational.com/static/images";

function usePicnicProductDetail(productId, open, loggedIn) {
  const [productDetail, setProductDetail] = useState({ productId: null, description: null });
  const [detailLoadingProductId, setDetailLoadingProductId] = useState(null);
  const productDetailFetchedForRef = useRef(null);

  useEffect(() => {
    if (!open || !productId || !loggedIn) return undefined;
    if (productDetailFetchedForRef.current === productId) return undefined;

    let cancelled = false;
    setDetailLoadingProductId(productId);
    fetch("/api/picnic-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        productDetailFetchedForRef.current = productId;
        setProductDetail({ productId, description: data.description ?? null });
        setDetailLoadingProductId((current) => (current === productId ? null : current));
      })
      .catch(() => {
        if (cancelled) return;
        productDetailFetchedForRef.current = productId;
        setProductDetail({ productId, description: null });
        setDetailLoadingProductId((current) => (current === productId ? null : current));
      });
    return () => { cancelled = true; };
  }, [loggedIn, open, productId]);

  return {
    detailLoading: detailLoadingProductId === productId,
    productDetail: productDetail.productId === productId ? productDetail : null,
  };
}

function PicnicProductPopover({ product, picnicUser, open, className = "picnic-association-popover" }) {
  const { t, lang } = useLanguage();
  const { detailLoading, productDetail } = usePicnicProductDetail(product?.id, open, !!picnicUser);
  const priceFormatter = useMemo(
    () => new Intl.NumberFormat(lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "nl-NL", {
      style: "currency",
      currency: "EUR",
    }),
    [lang]
  );
  const formattedPrice = typeof product?.displayPrice === "number"
    ? priceFormatter.format(product.displayPrice / 100)
    : null;
  const imageId = product?.imageId || null;
  const imageUrl = imageId ? `${PICNIC_IMAGE_BASE}/${imageId}/small.png` : null;

  if (!open || !product) return null;

  return (
    <div className={className} role="tooltip">
      <div className="picnic-popover-header">
        {imageUrl && (
          <img
            className="picnic-popover-image"
            src={imageUrl}
            alt={product.name}
            loading="lazy"
          />
        )}
        <div className="picnic-popover-header-text">
          <strong className="picnic-association-popover-name">{product.name}</strong>
          {(product.unitQuantity || formattedPrice) && (
            <span className="picnic-association-popover-meta">
              {[product.unitQuantity, formattedPrice].filter(Boolean).join(" · ")}
            </span>
          )}
          <span className="picnic-association-popover-id">#{product.id}</span>
        </div>
      </div>
      {picnicUser && (
        detailLoading
          ? <span className="picnic-popover-description loading">{t("loading")}</span>
          : productDetail?.description
            ? <p className="picnic-popover-description">{productDetail.description}</p>
            : null
      )}
    </div>
  );
}

function PicnicCartItem({ item, picnicUser, linkedRecipes, picnicCartUpdating, updateCartItemQuantity, lang }) {
  const { t } = useLanguage();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsTimeoutRef = useRef(null);
  const detailsLongPressRef = useRef(false);
  const detailsRef = useRef(null);
  const priceFormatter = useMemo(
    () => new Intl.NumberFormat(lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "nl-NL", {
      style: "currency",
      currency: "EUR",
    }),
    [lang]
  );
  const product = useMemo(() => ({ ...item, displayPrice: item.price }), [item]);

  useEffect(() => () => {
    if (detailsTimeoutRef.current) clearTimeout(detailsTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!detailsOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!detailsRef.current?.contains(event.target)) {
        setDetailsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [detailsOpen]);

  const clearDetailsTimeout = () => {
    if (detailsTimeoutRef.current) {
      clearTimeout(detailsTimeoutRef.current);
      detailsTimeoutRef.current = null;
    }
  };

  const openDetails = () => setDetailsOpen(true);

  const closeDetails = () => {
    clearDetailsTimeout();
    detailsLongPressRef.current = false;
    setDetailsOpen(false);
  };

  const handleTouchStart = () => {
    detailsLongPressRef.current = false;
    clearDetailsTimeout();
    detailsTimeoutRef.current = setTimeout(() => {
      detailsLongPressRef.current = true;
      setDetailsOpen(true);
      detailsTimeoutRef.current = null;
    }, 450);
  };

  const handleTouchEnd = () => {
    clearDetailsTimeout();
  };

  const qty = item.count ?? 1;
  const isUnavailable = item.available === false;
  const hasPrice = typeof item.price === "number" && !isUnavailable;

  return (
    <li
      ref={detailsRef}
      className={`picnic-cart-item${isUnavailable ? " picnic-cart-item--unavailable" : ""}`}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') openDetails(); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') closeDetails(); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={closeDetails}
      onTouchMove={handleTouchEnd}
    >
      <div className="picnic-cart-item-info">
        <div className="picnic-cart-item-name-row">
          <span className="picnic-cart-item-name">{item.name}</span>
          <button
            type="button"
            className="picnic-info-btn"
            onClick={(e) => { e.stopPropagation(); setDetailsOpen((o) => !o); }}
            onFocus={(e) => { if (e.target.matches(':focus-visible')) openDetails(); }}
            onBlur={closeDetails}
            aria-label="Info"
          >i</button>
        </div>
        {item.unitQuantity && (
          <span className="picnic-cart-item-meta">{item.unitQuantity}</span>
        )}
        {linkedRecipes.length > 0 && (
          <ul className="picnic-cart-item-links">
            {linkedRecipes.map((link, index) => (
              <li key={`${item.id}-${link.mealName}-${link.ingredientName}-${link.quantity}-${index}`} className="picnic-cart-item-link">
                <span className="picnic-cart-item-link-meal">{link.mealName}</span>
                <span className="picnic-cart-item-link-detail">
                  {link.ingredientName} ({link.quantity})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="picnic-cart-item-pricing">
        <div className="picnic-cart-item-qty-controls">
          <button
            className="picnic-cart-qty-btn"
            aria-label={t("picnicCartDecreaseQty")}
            disabled={!!picnicCartUpdating[item.id]}
            onClick={() => updateCartItemQuantity(item.id, qty - 1)}
          >−</button>
          <span className="picnic-cart-item-qty">{qty}</span>
          <button
            className="picnic-cart-qty-btn"
            aria-label={t("picnicCartIncreaseQty")}
            disabled={!!picnicCartUpdating[item.id]}
            onClick={() => updateCartItemQuantity(item.id, qty + 1)}
          >+</button>
        </div>
        {isUnavailable ? (
          <span className="picnic-cart-item-out-of-stock">{t("picnicOutOfStock")}</span>
        ) : (
          <>
            {hasPrice && (
              <span className="picnic-cart-item-price">{priceFormatter.format(item.price / 100)}</span>
            )}
            {hasPrice && (
              <span className="picnic-cart-item-line-total">{priceFormatter.format((item.price * qty) / 100)}</span>
            )}
          </>
        )}
      </div>
      <PicnicProductPopover
        product={product}
        picnicUser={picnicUser}
        open={detailsOpen}
        className="picnic-association-popover picnic-cart-item-popover"
      />
    </li>
  );
}

function PicnicSearchResult({ result, selected, picnicUser, onSelect }) {
  const { t, lang } = useLanguage();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsTimeoutRef = useRef(null);
  const detailsLongPressRef = useRef(false);
  const detailsRef = useRef(null);
  const priceFormatter = useMemo(
    () => new Intl.NumberFormat(lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "nl-NL", {
      style: "currency",
      currency: "EUR",
    }),
    [lang]
  );

  useEffect(() => () => {
    if (detailsTimeoutRef.current) clearTimeout(detailsTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!detailsOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!detailsRef.current?.contains(event.target)) {
        setDetailsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [detailsOpen]);

  const clearDetailsTimeout = () => {
    if (detailsTimeoutRef.current) {
      clearTimeout(detailsTimeoutRef.current);
      detailsTimeoutRef.current = null;
    }
  };

  const openDetails = () => {
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    clearDetailsTimeout();
    detailsLongPressRef.current = false;
    setDetailsOpen(false);
  };

  const handleTouchStart = () => {
    detailsLongPressRef.current = false;
    clearDetailsTimeout();
    detailsTimeoutRef.current = setTimeout(() => {
      detailsLongPressRef.current = true;
      setDetailsOpen(true);
      detailsTimeoutRef.current = null;
    }, 450);
  };

  const handleTouchEnd = () => {
    clearDetailsTimeout();
  };

  return (
    <li
      ref={detailsRef}
      className="picnic-search-result-item"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') openDetails(); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') closeDetails(); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={closeDetails}
      onTouchMove={handleTouchEnd}
    >
      <button
        type="button"
        className={`picnic-search-result${selected ? " selected" : ""}${result.maxCount === 0 ? " picnic-search-result--unavailable" : ""}`}
        onClick={() => onSelect(result)}
      >
        <span className="picnic-search-result-name">{result.name}</span>
        <span className="picnic-search-result-meta">
          {[result.unitQuantity, typeof result.displayPrice === "number" ? priceFormatter.format(result.displayPrice / 100) : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {result.maxCount === 0 && (
          <span className="picnic-search-result-out-of-stock">{t("picnicOutOfStock")}</span>
        )}
      </button>
      <button
        type="button"
        className="picnic-info-btn"
        onClick={(e) => { e.stopPropagation(); setDetailsOpen((o) => !o); }}
        onFocus={(e) => { if (e.target.matches(':focus-visible')) openDetails(); }}
        onBlur={closeDetails}
        aria-label="Info"
      >i</button>
      <PicnicProductPopover
        product={result}
        picnicUser={picnicUser}
        open={detailsOpen}
        className="picnic-association-popover picnic-search-result-popover"
      />
    </li>
  );
}

function PicnicAssociation({
  item,
  association,
  picnicUser,
  pickerOpen,
  pickerQuery,
  picnicSearch,
  onTogglePicker,
  onQueryChange,
  onSearch,
  onSelect,
}) {
  const { t, lang } = useLanguage();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsTimeoutRef = useRef(null);
  const detailsLongPressRef = useRef(false);
  const detailsRef = useRef(null);

  const priceFormatter = useMemo(
    () => new Intl.NumberFormat(lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "nl-NL", {
      style: "currency",
      currency: "EUR",
    }),
    [lang]
  );
  const formattedPrice = typeof association?.displayPrice === "number"
    ? priceFormatter.format(association.displayPrice / 100)
    : null;

  const summary = association
    ? [
      association.name,
      association.unitQuantity,
      formattedPrice,
    ].filter(Boolean).join(" · ")
    : t("picnicAssociationNone");

  useEffect(() => () => {
    if (detailsTimeoutRef.current) clearTimeout(detailsTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!detailsOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!detailsRef.current?.contains(event.target)) {
        setDetailsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [detailsOpen]);

  const clearDetailsTimeout = () => {
    if (detailsTimeoutRef.current) {
      clearTimeout(detailsTimeoutRef.current);
      detailsTimeoutRef.current = null;
    }
  };

  const openDetails = () => {
    if (association) setDetailsOpen(true);
  };

  const closeDetails = () => {
    clearDetailsTimeout();
    detailsLongPressRef.current = false;
    setDetailsOpen(false);
  };

  const handleTouchStart = () => {
    if (!association) return;
    detailsLongPressRef.current = false;
    clearDetailsTimeout();
    detailsTimeoutRef.current = setTimeout(() => {
      detailsLongPressRef.current = true;
      setDetailsOpen(true);
      detailsTimeoutRef.current = null;
    }, 450);
  };

  const handleTouchEnd = () => {
    clearDetailsTimeout();
  };

  const handleTriggerClick = () => {
    if (!association) return;
    if (detailsLongPressRef.current) {
      detailsLongPressRef.current = false;
      return;
    }
    setDetailsOpen((open) => !open);
  };

  return (
    <div className="picnic-association-block" onClick={(e) => e.stopPropagation()}>
      {association ? (
        <div
          ref={detailsRef}
          className={`picnic-association-summary${detailsOpen ? " open" : ""}`}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') openDetails(); }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') closeDetails(); }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={closeDetails}
          onTouchMove={handleTouchEnd}
        >
          <button
            type="button"
            className="picnic-association-trigger"
            onClick={handleTriggerClick}
            onFocus={(e) => { if (e.target.matches(':focus-visible')) openDetails(); }}
            onBlur={closeDetails}
            title={summary}
          >
            <span className="picnic-association-label">
              {t("picnicAssociationLabel")}: {summary}
            </span>
            <span className="picnic-info-icon" aria-hidden="true">i</span>
          </button>
          <PicnicProductPopover product={association} picnicUser={picnicUser} open={detailsOpen} />
        </div>
      ) : (
        <span className="picnic-association-label empty">
          {t("picnicAssociationLabel")}: {summary}
        </span>
      )}
      {picnicUser && (
        <div className="picnic-association-actions">
          <button
            type="button"
            className="picnic-select-btn"
            onClick={() => onTogglePicker(item)}
          >
            {association ? t("picnicAssociationChange") : t("picnicAssociationChoose")}
          </button>
        </div>
      )}
      {pickerOpen && (
        <div className="picnic-search-panel">
          <form
            className="picnic-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch(item.id, pickerQuery);
            }}
          >
            <input
              className="search-input picnic-search-input"
              value={pickerQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t("picnicSearchPlaceholder")}
            />
            <button type="submit" className="picnic-select-btn" disabled={picnicSearch.loading}>
              {picnicSearch.loading ? t("picnicSearchBusy") : t("picnicSearchBtn")}
            </button>
          </form>
          {picnicSearch.error && <p className="picnic-search-feedback">{picnicSearch.error}</p>}
          {!picnicSearch.loading && !picnicSearch.error && picnicSearch.results.length === 0 && (
            <p className="picnic-search-feedback">{t("picnicSearchEmpty")}</p>
          )}
          {picnicSearch.results.length > 0 && (
            <ul className="picnic-search-results">
              {picnicSearch.results.map((result) => (
                <PicnicSearchResult
                  key={result.id}
                  result={result}
                  selected={association?.id === result.id}
                  picnicUser={picnicUser}
                  onSelect={(r) => onSelect(item.id, r)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function AddStapleRow({ onAdd, placeholder }) {
  const [name, setName] = useState("");
  const submit = () => {
    if (name.trim()) { onAdd(name.trim()); setName(""); }
  };
  return (
    <div className="staples-add-row">
      <input
        className="staples-add-input"
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
      />
      <button className="staples-add-btn" onClick={submit} disabled={!name.trim()}>+</button>
    </div>
  );
}
