import React, { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { get, post, patch, remove, API_BASE } from './api';
import { Layout, Loading, NotFound, Msg, TeacherNav, useData, useAuth, fa, faDate } from './components';

const MAX_VIDEO = 2 * 1024 * 1024 * 1024;
const fmtSize = b => { b = Number(b) || 0; if (b >= 1073741824) return (b / 1073741824).toFixed(2).replace(/\.?0+$/, '') + ' GB'; if (b >= 1048576) return (b / 1048576).toFixed(1).replace(/\.0$/, '') + ' MB'; if (b >= 1024) return Math.round(b / 1024) + ' KB'; return b + ' B'; };
const lines = v => (v || '').split('\n').map(x => x.trim()).filter(Boolean);
const isoLocal = d => new Date(d || Date.now()).toISOString().slice(0, 16);
const toIso = v => v ? new Date(v).toISOString() : undefined;
const Icon = ({ children }) => <span className="heading-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{children}</svg></span>;
const shell = (title, hero, children) => <Layout title={title}><main className="page"><div className="wrap narrow"><TeacherNav/>{hero}{children}</div></main></Layout>;

export function Teacher() {
  const [d, e] = useData(async () => { const courses = await get('/courses/?mine=1');
    const [ann, qs] = await Promise.all([get('/announcements/'), get('/questions/')]);
    const students = await get('/enrollments/').catch(() => []);
    return { courses, ann, qs, students: new Set(students.filter(x => courses.some(c => c.id === x.course) && ['active', 'completed'].includes(x.status)).map(x => x.student)).size }; }, null);
  if (e || !d) return <Loading error={e}/>;
  const sessions = d.courses.reduce((n, c) => n + c.sessions.length, 0);
  return shell('پنل مدرس | Waynet',
    <div className="page-hero"><span className="section-label">TEACHER</span><h1 className="icon-heading"><Icon><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></Icon>داشبورد مدرس</h1><p>مدیریت دوره‌ها، جلسات، Announcementها و پاسخ به دانشجویان دوره‌های خودتان.</p></div>,
    <>
<div className="dash-grid"><div className="dash-card"><small>دوره‌های من</small><b>{fa(d.courses.length)}</b></div><div className="dash-card"><small>مجموع جلسات</small><b>{fa(sessions)}</b></div><div className="dash-card"><small>دانشجویان فعال</small><b>{fa(d.students)}</b></div><div className="dash-card"><small>Announcementها</small><b>{fa(d.ann.length)}</b></div></div>
<div className="dash-grid"><div className="dash-card"><small>سوالات و نظرات</small><b>{fa(d.qs.length)}</b></div><div className="dash-card"><small>بدون پاسخ</small><b>{fa(d.qs.filter(q => !q.reply_text).length)}</b></div></div>
<div className="panel"><h2 className="icon-heading"><Icon><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h8"/></Icon>دوره‌های من</h2>
  {!d.courses.length ? <div className="empty">هنوز هیچ دوره‌ای به شما اختصاص داده نشده است.</div> : <div className="table-like"><div><b>دوره</b><b>دسته‌بندی</b><b>عملیات</b></div>
    {d.courses.map(c => <div key={c.id}><span>{c.title}</span><span>{c.category_name}</span><span className="admin-actions"><Link className="btn secondary btn-with-icon" to={'/teacher/courses/' + c.id}><span className="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6a2 2 0 0 1 2-2h6l2 2h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 12h6M12 9v6"/></svg></span>مدیریت دوره</Link><Link className="btn secondary" to={'/teacher/courses/' + c.id + '/edit'}>ویرایش</Link></span></div>)}</div>}
</div></>);
}

export function TeacherCourses() {
  const [rows, e] = useData(() => get('/courses/?mine=1'), null);
  if (e || !rows) return <Loading error={e}/>;
  return shell('دوره‌های من | پنل مدرس',
    <div className="page-hero"><span className="section-label">TEACHER</span><h1>دوره‌های من</h1><p>فقط دوره‌هایی که به شما اختصاص داده شده‌اند اینجا نمایش داده می‌شوند.</p><div style={{ marginTop: 14 }}><Link className="btn primary" to="/teacher/courses/create">ایجاد دوره جدید</Link></div></div>,
    <div className="panel">{!rows.length ? <div className="empty">هنوز هیچ دوره‌ای به شما اختصاص داده نشده است.</div> : <div className="table-like"><div><b>دوره</b><b>دسته‌بندی</b><b>تعداد جلسات</b><b>عملیات</b></div>
      {rows.map(c => <div key={c.id}><span>{c.title}</span><span>{c.category_name}</span><span>{c.sessions.length}</span><span><Link to={'/teacher/courses/' + c.id}>مدیریت دوره ←</Link> &nbsp; <Link to={'/teacher/courses/' + c.id + '/edit'}>ویرایش</Link></span></div>)}</div>}</div>);
}

export function CourseForm({ mode, basePath = '/teacher' }) {
  const { id } = useParams(), nav = useNavigate();
  const [d, e, loading] = useData(async () => ({ cats: await get('/categories/'), course: mode === 'edit' ? await get('/courses/' + id + '/') : null }), null, [id, mode]);
  const [err, setErr] = useState('');
  if (e) return <NotFound/>; if (loading || !d) return <Loading/>;
  const course = d.course;
  async function submit(ev) { ev.preventDefault(); setErr(''); const f = Object.fromEntries(new FormData(ev.currentTarget));
    const cat = d.cats.find(c => c.id === f.categoryId);
    const body = { title: f.title.trim(), category: f.categoryId, category_name: cat.title, type: course ? course.type : cat.type, duration: f.duration, capacity: f.capacity, price: f.price, level: f.level, desc: f.desc, audience: f.audience, prerequisites: f.prerequisites, goals: lines(f.goals), skills: lines(f.skills), features: lines(f.features) };
    try { if (mode === 'create') { const r = await post('/courses/', { id: f.id, ...body }); nav(basePath + '/courses/' + r.id); } else { await patch('/courses/' + id + '/', body); nav(basePath + '/courses/' + id + '?saved=1'); } } catch (x) { setErr(x.message); } }
  return shell((mode === 'create' ? 'دوره جدید' : 'ویرایش ' + course.title) + ' | پنل مدرس',
    <div className="page-hero"><span className="section-label">TEACHER</span><h1>{mode === 'create' ? 'ایجاد دوره جدید' : 'ویرایش دوره'}</h1><p>این دوره به‌صورت خودکار به حساب مدرس فعلی اختصاص داده می‌شود.</p></div>,
    <>{err && <div className="error">خطا در اطلاعات دوره. لطفاً موارد واردشده را بررسی کنید. ({err})</div>}
<div className="form-card"><form onSubmit={submit}>
  {mode === 'create' && <div><label>شناسه دوره</label><input name="id" required pattern="[a-z0-9-]+" placeholder="مثلاً network-security"/></div>}
  <div><label>عنوان دوره</label><input name="title" defaultValue={course ? course.title : ''} required/></div>
  <div><label>دسته‌بندی</label><select name="categoryId" required defaultValue={course ? course.category : d.cats[0]?.id}>{d.cats.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
  <div><label>مدت</label><input name="duration" defaultValue={course ? course.duration : ''}/></div>
  <div><label>ظرفیت</label><input name="capacity" defaultValue={course ? course.capacity : ''}/></div>
  <div><label>شهریه</label><input name="price" defaultValue={course ? course.price : ''}/></div>
  <div><label>سطح</label><input name="level" defaultValue={course ? course.level : ''}/></div>
  <div className="full"><label>توضیحات</label><textarea name="desc" rows="4" defaultValue={course ? course.desc : ''}></textarea></div>
  <div className="full"><label>مناسب چه کسانی است؟</label><textarea name="audience" rows="3" defaultValue={course ? course.audience : ''}></textarea></div>
  <div className="full"><label>پیش‌نیازها</label><textarea name="prerequisites" rows="3" defaultValue={course ? course.prerequisites : ''}></textarea></div>
  <div className="full"><label>اهداف دوره (هر مورد در یک خط)</label><textarea name="goals" rows="4" defaultValue={course ? course.goals.join('\n') : ''}></textarea></div>
  <div className="full"><label>مهارت‌ها (هر مورد در یک خط)</label><textarea name="skills" rows="4" defaultValue={course ? course.skills.join('\n') : ''}></textarea></div>
  <div className="full"><label>ویژگی‌ها (هر مورد در یک خط)</label><textarea name="features" rows="4" defaultValue={course ? course.features.join('\n') : ''}></textarea></div>
  <div style={{ marginTop: 14 }}><button className="btn primary" type="submit">{mode === 'create' ? 'ایجاد دوره' : 'ذخیره تغییرات'}</button></div>
</form></div></>);
}

// آپلود واقعی با XMLHttpRequest و نوار پیشرفت؛ handle.upload(sessionId) برای حالت «افزودن جلسه» است.
function VideoUpload({ sessionId, current, onDone, handle, id }) {
  const [st, setSt] = useState({ text: '', cls: '' }), [pct, setPct] = useState(null), [busy, setBusy] = useState(false), file = useRef(null), xhrRef = useRef(null);
  const say = (text, cls = '') => setSt({ text, cls });
  const check = () => { const f = file.current.files && file.current.files[0];
    if (!f) { say('ابتدا فایل ویدئو را انتخاب کنید.', 'err'); return null; }
    if (!/\.(mp4|webm)$/i.test(f.name)) { say('فرمت فایل مجاز نیست (MP4 یا WebM).', 'err'); return null; }
    if (f.size > MAX_VIDEO) { say('حجم فایل بیشتر از حد مجاز (' + fmtSize(MAX_VIDEO) + ') است.', 'err'); return null; } return f; };
  const upload = (sid, f) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhrRef.current = xhr; xhr.open('POST', API_BASE + '/sessions/' + sid + '/video/');
    const t = localStorage.getItem('waynet_token'); if (t) xhr.setRequestHeader('Authorization', 'Bearer ' + t);
    setPct(0); setBusy(true);
    xhr.upload.onprogress = e => { if (!e.lengthComputable) return; const p = Math.floor(e.loaded / e.total * 100); setPct(p); say(p >= 100 ? 'در حال ذخیره‌سازی روی سرور...' : 'در حال آپلود... ' + p + '%  —  ' + fmtSize(e.loaded) + ' / ' + fmtSize(e.total)); };
    xhr.onload = () => { setBusy(false); let data = {}; try { data = JSON.parse(xhr.responseText); } catch (_) {}
      if (xhr.status >= 200 && xhr.status < 300) { setPct(100); say('آپلود با موفقیت انجام شد ✓', 'ok'); return resolve(data); }
      setPct(null); say((Array.isArray(data) ? data.join('، ') : data.detail) || 'آپلود ناموفق بود. دوباره تلاش کنید.', 'err'); reject(new Error('failed')); };
    xhr.onerror = () => { setBusy(false); setPct(null); say('خطای شبکه؛ آپلود ناموفق بود.', 'err'); reject(new Error('network')); };
    xhr.onabort = () => { setBusy(false); setPct(null); say('آپلود لغو شد.', 'err'); reject(new Error('aborted')); };
    const fd = new FormData(); fd.append('file', f); xhr.send(fd); });
  if (handle) { handle.hasFile = () => !!(file.current && file.current.files && file.current.files[0]); handle.check = check; handle.upload = sid => upload(sid, file.current.files[0]); }
  const start = async () => { const f = check(); if (!f) return; try { await upload(sessionId, f); file.current.value = ''; onDone && onDone(); } catch (_) {} };
  return <div className="video-upload" id={id}>
    {current !== undefined && <div className="vu-current">{current}</div>}
    <div className="vu-row"><input type="file" className="vu-file" ref={file} disabled={busy} accept=".mp4,.webm,video/mp4,video/webm"/>
      {sessionId && <button type="button" className="btn secondary vu-start" disabled={busy} onClick={start}>آپلود ویدئو</button>}
      <button type="button" className="btn secondary vu-cancel" hidden={!busy} onClick={() => xhrRef.current && xhrRef.current.abort()}>لغو</button></div>
    <div className="vu-bar" hidden={pct === null}><div className="vu-fill" style={{ width: (pct || 0) + '%' }}></div></div>
    <div className={'vu-status' + (st.cls ? ' ' + st.cls : '')} aria-live="polite">{st.text}</div></div>;
}

function SessionCard({ s, i, total, course, reload, setErr, siblings }) {
  const [f, setF] = useState({ title: s.title, duration: s.duration || '', description: s.description || '', video_url: s.video_url || '', is_free: !!s.is_free });
  async function save(ev) { ev.preventDefault(); try { await patch('/sessions/' + s.id + '/', f); reload(true); } catch (x) { setErr(x.message); } }
  async function move(dir) { const list = [...siblings]; const j = i + dir; [list[i], list[j]] = [list[j], list[i]];
    try { await Promise.all(list.map((x, idx) => x.order === idx ? null : post('/sessions/' + x.id + '/move/', { order: idx }))); reload(); } catch (x) { setErr(x.message); } }
  const del = async (url, q) => { if (!window.confirm(q)) return; try { await remove(url); reload(); } catch (x) { setErr(x.message); } };
  const cur = s.video_status === 'uploading' ? <span>آپلود قبلی هنوز در جریان است.</span> : s.video_status === 'ready' ? <span><b dir="ltr">{s.video_original_name || 'video'}</b> — <span dir="ltr">{fmtSize(s.video_size)}</span> — آپلودشده ✓</span> : <span>هنوز ویدئویی آپلود نشده است.</span>;
  return <div className="session-card">
    <div className="session-head"><div className="session-head-title"><span className="session-order">#{i + 1}</span><b>{s.title}</b>{s.is_free && <span className="override-badge">رایگان</span>}</div>
      <div className="session-actions">
        <form onSubmit={e => { e.preventDefault(); move(-1); }}><button className="btn secondary" type="submit" disabled={i === 0}>▲ بالا</button></form>
        <form onSubmit={e => { e.preventDefault(); move(1); }}><button className="btn secondary" type="submit" disabled={i === total - 1}>▼ پایین</button></form>
        {s.video_status === 'ready' && <form onSubmit={e => { e.preventDefault(); del('/sessions/' + s.id + '/video/', 'فایل ویدئوی این جلسه حذف شود؟'); }}><button className="btn secondary" type="submit">حذف ویدئو</button></form>}
        <form onSubmit={e => { e.preventDefault(); del('/sessions/' + s.id + '/', 'این جلسه حذف شود؟'); }}><button className="btn secondary" type="submit">حذف</button></form></div></div>
    <form onSubmit={save}><div className="session-fields">
      <div><label>عنوان جلسه</label><input type="text" name="title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required/></div>
      <div><label>مدت زمان</label><input type="text" name="duration" value={f.duration} onChange={e => setF({ ...f, duration: e.target.value })} placeholder="مثلاً ۴۵ دقیقه"/></div>
      <div className="full"><label>توضیحات</label><textarea name="description" rows="2" value={f.description} onChange={e => setF({ ...f, description: e.target.value })}></textarea></div>
      <div className="full"><label>آدرس ویدیو (اختیاری)</label><input type="text" name="videoUrl" value={f.video_url} onChange={e => setF({ ...f, video_url: e.target.value })} placeholder="در صورت خالی بودن، از ویدیوی پیش‌فرض دوره استفاده می‌شود"/></div>
      <div className="full"><label>فایل ویدئو</label><VideoUpload sessionId={s.id} current={cur} onDone={() => reload()}/></div>
      <div className="full checkbox-row"><input type="checkbox" id={'free-' + s.id} name="isFree" checked={f.is_free} onChange={e => setF({ ...f, is_free: e.target.checked })}/><label htmlFor={'free-' + s.id} style={{ margin: 0 }}>این جلسه رایگان باشد (بدون نیاز به خرید دوره)</label></div>
    </div><div style={{ marginTop: 12 }}><button className="btn primary" type="submit">ذخیره تغییرات</button></div></form></div>;
}
function AnnouncementCard({ a, reload, setErr }) {
  const [f, setF] = useState({ title: a.title, announcement_date: isoLocal(a.announcement_date), text: a.text, class_link: a.class_link || '' });
  async function save(ev) { ev.preventDefault(); try { await patch('/announcements/' + a.id + '/', { ...f, announcement_date: toIso(f.announcement_date), class_link: f.class_link || null }); reload(true); } catch (x) { setErr(x.message); } }
  return <div className="session-card"><div className="session-head"><div><b>{a.title}</b><div><small>{faDate(a.announcement_date)}</small></div></div>
    <form onSubmit={async e => { e.preventDefault(); if (!window.confirm('این Announcement حذف شود؟')) return; try { await remove('/announcements/' + a.id + '/'); reload(); } catch (x) { setErr(x.message); } }}><button className="btn secondary" type="submit">حذف</button></form></div>
    <p>{a.text}</p>{a.class_link && <p><a className="text-link" href={a.class_link} target="_blank" rel="noopener noreferrer">ورود به کلاس آنلاین ←</a></p>}
    <form onSubmit={save}><div className="session-fields">
      <div><label>عنوان</label><input name="title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required/></div>
      <div><label>تاریخ</label><input type="datetime-local" name="announcementDate" value={f.announcement_date} onChange={e => setF({ ...f, announcement_date: e.target.value })}/></div>
      <div className="full"><label>متن</label><textarea name="text" rows="3" value={f.text} onChange={e => setF({ ...f, text: e.target.value })} required></textarea></div>
      <div className="full"><label>لینک کلاس آنلاین</label><input name="classLink" value={f.class_link} onChange={e => setF({ ...f, class_link: e.target.value })}/></div>
    </div><div style={{ marginTop: 10 }}><button className="btn primary" type="submit">ذخیره Announcement</button></div></form></div>;
}
function QuestionCard({ q, courseTitle, reload, setErr }) {
  const [text, setText] = useState(q.reply_text || '');
  return <div className="session-card"><div className="session-head"><div><b>{q.type === 'question' ? 'سوال' : 'نظر'}</b> — {q.student_name || 'دانشجو'}{courseTitle && <> <small>({courseTitle})</small></>}</div><small>{faDate(q.created_at)}</small></div><p>{q.text}</p>
    <form onSubmit={async e => { e.preventDefault(); try { await post('/questions/' + q.id + '/reply/', { text }); reload(); } catch (x) { setErr(x.message); } }}>
      <label>پاسخ</label><textarea name="reply" rows="3" required value={text} onChange={e => setText(e.target.value)}></textarea>
      <div style={{ marginTop: 10 }}><button className="btn primary" type="submit">{q.reply_text ? 'ویرایش پاسخ' : 'پاسخ دادن'}</button></div></form>
    {courseTitle !== undefined && q.reply_text && <form style={{ marginTop: 8 }} onSubmit={async e => { e.preventDefault(); if (!window.confirm('پاسخ حذف شود؟')) return; try { await remove('/questions/' + q.id + '/reply/'); reload(); } catch (x) { setErr(x.message); } }}><button className="btn secondary" type="submit">حذف پاسخ</button></form>}
  </div>;
}

export function CourseManagement({ basePath = '/teacher' }) {
  const { id } = useParams(), loc = useLocation();
  const [d, e, loading, reloadData] = useData(async () => { const course = await get('/courses/' + id + '/');
    const [sessions, ann, qs] = await Promise.all([get('/sessions/?course=' + id), get('/announcements/?course=' + id), get('/questions/?course=' + id)]); return { course, sessions, ann, qs }; }, null, [id]);
  const [saved, setSaved] = useState(new URLSearchParams(loc.search).get('saved') === '1'), [err, setErr] = useState(''), [link, setLink] = useState(null), [busy, setBusy] = useState(false), [newFree, setNewFree] = useState(false);
  const handle = useRef({});
  if (e) return <NotFound/>; if (loading || !d) return <Loading/>;
  const { course, sessions, ann, qs } = d; const videoCount = sessions.filter(x => x.video_status === 'ready').length;
  const reload = (ok) => { setErr(''); setSaved(!!ok); reloadData(); };
  async function saveLink(ev) { ev.preventDefault(); try { await post('/courses/' + id + '/class_link/', { url: link ?? course.class_link ?? '' }); reload(true); } catch (x) { setErr('آدرس لینک کلاس معتبر نیست (باید با http یا https شروع شود).'); } }
  async function addSession(ev) { ev.preventDefault(); setErr(''); const form = ev.currentTarget; const f = Object.fromEntries(new FormData(form)); const h = handle.current;
    if (h.hasFile && h.hasFile() && !h.check()) return; setBusy(true);
    let created; try { created = await post('/sessions/', { course: id, title: f.title.trim(), duration: f.duration, description: f.description, video_url: f.videoUrl || null, is_free: !!f.isFree, order: sessions.length }); } catch (x) { setBusy(false); setErr('ثبت جلسه ناموفق بود (عنوان را بررسی کنید). ' + x.message); return; }
    if (h.hasFile && h.hasFile()) { try { await h.upload(created.id); } catch (_) { setErr('جلسه ساخته شد ولی آپلود کامل نشد؛ از همان جلسه دوباره آپلود کنید.'); } }
    setBusy(false); form.reset(); setNewFree(false); reload(true); }
  async function addAnn(ev) { ev.preventDefault(); const form = ev.currentTarget; const f = Object.fromEntries(new FormData(form));
    try { await post('/announcements/', { course: id, title: f.title, text: f.text, announcement_date: toIso(f.announcementDate), class_link: f.classLink || null }); form.reset(); reload(true); } catch (x) { setErr(x.message); } }
  return shell(course.title + ' | پنل مدرس',
    <div className="page-hero"><span className="section-label">TEACHER</span><h1>{course.title}</h1><p>{course.category_name} — مدیریت جلسات این دوره</p></div>,
    <>
{saved && <div className="success">تغییرات ذخیره شد.</div>}
{err && <div className="success" style={{ background: '#fdecec', borderColor: 'rgba(200,50,50,.25)', color: '#b42318' }}>{err}</div>}
<div className="panel" style={{ marginBottom: 22 }}><h2>اطلاعات دوره</h2>
  <div className="table-like"><div><span>دسته‌بندی: <b>{course.category_name}</b></span><span>مدت: <b>{course.duration}</b></span><span>جلسات: <b>{sessions.length}</b> — ویدئوهای آپلودشده: <b>{videoCount}</b></span></div></div>
  <div style={{ marginTop: 12 }}><Link className="btn secondary" to={basePath + '/courses/' + course.id + '/edit'}>ویرایش اطلاعات دوره</Link></div></div>
<div className="form-card" style={{ marginBottom: 22 }}><h2>لینک کلاس</h2><form onSubmit={saveLink}>
  <label>لینک کلاس آنلاین مثل Skyroom (برای دانشجویان این دوره نمایش داده می‌شود)<input type="url" name="classLink" value={link ?? course.class_link ?? ''} onChange={x => setLink(x.target.value)} placeholder="https://..."/></label>
  <button className="btn primary" type="submit">ذخیره لینک کلاس</button></form></div>
<div className="form-card" id="add-video" style={{ marginBottom: 22 }}>
  <h2 className="icon-heading"><Icon><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/><path d="M8.5 12h4M10.5 10v4"/></Icon>افزودن ویدئو</h2>
  <form id="add-session-form" onSubmit={addSession}><div className="session-fields">
    <div><label>عنوان جلسه</label><input type="text" name="title" required/></div>
    <div><label>مدت زمان</label><input type="text" name="duration" placeholder="مثلاً ۴۵ دقیقه"/></div>
    <div className="full"><label>توضیحات</label><textarea name="description" rows="2"></textarea></div>
    <div className="full"><label>آدرس ویدیو (اختیاری)</label><input type="text" name="videoUrl"/></div>
    <div className="full"><label>فایل ویدئو</label><VideoUpload id="new-video-upload" handle={handle.current}/></div>
    <div className="full checkbox-row free-session-option"><input type="checkbox" id="free-new" name="isFree" checked={newFree} onChange={x => setNewFree(x.target.checked)}/>
      <label htmlFor="free-new"><span className="free-session-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 10V8a6 6 0 0 1 12 0v2"/><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M12 14v2"/></svg></span><span>این جلسه رایگان باشد <small>(بدون نیاز به خرید دوره)</small></span></label></div>
  </div><div style={{ marginTop: 14 }}><button className="btn primary" type="submit" disabled={busy}>افزودن ویدئو</button></div></form></div>
<div className="panel" style={{ marginBottom: 22 }}>
  <h2 className="icon-heading"><Icon><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h8M8 12h5M8 16h8"/><path d="m17 11 2 1-2 1z"/></Icon>ویدئوهای دوره ({sessions.length})</h2>
  {!sessions.length && <div className="empty">هنوز جلسه‌ای برای این دوره ثبت نشده است.</div>}
  {sessions.map((s, i) => <SessionCard key={s.id} s={s} i={i} total={sessions.length} course={course} reload={reload} setErr={setErr} siblings={sessions}/>)}</div>
<div className="panel" style={{ marginTop: 22 }}><h2>Announcementهای دوره</h2>
  {!ann.length && <div className="empty">هنوز Announcementی ثبت نشده است.</div>}
  {ann.map(a => <AnnouncementCard key={a.id + a.title + a.text} a={a} reload={reload} setErr={setErr}/>)}</div>
<div className="form-card" style={{ marginTop: 22 }}><h2>ایجاد Announcement</h2><form onSubmit={addAnn}><div className="session-fields">
  <div><label>عنوان</label><input name="title" required/></div><div><label>تاریخ</label><input type="datetime-local" name="announcementDate"/></div>
  <div className="full"><label>متن</label><textarea name="text" rows="4" required></textarea></div>
  <div className="full"><label>لینک کلاس آنلاین مثل Skyroom (اختیاری)</label><input name="classLink"/></div>
</div><div style={{ marginTop: 14 }}><button className="btn primary" type="submit">ثبت Announcement</button></div></form></div>
<div className="panel" style={{ marginTop: 22 }}><h2>سوالات و نظرات دانشجویان ({qs.length})</h2>
  {!qs.length && <div className="empty">هنوز سوال یا نظری برای این دوره ثبت نشده است.</div>}
  {qs.map(q => <QuestionCard key={q.id + (q.reply_text || '')} q={q} reload={reload} setErr={setErr}/>)}</div>
</>);
}

export function TeacherAnnouncements() {
  const [d, e, , reload] = useData(async () => ({ courses: await get('/courses/?mine=1'), rows: await get('/announcements/') }), null);
  const [created, setCreated] = useState(false), [err, setErr] = useState('');
  if (e || !d) return <Loading error={e}/>;
  async function add(ev) { ev.preventDefault(); setErr(''); setCreated(false); const form = ev.currentTarget; const f = Object.fromEntries(new FormData(form));
    if (!f.title.trim() || !f.text.trim()) { setErr('عنوان و متن اطلاعیه الزامی است.'); return; }
    try { await post('/announcements/', { course: f.courseId, title: f.title, text: f.text, announcement_date: toIso(f.announcementDate), class_link: f.classLink || null }); form.reset(); setCreated(true); reload(); } catch (x) { setErr(x.message); } }
  const title = id => (d.courses.find(c => c.id === id) || {}).title || '';
  return shell('اطلاعیه‌ها | پنل مدرس',
    <div className="page-hero"><span className="section-label">TEACHER</span><h1>اطلاعیه‌های من</h1><p>ایجاد و مشاهده اطلاعیه‌های دوره‌های خودتان؛ هر اطلاعیه برای دانشجویان همان دوره نمایش داده می‌شود.</p></div>,
    <>{created && <div className="success">اطلاعیه با موفقیت ثبت شد.</div>}{err && <div className="success" style={{ borderColor: 'rgba(230,90,70,.3)', color: '#c65042' }}>{err}</div>}
<div className="panel"><h2>ایجاد اطلاعیه جدید</h2>
  {!d.courses.length ? <div className="empty">هنوز دوره‌ای به شما اختصاص داده نشده است؛ برای ثبت اطلاعیه ابتدا باید یک دوره داشته باشید.</div> :
  <form onSubmit={add} className="form-grid">
    <label>دوره<select name="courseId" required>{d.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
    <label>عنوان اطلاعیه<input type="text" name="title" maxLength="150" required placeholder="مثلاً تغییر زمان جلسه"/></label>
    <label>متن اطلاعیه<textarea name="text" rows="4" maxLength="4000" required placeholder="متن اطلاعیه را بنویسید..."></textarea></label>
    <label>تاریخ و زمان (اختیاری)<input type="datetime-local" name="announcementDate"/></label>
    <label>لینک کلاس آنلاین (اختیاری)<input type="url" name="classLink" placeholder="https://..."/></label>
    <button className="btn primary" type="submit">ثبت اطلاعیه</button></form>}</div>
<div className="panel"><h2>اطلاعیه‌های ثبت‌شده</h2>{!d.rows.length && <div className="empty">هنوز اطلاعیه‌ای ثبت نشده است.</div>}
  {d.rows.map(a => <div className="session-card" key={a.id}><div className="session-head"><div><b>{a.title}</b> <small>({title(a.course)})</small></div><small>{faDate(a.announcement_date)}</small></div><p>{a.text}</p>
    {a.class_link && <p><a className="text-link" href={a.class_link} target="_blank" rel="noopener noreferrer">لینک کلاس آنلاین ←</a></p>}<Link className="btn secondary" to={'/teacher/courses/' + a.course}>مدیریت دوره</Link></div>)}</div></>);
}

export function TeacherQuestions() {
  const filter = new URLSearchParams(useLocation().search).get('filter') === 'unanswered' ? 'unanswered' : 'all';
  const [d, e, , reload] = useData(async () => ({ courses: await get('/courses/?mine=1'), rows: await get('/questions/') }), null);
  const [err, setErr] = useState('');
  if (e || !d) return <Loading error={e}/>;
  const rows = d.rows.filter(q => filter === 'all' || !q.reply_text);
  return shell('سوالات و نظرات | پنل مدرس',
    <div className="page-hero"><span className="section-label">TEACHER</span><h1>سوالات و نظرات دانشجویان</h1><p>فقط پرسش‌ها و نظرات دوره‌هایی که مدرس آن‌ها هستید.</p></div>,
    <><Msg error={err}/>
<div style={{ display: 'flex', gap: 10, marginBottom: 16 }}><Link className={'btn ' + (filter === 'all' ? 'primary' : 'secondary')} to="/teacher/questions">همه</Link><Link className={'btn ' + (filter === 'unanswered' ? 'primary' : 'secondary')} to="/teacher/questions?filter=unanswered">بدون پاسخ</Link></div>
<div className="panel">{!rows.length && <div className="empty">موردی برای نمایش وجود ندارد.</div>}
  {rows.map(q => <QuestionCard key={q.id + (q.reply_text || '')} q={q} courseTitle={(d.courses.find(c => c.id === q.course) || {}).title || ''} reload={reload} setErr={setErr}/>)}</div></>);
}
