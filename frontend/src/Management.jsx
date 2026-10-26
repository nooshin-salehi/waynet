import React, { useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { get, post, patch, remove, request } from './api';
import { Layout, Loading, NotFound, Msg, AdminNav, useData, fa, faDate } from './components';

const AMBER = { padding: 15, color: 'var(--amber)' };
const lines = v => (v || '').split('\n').map(x => x.trim()).filter(Boolean);
const roleName = r => r === 'admin' ? 'ادمین' : r === 'teacher' ? 'مدرس' : 'دانشجو';
const payStatus = s => s === 'paid' ? 'پرداخت‌شده' : s === 'failed' ? 'ناموفق' : 'در انتظار پرداخت';
const Warn = ({ children }) => children ? <div className="empty" style={AMBER}>{children}</div> : null;
const shell = (title, hero, children, narrow = true) => <Layout title={title}><main className="page"><div className={'wrap' + (narrow ? ' narrow' : '')}><AdminNav/>{hero}{children}</div></main></Layout>;
const hero = (h, p) => <div className="page-hero"><span className="section-label">ADMIN</span><h1>{h}</h1><p>{p}</p></div>;
const confirmThen = (q, fn) => e => { e.preventDefault(); if (window.confirm(q)) fn(); };

// کوچک‌سازی عکس با canvas، مثل نسخهٔ EJS (خروجی data URL)
function fileToDataUrl(file, max, limit) {
  return new Promise(resolve => {
    if (!file || !/^image\//.test(file.type)) return resolve('');
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); let q = .85, d = c.toDataURL('image/jpeg', q); while (d.length > limit && q > .3) { q -= .1; d = c.toDataURL('image/jpeg', q); }
      URL.revokeObjectURL(url); if (d.length <= limit) resolve(d); else { alert('حجم عکس زیاد است؛ عکس کوچک‌تری انتخاب کنید.'); resolve(''); } };
    img.src = url; });
}

export function Admin() {
  const [d, e] = useData(async () => { const [stats, orders] = await Promise.all([get('/admin/dashboard/'), get('/orders/')]); return { stats, orders }; }, null);
  if (e || !d) return <Loading error={e}/>;
  const s = d.stats, paid = d.orders.filter(o => o.status === 'paid'); const counts = {};
  paid.forEach(o => o.items.filter(i => i.type === 'course').forEach(i => { counts[i.title] = (counts[i.title] || 0) + 1; }));
  const top = Object.entries(counts).map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count).slice(0, 5); const max = top[0]?.count || 1;
  const sold = paid.reduce((n, o) => n + o.items.filter(i => i.type === 'course').length, 0);
  return shell('داشبورد مدیریت | Waynet', hero('داشبورد مدیریت Waynet', 'آمار زنده از دیتابیس — کاربران، دوره‌ها، فروش و درخواست‌ها.'), <>
<div className="dash-grid"><div className="dash-card"><small>تعداد کاربران</small><b>{fa(s.userCount)}</b></div><div className="dash-card"><small>مدرسان</small><b>{fa(s.teacherCount)}</b></div><div className="dash-card"><small>دانشجویان</small><b>{fa(s.studentCount)}</b></div><div className="dash-card"><small>دوره‌ها</small><b>{fa(s.courseCount)}</b></div></div>
<div className="dash-grid"><div className="dash-card"><small>جلسات آموزشی</small><b>{fa(s.sessionCount)}</b></div><div className="dash-card"><small>سفارش‌ها</small><b>{fa(s.orderCount)}</b></div><div className="dash-card"><small>خدمات</small><b>{fa(s.serviceCount)}</b></div><div className="dash-card"><small>محصولات</small><b>{fa(s.productCount)}</b></div></div>
<div className="dash-grid"><div className="dash-card"><small>دوره‌های فروخته‌شده</small><b>{fa(sold)}</b></div><div className="dash-card"><small>درآمد کل (پرداخت‌شده)</small><b>{fa(s.revenue)} ت</b></div><div className="dash-card"><small>درخواست رک در انتظار</small><b>{fa(s.pendingRackRequests)}</b></div></div>
<div className="panel"><h2>پرفروش‌ترین دوره‌ها</h2>
  {!top.length ? <div className="empty">هنوز سفارش پرداخت‌شده‌ای ثبت نشده است.</div> : <div className="bar-chart">{top.map(c => <div className="bar-chart-row" key={c.title}><span>{c.title}</span><small>{c.count} فروش</small><div className="bar-track"><div className="bar-fill" style={{ width: Math.round(c.count / max * 100) + '%' }}></div></div></div>)}</div>}</div></>);
}

function SearchBox({ q, setQ }) {
  const [v, setV] = useState(q);
  return <form className="form-card" onSubmit={e => { e.preventDefault(); setQ(v); }} style={{ marginBottom: 20, padding: 16, display: 'flex', gap: 10 }}><input type="text" name="q" value={v} onChange={e => setV(e.target.value)} placeholder="جست‌وجو با شماره‌موبایل یا نام..." style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 11, padding: 12 }}/><button className="btn primary" type="submit">جست‌وجو</button></form>;
}
const matches = (u, q) => !q || u.fullname.includes(q) || u.phone.includes(q);

export function AdminUsers() {
  const [q, setQ] = useState(''); const [users, e] = useData(() => get('/users/'), null);
  if (e || !users) return <Loading error={e}/>;
  const rows = users.filter(u => matches(u, q));
  return shell('مدیریت کاربران | Waynet', hero('مدیریت کاربران', 'جست‌وجو، مشاهده‌ی خریدها و کنترل دسترسی هر کاربر.'), <>
<SearchBox q={q} setQ={setQ}/>
<div className="panel">{!rows.length ? <div className="empty">کاربری یافت نشد.</div> : <div className="table-like admin-users-table"><div><b>نام</b><b>شماره‌موبایل</b><b>نقش</b><b>عملیات</b></div>
  {rows.map(u => <div key={u.id}><span>{u.fullname}{u.is_active === false && <> <span className="override-badge">غیرفعال</span></>}</span><span>{u.phone}</span><span>{roleName(u.role)}</span><Link to={'/admin/users/' + encodeURIComponent(u.phone)}>مشاهده ←</Link></div>)}</div>}</div></>);
}

export function AdminUserDetail() {
  const { phone } = useParams(), nav = useNavigate();
  const [d, e, loading, reload] = useData(async () => { const users = await get('/users/'); const user = users.find(u => u.phone === phone); if (!user) throw new Error('404');
    const [courses, enrollments, grants] = await Promise.all([get('/courses/'), get('/enrollments/'), get('/session-access/')]); return { user, courses, enrollments: enrollments.filter(x => x.student === user.id), grants: grants.filter(x => x.student === user.id) }; }, null, [phone]);
  const [msg, setMsg] = useState({ k: '', t: '' }), [courseSel, setCourseSel] = useState(''), [sessions, setSessions] = useState(null), [picked, setPicked] = useState([]), [prices, setPrices] = useState({});
  if (e) return <NotFound/>; if (loading || !d) return <Loading/>;
  const { user, courses, enrollments, grants } = d;
  const ok = (k, t) => setMsg({ k, t }); const fail = x => ok('err', x.message);
  const run = (fn, k, t) => async () => { try { await fn(); ok(k || '', t || ''); reload(); } catch (x) { fail(x); } };
  const active = c => enrollments.find(x => x.course === c.id && x.status === 'active');
  const showSessions = async cid => { setCourseSel(cid); setPicked([]); if (!cid) { setSessions(null); return; } try { setSessions(await get('/sessions/?course=' + cid)); } catch (x) { fail(x); } };
  const sel = courses.find(c => c.id === courseSel);
  return shell(user.fullname + ' | مدیریت کاربران', hero(user.fullname, user.phone + ' — عضو از ' + new Date(user.created_at).toLocaleDateString('fa-IR')), <>
{msg.k === 'err' && <Warn>{msg.t}</Warn>}
<div className="panel" style={{ marginBottom: 22 }}><h2>نقش و وضعیت حساب</h2>
  <div className="user-course-row"><span><b>نقش فعلی:</b> {roleName(user.role)} &nbsp;|&nbsp; <b>وضعیت:</b> {user.is_active === false ? 'غیرفعال' : 'فعال'}</span><span></span>
    <span className="admin-actions"><form onSubmit={e2 => { e2.preventDefault(); run(() => post('/users/' + user.id + '/toggle_active/'))(); }}><button className="btn secondary" type="submit">{user.is_active === false ? 'فعال‌سازی حساب' : 'غیرفعال‌سازی حساب'}</button></form></span></div></div>
{msg.k === 'pw' && <div className="success" style={{ marginBottom: 14 }}>رمز عبور با موفقیت تغییر کرد و Sessionهای قبلی این کاربر باطل شدند.</div>}
<div className="form-card" style={{ marginBottom: 22 }}><h2>Reset رمز عبور</h2><p style={{ color: 'var(--muted)', fontSize: 12, marginTop: -8 }}>رمز جدید فقط به‌صورت Hash در Database ذخیره می‌شود و هیچ‌وقت نمایش داده نمی‌شود.</p>
  <form onSubmit={async e2 => { e2.preventDefault(); const f = e2.currentTarget; const pw = new FormData(f).get('password'); if (pw.length < 6) { ok('err', 'رمز عبور باید حداقل ۶ کاراکتر باشد.'); return; } try { await patch('/users/' + user.id + '/', { password: pw }); f.reset(); ok('pw', ''); } catch (x) { fail(x); } }}>
    <div className="form-grid"><div><label>رمز عبور جدید</label><input type="password" name="password" minLength="6" autoComplete="new-password" required/></div></div>
    <div style={{ marginTop: 14 }}><button className="btn secondary" type="submit">تغییر رمز عبور</button></div></form></div>
<div className="panel"><h2>دوره‌ها</h2><p style={{ color: 'var(--muted)', fontSize: 12, marginTop: -8 }}>برای هر دوره می‌توانید دسترسی را دستی باز/بسته کنید یا قیمت اختصاصی برای همین کاربر تنظیم کنید (روی چک‌اوت بعدی او اعمال می‌شود).</p>
  {courses.map(c => { const en = active(c), ov = user.price_overrides ? user.price_overrides[c.id] : undefined; const savePrices = o => patch('/users/' + user.id + '/', { price_overrides: o });
    return <div className="user-course-row" key={c.id}>
      <span><b>{c.title}</b>{ov != null && <><br/><span className="override-badge">قیمت اختصاصی: {fa(ov)} ت</span></>}</span>
      <span>{en ? <>فعال {!en.order && '(unlock دستی)'}</> : 'قفل'}</span>
      <span className="admin-actions">
        {en ? <form onSubmit={e2 => { e2.preventDefault(); run(() => patch('/enrollments/' + en.id + '/', { status: 'cancelled' }))(); }}><button className="btn secondary" type="submit">قفل کردن</button></form>
          : <form onSubmit={e2 => { e2.preventDefault(); run(() => post('/enrollments/', { student: user.id, course: c.id, status: 'active' }))(); }}><button className="btn primary" type="submit">unlock رایگان</button></form>}
        <form onSubmit={e2 => { e2.preventDefault(); const v = prices[c.id]; if (v === undefined || v === '') return; run(() => savePrices({ ...user.price_overrides, [c.id]: parseInt(v, 10) }))(); }}>
          <input type="number" name="price" min="0" step="1000" placeholder="قیمت اختصاصی (تومان)" value={prices[c.id] ?? (ov != null ? ov : '')} onChange={e2 => setPrices({ ...prices, [c.id]: e2.target.value })}/><button className="btn secondary" type="submit">ثبت قیمت</button></form>
        {ov != null && <form onSubmit={e2 => { e2.preventDefault(); const o = { ...user.price_overrides }; delete o[c.id]; setPrices({ ...prices, [c.id]: '' }); run(() => savePrices(o))(); }}><button className="btn secondary" type="submit">حذف قیمت اختصاصی</button></form>}
      </span></div>; })}</div>
<div className="panel" id="session-access" style={{ marginTop: 22 }}><h2>مدیریت دسترسی رایگان جلسات</h2><p style={{ color: 'var(--muted)', fontSize: 12, marginTop: -8 }}>دوره را انتخاب کنید و فقط جلسات موردنظر را برای همین دانشجو رایگان کنید. دسترسی به‌صورت جلسه‌محور است و کل دوره را باز نمی‌کند.</p>
  {msg.k === 'grant' && <div className="success">دسترسی رایگان جلسات انتخاب‌شده فعال شد.</div>}{msg.k === 'revoke' && <div className="success">دسترسی رایگان جلسه لغو شد.</div>}
  <form onSubmit={e2 => { e2.preventDefault(); showSessions(courseSel); }} className="admin-actions" style={{ marginBottom: 14 }}>
    <select name="course" required value={courseSel} onChange={e2 => setCourseSel(e2.target.value)}><option value="">انتخاب دوره...</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select><button className="btn secondary" type="submit">نمایش جلسات</button></form>
  {sel && sessions && (active(sel) ? <div className="empty" style={AMBER}>این دانشجو کل دوره «{sel.title}» را دارد؛ همه‌ی جلسات برایش باز است و نیازی به دسترسی رایگان جداگانه نیست.</div>
    : !sessions.length ? <div className="empty">این دوره هنوز جلسه‌ای ندارد.</div> :
    <form onSubmit={e2 => { e2.preventDefault(); if (!picked.length) { ok('err', 'حداقل یک جلسه را انتخاب کنید.'); return; } run(async () => { for (const sid of picked) await post('/session-access/', { student: user.id, course: sel.id, session: sid }); setPicked([]); }, 'grant')(); }}>
      {sessions.map((ss, i) => { const g = grants.find(x => x.session === ss.id); return <div className="user-course-row" key={ss.id}>
        <span>{!g && !ss.is_free ? <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><input type="checkbox" checked={picked.includes(ss.id)} onChange={e2 => setPicked(e2.target.checked ? [...picked, ss.id] : picked.filter(x => x !== ss.id))}/> <b>جلسه {fa(i + 1)} — {ss.title}</b></label> : <b>جلسه {fa(i + 1)} — {ss.title}</b>}</span>
        <span>{g ? 'دسترسی رایگان فعال است' : ss.is_free ? 'رایگان برای همه' : 'قفل'}</span>
        <span className="admin-actions">{g && <button className="btn secondary" type="button" onClick={run(() => remove('/session-access/' + g.id + '/'), 'revoke')}>لغو دسترسی (Lock)</button>}</span></div>; })}
      <div style={{ marginTop: 14 }}><button className="btn primary" type="submit">فعال‌سازی دسترسی رایگان</button></div></form>)}
</div></>);
}

export function AdminTeachers() {
  const [d, e, , reload] = useData(async () => ({ users: await get('/users/?role=teacher'), courses: await get('/courses/') }), null);
  const [err, setErr] = useState(''), [avatar, setAvatar] = useState('');
  if (e || !d) return <Loading error={e}/>;
  async function create(ev) { ev.preventDefault(); setErr(''); const form = ev.currentTarget; const f = Object.fromEntries(new FormData(form));
    if (!f.fullname || !f.phone || !f.password) { setErr('همه فیلدها را پر کنید.'); return; } if (f.password.length < 6) { setErr('رمز عبور باید حداقل ۶ کاراکتر باشد.'); return; }
    try { await post('/users/', { role: 'teacher', fullname: f.fullname, phone: f.phone, password: f.password, teaching_field: f.teachingField, specialty: f.specialty, avatar: avatar || null }); form.reset(); setAvatar(''); reload(); }
    catch (x) { setErr(/unique|exist|already|تکراری|قبلاً/i.test(x.message) ? 'این شماره موبایل قبلاً ثبت شده است.' : x.message); } }
  return shell('مدیریت مدرسان | Waynet', hero('مدیریت مدرسان', 'ایجاد حساب مدرس جدید و مشاهده‌ی تعداد دوره‌های هر مدرس.'), <>
<Warn>{err}</Warn>
<div className="form-card" style={{ marginBottom: 22 }}><h2>ایجاد مدرس جدید</h2><form onSubmit={create}><div className="form-grid">
  <div><label>نام و نام‌خانوادگی</label><input type="text" name="fullname" required/></div><div><label>شماره موبایل</label><input type="text" name="phone" required/></div>
  <div><label>رمز عبور</label><input type="password" name="password" minLength="6" required/></div>
  <div><label>درس / حوزه تدریس (اختیاری)</label><input type="text" name="teachingField" placeholder="مثلاً مدرس شبکه و سیسکو"/></div>
  <div><label>حوزه تخصصی (اختیاری)</label><input type="text" name="specialty" placeholder="مثلاً طراحی و پیاده‌سازی شبکه‌های سازمانی"/></div>
  <div><label>عکس مدرس (اختیاری)</label><input type="file" id="avatarFile" accept="image/jpeg,image/png,image/webp" onChange={async x => setAvatar(await fileToDataUrl(x.target.files[0], 480, 70000))}/></div></div>
  <div style={{ marginTop: 14 }}><button className="btn primary" type="submit">ایجاد مدرس</button></div></form></div>
<div className="panel">{!d.users.length ? <div className="empty">هنوز مدرسی ثبت نشده است.</div> : <div className="table-like admin-teachers-table"><div><b>نام</b><b>تعداد دوره</b><b>وضعیت</b></div>
  {d.users.map(t => <div key={t.id}><span><Link to={'/admin/teachers/' + t.id + '/edit'}>{t.fullname}</Link></span><span>{d.courses.filter(c => c.teacher_user === t.id).length}</span><span className="status">{t.is_active === false ? 'غیرفعال' : 'فعال'}</span></div>)}</div>}</div>
<p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 14 }}>برای تغییر نقش، فعال/غیرفعال‌کردن یا دیدن جزئیات، از <Link to="/admin/users">مدیریت کاربران</Link> استفاده کنید.</p></>);
}
export function AdminTeacherEdit() {
  const { id } = useParams(), nav = useNavigate();
  const [t, e, loading] = useData(() => get('/users/' + id + '/'), null, [id]);
  const [err, setErr] = useState(''), [avatar, setAvatar] = useState('');
  if (e) return <NotFound/>; if (loading || !t) return <Loading/>;
  async function save(ev) { ev.preventDefault(); setErr(''); const f = Object.fromEntries(new FormData(ev.currentTarget)); if (!f.fullname.trim()) { setErr('نام مدرس را وارد کنید.'); return; }
    const body = { fullname: f.fullname.trim(), teaching_field: f.teachingField, specialty: f.specialty }; if (avatar) body.avatar = avatar; else if (f.removeAvatar) body.avatar = null;
    try { await patch('/users/' + id + '/', body); nav('/admin/teachers'); } catch (x) { setErr(x.message); } }
  return shell('ویرایش ' + t.fullname + ' | مدیریت مدرسان', hero('ویرایش مدرس', 'اطلاعات مدرس'), <>
<Warn>{err}</Warn>
<div className="form-card" style={{ marginBottom: 22 }}><form onSubmit={save}><div className="form-grid">
  <div><label>نام و نام‌خانوادگی</label><input type="text" name="fullname" defaultValue={t.fullname} required/></div>
  <div><label>درس / حوزه تدریس</label><input type="text" name="teachingField" defaultValue={t.teaching_field || ''}/></div>
  <div><label>حوزه تخصصی</label><input type="text" name="specialty" defaultValue={t.specialty || ''}/></div>
  <div><label>عکس مدرس</label>{t.avatar && <img className="admin-avatar-preview" src={t.avatar} alt={t.fullname}/>}
    <input type="file" id="avatarFile" accept="image/jpeg,image/png,image/webp" onChange={async x => setAvatar(await fileToDataUrl(x.target.files[0], 480, 70000))}/>
    {t.avatar && <label style={{ marginTop: 10 }}><input type="checkbox" name="removeAvatar" value="1" style={{ display: 'inline', width: 'auto' }}/> حذف عکس فعلی</label>}</div></div>
  <div style={{ marginTop: 14, display: 'flex', gap: 8 }}><button className="btn primary" type="submit">ذخیره</button><Link className="btn secondary" to="/admin/teachers">بازگشت</Link>
    <button className="btn secondary" type="button" onClick={async () => { if (!window.confirm('این مدرس حذف شود؟ دوره‌های او بدون مدرس باقی می‌مانند.')) return; try { await remove('/users/' + id + '/'); nav('/admin/teachers'); } catch (x) { setErr(x.message); } }}>حذف مدرس</button></div></form></div></>);
}

export function AdminStudents() {
  const [q, setQ] = useState(''); const [d, e, , reload] = useData(async () => ({ users: await get('/users/?role=student'), enr: await get('/enrollments/') }), null);
  const [err, setErr] = useState('');
  if (e || !d) return <Loading error={e}/>;
  async function create(ev) { ev.preventDefault(); setErr(''); const form = ev.currentTarget; const f = Object.fromEntries(new FormData(form));
    if (!f.fullname || !f.phone || !f.password) { setErr('همه فیلدها را پر کنید.'); return; } if (f.password.length < 6) { setErr('رمز عبور باید حداقل ۶ کاراکتر باشد.'); return; }
    try { await post('/users/', { role: 'student', fullname: f.fullname, phone: f.phone, password: f.password }); form.reset(); reload(); } catch (x) { setErr(/unique|exist|already|تکراری|قبلاً/i.test(x.message) ? 'این شماره موبایل قبلاً ثبت شده است.' : x.message); } }
  const rows = d.users.filter(u => matches(u, q));
  return shell('مدیریت دانشجویان | Waynet', hero('مدیریت دانشجویان', 'ایجاد حساب دانشجو و جست‌وجو در میان دانشجویان ثبت‌نام‌شده.'), <>
<Warn>{err}</Warn>
<div className="form-card" style={{ marginBottom: 22 }}><h2>ایجاد دانشجوی جدید</h2><form onSubmit={create}><div className="form-grid"><div><label>نام و نام‌خانوادگی</label><input type="text" name="fullname" required/></div><div><label>شماره موبایل</label><input type="text" name="phone" required/></div><div className="full"><label>رمز عبور</label><input type="password" name="password" minLength="6" required/></div></div><div style={{ marginTop: 14 }}><button className="btn primary" type="submit">ایجاد دانشجو</button></div></form></div>
<SearchBox q={q} setQ={setQ}/>
<div className="panel">{!rows.length ? <div className="empty">دانشجویی یافت نشد.</div> : <div className="table-like admin-users-table"><div><b>نام</b><b>شماره‌موبایل</b><b>دوره‌های خریداری‌شده</b><b>عملیات</b></div>
  {rows.map(u => <div key={u.id}><span>{u.fullname}{u.is_active === false && <> <span className="override-badge">غیرفعال</span></>}</span><span>{u.phone}</span><span>{d.enr.filter(x => x.student === u.id && x.status === 'active').length}</span><Link to={'/admin/users/' + encodeURIComponent(u.phone)}>مشاهده ←</Link></div>)}</div>}</div></>);
}

export function AdminCourses() {
  const [rows, e] = useData(() => get('/courses/'), null);
  if (e || !rows) return <Loading error={e}/>;
  return shell('مدیریت دوره‌ها | Waynet', hero('مدیریت دوره‌ها', 'ایجاد، ویرایش، تخصیص مدرس و مدیریت جلسات هر دوره.'), <>
<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><Link className="btn primary" to="/admin/courses/create">+ دوره جدید</Link></div>
<div className="panel">{!rows.length ? <div className="empty">هنوز دوره‌ای ثبت نشده است.</div> : <div className="table-like admin-courses-table"><div><b>عنوان</b><b>دسته‌بندی</b><b>مدرس</b><b>وضعیت</b><b>عملیات</b></div>
  {rows.map(c => <div key={c.id}><span>{c.title}</span><span>{c.category_name}</span><span>{c.teacher_name}</span><span className="status">{c.is_active ? 'فعال' : 'غیرفعال'}</span><span className="admin-actions"><Link className="btn secondary" to={'/admin/courses/' + c.id}>جلسات</Link><Link className="btn secondary" to={'/admin/courses/' + c.id + '/edit'}>ویرایش</Link></span></div>)}</div>}</div></>);
}
export function AdminCourseForm({ mode }) {
  const { id } = useParams(), nav = useNavigate();
  const [d, e, loading] = useData(async () => ({ cats: await get('/categories/'), teachers: await get('/users/?role=teacher'), course: mode === 'edit' ? await get('/courses/' + id + '/') : null }), null, [id, mode]);
  const [err, setErr] = useState('');
  if (e) return <NotFound/>; if (loading || !d) return <Loading/>;
  const course = d.course;
  async function submit(ev) { ev.preventDefault(); setErr(''); const f = Object.fromEntries(new FormData(ev.currentTarget));
    const cat = d.cats.find(c => c.id === f.categoryId); if (!cat) { setErr('دسته‌بندی انتخاب‌شده معتبر نیست.'); return; }
    if (mode === 'create' && !/^[a-z0-9-]+$/.test(f.id)) { setErr('شناسه‌ی دوره باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد (مثل ccna-rs).'); return; }
    const teacher = d.teachers.find(t => String(t.id) === f.teacherId);
    const body = { title: f.title.trim(), category: cat.id, category_name: cat.title, type: course ? course.type : cat.type, teacher_user: teacher ? teacher.id : null, teacher: teacher ? teacher.fullname : '', duration: f.duration, capacity: f.capacity, price: f.price, level: f.level, desc: f.desc, audience: f.audience, prerequisites: f.prerequisites, goals: lines(f.goals), skills: lines(f.skills), features: lines(f.features) };
    try { if (mode === 'create') { const r = await post('/courses/', { id: f.id, ...body }); nav('/admin/courses/' + r.id); } else { await patch('/courses/' + id + '/', body); nav('/admin/courses/' + id + '?saved=1'); } }
    catch (x) { setErr(/exist|already|unique|وجود/i.test(x.message) ? 'دوره‌ای با همین شناسه از قبل وجود دارد.' : x.message); } }
  return shell((mode === 'create' ? 'دوره جدید' : 'ویرایش ' + course.title) + ' | مدیریت دوره‌ها', hero(mode === 'create' ? 'دوره جدید' : 'ویرایش دوره', 'اطلاعات دوره را وارد کنید — طراحی/UI سایت با این فرم تغییری نمی‌کند.'), <>
<Warn>{err}</Warn>
<div className="form-card"><form onSubmit={submit}><div className="form-grid">
  {mode === 'create' ? <div><label>شناسه یکتا (لاتین، مثل ccna-rs)</label><input type="text" name="id" pattern="[a-z0-9-]+" required/></div> : <div><label>شناسه (غیرقابل تغییر)</label><input type="text" value={course.id} disabled readOnly/></div>}
  <div><label>عنوان دوره</label><input type="text" name="title" defaultValue={course ? course.title : ''} required/></div>
  <div><label>دسته‌بندی</label><select name="categoryId" required defaultValue={course ? course.category : d.cats[0]?.id}>{d.cats.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
  <div><label>مدرس</label><select name="teacherId" defaultValue={course && course.teacher_user ? String(course.teacher_user) : ''}><option value="">— بدون مدرس —</option>{d.teachers.map(t => <option key={t.id} value={String(t.id)}>{t.fullname}</option>)}</select></div>
  <div><label>مدت دوره (مثلاً ۴۵ ساعت)</label><input type="text" name="duration" defaultValue={course ? course.duration : ''} required/></div>
  <div><label>ظرفیت (مثلاً ۱۲ نفر)</label><input type="text" name="capacity" defaultValue={course ? course.capacity : ''} required/></div>
  <div><label>قیمت (مثلاً ۴,۸۰۰,۰۰۰ تومان)</label><input type="text" name="price" defaultValue={course ? course.price : ''} required/></div>
  <div><label>سطح (مثلاً مقدماتی تا متوسط)</label><input type="text" name="level" defaultValue={course ? course.level : ''} required/></div>
  <div className="full"><label>توضیح کوتاه</label><textarea name="desc" rows="3" defaultValue={course ? course.desc : ''} required></textarea></div>
  <div className="full"><label>مخاطب دوره</label><textarea name="audience" rows="2" defaultValue={course ? course.audience : ''} required></textarea></div>
  <div className="full"><label>پیش‌نیازها</label><textarea name="prerequisites" rows="2" defaultValue={course ? course.prerequisites : ''} required></textarea></div>
  <div className="full"><label>اهداف دوره (هر مورد در یک خط)</label><textarea name="goals" rows="3" defaultValue={course ? course.goals.join('\n') : ''}></textarea></div>
  <div className="full"><label>مهارت‌ها (هر مورد در یک خط)</label><textarea name="skills" rows="3" defaultValue={course ? course.skills.join('\n') : ''}></textarea></div>
  <div className="full"><label>امکانات دوره (هر مورد در یک خط)</label><textarea name="features" rows="3" defaultValue={course ? course.features.join('\n') : ''}></textarea></div></div>
  <div style={{ marginTop: 16 }}><button className="btn primary" type="submit">{mode === 'create' ? 'ایجاد دوره' : 'ذخیره تغییرات'}</button>{mode === 'edit' && <Link className="btn secondary" to={'/admin/courses/' + course.id}>مدیریت جلسات ←</Link>}</div></form></div></>);
}
export function AdminCourseDetail() {
  const { id } = useParams(), nav = useNavigate(), loc = useLocation();
  const [d, e, loading, reload] = useData(async () => { const course = await get('/courses/' + id + '/'); const [sessions, ann, qs, enr, orders] = await Promise.all([get('/sessions/?course=' + id), get('/announcements/?course=' + id), get('/questions/?course=' + id), get('/enrollments/'), get('/orders/')]); return { course, sessions, ann, qs, enr, orders }; }, null, [id]);
  const [saved, setSaved] = useState(new URLSearchParams(loc.search).get('saved') === '1'), [err, setErr] = useState('');
  const [forms, setForms] = useState({}), [newFree, setNewFree] = useState(false);
  if (e) return <NotFound/>; if (loading || !d) return <Loading/>;
  const { course, sessions, ann, qs } = d;
  const act = (fn, ok) => async () => { setErr(''); try { await fn(); setSaved(!!ok); reload(); } catch (x) { setErr(x.message); } };
  const fv = s => forms[s.id] || { title: s.title, duration: s.duration || '', description: s.description || '', video_url: s.video_url || '', is_free: !!s.is_free };
  const setF = (s, patchObj) => setForms({ ...forms, [s.id]: { ...fv(s), ...patchObj } });
  const move = async (i, dir) => { const list = [...sessions]; const j = i + dir; [list[i], list[j]] = [list[j], list[i]]; await Promise.all(list.map((x, idx) => x.order === idx ? null : post('/sessions/' + x.id + '/move/', { order: idx }))); };
  const enrollmentCount = d.enr.filter(x => x.course === id && x.status === 'active').length;
  const orderCount = d.orders.filter(o => o.status === 'paid' && o.items.some(i => i.type === 'course' && i.id === id)).length;
  return shell(course.title + ' | مدیریت دوره‌ها', hero(course.title, course.category_name + ' — مدیریت جلسات این دوره'), <>
{saved && <div className="success">تغییرات ذخیره شد.</div>}<Warn>{err}</Warn>
<div className="panel" style={{ marginBottom: 22 }}><div className="user-course-row"><span>وضعیت: <b>{course.is_active !== false ? 'فعال' : 'غیرفعال'}</b> &nbsp;|&nbsp; ثبت‌نام فعال: <b>{enrollmentCount}</b> &nbsp;|&nbsp; سفارش پرداخت‌شده: <b>{orderCount}</b></span><span></span>
  <span className="admin-actions"><Link className="btn secondary" to={'/admin/courses/' + course.id + '/edit'}>ویرایش اطلاعات دوره</Link>
    {course.is_active === false && <form onSubmit={e2 => { e2.preventDefault(); act(() => patch('/courses/' + id + '/', { is_active: true }), true)(); }}><button className="btn secondary" type="submit">فعال‌سازی مجدد</button></form>}
    <form onSubmit={confirmThen('این دوره حذف/غیرفعال شود؟', act(() => remove('/courses/' + id + '/'), true))}><button className="btn secondary" type="submit">حذف دوره</button></form></span></div></div>
<div className="panel" style={{ marginBottom: 22 }}><h2>جلسات ({sessions.length})</h2>{!sessions.length && <div className="empty">هنوز جلسه‌ای برای این دوره ثبت نشده است.</div>}
  {sessions.map((s, i) => { const f = fv(s); return <div className="session-card" key={s.id}>
    <div className="session-head"><div className="session-head-title"><span className="session-order">#{i + 1}</span><b>{s.title}</b>{s.is_free && <span className="override-badge">رایگان</span>}</div>
      <div className="session-actions">
        <form onSubmit={e2 => { e2.preventDefault(); act(() => move(i, -1))(); }}><button className="btn secondary" type="submit" disabled={i === 0}>▲ بالا</button></form>
        <form onSubmit={e2 => { e2.preventDefault(); act(() => move(i, 1))(); }}><button className="btn secondary" type="submit" disabled={i === sessions.length - 1}>▼ پایین</button></form>
        <form onSubmit={confirmThen('این جلسه حذف شود؟', act(() => remove('/sessions/' + s.id + '/')))}><button className="btn secondary" type="submit">حذف</button></form></div></div>
    <form onSubmit={e2 => { e2.preventDefault(); act(() => patch('/sessions/' + s.id + '/', f), true)(); }}><div className="session-fields">
      <div><label>عنوان جلسه</label><input type="text" name="title" value={f.title} onChange={x => setF(s, { title: x.target.value })} required/></div>
      <div><label>مدت زمان</label><input type="text" name="duration" value={f.duration} onChange={x => setF(s, { duration: x.target.value })} placeholder="مثلاً ۴۵ دقیقه"/></div>
      <div className="full"><label>توضیحات</label><textarea name="description" rows="2" value={f.description} onChange={x => setF(s, { description: x.target.value })}></textarea></div>
      <div className="full"><label>آدرس ویدیو (اختیاری)</label><input type="text" name="videoUrl" value={f.video_url} onChange={x => setF(s, { video_url: x.target.value })} placeholder="در صورت خالی بودن، از ویدیوی پیش‌فرض دوره استفاده می‌شود"/></div>
      <div className="full checkbox-row"><input type="checkbox" id={'free-' + s.id} name="isFree" checked={f.is_free} onChange={x => setF(s, { is_free: x.target.checked })}/><label htmlFor={'free-' + s.id} style={{ margin: 0 }}>این جلسه رایگان باشد (بدون نیاز به خرید دوره)</label></div></div>
      <div style={{ marginTop: 12 }}><button className="btn primary" type="submit">ذخیره تغییرات</button></div></form></div>; })}</div>
<div className="form-card"><h2>افزودن جلسه جدید</h2><form onSubmit={async e2 => { e2.preventDefault(); const form = e2.currentTarget; const f = Object.fromEntries(new FormData(form)); await act(() => post('/sessions/', { course: id, title: f.title.trim(), duration: f.duration, description: f.description, video_url: f.videoUrl || null, is_free: newFree, order: sessions.length }), true)(); form.reset(); setNewFree(false); }}><div className="session-fields">
  <div><label>عنوان جلسه</label><input type="text" name="title" required/></div><div><label>مدت زمان</label><input type="text" name="duration" placeholder="مثلاً ۴۵ دقیقه"/></div>
  <div className="full"><label>توضیحات</label><textarea name="description" rows="2"></textarea></div><div className="full"><label>آدرس ویدیو (اختیاری)</label><input type="text" name="videoUrl"/></div>
  <div className="full checkbox-row"><input type="checkbox" id="free-new" name="isFree" checked={newFree} onChange={x => setNewFree(x.target.checked)}/><label htmlFor="free-new" style={{ margin: 0 }}>این جلسه رایگان باشد (بدون نیاز به خرید دوره)</label></div></div>
  <div style={{ marginTop: 14 }}><button className="btn primary" type="submit">افزودن جلسه</button></div></form></div>
<div className="panel" style={{ marginTop: 22 }}><h2>Announcementهای دوره ({ann.length})</h2>{!ann.length && <div className="empty">Announcementی ثبت نشده است.</div>}
  {ann.map(a => <div className="session-card" key={a.id}><div className="session-head"><div><b>{a.title}</b></div><small>{faDate(a.announcement_date)}</small></div><p>{a.text}</p>{a.class_link && <p><a className="text-link" href={a.class_link} target="_blank" rel="noopener noreferrer">لینک کلاس آنلاین ←</a></p>}
    <form onSubmit={confirmThen('حذف شود؟', act(() => remove('/announcements/' + a.id + '/')))}><button className="btn secondary" type="submit">حذف</button></form></div>)}</div>
<div className="panel" style={{ marginTop: 22 }}><h2>سوالات و نظرات دانشجویان ({qs.length})</h2>{!qs.length && <div className="empty">موردی ثبت نشده است.</div>}
  {qs.map(q => <div className="session-card" key={q.id}><div className="session-head"><div><b>{q.type === 'question' ? 'سوال' : 'نظر'}</b> — {q.student_name || 'دانشجو'}</div><small>{faDate(q.created_at)}</small></div><p>{q.text}</p>{q.reply_text && <div className="panel"><b>پاسخ مدرس</b><p>{q.reply_text}</p></div>}
    <form onSubmit={confirmThen('حذف شود؟', act(() => remove('/questions/' + q.id + '/')))}><button className="btn secondary" type="submit">حذف</button></form></div>)}</div></>);
}

export function AdminCategories() {
  const [d, e, , reload] = useData(async () => ({ cats: await get('/categories/'), courses: await get('/courses/') }), null);
  const [err, setErr] = useState(''), [saved, setSaved] = useState('');
  if (e || !d) return <Loading error={e}/>;
  const act = (fn, s) => async () => { setErr(''); setSaved(''); try { await fn(); setSaved(s); reload(); } catch (x) { setErr(/دارای دوره/.test(x.message) ? 'این حوزه دارای دوره است و برای جلوگیری از خراب شدن ارتباط دوره‌ها قابل حذف نیست.' : x.message); } };
  async function create(ev) { ev.preventDefault(); const form = ev.currentTarget; const f = Object.fromEntries(new FormData(form));
    if (![f.id, f.title, f.short, f.icon, f.desc].every(Boolean)) { setErr('همه فیلدهای حوزه را کامل کنید.'); return; }
    if (d.cats.some(c => c.id === f.id)) { setErr('شناسه‌ای با این مقدار از قبل وجود دارد.'); return; }
    await act(() => post('/categories/', { id: f.id, title: f.title, short: f.short, icon: f.icon, desc: f.desc, type: f.id }), 'saved')(); form.reset(); }
  return shell('مدیریت حوزه‌ها | Waynet', hero('مدیریت حوزه‌ها', 'ایجاد حوزه‌های جدید برای دسته‌بندی دوره‌ها؛ مثلاً «سرور»، «کلاد» یا هر حوزه تخصصی دیگر.'), <>
<Warn>{err}</Warn>{saved && <div className="success">{saved === 'deleted' ? 'حوزه با موفقیت حذف شد.' : 'تغییرات با موفقیت ذخیره شد.'}</div>}
<div className="form-card" style={{ marginBottom: 22 }}><h2>ایجاد حوزه جدید</h2><form onSubmit={create}><div className="form-grid">
  <div><label>شناسه یکتا (لاتین، مثل server)</label><input type="text" name="id" pattern="[a-z0-9-]+" required/></div><div><label>عنوان حوزه</label><input type="text" name="title" placeholder="مثلاً دوره سرور" required/></div>
  <div><label>عنوان کوتاه</label><input type="text" name="short" placeholder="مثلاً سرور" required/></div><div><label>آیکون / عبارت کوتاه</label><input type="text" name="icon" placeholder="مثلاً SRV" required/></div>
  <div className="full"><label>توضیح حوزه</label><textarea name="desc" rows="3" placeholder="توضیح کوتاهی که در صفحه حوزه نمایش داده می‌شود" required></textarea></div></div>
  <div style={{ marginTop: 16 }}><button className="btn primary" type="submit">+ ایجاد حوزه</button></div></form></div>
<div className="panel"><h2 style={{ marginTop: 0 }}>حوزه‌های فعلی</h2>{!d.cats.length ? <div className="empty">هنوز حوزه‌ای ثبت نشده است.</div> : <div className="table-like"><div><b>حوزه</b><b>شناسه</b><b>تعداد دوره</b><b>عملیات</b></div>
  {d.cats.map(c => { const count = d.courses.filter(x => x.category === c.id).length; return <div key={c.id}><span><strong>{c.title}</strong><br/><small>{c.short} — {c.icon}</small></span><span>{c.id}</span><span>{count}</span>
    <span className="admin-actions"><Link className="btn secondary" to={'/courses/' + c.id} target="_blank">مشاهده</Link>
      <details style={{ display: 'inline-block' }}><summary className="btn secondary" style={{ cursor: 'pointer' }}>ویرایش</summary>
        <div className="form-card" style={{ marginTop: 10, minWidth: 360, textAlign: 'right' }}>
          <form onSubmit={e2 => { e2.preventDefault(); const f = Object.fromEntries(new FormData(e2.currentTarget)); act(() => patch('/categories/' + c.id + '/', { title: f.title, short: f.short, icon: f.icon, desc: f.desc }), 'saved')(); }}>
            <label>عنوان<input type="text" name="title" defaultValue={c.title} required/></label><label>عنوان کوتاه<input type="text" name="short" defaultValue={c.short} required/></label>
            <label>آیکون / عبارت کوتاه<input type="text" name="icon" defaultValue={c.icon} required/></label><label>توضیح<textarea name="desc" rows="3" defaultValue={c.desc} required></textarea></label><button className="btn primary" type="submit">ذخیره</button></form>
          {count === 0 && <form style={{ marginTop: 8 }} onSubmit={confirmThen('این حوزه حذف شود؟', act(() => remove('/categories/' + c.id + '/'), 'deleted'))}><button className="btn secondary" type="submit">حذف حوزه</button></form>}</div></details></span></div>; })}</div>}</div></>);
}

export function AdminOrders() {
  const [orders, e] = useData(() => get('/orders/'), null);
  if (e || !orders) return <Loading error={e}/>;
  return shell('مدیریت سفارش‌ها | Waynet', hero('مدیریت سفارش‌ها', 'سفارش‌های ثبت‌شده در سبد خرید و نتیجه‌ی نهایی پرداخت از طریق زرین‌پال.'),
    <div className="panel">{!orders.length ? <div className="empty">هنوز سفارشی ثبت نشده است.</div> : <div className="table-like admin-orders-table"><div><b>سفارش</b><b>مبلغ</b><b>وضعیت</b><b>تاریخ</b></div>
      {orders.map(o => <div key={o.id}><span><b>{o.phone || 'مهمان'}</b><br/><small>{o.items.map((it, i) => <React.Fragment key={i}>{it.title} × {it.qty}{i < o.items.length - 1 && '، '}</React.Fragment>)}</small>{o.ref_id && <><br/><small>کد رهگیری: {o.ref_id}</small></>}</span><span>{fa(o.amount)} تومان</span><span className="status">{payStatus(o.status)}</span><span><small>{faDate(o.created_at)}</small></span></div>)}</div>}</div>);
}
export function AdminPayments() {
  const status = new URLSearchParams(useLocation().search).get('status') || '';
  const [all, e] = useData(() => get('/orders/'), null);
  if (e || !all) return <Loading error={e}/>;
  const tot = {}; all.forEach(o => { const t = tot[o.status] || (tot[o.status] = { count: 0, total: 0 }); t.count++; t.total += o.amount; });
  const payments = status ? all.filter(o => o.status === status) : all;
  return shell('مدیریت پرداخت‌ها | Waynet', hero('مدیریت پرداخت‌ها', 'پروژه مدل جدای Payment ندارد؛ این صفحه همان سفارش‌ها را با تمرکز بر اطلاعات پرداخت (کد رهگیری/Authority زرین‌پال) نشان می‌دهد.'), <>
<div className="dash-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}><div className="dash-card"><small>پرداخت‌شده</small><b>{fa(tot.paid?.total || 0)} ت</b><small>{tot.paid?.count || 0} تراکنش</small></div><div className="dash-card"><small>در انتظار</small><b>{tot.pending?.count || 0}</b><small>تراکنش</small></div><div className="dash-card"><small>ناموفق</small><b>{tot.failed?.count || 0}</b><small>تراکنش</small></div></div>
<div className="filter-row">{[['', 'همه'], ['paid', 'پرداخت‌شده'], ['pending', 'در انتظار'], ['failed', 'ناموفق']].map(([s, l]) => <Link key={s} className={'filter ' + (status === s ? 'active' : '')} to={'/admin/payments' + (s ? '?status=' + s : '')}>{l}</Link>)}</div>
<div className="panel">{!payments.length ? <div className="empty">پرداختی یافت نشد.</div> : <div className="table-like admin-payments-table"><div><b>سفارش</b><b>مبلغ</b><b>Authority / کد رهگیری</b><b>وضعیت</b><b>تاریخ</b></div>
  {payments.map(p => <div key={p.id}><span>{p.phone || 'مهمان'}</span><span>{fa(p.amount)} ت</span><span><small>{p.authority || '—'}{p.ref_id && <><br/>رهگیری: {p.ref_id}</>}</small></span><span className="status">{p.status === 'paid' ? 'پرداخت‌شده' : p.status === 'failed' ? 'ناموفق' : 'در انتظار'}</span><span><small>{faDate(p.created_at)}</small></span></div>)}</div>}</div></>);
}

// ---- خدمات / محصولات / رک‌ها: لیست و فرم مشترک با همان ظاهر EJS ----
const KINDS = {
  service: { res: 'services', base: 'services', one: 'خدمت', h: 'مدیریت خدمات', p: 'خدمات شبکه/امنیت نمایش‌داده‌شده در صفحه‌ی «خدمات».', empty: 'هنوز خدمتی ثبت نشده است.', plus: '+ خدمت جدید', cls: 'admin-services-table', title: s => s.title, sub: s => s.short, cols: ['عنوان', 'نوع'], cells: s => [s.type], newH: 'خدمت جدید', editH: 'ویرایش خدمت', formP: 'اطلاعات خدمت را وارد کنید.', createBtn: 'ایجاد خدمت', max: 640, limit: 75000, delQ: 'این خدمت حذف شود؟', exist: 'خدمتی با همین شناسه از قبل وجود دارد.',
    fields: [['id'], ['title', 'عنوان'], ['short', 'توضیح کوتاه'], ['type', 'نوع'], ['image', 'عکس'], ['desc', 'توضیح کامل', 'ta', 3, 1], ['steps', 'مراحل انجام (هر مورد در یک خط)', 'lines'], ['benefits', 'مزایا (هر مورد در یک خط)', 'lines'], ['features', 'امکانات (هر مورد در یک خط)', 'lines']] },
  product: { res: 'products', base: 'products', one: 'محصول', h: 'مدیریت محصولات', p: 'تجهیزات شبکه‌ای قابل خرید در فروشگاه.', empty: 'هنوز محصولی ثبت نشده است.', plus: '+ محصول جدید', cls: 'admin-products-table', title: s => s.name, sub: s => s.short, cols: ['نام', 'نوع', 'قیمت'], cells: s => [s.type, fa(s.price) + ' ت'], newH: 'محصول جدید', editH: 'ویرایش محصول', formP: 'اطلاعات محصول را وارد کنید.', createBtn: 'ایجاد محصول', max: 640, limit: 75000, delQ: 'این محصول حذف شود؟', exist: 'محصولی با همین شناسه از قبل وجود دارد.',
    fields: [['id'], ['name', 'نام محصول'], ['short', 'توضیح کوتاه'], ['type', 'نوع'], ['price', 'قیمت (تومان، فقط عدد)', 'num'], ['image', 'عکس'], ['desc', 'توضیح کامل', 'ta', 3, 1], ['specs', 'مشخصات فنی (هر مورد در یک خط)', 'lines']] },
  rack: { res: 'racks', base: 'racks', one: 'رک', h: 'مدیریت رک‌ها', p: 'موجودی رک‌های قابل اجاره (جدا از درخواست‌های اجاره).', empty: 'هنوز رکی ثبت نشده است.', plus: '+ رک جدید', cls: 'admin-racks-table', title: s => s.name, cols: ['نام', 'ظرفیت'], cells: s => [s.capacity], newH: 'رک جدید', editH: 'ویرایش رک', formP: 'اطلاعات رک را وارد کنید.', createBtn: 'ایجاد رک', max: 640, limit: 75000, delQ: 'این رک حذف شود؟', exist: 'رکی با همین شناسه از قبل وجود دارد.',
    fields: [['id'], ['name', 'نام رک'], ['capacity', 'ظرفیت (مثلاً 20U)'], ['duration', 'مدت اجاره'], ['price_note', 'یادداشت قیمت'], ['image', 'عکس رک'], ['terms', 'شرایط اجاره', 'ta', 2, 1], ['equipment', 'تجهیزات موجود (هر مورد در یک خط)', 'lines'], ['specs', 'مشخصات فنی (هر مورد در یک خط)', 'lines']] },
};
export function CatalogList({ kind }) {
  const k = KINDS[kind]; const [rows, e, , reload] = useData(() => get('/' + k.res + '/'), null, [kind]); const [err, setErr] = useState('');
  if (e || !rows) return <Loading error={e}/>;
  return shell(k.h + ' | Waynet', hero(k.h, k.p), <>
<Warn>{err}</Warn><div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><Link className="btn primary" to={'/admin/' + k.base + '/create'}>{k.plus}</Link></div>
<div className="panel">{!rows.length ? <div className="empty">{k.empty}</div> : <div className={'table-like ' + k.cls}><div>{k.cols.map(c => <b key={c}>{c}</b>)}<b>عملیات</b></div>
  {rows.map(r => <div key={r.id}><span>{k.sub ? <><b>{k.title(r)}</b><br/><small>{k.sub(r)}</small></> : k.title(r)}</span>{k.cells(r).map((c, i) => <span key={i}>{c}</span>)}
    <span className="admin-actions"><Link className="btn secondary" to={'/admin/' + k.base + '/' + r.id + '/edit'}>ویرایش</Link><form onSubmit={confirmThen(k.delQ, async () => { try { await remove('/' + k.res + '/' + r.id + '/'); reload(); } catch (x) { setErr(x.message); } })}><button className="btn secondary" type="submit">حذف</button></form></span></div>)}</div>}</div></>);
}
export function CatalogForm({ kind, mode }) {
  const k = KINDS[kind], { id } = useParams(), nav = useNavigate();
  const [item, e, loading] = useData(() => mode === 'edit' ? get('/' + k.res + '/' + id + '/') : null, null, [id, mode, kind]);
  const [err, setErr] = useState(''), [img, setImg] = useState(null);
  if (e) return <NotFound/>; if (loading) return <Loading/>;
  const label = { service: 'شناسه یکتا (لاتین)', product: 'شناسه یکتا (لاتین)', rack: 'شناسه یکتا (لاتین)' }[kind];
  async function submit(ev) { ev.preventDefault(); setErr(''); const f = Object.fromEntries(new FormData(ev.currentTarget)); const body = {};
    if (mode === 'create') { if (!/^[a-z0-9-]+$/.test(f.id)) { setErr('شناسه باید فقط شامل حروف انگلیسی کوچک، عدد و خط تیره باشد.'); return; } body.id = f.id; }
    for (const [n, , t] of k.fields) { if (n === 'id' || n === 'image') continue; body[n] = t === 'lines' ? lines(f[n]) : t === 'num' ? parseInt(f[n], 10) : f[n]; }
    if (kind === 'product' && !(body.price >= 0)) { setErr('قیمت باید یک عدد معتبر (تومان) باشد.'); return; }
    try { let r; if (mode === 'create') r = await post('/' + k.res + '/', body); else r = await patch('/' + k.res + '/' + id + '/', body);
      const rid = mode === 'create' ? r.id : id;
      if (img) { const fd = new FormData(); fd.append('image', img); await request('/' + k.res + '/' + rid + '/', { method: 'PATCH', body: fd }); }
      else if (f.removeImage) await patch('/' + k.res + '/' + rid + '/', { image: null });
      nav('/admin/' + k.base); } catch (x) { setErr(/exist|already|unique|وجود/i.test(x.message) ? k.exist : x.message); } }
  const val = n => item ? (Array.isArray(item[n]) ? item[n].join('\n') : (item[n] ?? '')) : '';
  return shell((mode === 'create' ? k.newH : k.editH + ' ' + (k.title(item))) + ' | Waynet', hero(mode === 'create' ? k.newH : k.editH, k.formP), <>
<Warn>{err}</Warn>
<div className="form-card"><form onSubmit={submit}><div className="form-grid">
  {k.fields.map(([n, l, t, rows, req]) => {
    if (n === 'id') return mode === 'create' ? <div key={n}><label>{label}</label><input type="text" name="id" pattern="[a-z0-9-]+" required/></div> : <div key={n}><label>شناسه (غیرقابل تغییر)</label><input type="text" value={item.id} disabled readOnly/></div>;
    if (n === 'image') return <div className="full" key={n}><label>{l}</label>{item && item.image && <img className="admin-avatar-preview" src={item.image} alt=""/>}<input type="file" id="imageFile" accept="image/jpeg,image/png,image/webp" onChange={x => setImg(x.target.files[0] || null)}/>{item && item.image && <label style={{ marginTop: 10 }}><input type="checkbox" name="removeImage" value="1" style={{ display: 'inline', width: 'auto' }}/> حذف عکس فعلی</label>}</div>;
    if (t === 'ta' || t === 'lines') return <div className="full" key={n}><label>{l}</label><textarea name={n} rows={rows || 3} defaultValue={val(n)} required={!!req}></textarea></div>;
    if (t === 'num') return <div key={n}><label>{l}</label><input type="number" name={n} min="0" step="1000" defaultValue={val(n)} required/></div>;
    return <div key={n}><label>{l}</label><input type="text" name={n} defaultValue={val(n)} required/></div>; })}</div>
  <div style={{ marginTop: 16 }}><button className="btn primary" type="submit">{mode === 'create' ? k.createBtn : 'ذخیره تغییرات'}</button></div></form></div></>);
}

export function AdminRackRequests() {
  const [d, e, , reload] = useData(async () => ({ rows: await get('/rack-requests/'), racks: await get('/racks/') }), null); const [err, setErr] = useState('');
  if (e || !d) return <Loading error={e}/>;
  const act = (id, a) => async () => { try { await post('/rack-requests/' + id + '/' + a + '/'); reload(); } catch (x) { setErr(x.message); } };
  return shell('مدیریت درخواست‌های رک | Waynet', hero('مدیریت درخواست‌های اجاره‌ی رک', 'بررسی و تأیید یا رد درخواست‌های ثبت‌شده توسط کاربران برای اجاره‌ی رک.'), <><Warn>{err}</Warn>
<div className="panel">{!d.rows.length ? <div className="empty">هنوز درخواستی ثبت نشده است.</div> : <div className="table-like admin-rack-requests-table"><div><b>متقاضی</b><b>رک / مدت</b><b>وضعیت</b><b>عملیات</b></div>
  {d.rows.map(r => <div key={r.id}><span><b>{r.name}</b><br/><small>{r.phone}{r.email && ' — ' + r.email}</small>{r.notes && <><br/><small>{r.notes}</small></>}</span>
    <span><small>{r.rack}{r.duration && ' — ' + r.duration}{r.start_date && <><br/>شروع: {r.start_date}</>}</small></span>
    <span className="status">{r.status === 'approved' ? 'تأیید شده' : r.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}</span>
    <span className="admin-actions">{r.status === 'pending' && <><form onSubmit={x => { x.preventDefault(); act(r.id, 'approve')(); }}><button className="btn primary" type="submit">تأیید</button></form><form onSubmit={x => { x.preventDefault(); act(r.id, 'reject')(); }}><button className="btn secondary" type="submit">رد</button></form></>}</span></div>)}</div>}</div></>);
}

function ReplyBox({ t, run }) {
  const [text, setText] = useState(t.reply?.text || '');
  return <span className="admin-reply-box">{t.reply && t.reply.text && <small className="admin-reply-current"><b>پاسخ شما:</b> {t.reply.text}</small>}
    <form onSubmit={x => { x.preventDefault(); run(() => post('/testimonials/' + t.id + '/reply/', { text }))(); }}><textarea name="reply" rows="2" maxLength="2000" placeholder="پاسخ ادمین..." required value={text} onChange={x => setText(x.target.value)}></textarea><button className="btn secondary" type="submit">{t.reply && t.reply.text ? 'ویرایش پاسخ' : 'ارسال پاسخ'}</button></form>
    {t.reply && t.reply.text && <form onSubmit={confirmThen('پاسخ حذف شود؟', run(() => remove('/testimonials/' + t.id + '/reply/')))}><button className="btn secondary" type="submit">حذف پاسخ</button></form>}</span>;
}
export function AdminTestimonials() {
  const [all, e, , reload] = useData(() => get('/testimonials/'), null); const [err, setErr] = useState('');
  if (e || !all) return <Loading error={e}/>;
  const run = fn => async () => { try { await fn(); reload(); } catch (x) { setErr(x.message); } };
  return shell('مدیریت نظرات | Waynet', hero('مدیریت نظرات دانشجویان', 'تأیید یا حذف نظرات ثبت‌شده توسط دانشجویان، پیش از نمایش در صفحه اصلی.'), <><Warn>{err}</Warn>
<div className="panel">{!all.length ? <div className="empty">هنوز نظری ثبت نشده است.</div> : <div className="table-like admin-testimonials-table"><div><b>نظر</b><b>وضعیت</b><b>عملیات</b></div>
  {all.map(t => <div key={t.id}><span><b>{t.name}</b>{t.role && ' — ' + t.role}<br/><small>{t.text}</small><ReplyBox key={t.id + (t.reply?.text || '')} t={t} run={run}/></span>
    <span className="status">{t.approved ? 'تأیید شده' : 'در انتظار تأیید'}</span>
    <span className="admin-actions">{!t.approved && <form onSubmit={x => { x.preventDefault(); run(() => post('/testimonials/' + t.id + '/approve/'))(); }}><button className="btn primary" type="submit">تأیید</button></form>}
      <form onSubmit={x => { x.preventDefault(); run(() => remove('/testimonials/' + t.id + '/'))(); }}><button className="btn secondary" type="submit">حذف</button></form></span></div>)}</div>}</div></>);
}
