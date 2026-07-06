/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from "react";
import { useLang } from "../lib/i18n";
import { picnicSearch, picnicProductDetail, getPicnicCart, patchPicnicCart } from "../lib/api";
import { List, Row, Sheet, Icons } from "../ios/ui";

const PICNIC_IMAGE_BASE = "https://storefront-prod.nl.picnicinternational.com/static/images";

export const eur = (cents) => (typeof cents === "number" ? `€ ${(cents / 100).toFixed(2)}` : "");

// case-insensitive association lookup with object-key fallback (issue #45)
export function assocFor(associations, key) {
  if (!associations || !key) return undefined;
  const lower = key.toLowerCase();
  for (const v of Object.values(associations)) {
    if (v?.ingredient?.toLowerCase() === lower) return v;
  }
  return associations[lower];
}

/* Always-visible line under a shopping item: which Picnic product it's
   linked to (or none), the total amount needed, an inline "i" disclosure
   with image/description, and a Kies/Wijzig button that opens the picker. */
export function AssociationLine({ item, association, onOpenPicker }) {
  const { t } = useLang();
  const [infoOpen, setInfoOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const fetchedFor = useRef(null);

  useEffect(() => {
    if (!infoOpen || !association?.id || fetchedFor.current === association.id) return;
    let live = true;
    picnicProductDetail(association.id)
      .then((d) => { if (live) { setDetail(d); fetchedFor.current = association.id; } })
      .catch(() => { if (live) { setDetail({}); fetchedFor.current = association.id; } });
    return () => { live = false; };
  }, [infoOpen, association?.id]);

  const summary = association
    ? [association.name, association.unitQuantity, eur(association.displayPrice)].filter(Boolean).join(" · ")
    : t.picnicNone;
  const imageUrl = association?.imageId ? `${PICNIC_IMAGE_BASE}/${association.imageId}/small.png` : null;

  // Swallow touch + click events so interacting with the Picnic controls
  // never reaches the row's swipe handler (which would reveal "Kast").
  const stop = (e) => e.stopPropagation();

  return (
    <div className="assoc-block" onClick={stop} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop}>
      <div className="assoc-line">
        <span className="assoc-text">
          <b>{t.picnic}</b>: {summary}
          {item.amounts?.length > 0 && <> — <b>{t.picnicNeeded}</b>: {item.amounts.join(" + ")}</>}
        </span>
        {association && (
          <button className="info-dot" aria-label="Info" onClick={() => setInfoOpen((o) => !o)}>i</button>
        )}
        <button className="assoc-choose" onClick={() => onOpenPicker(item)}>
          {association ? t.picnicChange : t.picnicChoose}
        </button>
      </div>
      {infoOpen && association && (
        <div className="popover-card">
          {imageUrl && <img src={imageUrl} alt={association.name} loading="lazy" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="popover-name">{association.name}</div>
            {(association.unitQuantity || typeof association.displayPrice === "number") && (
              <div className="popover-meta">{[association.unitQuantity, eur(association.displayPrice)].filter(Boolean).join(" · ")}</div>
            )}
            {detail === null
              ? <div className="popover-desc muted">{t.loading}</div>
              : detail.description
                ? <div className="popover-desc">{detail.description}</div>
                : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* Product picker: choose/change which Picnic product an item maps to. */
export function PicnicPicker({ item, associations, saveAssociations, onClose, onExpired, toast }) {
  const { t } = useLang();
  const current = assocFor(associations, item.key);
  const [q, setQ] = useState(item.searchName || item.name);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  const search = async (query) => {
    const mine = ++seq.current;
    setBusy(true);
    try {
      const r = await picnicSearch(query);
      if (seq.current === mine) setResults(r);
    } catch (e) {
      if (e.auth) { onExpired(); onClose(); toast("⚠️ Picnic"); }
    }
    if (seq.current === mine) setBusy(false);
  };
  useEffect(() => {
    const id = setTimeout(() => search(item.searchName || item.name), 0);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (product) => {
    saveAssociations({ ...associations, [item.key]: { ...product, ingredient: item.key } });
    onClose();
  };
  const unlink = () => {
    const next = { ...associations };
    for (const [k, v] of Object.entries(next)) {
      if (k === item.key || v?.ingredient?.toLowerCase() === item.key) delete next[k];
    }
    saveAssociations(next);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={item.name}
      rightAction={<button className="nav-txt-btn" style={{ padding: 0 }} onClick={onClose}>{t.done}</button>}>
      {current && (
        <List header={t.picnicLinked}>
          <Row className="static"
            lead={<span className="assoc-dot on" />}
            title={current.name}
            sub={[current.unitQuantity, eur(current.displayPrice ?? current.display_price)].filter(Boolean).join(" · ")}
            trail={<button className="nav-txt-btn" style={{ color: "var(--red)", padding: 0, fontSize: "0.8824rem" }} onClick={unlink}>{t.remove}</button>}
          />
        </List>
      )}
      <form className="search" style={{ marginTop: current ? 6 : 2 }}
        onSubmit={(e) => { e.preventDefault(); search(q); }}>
        <Icons.search size={17} weight={2.2} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.picnicSearchPh} enterKeyHint="search" />
      </form>
      <List header={busy ? "…" : t.picnicResults}>
        {results.map((r) => (
          <Row key={r.id}
            title={r.name}
            sub={[r.unitQuantity, eur(r.displayPrice)].filter(Boolean).join(" · ")}
            trail={current?.id === r.id ? <span style={{ color: "var(--tint)" }}><Icons.check size={17} weight={2.6} /></span> : null}
            onClick={() => select(r)}
          />
        ))}
        {!busy && results.length === 0 && <div className="empty t-sub muted">—</div>}
      </List>
      <div style={{ height: 16 }} />
    </Sheet>
  );
}

/* Cart: live Picnic basket with quantity steppers and linked meals. */
export function PicnicCart({ open, onClose, associations, mealsByIngredient, onExpired, toast }) {
  const { t } = useLang();
  const [cart, setCart] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!open) return;
    let live = true;
    const id = setTimeout(() => {
      setCart(null);
      getPicnicCart()
        .then((c) => live && setCart(c))
        .catch((e) => { if (!live) return; if (e.auth) { onExpired(); onClose(); } toast("⚠️ Picnic"); });
    }, 0);
    return () => { live = false; clearTimeout(id); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const items = cart?.items ?? [];

  // which meals need the ingredient(s) linked to this product
  const linkedMeals = (productId) => {
    const meals = new Set();
    for (const [k, v] of Object.entries(associations ?? {})) {
      if (String(v?.id) !== String(productId)) continue;
      const key = (v?.ingredient ?? k).toLowerCase();
      (mealsByIngredient.get(key) ?? []).forEach((m) => meals.add(m));
    }
    return [...meals];
  };

  const setCount = async (item, count) => {
    if (count < 0) return;
    setBusyId(item.id);
    try {
      await patchPicnicCart(item.id, count);
      setCart((c) => ({
        ...c,
        items: count === 0
          ? c.items.filter((x) => x.id !== item.id)
          : c.items.map((x) => (x.id === item.id ? { ...x, count } : x)),
      }));
    } catch { toast("⚠️ Picnic"); }
    setBusyId(null);
  };

  const total = items.reduce((s, i) => s + (i.price ?? 0) * (i.count ?? 1), 0);

  return (
    <Sheet open onClose={onClose} title={t.picnicCart}
      rightAction={<button className="nav-txt-btn" style={{ padding: 0 }} onClick={onClose}>{t.done}</button>}>
      {!cart && <div className="spin" />}
      {cart && (
        <>
          <List footer={items.length ? undefined : t.picnicCartEmpty}>
            {items.map((i) => {
              const meals = linkedMeals(i.id);
              return (
                <Row key={i.id} className="static"
                  title={i.name}
                  sub={[i.unitQuantity, meals.length ? `→ ${meals.join(", ")}` : null].filter(Boolean).join(" · ")}
                  trail={
                    <span className="stepper">
                      <button disabled={busyId === i.id} onClick={() => setCount(i, (i.count ?? 1) - 1)}>−</button>
                      <span className="n">{i.count ?? 1}</span>
                      <button disabled={busyId === i.id} onClick={() => setCount(i, (i.count ?? 1) + 1)}>+</button>
                      <span className="p">{eur((i.price ?? 0) * (i.count ?? 1))}</span>
                    </span>
                  }
                />
              );
            })}
          </List>
          {items.length > 0 && (
            <div className="row static" style={{ background: "none", justifyContent: "space-between" }}>
              <span className="t-head">{t.total}</span>
              <span className="t-head">{eur(total)}</span>
            </div>
          )}
        </>
      )}
      <div style={{ height: 16 }} />
    </Sheet>
  );
}
