import { useEffect, useMemo, useState } from "react";
import { getIsoWeekKey } from "./week";
import { LangProvider, useLang } from "./lib/i18n";
import { DAYS, FAMILY } from "./lib/food";
import { AUTH_KEY, PICNIC_KEY, login, useBlob, useWeekPlan, picnicLogin, picnicVerify } from "./lib/api";
import { TabBar, Sheet, List, Row, Icons, Toast } from "./ios/ui";
import WeekScreen from "./screens/Week";
import RecipesScreen from "./screens/Recipes";
import ShoppingScreen from "./screens/Shopping";
import "./ios.css";

const emptyWeek = () =>
  DAYS.reduce((acc, d) => { acc[d] = FAMILY.reduce((a, m) => { a[m] = null; return a; }, {}); return acc; }, {});

function Root() {
  const { t, lang, setLang } = useLang();
  const [user, setUser] = useState(() => localStorage.getItem(AUTH_KEY));

  // iOS pans the whole web view up when the on-screen keyboard opens and
  // doesn't always pan back on dismiss, leaving position:fixed chrome (tab
  // bar, action bar) stranded mid-screen. Re-pin the viewport whenever the
  // keyboard closes / the visual viewport settles.
  useEffect(() => {
    const repin = () => {
      const el = document.activeElement;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) window.scrollTo(0, 0);
    };
    const onFocusOut = () => setTimeout(repin, 50);
    window.visualViewport?.addEventListener("resize", repin);
    window.addEventListener("focusout", onFocusOut);
    return () => {
      window.visualViewport?.removeEventListener("resize", repin);
      window.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  const [tab, setTab] = useState("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [openRecipeId, setOpenRecipeId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(""), 3200); };

  const weekKey = getIsoWeekKey(weekOffset);
  const [plan, assign, planLoaded] = useWeekPlan(user, weekKey, emptyWeek);
  const [recipes, saveRecipes] = useBlob(user, "/api/recipes", "recipes", []);
  const [staples, saveStaples] = useBlob(user, "/api/staples", "staples", []);
  const [overridesArr, saveOverrides] = useBlob(user, "/api/pantry-overrides", "overrides", []);
  const overrides = useMemo(() => new Set(overridesArr), [overridesArr]);
  const toggleOverride = (name) => {
    const key = name.toLowerCase();
    const next = new Set(overrides);
    next.has(key) ? next.delete(key) : next.add(key);
    saveOverrides([...next]);
  };

  const [picnicUser, setPicnicUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PICNIC_KEY)) ?? null; } catch { return null; }
  });
  const [associations, saveAssociations] = useBlob(user, "/api/picnic-associations", "associations", {});
  const onPicnicExpired = () => { localStorage.removeItem(PICNIC_KEY); setPicnicUser(null); };

  if (!user) return <Login onDone={setUser} />;

  const tabs = [
    { key: "week", label: t.tabWeek, icon: Icons.calendar },
    { key: "shopping", label: t.tabShopping, icon: Icons.cart },
    { key: "recipes", label: t.tabRecipes, icon: Icons.book },
  ];

  const openRecipe = (id) => { setOpenRecipeId(id); setTab("recipes"); };

  return (
    <div className="shell">
      {tab === "week" && (
        <WeekScreen
          user={user} plan={plan} assign={assign} loaded={planLoaded}
          weekOffset={weekOffset} setWeekOffset={setWeekOffset}
          recipes={recipes} onOpenRecipe={openRecipe}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {tab === "recipes" && (
        <RecipesScreen
          user={user} recipes={recipes} saveRecipes={saveRecipes}
          plan={plan} assign={assign} weekOffset={weekOffset}
          openRecipeId={openRecipeId} onOpenRecipe={setOpenRecipeId} onCloseRecipe={() => setOpenRecipeId(null)}
          toast={toast}
        />
      )}
      {tab === "shopping" && (
        <ShoppingScreen
          plan={plan} recipes={recipes}
          staples={staples} saveStaples={saveStaples}
          overrides={overrides} toggleOverride={toggleOverride}
          picnicUser={picnicUser} associations={associations} saveAssociations={saveAssociations}
          onPicnicExpired={onPicnicExpired}
          toast={toast}
        />
      )}
      <TabBar tabs={tabs} active={tab} onChange={(k) => { setTab(k); if (k !== "recipes") setOpenRecipeId(null); }} />

      <SettingsSheet
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        user={user} lang={lang} setLang={setLang}
        picnicUser={picnicUser} setPicnicUser={setPicnicUser}
        onLogout={() => { localStorage.removeItem(AUTH_KEY); setUser(null); }}
        toast={toast}
      />
      <Toast msg={toastMsg} />
    </div>
  );
}

function Login({ onDone }) {
  const { t } = useLang();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(false);
    try { onDone(await login(u, p)); } catch { setErr(true); }
    setBusy(false);
  };
  return (
    <form className="login" onSubmit={submit}>
      <img src="/login-icon.png" alt="" className="login-mark" />
      <h1 className="t-large">{t.welcome}</h1>
      <div className="t-sub muted mt4">{t.loginHint}</div>
      <div className="login-card">
        <div className="field-lb">{t.username}</div>
        <input className="field" autoCapitalize="none" value={u} onChange={(e) => setU(e.target.value)} />
        <div className="field-lb">{t.password}</div>
        <input className="field" type="password" value={p} onChange={(e) => setP(e.target.value)} />
      </div>
      {err && <div className="t-foot" style={{ color: "var(--red)", marginTop: 10 }}>{t.wrongLogin}</div>}
      <button className="btn mt20" disabled={busy || !u || !p}>{t.login}</button>
    </form>
  );
}

function SettingsSheet({ open, onClose, user, lang, setLang, picnicUser, setPicnicUser, onLogout, toast }) {
  const { t } = useLang();
  const [form, setForm] = useState(null); // null | {u,p} | {code}
  const [busy, setBusy] = useState(false);

  const doPicnicLogin = async () => {
    setBusy(true);
    try {
      const r = await picnicLogin(form.u, form.p);
      if (r.requiresTwoFactor) setForm({ code: "" });
      else { setPicnicUser(r.user ?? { name: form.u }); setForm(null); toast("✓ Picnic"); }
    } catch { toast("⚠️ Picnic"); }
    setBusy(false);
  };
  const doVerify = async () => {
    setBusy(true);
    try {
      const r = await picnicVerify(form.code);
      setPicnicUser(r.user ?? { name: "Picnic" }); setForm(null); toast("✓ Picnic");
    } catch { toast("⚠️ 2FA"); }
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={onClose} title={t.settings}
      rightAction={<button className="nav-txt-btn" style={{ padding: 0 }} onClick={onClose}>{t.done}</button>}>
      <List header={t.language}>
        <div className="row static">
          <div className="chips" style={{ margin: 0, padding: 0 }}>
            {[["nl", "Nederlands"], ["en", "English"], ["ru", "Русский"]].map(([code, label]) => (
              <button key={code} className={`chip sm${lang === code ? " on" : ""}`} onClick={() => setLang(code)}>{label}</button>
            ))}
          </div>
        </div>
      </List>

      <List header={t.picnic}>
        {picnicUser ? (
          <>
            <Row className="static" lead={<Icons.cart size={20} />} title={picnicUser.name ?? "Picnic"} sub={t.loggedInAs} />
            <Row title={<span style={{ color: "var(--orange)" }}>{t.picnicLogout}</span>}
              onClick={() => { localStorage.removeItem(PICNIC_KEY); setPicnicUser(null); }} />
          </>
        ) : form == null ? (
          <Row title={<span style={{ color: "var(--orange)" }}>{t.picnicLogin}</span>} onClick={() => setForm({ u: "", p: "" })} />
        ) : "code" in form ? (
          <div className="row static" style={{ display: "block" }}>
            <input className="field" inputMode="numeric" autoComplete="one-time-code" placeholder={t.picnicCode}
              value={form.code} onChange={(e) => setForm({ code: e.target.value })} />
            <button className="btn orange mt8" disabled={busy || !form.code} onClick={doVerify}>{t.login}</button>
          </div>
        ) : (
          <div className="row static" style={{ display: "block" }}>
            <input className="field" autoCapitalize="none" placeholder={t.picnicUser}
              value={form.u} onChange={(e) => setForm({ ...form, u: e.target.value })} />
            <input className="field mt8" type="password" placeholder={t.picnicPass}
              value={form.p} onChange={(e) => setForm({ ...form, p: e.target.value })} />
            <button className="btn orange mt8" disabled={busy || !form.u || !form.p} onClick={doPicnicLogin}>{t.picnicLogin}</button>
          </div>
        )}
      </List>

      <List header={`${t.loggedInAs} ${user}`}>
        <Row title={<span style={{ color: "var(--red)" }}>{t.logout}</span>} onClick={onLogout} />
      </List>
      <div className="t-foot muted" style={{ textAlign: "center", padding: "18px 0 8px" }}>
        {/* eslint-disable-next-line no-undef */}
        Versie {typeof __BUILD_ID__ === "undefined" ? "dev" : __BUILD_ID__}
      </div>
      <div style={{ height: 16 }} />
    </Sheet>
  );
}

export default function App() {
  return (
    <LangProvider>
      <Root />
    </LangProvider>
  );
}
