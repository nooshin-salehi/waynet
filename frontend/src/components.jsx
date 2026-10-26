import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { get, post } from './api';
import { cartCount } from './cart';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem('waynet_token')) { setLoading(false); return; }
    get('/auth/me/').then(setUser).catch(() => localStorage.removeItem('waynet_token')).finally(() => setLoading(false));
  }, []);
  function signIn(data) { localStorage.setItem('waynet_token', data.token); setUser(data.user); }
  async function signOut() { try { await post('/auth/logout/'); } catch (e) { /* توکن محلی در هر حال حذف می‌شود */ } finally { localStorage.removeItem('waynet_token'); setUser(null); } }
  return <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
export const panelUrl = user => user?.role === 'admin' ? '/admin' : user?.role === 'teacher' ? '/teacher' : '/dashboard';

export function useData(fn, initial = null, deps = []) {
  const [data, setData] = useState(initial), [error, setError] = useState(''), [loading, setLoading] = useState(true), [version, setVersion] = useState(0);
  useEffect(() => { let active = true; setLoading(true); setError('');
    Promise.resolve().then(fn).then(d => { if (active) setData(d); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [...deps, version]);
  return [data, error, loading, () => setVersion(v => v + 1)];
}
export function useTitle(title) { useEffect(() => { if (title) document.title = title; }, [title]); }
export const fa = n => Number(n || 0).toLocaleString('fa-IR');
export const faDate = d => new Date(d).toLocaleString('fa-IR');

export function Guard({ roles, children }) {
  const { user, loading } = useAuth(); const loc = useLocation();
  if (loading) return <Layout title="Waynet"><main className="page"><div className="wrap"><div className="empty">در حال بارگذاری…</div></div></main></Layout>;
  if (!user) return <Navigate to={'/login?next=' + encodeURIComponent(loc.pathname)} replace/>;
  if (roles && !roles.includes(user.role)) return <NotFound title="دسترسی غیرمجاز"/>;
  return children;
}

function Icon({ d, sw = 1.8, children }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}>{children || <path d={d}/>}</svg>; }
const NAV = [['/', 'خانه'], ['/courses', 'دوره‌ها'], ['/#instructors', 'اساتید'], ['/services', 'خدمات ما'], ['/contact', 'تماس با ما'], ['/about', 'درباره ما']];

function Navbar() {
  const { user } = useAuth(), nav = useNavigate();
  const [count, setCount] = useState(cartCount()), [searchOpen, setSearchOpen] = useState(false), [drawer, setDrawer] = useState(false), [q, setQ] = useState('');
  useEffect(() => { const f = () => setCount(cartCount()); window.addEventListener('waynet-cart', f); window.addEventListener('storage', f); return () => { window.removeEventListener('waynet-cart', f); window.removeEventListener('storage', f); }; }, []);
  useEffect(() => { if (searchOpen) document.getElementById('searchInput')?.focus(); }, [searchOpen]);
  const toggleTheme = () => { const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('waynet-theme', next); } catch (e) {} };
  const userIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>;
  return <>
    <header className="nav"><div className="nav-inner">
      <Link className="brand" to="/"><span className="brand-mark"><img src="/images/waynet-logo.png" alt="Waynet"/></span><span className="brand-text"><b>Waynet</b><small>مدرسه تخصصی امنیت اطلاعات</small></span></Link>
      <nav className="links">{NAV.map(([u, l]) => <Link key={u} to={u}>{l}</Link>)}</nav>
      <div className="nav-actions">
        <button className="icon-btn theme-toggle" id="themeToggle" aria-label="تغییر تم روشن/تاریک" onClick={toggleTheme}>
          <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.5 4.5l1.85 1.85M17.65 17.65l1.85 1.85M2.5 12h2.6M18.9 12h2.6M4.5 19.5l1.85-1.85M17.65 6.35l1.85-1.85"/></svg>
          <svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 14.7A8.6 8.6 0 1 1 9.3 3.2a7 7 0 0 0 11.5 11.5Z"/></svg>
        </button>
        {user ? <Link className="icon-btn" to={panelUrl(user)} aria-label="پنل کاربری">{userIcon}</Link> : <Link className="icon-btn" to="/login" aria-label="ورود / ثبت‌نام">{userIcon}</Link>}
        <Link className="icon-btn cart-link" to="/cart" aria-label="سبد خرید"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.5 3h2l2.7 12.5a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6"/></svg><i id="cartCount">{count}</i></Link>
        <button className="icon-btn" id="searchOpen" aria-label="جستجو" onClick={() => setSearchOpen(o => !o)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></button>
        <a className="phone-chip" href="tel:02177475022"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .7 2.9a2 2 0 0 1-.4 2.1L8 10a16 16 0 0 0 6 6l1.3-1.4a2 2 0 0 1 2.1-.4c.9.4 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg><span dir="ltr">021-77475022</span></a>
        <button className="burger" id="burgerBtn" aria-label="منو" onClick={() => setDrawer(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div>
    </div></header>
    <div className={'search-panel' + (searchOpen ? ' open' : '')} id="searchPanel">
      <form onSubmit={e => { e.preventDefault(); nav('/search?q=' + encodeURIComponent(q)); setSearchOpen(false); }}><input name="q" id="searchInput" placeholder="جستجوی دوره، شبکه، امنیت..." autoComplete="off" value={q} onChange={e => setQ(e.target.value)}/><button>جستجو</button></form>
    </div>
    <div className={'drawer' + (drawer ? ' open' : '')} id="drawer" onClick={e => { if (e.target === e.currentTarget) setDrawer(false); }}><div className="drawer-panel" onClick={e => { if (e.target.closest('a')) setDrawer(false); }}><button className="drawer-close" id="drawerClose" onClick={() => setDrawer(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 6-12 12M6 6l12 12"/></svg></button>
      {NAV.map(([u, l]) => <Link key={u} to={u}>{l}</Link>)}<Link to="/cart">سبد خرید</Link>{user ? <Link to={panelUrl(user)}>پنل کاربری</Link> : <Link to="/login">ورود / ثبت‌نام</Link>}</div></div>
  </>;
}

function SupportChat() {
  const [open, setOpen] = useState(false), [text, setText] = useState(''), [msgs, setMsgs] = useState([{ k: 'support', t: 'سلام 👋 چطور می‌تونم کمکتون کنم؟' }]);
  const ref = React.useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs]);
  function send(e) { e.preventDefault(); const t = text.trim(); if (!t) return; setMsgs(m => [...m, { k: 'user', t }]); setText('');
    setTimeout(() => setMsgs(m => [...m, { k: 'support', t: 'پیام شما دریافت شد؛ همکاران ما به زودی پاسخ می دهند.' }]), 500); }
  return <>
    <button className="support-fab" id="supportFab" aria-label="گفتگو با پشتیبانی" onClick={() => setOpen(o => !o)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></button>
    <div className={'support-panel' + (open ? ' open' : '')} id="supportPanel">
      <div className="support-head"><div><b>پشتیبانی Waynet</b><span className="support-status"><i></i>آنلاین</span></div><button id="supportClose" aria-label="بستن" onClick={() => setOpen(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 6-12 12M6 6l12 12"/></svg></button></div>
      <div className="support-messages" id="supportMessages" ref={ref}>{msgs.map((m, i) => <div key={i} className={'msg ' + m.k}>{m.t}</div>)}</div>
      <form className="support-input" id="supportForm" onSubmit={send}><input type="text" id="supportInput" placeholder="پیام خود را بنویسید..." autoComplete="off" value={text} onChange={e => setText(e.target.value)}/><button type="submit" aria-label="ارسال"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg></button></form>
    </div>
  </>;
}

function Footer() {
  return <><footer id="footer">
    <div className="wrap foot-grid">
      <div className="foot-brand"><Link className="brand" to="/"><span className="brand-mark"><img src="/images/waynet-logo.png" alt="Waynet"/></span><span className="brand-text"><b>Waynet</b><small>مدرسه تخصصی امنیت اطلاعات</small></span></Link><p>آموزش تخصصی شبکه و امنیت، نزدیک به نیاز واقعی صنعت.</p></div>
      <div><h4>دسترسی سریع</h4><Link to="/courses">دوره‌ها</Link><Link to="/services">خدمات ما</Link><Link to="/about">درباره ما</Link><Link to="/contact">تماس با ما</Link></div>
      <div><h4>دانشگاه امنیت</h4><Link to="/#roadmap">نقشه راه</Link><Link to="/#instructors">اساتید</Link><Link to="/dashboard">پنل کاربری</Link><Link to="/login">ورود و ثبت‌نام</Link></div>
      <div><h4>تماس</h4><a href="tel:02177475022" dir="ltr">021-77475022</a><a href="mailto:info@waynet.example">info@waynet.example</a><span>تهران، ایران</span></div>
    </div>
    <div className="wrap foot-bottom"><span>© {new Date().getFullYear()} تمامی حقوق برای Waynet محفوظ است.</span><span>Network • Infrastructure • Cyber Security</span></div>
  </footer><SupportChat/></>;
}

// معادل head + navbar + footer در EJS. محتوای هر صفحه (main) به‌عنوان children داده می‌شود.
export function Layout({ title, children }) {
  useTitle(title);
  return <><div className="grid-bg"></div><Navbar/>{children}<Footer/></>;
}
export function NotFound({ title = 'یافت نشد' }) {
  return <Layout title={title + ' | Waynet'}><main className="page"><div className="wrap empty-page"><span className="section-label">404</span><h1>این صفحه پیدا نشد</h1><p>آدرس را بررسی کنید یا به صفحه اصلی برگردید.</p><Link className="btn primary" to="/">بازگشت به خانه ←</Link></div></main></Layout>;
}
export function Loading({ error }) {
  return <Layout title="Waynet"><main className="page"><div className="wrap"><div className="empty">{error || 'در حال بارگذاری…'}</div></div></main></Layout>;
}
// هش‌لینک‌ها (/#instructors) پس از رندر داده‌های ناهمگام اسکرول شوند.
export function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return; }
    let tries = 0; const id = decodeURIComponent(hash.slice(1));
    const t = setInterval(() => { const el = document.getElementById(id); if (el) { el.scrollIntoView(); clearInterval(t); } else if (++tries > 20) clearInterval(t); }, 100);
    return () => clearInterval(t);
  }, [pathname, hash]);
  return null;
}
export function Msg({ error, children }) { return error ? <div className="success" style={{ borderColor: 'rgba(230,90,70,.3)', color: '#c65042' }}>{error}</div> : children ? <div className="success">{children}</div> : null; }
// فرم خروج پنل‌ها (nav-logout)
export function LogoutForm() {
  const { signOut } = useAuth(), nav = useNavigate();
  return <form className="nav-logout" onSubmit={async e => { e.preventDefault(); await signOut(); nav('/'); }}><button type="submit">خروج از حساب</button></form>;
}
export const DashboardNav = () => <div className="dashboard-nav"><Link to="/dashboard">پنل من</Link><Link to="/dashboard/courses">دوره‌های من</Link><Link to="/dashboard/orders">سفارش‌های من</Link><Link to="/dashboard/profile">پروفایل</Link><LogoutForm/></div>;
export const TeacherNav = () => <div className="admin-nav"><Link to="/teacher">داشبورد</Link><Link to="/teacher/courses">دوره‌های من</Link><Link to="/teacher/announcements">Announcementها</Link><Link to="/teacher/questions">سوالات و نظرات</Link><LogoutForm/></div>;
export const AdminNav = () => <div className="admin-nav"><Link to="/admin">داشبورد</Link><Link to="/admin/users">کاربران</Link><Link to="/admin/teachers">مدرسان</Link><Link to="/admin/students">دانشجویان</Link><Link to="/admin/courses">دوره‌ها</Link><Link to="/admin/categories">حوزه‌ها</Link><Link to="/admin/orders">سفارش‌ها</Link><Link to="/admin/payments">پرداخت‌ها</Link><Link to="/admin/services">خدمات</Link><Link to="/admin/products">محصولات</Link><Link to="/admin/racks">رک‌ها</Link><Link to="/admin/rack-requests">درخواست‌های رک</Link><Link to="/admin/testimonials">نظرات</Link><LogoutForm/></div>;
