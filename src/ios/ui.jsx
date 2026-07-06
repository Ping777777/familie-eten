/* eslint-disable react-refresh/only-export-components */
import { useRef, useState, useEffect } from "react";

/* ── SF-symbol-style icons ── */
const I = (path, vb = "0 0 24 24") => ({ size = 24, weight = 1.8 }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor"
    strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">{path}</svg>
);
export const Icons = {
  calendar: I(<><rect x="3" y="5" width="18" height="17" rx="4" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  book: I(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 0 4 5.5v14z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></>),
  cart: I(<><circle cx="9" cy="20.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="17.5" cy="20.5" r="1.3" fill="currentColor" stroke="none" /><path d="M2.5 3.5h2.6l2.5 12.2a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.6-1.3l1.7-8.2H6" /></>),
  plus: I(<path d="M12 5v14M5 12h14" />),
  chevL: I(<path d="M14.5 5.5 8 12l6.5 6.5" />),
  chevR: I(<path d="M9.5 5.5 16 12l-6.5 6.5" />),
  chevRsm: I(<path d="M9.5 6 15.5 12 9.5 18" />, "0 0 24 24"),
  x: I(<path d="M6 6l12 12M18 6 6 18" />),
  check: I(<path d="M4.5 12.5 10 18 19.5 7" />),
  star: I(<path d="M12 3.5 14.7 9l6 .7-4.5 4.1 1.2 5.9L12 16.8 6.6 19.7l1.2-5.9L3.3 9.7l6-.7z" />),
  starFill: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 14.8 9l6.2.8-4.6 4.2 1.2 6L12 17l-5.6 3 1.2-6L3 9.8 9.2 9z" /></svg>
  ),
  gear: I(<><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8v2.4M12 18.8v2.4M4.2 6.6l1.7 1.7M18.1 15.7l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 17.4l1.7-1.7M18.1 8.3l1.7-1.7" /></>),
  search: I(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></>),
  dots: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
  ),
  trash: I(<><path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" /><path d="M6.5 7 7.4 19a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8L17.5 7" /><path d="M10 11v6M14 11v6" /></>),
  house: I(<><path d="M4 11.5 12 4.5l8 7" /><path d="M6 10v9.5h12V10" /></>),
  boxDown: I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>),
  boxUp: I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 8 5-5 5 5M12 3v12" /></>),
  pencil: I(<path d="M16.5 4.5 19.5 7.5 8 19l-4 1 1-4z" />),
  fork: I(<><path d="M7 3v7a2.5 2.5 0 0 0 5 0V3M9.5 3v18" /><path d="M17 3c-1.7 1-2.5 3-2.5 5.5S15.5 12 17 12v9" /></>),
};

/* ── screen with collapsing large title ── */
export function Screen({ title, sub, left, right, children, scrollRef }) {
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef(null);
  const onScroll = (e) => setScrolled(e.target.scrollTop > 30);
  useEffect(() => { if (scrollRef) scrollRef.current = ref.current; });
  return (
    <>
      <div className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="nav-side">{left}</div>
        <span className="nav-inline">{title}</span>
        <div className="nav-side right">{right}</div>
      </div>
      <div className="screen" ref={ref} onScroll={onScroll}>
        <div className="large-title">
          <h1 className="t-large">{title}</h1>
          {sub && <div className="t-sub muted sub">{sub}</div>}
        </div>
        {children}
      </div>
    </>
  );
}

export function NavBtn({ icon: Ic, onClick, label }) {
  return (
    <button className="nav-btn" onClick={onClick} aria-label={label}>
      <Ic size={19} weight={2} />
    </button>
  );
}

/* ── tab bar ── */
export function TabBar({ tabs, active, onChange }) {
  return (
    <nav className="tabbar">
      {tabs.map(({ key, label, icon: Ic }) => (
        <button key={key} className={`tab${active === key ? " active" : ""}`} onClick={() => onChange(key)}>
          <span className="tab-ic"><Ic size={26} weight={active === key ? 2 : 1.7} /></span>
          <span className="tab-lb">{label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ── grouped list ── */
export function List({ header, footer, children, headerAction }) {
  return (
    <section className="list">
      {header && (
        <div className="list-h">
          <span>{header}</span>
          {headerAction}
        </div>
      )}
      <div className="group">{children}</div>
      {footer && <div className="list-f">{footer}</div>}
    </section>
  );
}

export function Row({ title, sub, lead, trail, onClick, chevron, className = "", strike }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`row${onClick ? "" : " static"} ${className}`} onClick={onClick}>
      {lead && <span className="row-lead">{lead}</span>}
      <span className="row-body">
        <div className={`row-title${strike ? " struck" : ""}`}>{title}</div>
        {sub && <div className="row-sub">{sub}</div>}
      </span>
      {trail && <span className="row-trail">{trail}</span>}
      {chevron && <span className="chev"><Icons.chevRsm size={16} weight={2.4} /></span>}
    </Tag>
  );
}

/* ── bottom sheet ── */
export function Sheet({ open, onClose, title, leftAction, rightAction, children }) {
  if (!open) return null;
  return (
    <>
      <div className="sheet-back" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="grabber" />
        <div className="sheet-head">
          <span className="side">{leftAction}</span>
          <span className="t-head">{title}</span>
          <span className="side r">{rightAction}</span>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

/* ── swipeable row (native-style trailing actions) ── */
export function SwipeRow({ actions = [], children }) {
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const start = useRef(null);
  const width = actions.length * 76;
  const onTouchStart = (e) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx };
  };
  const onTouchMove = (e) => {
    if (!start.current) return;
    const mx = e.touches[0].clientX - start.current.x;
    const my = e.touches[0].clientY - start.current.y;
    if (!drag) {
      // Ignore small jitter so tapping a button inside the row (e.g. a
      // Picnic action) never engages the swipe reveal.
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      if (Math.abs(my) > Math.abs(mx)) { start.current = null; return; }
      setDrag(true);
    }
    setDx(Math.min(0, Math.max(-width - 30, start.current.dx + mx)));
  };
  const onTouchEnd = () => {
    if (!start.current) return;
    setDrag(false);
    setDx(dx < -width / 2 ? -width : 0);
    start.current = null;
  };
  const fire = (fn) => { setDx(0); fn(); };
  return (
    <div className="swipe-wrap" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="swipe-actions" style={{ width }}>
        {actions.map((a, i) => (
          <button key={i} className={`swipe-act ${a.color}`} onClick={() => fire(a.onClick)}>
            {a.icon && <a.icon size={20} weight={2} />}
            {a.label}
          </button>
        ))}
      </div>
      <div className={`swipe-inner${drag ? " dragging" : ""}`} style={{ transform: `translateX(${dx}px)` }}
        onClickCapture={(e) => { if (dx !== 0) { e.stopPropagation(); setDx(0); } }}>
        {children}
      </div>
    </div>
  );
}

/* ── toast ── */
export function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

export function Avatar({ name, colors }) {
  return <span className="avatar" style={{ background: colors[name] ?? "#8e8e93" }}>{name?.[0]}</span>;
}
