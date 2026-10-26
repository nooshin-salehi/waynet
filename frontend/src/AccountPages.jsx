import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { get, post, patch, api } from './api';
import { Layout, Loading, Msg, DashboardNav, useAuth, useData, panelUrl, fa, faDate } from './components';

const ERR = { borderColor: 'rgba(230,90,70,.3)', color: '#c65042' };
const safeNext = n => (n && n.startsWith('/') && !n.startsWith('//')) ? n : '';

export function Auth() {
  const loc = useLocation(), nav = useNavigate(), { signIn } = useAuth();
  const mode = loc.pathname === '/register' ? 'register' : 'login';
  const next = safeNext(new URLSearchParams(loc.search).get('next')) || '/dashboard';
  const [err, setErr] = useState(''), [codeSent, setCodeSent] = useState(false), [cooldown, setCooldown] = useState(0), [info, setInfo] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);
  useEffect(() => { setCodeSent(false); setCooldown(0); setInfo(''); setErr(''); }, [mode]);
  async function sendCode(form) { setErr(''); setInfo(''); setBusy(true);
    try { const d = await post('/auth/send-code/', { phone: new FormData(form).get('phone') });
      setCodeSent(true); setCooldown(d.cooldown || 60); setInfo(d.debug_code ? 'کد آزمایشی (فقط حالت توسعه): ' + d.debug_code : d.detail);
    } catch (x) { setErr(x.message); } setBusy(false); }
  async function submit(e) { e.preventDefault(); setErr('');
    const form = e.currentTarget;
    if (mode === 'register' && !codeSent) { await sendCode(form); return; }
    const f = Object.fromEntries(new FormData(form));
    try { const data = await (mode === 'register' ? api.register({ fullname: f.fullname, phone: f.phone, password: f.password, code: f.code }) : api.login({ phone: f.phone, password: f.password }));
      signIn(data); const n = safeNext(new URLSearchParams(loc.search).get('next')); nav(n || panelUrl(data.user)); } catch (x) { setErr(x.message); } }
  return <Layout title={(mode === 'register' ? 'ثبت‌نام' : 'ورود') + ' | Waynet'}><main className="page"><div className="wrap auth-wrap"><div className="auth-card">
<span className="section-label">WAYNET ACCOUNT</span>
<h1>{mode === 'register' ? 'ثبت‌نام' : 'ورود'}</h1>
<p>برای مشاهده دوره‌های خریداری‌شده، جلسات و ثبت‌نام‌ها وارد حساب خود شوید.</p>
{err && <div className="success" style={ERR}>‌{err}</div>}
<form onSubmit={submit} key={mode}>
  {mode === 'register' && <label>نام و نام خانوادگی<input type="text" name="fullname" placeholder="نام شما" required/></label>}
  <label>شماره موبایل<input type="tel" name="phone" placeholder="09xxxxxxxxx" required/></label>
  <label>رمز عبور<input type="password" name="password" placeholder="••••••••" required/></label>
  {mode === 'register' && codeSent && <label>کد تأیید پیامک‌شده<input type="text" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={5} placeholder="•••••" required/></label>}
  {info && <div className="success">{info}</div>}
  <button className="btn primary" disabled={busy}>{mode === 'register' ? (codeSent ? 'ثبت‌نام و ورود به حساب' : 'ارسال کد تأیید') : 'ورود به حساب'}</button>
  {mode === 'register' && codeSent && <button type="button" className="btn secondary" style={{ marginTop: 10 }} disabled={busy || cooldown > 0} onClick={e => sendCode(e.currentTarget.form)}>{cooldown > 0 ? 'ارسال مجدد کد (' + cooldown + ' ثانیه)' : 'ارسال مجدد کد'}</button>}
</form>
<small>
  {mode !== 'register' && <><Link className="text-link" to="/forgot-password">رمز عبور خود را فراموش کرده‌اید؟</Link><br/></>}
  {mode === 'register' ? <>حساب دارید؟ <Link className="text-link" to={'/login?next=' + encodeURIComponent(next)}>ورود</Link></> : <>حساب ندارید؟ <Link className="text-link" to={'/register?next=' + encodeURIComponent(next)}>ثبت‌نام</Link></>}
</small>
</div></div></main></Layout>;
}

export function ForgotPassword() {
  const nav = useNavigate();
  const [phone, setPhone] = useState(''), [sent, setSent] = useState(false), [cooldown, setCooldown] = useState(0), [err, setErr] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);
  async function sendCode() { setErr(''); setInfo(''); setBusy(true);
    try { const d = await post('/auth/forgot-password/', { phone: phone.trim() });
      setSent(true); setCooldown(d.cooldown || 60); setInfo(d.debug_code ? 'کد آزمایشی (فقط حالت توسعه): ' + d.debug_code : d.detail);
    } catch (x) { setErr(x.message); } setBusy(false); }
  async function submit(e) { e.preventDefault(); setErr('');
    if (!sent) { await sendCode(); return; }
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (f.password !== f.password2) { setErr('رمز عبور و تکرار آن یکسان نیست.'); return; }
    setBusy(true);
    try { await post('/auth/reset-password/', { phone: phone.trim(), code: f.code, password: f.password }); nav('/login'); }
    catch (x) { setErr(x.message); } setBusy(false); }
  return <Layout title="بازیابی رمز عبور | Waynet"><main className="page"><div className="wrap auth-wrap"><div className="auth-card">
<span className="section-label">WAYNET ACCOUNT</span><h1>بازیابی رمز عبور</h1>
<p>{sent ? 'کد پیامک‌شده را همراه با رمز عبور جدید (حداقل ۶ کاراکتر) وارد کنید.' : 'شماره موبایل حساب خود را وارد کنید تا کد بازیابی برای شما پیامک شود.'}</p>
{err && <div className="success" style={ERR}>{err}</div>}{info && <div className="success">{info}</div>}
<form onSubmit={submit}>
  <label>شماره موبایل<input type="tel" name="phone" placeholder="09xxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} readOnly={sent} required/></label>
  {sent && <>
    <label>کد بازیابی پیامک‌شده<input type="text" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={5} placeholder="•••••" required/></label>
    <label>رمز عبور جدید<input type="password" name="password" minLength="6" required/></label>
    <label>تکرار رمز عبور جدید<input type="password" name="password2" minLength="6" required/></label></>}
  <button className="btn primary" disabled={busy}>{sent ? 'ذخیره رمز جدید' : 'ارسال کد بازیابی'}</button>
  {sent && <button type="button" className="btn secondary" style={{ marginTop: 10 }} disabled={busy || cooldown > 0} onClick={sendCode}>{cooldown > 0 ? 'ارسال مجدد کد (' + cooldown + ' ثانیه)' : 'ارسال مجدد کد'}</button>}
</form>
<small>{sent && <><a className="text-link" href="#" onClick={e => { e.preventDefault(); setSent(false); setInfo(''); setErr(''); }}>اصلاح شماره موبایل</a><br/></>}<Link className="text-link" to="/login">بازگشت به ورود</Link></small>
</div></div></main></Layout>;
}

// دوره‌های خریداری‌شده + پیشرفت (progress) و جلسات رایگان فعال‌شده
function useMyCourses() {
  return useData(async () => {
    const [dash, progress, all] = await Promise.all([api.dashboard(), get('/progress/').catch(() => []), get('/courses/')]);
    const owned = new Set(dash.courses.map(c => c.id));
    const purchased = dash.courses.map(c => { const done = progress.filter(p => p.course === c.id && p.completed).length; const total = c.sessions.length;
      return { ...c, progress: { completedCount: done, totalSessions: total, percent: total ? Math.round(done / total * 100) : 0 } }; });
    const granted = all.filter(c => !owned.has(c.id)).map(c => ({ id: c.id, title: c.title, total: c.sessions.length, sessions: c.sessions.filter(s => !s.locked && !s.is_free) })).filter(g => g.sessions.length);
    return { user: dash.user, ordersCount: dash.ordersCount, purchased, granted };
  }, null);
}
const Empty = () => <div className="empty">هنوز دوره‌ای خریداری نکرده‌اید. <Link className="text-link" to="/courses">مشاهده دوره‌ها ←</Link></div>;
function ProgressTable({ rows, withLabel }) {
  return <div className="table-like courses-progress-table"><div><b>دوره</b><b>پیشرفت</b><b>عملیات</b></div>
    {rows.map(c => <div key={c.id}><span>{c.title}</span><span className="progress-cell"><span className="bar-track" style={{ flex: 1, maxWidth: 120 }}><span className="bar-fill" style={{ width: c.progress.percent + '%' }}></span></span><small>{c.progress.completedCount} / {c.progress.totalSessions}{withLabel ? ' جلسه' : ''}</small></span>
      {c.sessions[0] ? <Link to={'/course/' + c.id + '/session/' + c.sessions[0].id}>ادامه یادگیری</Link> : <span></span>}</div>)}</div>;
}

export function Dashboard() {
  const { user } = useAuth();
  const [d, e] = useMyCourses();
  if (e || !d) return <Loading error={e}/>;
  return <Layout title="پنل کاربری | Waynet"><main className="page"><div className="wrap"><div className="dashboard-head"><div><span className="section-label">USER PANEL</span><h1>پنل کاربری Waynet</h1><p>خوش آمدید {user.fullname} — مدیریت دوره‌ها، خریدها و ادامه جلسات.</p></div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{user.role === 'teacher' && <Link className="btn secondary" to="/teacher">پنل مدرس</Link>}<Link className="btn primary" to="/courses">خرید دوره جدید</Link></div></div>
<DashboardNav/>
<div className="dash-grid"><div className="dash-card"><small>دوره‌های فعال</small><b>{d.purchased.length}</b></div><div className="dash-card"><small>سفارش‌های پرداخت‌شده</small><b>{fa(d.ordersCount)}</b></div><div className="dash-card"><small>وضعیت حساب</small><b>فعال</b></div></div>
<div className="panel"><h2>دوره‌های من</h2>{d.purchased.length ? <ProgressTable rows={d.purchased}/> : <Empty/>}</div>
</div></main></Layout>;
}
export function DashboardCourses() {
  const [d, e] = useMyCourses();
  if (e || !d) return <Loading error={e}/>;
  return <Layout title="دوره‌های من | Waynet"><main className="page"><div className="wrap narrow"><DashboardNav/>
<div className="page-hero"><span className="section-label">USER PANEL</span><h1>دوره‌های من</h1><p>فقط دوره‌هایی که خریداری/Enroll کرده‌اید اینجا نمایش داده می‌شوند.</p></div>
<div className="panel">{d.purchased.length ? <ProgressTable rows={d.purchased} withLabel/> : <Empty/>}</div>
{d.granted.length > 0 && <div className="panel" style={{ marginTop: 22 }}><h2>جلسات رایگان فعال‌شده برای شما</h2><div className="table-like courses-progress-table"><div><b>دوره</b><b>جلسات باز</b><b>عملیات</b></div>
  {d.granted.map(g => <div key={g.id}><span>{g.title}</span><span><small>{fa(g.sessions.length)} از {fa(g.total)} جلسه</small></span><span>{g.sessions.map(x => <Link key={x.id} to={'/course/' + g.id + '/session/' + x.id} style={{ display: 'block' }}>{x.title}</Link>)}</span></div>)}</div></div>}
</div></main></Layout>;
}
export function Orders() {
  const [orders, e] = useData(() => get('/orders/'), null);
  if (e || !orders) return <Loading error={e}/>;
  return <Layout title="سفارش‌های من | Waynet"><main className="page"><div className="wrap narrow"><DashboardNav/>
<div className="page-hero"><span className="section-label">USER PANEL</span><h1>سفارش‌های من</h1><p>تاریخچه‌ی سفارش‌ها و نتیجه‌ی پرداخت از طریق زرین‌پال.</p></div>
<div className="panel">{!orders.length ? <div className="empty">هنوز سفارشی ثبت نکرده‌اید.</div> : <div className="table-like admin-orders-table"><div><b>سفارش</b><b>مبلغ</b><b>وضعیت</b><b>تاریخ</b></div>
  {orders.map(o => <div key={o.id}><span><small>{o.items.map((it, i) => <React.Fragment key={i}>{it.title} × {it.qty}{i < o.items.length - 1 && '، '}</React.Fragment>)}</small>{o.ref_id && <><br/><small>کد رهگیری: {o.ref_id}</small></>}</span><span>{fa(o.amount)} تومان</span><span className="status">{o.status === 'paid' ? 'پرداخت‌شده' : o.status === 'failed' ? 'ناموفق' : 'در انتظار پرداخت'}</span><span><small>{faDate(o.created_at)}</small></span></div>)}</div>}</div>
</div></main></Layout>;
}
export function Profile() {
  const { user, setUser, signOut } = useAuth(), nav = useNavigate();
  const [saved, setSaved] = useState(false), [err, setErr] = useState(''), [pwErr, setPwErr] = useState('');
  async function save(e) { e.preventDefault(); setErr(''); setSaved(false); const f = Object.fromEntries(new FormData(e.currentTarget));
    try { setUser(await patch('/auth/me/', { fullname: f.fullname, specialty: f.specialty, bio: f.bio })); setSaved(true); } catch (x) { setErr(x.message); } }
  async function pw(e) { e.preventDefault(); setPwErr(''); const f = Object.fromEntries(new FormData(e.currentTarget));
    if (f.password !== f.password2) { setPwErr('رمز عبور جدید و تکرار آن یکسان نیست.'); return; }
    try { await post('/auth/change-password/', { old_password: f.current, password: f.password }); await signOut(); nav('/login'); } catch (x) { setPwErr(x.message); } }
  const box = { padding: 16, marginBottom: 16, color: '#c0392b' };
  return <Layout title="پروفایل | Waynet"><main className="page"><div className="wrap narrow"><DashboardNav/>
<div className="page-hero"><span className="section-label">USER PANEL</span><h1>پروفایل من</h1><p>مشاهده و ویرایش اطلاعات حساب کاربری خودتان.</p></div>
{saved && <div className="success">تغییرات با موفقیت ذخیره شد.</div>}
<div className="form-card">{err && <div className="empty" style={box}>{err}</div>}
  <form className="profile-form" onSubmit={save}>
    <label>شماره موبایل<input type="text" value={user.phone} readOnly dir="ltr"/></label>
    <label>نام و نام‌خانوادگی<input type="text" name="fullname" defaultValue={user.fullname} required/></label>
    <label>تخصص (اختیاری)<input type="text" name="specialty" defaultValue={user.specialty || ''}/></label>
    <label>درباره من (اختیاری)<textarea name="bio" rows="4" defaultValue={user.bio || ''}></textarea></label>
    <button className="btn primary" type="submit">ذخیره تغییرات</button></form></div>
<div className="form-card" id="password" style={{ marginTop: 18 }}><h2>تغییر رمز عبور</h2>{pwErr && <div className="empty" style={box}>{pwErr}</div>}
  <form className="profile-form" onSubmit={pw}><label>رمز عبور فعلی<input type="password" name="current" required/></label><label>رمز عبور جدید<input type="password" name="password" minLength="6" required/></label><label>تکرار رمز عبور جدید<input type="password" name="password2" minLength="6" required/></label><button className="btn primary" type="submit">تغییر رمز عبور</button></form></div>
</div></main></Layout>;
}
