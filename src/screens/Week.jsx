import { useMemo, useRef, useState } from "react";
import { getMondayOfWeek } from "../week";
import { useLang, recipeName, trTag } from "../lib/i18n";
import { DAYS, MEMBER_COLORS, SPECIAL_MEALS, CATEGORIES, matchesCategory } from "../lib/food";
import { Screen, NavBtn, List, Row, Sheet, Icons, Avatar } from "../ios/ui";

export default function WeekScreen({ user, plan, assign, loaded, weekOffset, setWeekOffset, recipes, onOpenRecipe, onOpenSettings }) {
  const { t, lang } = useLang();
  const [picking, setPicking] = useState(null); // { day }
  const monday = getMondayOfWeek(weekOffset);
  const todayIdx = (() => {
    const now = new Date();
    const diff = Math.floor((now - monday) / 86400000);
    return weekOffset === 0 && diff >= 0 && diff < 7 ? diff : -1;
  })();

  const specials = SPECIAL_MEALS.map((s) => ({ ...s, name: t[s.key] }));
  const getMeal = (id) =>
    recipes.find((r) => r.id === id) ?? specials.find((s) => s.id === id) ?? null;

  // one cook per day: the day's single (member, meal) pair, if any
  const dayInfo = (day) => {
    const entries = Object.entries(plan?.[day] ?? {}).filter(([, id]) => id);
    if (!entries.length) return null;
    const [member, id] = entries[0];
    return { member, meal: getMeal(id) };
  };

  const today = todayIdx >= 0 ? dayInfo(DAYS[todayIdx]) : null;

  // variety note
  const varietyNotes = useMemo(() => {
    const counts = {};
    DAYS.forEach((day) => {
      Object.values(plan?.[day] ?? {}).filter(Boolean).forEach((id) => {
        const r = recipes.find((x) => x.id === id);
        if (!r) return;
        CATEGORIES.filter((c) => c.threshold).forEach((c) => {
          if (matchesCategory(r, c.key)) counts[c.key] = (counts[c.key] ?? 0) + 1;
        });
      });
    });
    return Object.entries(counts).filter(([k, n]) => n >= CATEGORIES.find((c) => c.key === k).threshold);
  }, [plan, recipes]);

  const months = t.months;
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const rangeLabel = monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()} – ${sunday.getDate()} ${months[monday.getMonth()]}`
    : `${monday.getDate()} ${months[monday.getMonth()]} – ${sunday.getDate()} ${months[sunday.getMonth()]}`;

  // swipe between weeks
  const touchX = useRef(0);
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 70) setWeekOffset(weekOffset + (dx < 0 ? 1 : -1));
  };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Screen
        title={t.thisWeek}
        sub={rangeLabel}
        left={<NavBtn icon={Icons.gear} onClick={onOpenSettings} label={t.settings} />}
        right={
          <span className="week-nav-row">
            <NavBtn icon={Icons.chevL} onClick={() => setWeekOffset(weekOffset - 1)} label={t.prevWeek} />
            <NavBtn icon={Icons.chevR} onClick={() => setWeekOffset(weekOffset + 1)} label={t.nextWeek} />
          </span>
        }
      >
        {todayIdx >= 0 && (
          today?.meal ? (
            <button className="hero" style={{ display: "block", width: "100%", textAlign: "left" }}
              onClick={() => today.meal.id > 0 && onOpenRecipe(today.meal.id)}>
              <div className="kicker">{t.tonight}</div>
              <div className="big">{recipeName(today.meal, lang) ?? today.meal.name}</div>
              <div className="meta">
                <Avatar name={today.member} colors={MEMBER_COLORS} />
                <span>{t.cookedBy} {today.member}</span>
              </div>
              <span className="emoji">{today.meal.emoji}</span>
            </button>
          ) : (
            <button className="hero" style={{ display: "block", width: "100%", textAlign: "left" }}
              onClick={() => setPicking({ day: DAYS[todayIdx] })}>
              <div className="kicker">{t.tonight}</div>
              <div className="big">{t.nothingTonight}</div>
              <div className="meta"><span className="plus-pill" style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}><Icons.plus size={16} weight={2.4} /></span><span>{t.pickTonight}</span></div>
            </button>
          )
        )}

        <List>
          {!loaded && <div className="spin" />}
          {loaded && DAYS.map((day, i) => {
            const date = new Date(monday); date.setDate(monday.getDate() + i);
            const info = dayInfo(day);
            const lead = (
              <span className={`day-num${i === todayIdx ? " today" : ""}`}>
                <div className="d">{t.days[day].slice(0, 2)}</div>
                <div className="n">{date.getDate()}</div>
              </span>
            );
            if (info?.meal) {
              return (
                <Row key={day} lead={lead} sep="68px"
                  title={recipeName(info.meal, lang) ?? info.meal.name}
                  sub={info.member}
                  onClick={() => (info.meal.id > 0 ? onOpenRecipe(info.meal.id, day) : setPicking({ day }))}
                  chevron={info.meal.id > 0}
                />
              );
            }
            return (
              <Row key={day} lead={lead} sep="68px"
                title={<span className="muted3">{t.freeDay}</span>}
                trail={<span className="plus-pill"><Icons.plus size={16} weight={2.4} /></span>}
                onClick={() => setPicking({ day })}
              />
            );
          })}
        </List>

        {varietyNotes.length > 0 && (
          <div className="list-f warn mt8">
            <span>⚠️</span>
            <span>{varietyNotes.map(([k, n]) => t.varietyNote(CATEGORIES.find((c) => c.key === k).emoji + " " + trTag(k, lang), n)).join(" ")}</span>
          </div>
        )}
      </Screen>

      <MealPicker
        open={!!picking}
        day={picking?.day}
        onClose={() => setPicking(null)}
        recipes={recipes}
        specials={specials}
        plan={plan}
        onPick={(id) => { assign(picking.day, user, id); setPicking(null); }}
        onClear={() => {
          const cur = dayInfo(picking.day);
          if (cur) assign(picking.day, cur.member, null);
          setPicking(null);
        }}
      />
    </div>
  );
}

function MealPicker({ open, day, onClose, recipes, specials, plan, onPick, onClear }) {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(null);
  if (!open) return null;

  const usedIds = new Set(DAYS.flatMap((d) => Object.values(plan?.[d] ?? {})).filter(Boolean));
  const hasCurrent = Object.values(plan?.[day] ?? {}).some(Boolean);
  const ql = q.toLowerCase();
  const visible = recipes
    .filter((r) => !r.archived)
    .filter((r) => matchesCategory(r, cat))
    .filter((r) => !ql || (recipeName(r, lang) ?? r.name).toLowerCase().includes(ql) || r.tags?.some((x) => x.toLowerCase().includes(ql)))
    .sort((a, b) => (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0) || (usedIds.has(a.id) ? 1 : 0) - (usedIds.has(b.id) ? 1 : 0));

  return (
    <Sheet open onClose={onClose}
      title={`${t.chooseMeal} — ${t.days[day]}`}
      leftAction={hasCurrent && <button className="nav-txt-btn" style={{ color: "var(--red)", padding: 0 }} onClick={onClear}>{t.remove}</button>}
      rightAction={<button className="nav-txt-btn" style={{ padding: 0 }} onClick={onClose}>{t.cancel}</button>}
    >
      <div className="search" style={{ marginTop: 2 }}>
        <Icons.search size={17} weight={2.2} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchRecipes} />
      </div>
      <div className="chips">
        <button className={`chip sm${cat === null ? " on" : ""}`} onClick={() => setCat(null)}>{t.all}</button>
        {CATEGORIES.map((c) => (
          <button key={c.key} className={`chip sm${cat === c.key ? " on" : ""}`} onClick={() => setCat(cat === c.key ? null : c.key)}>
            {c.emoji} {trTag(c.key, lang)}
          </button>
        ))}
      </div>
      <List>
        {!cat && !ql && specials.map((s) => (
          <Row key={s.id} lead={<span className="emoji-tile">{s.emoji}</span>} title={s.name} onClick={() => onPick(s.id)} />
        ))}
        {visible.map((r) => {
          const used = usedIds.has(r.id);
          return (
            <Row key={r.id}
              lead={<span className="emoji-tile">{r.emoji}</span>}
              title={<span className={used ? "muted3" : ""}>{recipeName(r, lang) ?? r.name}</span>}
              sub={used ? t.used : r.tags?.map((x) => trTag(x, lang)).slice(0, 3).join(" · ")}
              trail={r.favourite ? <span style={{ color: "var(--yellow)" }}><Icons.starFill size={16} /></span> : null}
              onClick={() => onPick(r.id)}
            />
          );
        })}
        {visible.length === 0 && <div className="empty"><div className="big">🔍</div></div>}
      </List>
      <div style={{ height: 20 }} />
    </Sheet>
  );
}
