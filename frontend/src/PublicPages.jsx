import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { get, post } from './api';
import { Layout, Loading, NotFound, Msg, useData, useAuth, fa, faDate } from './components';
import { addToCart, getCart, setCart } from './cart';

const LOCK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
const TICK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 13 4 4L19 7"/></svg>;
const SENT = <div className="success">درخواست شما با موفقیت ثبت شد. کارشناسان Waynet با شما تماس می‌گیرند.</div>;
const toPrice = v => { const s = String(v ?? '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g, ''); return Number(s) || 0; };

export function CourseCard({ course }) {
  return <Link className="course-card full" to={'/course/' + course.id}>
    <div className={'course-art art-' + course.type}><span>{course.category_name}</span><b>WAYNET</b></div>
    <div className="course-info"><h3>{course.title}</h3><p>{course.desc}</p>
      <div className="course-meta"><span>{course.teacher_name}</span><span>{course.duration}</span><span>{(course.sessions || []).length} جلسه</span><strong>{course.price}</strong></div></div>
  </Link>;
}
const CategoryCard = ({ category }) => <Link className="service-box course-card full" to={'/courses/' + category.id}>
  <div className={'course-art service-art art-' + category.type}><span>{category.short}</span><b>{category.icon}</b></div>
  <div className="course-info"><h3>{category.title}</h3><p>{category.desc}</p><span className="view-link">مشاهده دوره‌ها ←</span></div></Link>;
const ServiceCard = ({ service }) => <Link className="service-box course-card full" to={'/services/' + service.id}>
  <div className={'course-art service-art art-' + service.type + (service.image ? ' has-img' : '')}>{service.image && <img className="card-img" src={service.image} alt={service.title} loading="lazy"/>}<span>{service.short}</span><b>WAYNET</b></div>
  <div className="course-info"><h3>{service.title}</h3><p>{service.desc}</p><span className="view-link">مشاهده خدمت ←</span></div></Link>;

export function Courses() {
  const [cats, e] = useData(() => get('/categories/'), []);
  if (e) return <Loading error={e}/>;
  return <Layout title="دوره‌ها | Waynet"><main className="page"><div className="wrap">
    <div className="page-hero"><span className="section-label">LEARNING FIELDS</span><h1>حوزه‌های آموزشی Waynet</h1><p>یک حوزه را انتخاب کنید تا دوره‌های مرتبط با آن را ببینید.</p></div>
    <div className="service-grid course-grid">{cats.map(c => <CategoryCard key={c.id} category={c}/>)}</div>
  </div></main></Layout>;
}
export function Category() {
  const { category: id } = useParams();
  const [d, e, loading] = useData(() => Promise.all([get('/categories/' + id + '/'), get('/courses/?category=' + id)]), null, [id]);
  if (e) return <NotFound/>; if (loading || !d) return <Loading/>;
  const [category, courses] = d;
  return <Layout title={category.title + ' | Waynet'}><main className="page"><div className="wrap">
    <div className="page-hero"><span className="section-label">WAYNET / {category.short}</span><h1>{category.title}</h1><p>{category.desc}</p></div>
    <div className="filter-row"><Link className="filter" to="/courses">← همه حوزه‌ها</Link><Link className="filter active" to={'/courses/' + category.id}>{category.short}</Link></div>
    {courses.length ? <div className="course-grid">{courses.map(c => <CourseCard key={c.id} course={c}/>)}</div> : <div className="empty">دوره‌ای در این حوزه ثبت نشده است.</div>}
  </div></main></Layout>;
}
export function Search() {
  const q = new URLSearchParams(useLocation().search).get('q') || '';
  const [r, e, loading] = useData(() => get('/courses/?q=' + encodeURIComponent(q)), [], [q]);
  if (e) return <Loading error={e}/>;
  return <Layout title="نتایج جستجو | Waynet"><main className="page"><div className="wrap"><div className="page-hero"><span className="section-label">SEARCH</span><h1>نتایج جستجو</h1><p>{q ? `نتایج برای «${q}»` : 'همه دوره‌ها'}</p></div>
    <div className="course-grid">{r.map(c => <CourseCard key={c.id} course={c}/>)}</div>
    {!loading && !r.length && <div className="empty">دوره‌ای با این عبارت پیدا نشد.</div>}
  </div></main></Layout>;
}

function SessionList({ course, purchased, activeId }) {
  return <div className="session-list">{course.sessions.map(s => { const open = !s.locked || purchased;
    return <Link key={s.id} className={'session-row ' + (open ? '' : 'locked') + ' ' + (s.id === activeId ? 'active' : '')} to={'/course/' + course.id + '/session/' + s.id}>
      <span className="session-status">{open ? TICK : LOCK}</span><span className="session-title">{s.title}</span><span className="session-duration">{s.duration}</span></Link>; })}</div>;
}
function useCourseAccess(id) {
  const { user } = useAuth();
  const [course, e, loading] = useData(() => get('/courses/' + id + '/'), null, [id, user]);
  const [mine] = useData(() => user ? get('/dashboard/') : Promise.resolve(null), null, [user]);
  const purchased = !!course && !!user && (!!(mine && mine.courses.some(c => c.id === id)) || user.role === 'admin' || !!course.class_link);
  return { user, course, e, loading, purchased };
}
export function Course() {
  const { id } = useParams();
  const { user, course, e, loading, purchased } = useCourseAccess(id);
  const [ann] = useData(() => user ? get('/announcements/?course=' + id).catch(() => []) : [], [], [id, user]);
  const [qs, , , reload] = useData(() => user ? get('/questions/?course=' + id).catch(() => []) : [], [], [id, user]);
  const [f, setF] = useState({ type: 'question', text: '' }), [err, setErr] = useState(''), [added, setAdded] = useState(false);
  if (e) return <NotFound/>; if (loading || !course) return <Loading/>;
  const first = course.sessions[0];
  const canInteract = purchased && user && user.role === 'student';
  async function ask(ev) { ev.preventDefault(); setErr(''); try { await post('/questions/', { course: id, ...f }); setF({ type: 'question', text: '' }); reload(); } catch (x) { setErr(x.message); } }
  return <Layout title={course.title + ' | Waynet'}><main className="page"><div className="wrap">
<div className="course-detail-page"><div className={'detail-art art-' + course.type}><span>{course.category_name}</span><b>WAYNET</b></div>
<div className="detail-content"><span className="section-label">SPECIALIZED COURSE</span><h1>{course.title}</h1><p className="lead">{course.desc}</p>
<div className="detail-meta"><div><small>مدرس</small><b>{course.teacher_name}</b></div><div><small>مدت</small><b>{course.duration}</b></div><div><small>ظرفیت</small><b>{course.capacity}</b></div><div><small>شهریه</small><b>{course.price}</b></div><div><small>سطح</small><b>{course.level}</b></div><div><small>تعداد جلسات</small><b>{course.sessions.length} جلسه</b></div></div>
<div className="detail-actions">
  {purchased ? (first && <Link className="btn primary" to={'/course/' + course.id + '/session/' + first.id}>ادامه یادگیری ←</Link>)
    : <button className="btn primary add-cart" onClick={() => { if (addToCart({ id: course.id, type: 'course', title: course.title, price: toPrice(course.price), qty: 1 })) { setAdded(true); setTimeout(() => setAdded(false), 1200); } }}>{added ? '✓ به سبد اضافه شد' : 'افزودن به سبد خرید'}</button>}
  <Link className="btn secondary" to="/contact">مشاوره قبل از ثبت‌نام</Link>
</div>
<div className="syllabus"><h2>اطلاعات دوره</h2>
  <div className="course-info-grid"><div><h3>دوره مناسب چه کسانی است؟</h3><p>{course.audience}</p></div><div><h3>پیش‌نیازها</h3><p>{course.prerequisites}</p></div></div>
  <div className="course-info-grid"><div><h3>اهداف دوره</h3><ul className="tick-list">{course.goals.map((g, i) => <li key={i}>{g}</li>)}</ul></div><div><h3>مهارت‌هایی که کسب می‌کنید</h3><ul className="tick-list">{course.skills.map((s, i) => <li key={i}>{s}</li>)}</ul></div></div>
  <h2>سرفصل و ویژگی‌های دوره</h2><div className="syllabus-grid">{course.features.map((f, i) => <span key={i}>{f}</span>)}</div></div>
<div className="syllabus sessions-block"><h2>جلسات دوره ({course.sessions.length} جلسه)</h2>
  {first && <div className="session-preview"><span className="section-label">PREVIEW</span><h3>پیش‌نمایش رایگان دوره</h3><p>در این پیش‌نمایش خلاصه‌ای از مسیر دوره، سرفصل‌ها و شیوه تدریس {course.teacher_name} را می‌بینید — بدون نیاز به خرید.</p><Link className="btn secondary" to={'/course/' + course.id + '/session/' + first.id}>مشاهده پیش‌نمایش ←</Link></div>}
  <SessionList course={course} purchased={purchased}/></div>
{purchased && course.class_link && <div className="syllabus"><h2>کلاس آنلاین</h2><a className="btn secondary" href={course.class_link} target="_blank" rel="noopener noreferrer">ورود به کلاس آنلاین ←</a></div>}
{ann.length > 0 && <div className="syllabus"><h2>Announcementهای دوره</h2>{ann.map(a => <div className="session-card" key={a.id}><div className="session-head"><div><b>{a.title}</b></div><small>{faDate(a.announcement_date)}</small></div><p>{a.text}</p>{a.class_link && <a className="btn secondary" href={a.class_link} target="_blank" rel="noopener noreferrer">ورود به کلاس آنلاین ←</a>}</div>)}</div>}
{canInteract && <div className="syllabus"><h2>سوالات و نظرات من</h2>
  {qs.length ? qs.map(q => <div className="session-card" key={q.id}><div className="session-head"><b>{q.type === 'question' ? 'سوال' : 'نظر'}</b><small>{faDate(q.created_at)}</small></div><p>{q.text}</p>{q.reply_text && <div className="panel"><b>پاسخ مدرس</b><p>{q.reply_text}</p></div>}</div>) : <div className="empty">هنوز سوال یا نظری ثبت نکرده‌اید.</div>}
  <div className="form-card" style={{ marginTop: 18 }}><form onSubmit={ask}>
    {err && <Msg error={err}/>}
    <div><label>نوع</label><select name="type" value={f.type} onChange={x => setF({ ...f, type: x.target.value })}><option value="question">سوال</option><option value="comment">نظر</option></select></div>
    <div className="full"><label>متن</label><textarea name="text" rows="4" required value={f.text} onChange={x => setF({ ...f, text: x.target.value })}></textarea></div>
    <div style={{ marginTop: 12 }}><button className="btn primary" type="submit">ارسال</button></div></form></div></div>}
</div></div></div></main></Layout>;
}

export function Lesson() {
  const { id, sessionId } = useParams();
  const { user, course, e, loading, purchased } = useCourseAccess(id);
  const sid = Number(sessionId);
  const session = course && course.sessions.find(s => s.id === sid);
  const unlocked = !!session && (!session.locked || purchased);
  const [play] = useData(() => unlocked ? get('/sessions/' + sid + '/playback/').catch(() => null) : null, null, [sid, unlocked]);
  const last = useRef(0);
  const videoRef = useRef(null);
  const retries = useRef(0);
  const resume = useRef({ time: 0, play: false });
  const [fresh, setFresh] = useState({ sid: 0, url: null });
  const src = fresh.sid === sid && fresh.url ? fresh.url : (play ? play.url : undefined);
  // اگر لینک پخش منقضی یا قطع شد، لینک تازه می‌گیریم و از همان ثانیه ادامه می‌دهیم.
  const recover = async () => {
    const v = videoRef.current;
    if (!v || retries.current >= 3) return;
    retries.current += 1;
    resume.current = { time: v.currentTime || 0, play: !v.paused };
    try { const r = await get('/sessions/' + sid + '/playback/'); setFresh({ sid, url: r.url }); } catch (err) { /* دسترسی لغو شده یا خطای شبکه */ }
  };
  const restore = v => { const r = resume.current; if (r.time > 0) { v.currentTime = r.time; if (r.play) v.play().catch(() => {}); resume.current = { time: 0, play: false }; } };
  if (e) return <NotFound/>; if (loading || !course) return <Loading/>; if (!session) return <NotFound/>;
  const index = course.sessions.findIndex(s => s.id === sid) + 1;
  const send = (v, completed) => { if (!user) return; const w = Math.floor(v.currentTime || 0); if (!completed && w - last.current < 10) return; last.current = w; post('/progress/', { session: sid, watched_duration: w, completed }).catch(() => {}); };
  return <Layout title={session.title + ' | ' + course.title}><main className="page"><div className="wrap narrow">
<div className="page-hero"><span className="section-label">{course.title}</span><h1>{session.title}</h1><p>{index === 1 ? 'پیش‌نمایش رایگان دوره' : (unlocked ? 'این جلسه برای شما باز شده است.' : 'این جلسه قفل است.')}</p></div>
{unlocked ? <div className="video-box">
  <video ref={videoRef} controls controlsList="nodownload noremoteplayback noplaybackrate" disablePictureInPicture onContextMenu={x => x.preventDefault()} src={src} onError={recover} onLoadedMetadata={x => restore(x.currentTarget)} onPlaying={() => { retries.current = 0; }} onTimeUpdate={x => send(x.currentTarget, false)} onPause={x => send(x.currentTarget, false)} onEnded={x => send(x.currentTarget, true)}>مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.</video>
  <p className="video-note">این ویدئو فقط به‌صورت آنلاین و داخل سایت Waynet قابل مشاهده است.</p></div>
: <div className="locked-box"><div className="locked-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>
  <h2>این جلسه قفل است</h2><p>برای مشاهده این جلسه، ابتدا وارد حساب کاربری خود شوید و دوره «{course.title}» را خریداری کنید.</p>
  <div className="detail-actions">{!user && <Link className="btn primary" to={'/login?next=' + encodeURIComponent('/course/' + course.id + '/session/' + session.id)}>ورود / ثبت‌نام</Link>}<Link className="btn secondary" to={'/course/' + course.id}>مشاهده و خرید دوره</Link></div></div>}
<div className="syllabus"><h2>لیست جلسات</h2><SessionList course={course} purchased={purchased} activeId={sid}/></div>
</div></main></Layout>;
}

export function Career() {
  const { id } = useParams();
  const [d, e, loading] = useData(() => Promise.all([get('/careers/' + id + '/'), get('/courses/')]), null, [id]);
  if (e) return <NotFound/>; if (loading || !d) return <Loading/>;
  const [career, all] = d; const related = (career.course_ids || []).map(cid => all.find(c => c.id === cid)).filter(Boolean);
  return <Layout title={career.title + ' | مسیر شغلی Waynet'}><main className="page career-detail-page"><div className="wrap">
    <div className="page-hero"><span className="section-label">CAREER PATH</span><h1>{career.title}</h1><p>{career.summary}</p></div>
    <section className="career-description-section"><div className="feature-panel career-description"><span className="section-label">PATH OVERVIEW</span><h2>درباره این مسیر شغلی</h2><p>{career.description}</p></div></section>
    <section className="career-related-courses"><div className="section-head centered"><span className="section-label">RELATED COURSES</span><h2>دوره‌های مرتبط با <em>{career.title}</em></h2><p>دوره‌های منتخب موجود در سایت برای این مسیر شغلی.</p></div>
      {related.length ? <div className="course-grid">{related.map(c => <Link key={c.id} className="course-card full" to={'/course/' + c.id}><div className={'course-art art-' + c.type}><span>{c.category_name}</span></div><div className="course-info"><h3>{c.title.split('(')[0].trim()}</h3><p>{c.duration} · {c.capacity}</p><span className="view-link">مشاهده دوره ←</span></div></Link>)}</div> : <div className="empty">در حال حاضر دوره مرتبطی برای این مسیر ثبت نشده است.</div>}
    </section></div></main></Layout>;
}
export function Instructor() {
  const { id } = useParams();
  const [d, e, loading] = useData(() => Promise.all([get('/instructors/' + id + '/'), get('/courses/?teacher=' + id)]), null, [id]);
  if (e) return <NotFound/>; if (loading || !d) return <Loading/>;
  const [t, courses] = d;
  return <Layout title={t.fullname + ' | اساتید Waynet'}><main className="page"><div className="wrap">
    <div className="page-hero"><span className="section-label">WAYNET / INSTRUCTOR</span>
      <div className="instructor-header">{t.avatar ? <img src={t.avatar} alt={t.fullname}/> : <div className="instructor-photo-fallback">{(t.fullname || '?').trim().charAt(0)}</div>}<h1>{t.fullname}</h1></div>
      {t.teaching_field && <p><b>{t.teaching_field}</b></p>}{t.specialty && <p>{t.specialty}</p>}</div>
    <div className="filter-row"><Link className="filter" to="/#instructors">← همه اساتید</Link></div>
    {courses.length ? <div className="course-grid">{courses.map(c => <CourseCard key={c.id} course={c}/>)}</div> : <div className="empty">در حال حاضر دوره‌ای برای این مدرس ثبت نشده است.</div>}
  </div></main></Layout>;
}

function useSubmit(fn) {
  const [sent, setSent] = useState(false), [err, setErr] = useState('');
  return [sent, err, async ev => { ev.preventDefault(); setErr(''); setSent(false); const form = ev.currentTarget; try { await fn(Object.fromEntries(new FormData(form))); form.reset(); setSent(true); window.scrollTo(0, 0); } catch (x) { setErr(x.message); } }];
}
export function Services() {
  const [services, e] = useData(() => get('/services/'), []);
  const [sent, err, submit] = useSubmit(d => post('/contact/', { name: d.name, phone: d.phone, text: d.description || 'درخواست خدمات', service: 'services' }));
  if (e) return <Loading error={e}/>;
  return <Layout title="خدمات | Waynet"><main className="page"><div className="wrap narrow">
<div className="page-hero"><span className="section-label">WAYNET SERVICES</span><h1>خدمات شبکه و امنیت</h1><p>طراحی، پیاده‌سازی، کانفیگ و پشتیبانی زیرساخت برای کسب‌وکارها.</p></div>
{sent && SENT}<Msg error={err}/>
<div className="service-grid course-grid">{services.map(s => <ServiceCard key={s.id} service={s}/>)}</div>
<form className="form-card" onSubmit={submit}><h2>درخواست خدمات</h2><div className="form-grid"><label>نام و نام خانوادگی<input name="name" required/></label><label>شماره تماس<input name="phone" type="tel" required/></label></div><label>توضیحات پروژه<textarea name="description" rows="6" placeholder="نوع شبکه، تعداد کاربران، تجهیزات یا نیاز امنیتی..."></textarea></label><button className="btn primary" type="submit">ارسال درخواست ←</button></form>
</div></main></Layout>;
}

function Shop({ service }) {
  const [products, e] = useData(() => get('/products/'), []);
  const [qty, setQty] = useState({}), [added, setAdded] = useState('');
  if (e) return <Loading error={e}/>;
  return <Layout title={service.title + ' | Waynet'}><main className="page"><div className="wrap narrow">
<div className="page-hero"><span className="section-label">WAYNET STORE</span><h1>{service.title}</h1><p>{service.desc}</p></div>
<div className="shop-toolbar"><span>{products.length} محصول</span><Link className="btn secondary" to="/cart">سبد خرید مشترک ←</Link></div>
<div className="product-grid course-grid">{products.map(p => <div key={p.id} className="course-card full product-card">
  <div className={'course-art art-' + p.type + (p.image ? ' has-img' : '')}>{p.image && <img className="card-img" src={p.image} alt={p.name} loading="lazy"/>}<span>{p.short}</span><b>WAYNET</b></div>
  <div className="course-info"><h3>{p.name}</h3><p>{p.desc}</p><ul className="tick-list product-specs">{p.specs.map((s, i) => <li key={i}>{s}</li>)}</ul>
    <div className="product-footer"><b className="product-price">{fa(p.price)} تومان</b>
      <div className="add-to-cart-form"><input type="number" value={qty[p.id] ?? 1} min="1" className="qty-input product-qty" onChange={x => setQty({ ...qty, [p.id]: x.target.value })}/>
        <button className="btn primary add-cart product-add-cart" type="button" onClick={() => { if (addToCart({ id: p.id, type: 'product', title: p.name, price: p.price, qty: qty[p.id] || 1 })) { setAdded(p.id); setTimeout(() => setAdded(''), 1200); } }}>{added === p.id ? '✓ به سبد اضافه شد' : 'افزودن به سبد خرید'}</button></div></div></div></div>)}</div>
</div></main></Layout>;
}
function RackRental({ service }) {
  const [racks, e] = useData(() => get('/racks/'), []);
  const [sent, err, submit] = useSubmit(d => post('/rack-requests/', { name: d.name, phone: d.phone, email: d.email || '', rack: d.rackId, duration: d.duration || '', start_date: d.startDate || '', notes: d.notes || '' }));
  if (e) return <Loading error={e}/>;
  return <Layout title={service.title + ' | Waynet'}><main className="page"><div className="wrap narrow">
<div className="page-hero"><span className="section-label">WAYNET DATA CENTER</span><h1>{service.title}</h1><p>{service.desc}</p></div>
{sent && <div className="success">درخواست اجاره رک شما با موفقیت ثبت شد. کارشناسان Waynet با شما تماس می‌گیرند.</div>}<Msg error={err}/>
<div className="rack-grid course-grid">{racks.map(r => <div key={r.id} className="course-card full rack-card">
  <div className={'course-art art-server' + (r.image ? ' has-img' : '')}>{r.image && <img className="card-img" src={r.image} alt={r.name} loading="lazy"/>}<span>{r.capacity}</span><b>WAYNET</b></div>
  <div className="course-info"><h3>{r.name}</h3><div className="detail-meta"><div><small>ظرفیت</small><b>{r.capacity}</b></div><div><small>حداقل مدت اجاره</small><b>{r.duration}</b></div></div>
    <h4>تجهیزات موجود در رک</h4><ul className="tick-list">{r.equipment.map((x, i) => <li key={i}>{x}</li>)}</ul>
    <h4>مشخصات و امکانات</h4><ul className="tick-list">{r.specs.map((x, i) => <li key={i}>{x}</li>)}</ul>
    <p className="rack-terms"><b>شرایط اجاره:</b> {r.terms}</p><p className="rack-price">{r.price_note}</p></div></div>)}</div>
<form className="form-card" onSubmit={submit}><h2>فرم درخواست اجاره رک</h2>
  <div className="form-grid"><label>نام و نام خانوادگی<input name="name" required/></label><label>شماره تماس<input name="phone" type="tel" required/></label><label>ایمیل<input name="email" type="email"/></label>
    <label>رک موردنظر<select name="rackId" required>{racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <label>مدت زمان اجاره<input name="duration" placeholder="مثلاً ۳ ماه"/></label><label>تاریخ شروع<input name="startDate" type="date"/></label></div>
  <label>توضیحات / درخواست‌های تکمیلی<textarea name="notes" rows="5"></textarea></label><button className="btn primary" type="submit">ارسال درخواست ←</button></form>
</div></main></Layout>;
}
export function ServiceDetail() {
  const { id } = useParams();
  const [s, e, loading] = useData(() => get('/services/' + id + '/'), null, [id]);
  const [sent, err, submit] = useSubmit(d => post('/contact/', { name: d.name, phone: d.phone, text: d.description || 'درخواست خدمت', service: id }));
  if (e) return <NotFound/>; if (loading || !s) return <Loading/>;
  if (s.id === 'network-equipment') return <Shop service={s}/>;
  if (s.id === 'rack-rental') return <RackRental service={s}/>;
  return <Layout title={s.title + ' | Waynet'}><main className="page"><div className="wrap"><div className="course-detail-page">
  <div className={'detail-art art-' + s.type}><span>{s.short}</span><b>WAYNET</b></div>
  <div className="detail-content"><span className="section-label">WAYNET SERVICES</span><h1>{s.title}</h1><p className="lead">{s.desc}</p>
    {sent && SENT}<Msg error={err}/>
    <div className="syllabus"><h2>مراحل انجام کار</h2>
      <div className="course-info-grid"><div><ul className="tick-list">{s.steps.map((x, i) => <li key={i}>{x}</li>)}</ul></div><div><h3>مزایا</h3><ul className="tick-list">{s.benefits.map((x, i) => <li key={i}>{x}</li>)}</ul></div></div>
      <h2>ویژگی‌های خدمت</h2><div className="syllabus-grid">{s.features.map((x, i) => <span key={i}>{x}</span>)}</div></div>
    <form className="form-card" onSubmit={submit}><h2>درخواست این خدمت</h2><div className="form-grid"><label>نام و نام خانوادگی<input name="name" required/></label><label>شماره تماس<input name="phone" type="tel" required/></label></div><label>توضیحات پروژه<textarea name="description" rows="6"></textarea></label><button className="btn primary" type="submit">ارسال درخواست ←</button></form>
  </div></div></div></main></Layout>;
}
export const ShopRedirect = () => <Navigate to="/services/network-equipment" replace/>;
export const RackRedirect = () => <Navigate to="/services/rack-rental" replace/>;

export function Contact() {
  const [sent, err, submit] = useSubmit(d => post('/contact/', { name: d.name, phone: d.phone, email: d.email || '', text: d.subject + '\n' + d.message, service: d.type }));
  return <Layout title="تماس با ما | Waynet"><main className="page"><div className="wrap narrow">
<div className="page-hero"><span className="section-label">CONTACT</span><h1>در ارتباط با ما باشید</h1><p>برای دریافت مشاوره، ثبت‌نام دوره‌های آموزشی، دریافت خدمات تخصصی شبکه و امنیت یا پاسخ به سوالات خود، از طریق راه‌های ارتباطی زیر با ما در تماس باشید.</p></div>
{sent && <div className="success">درخواست شما ثبت شد. به‌زودی با شما تماس می‌گیریم.</div>}<Msg error={err}/>
<div className="contact-info-list">
  <p>📍 <b>آدرس:</b> تهران، ایران — آدرس کامل آموزشگاه</p>
  <p>📞 <b>شماره تماس:</b> <span dir="ltr">021-77475022</span></p>
  <p>📱 <b>موبایل / واتساپ:</b> <span dir="ltr">0912-XXXXXXX</span></p>
  <p>✉️ <b>ایمیل:</b> <span dir="ltr">info@waynet.example</span></p>
  <p>🕐 <b>ساعات پاسخگویی:</b> شنبه تا پنجشنبه، ساعت ۹ تا ۱۸</p>
</div>
<div className="social-block"><h2>ما را در شبکه‌های اجتماعی دنبال کنید</h2><div className="social-row">
  <a className="social-btn" href="https://instagram.com/waynet.academy" target="_blank" rel="noopener" aria-label="اینستاگرام Waynet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4.3"/><circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none"/></svg></a>
  <a className="social-btn" href="https://t.me/waynet_academy" target="_blank" rel="noopener" aria-label="تلگرام Waynet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M17 7 6.5 11.5c-.6.25-.6.6 0 .8l3 1 1 3.3c.2.6.5.65.85.15l1.55-2.2 3.15 2.3c.5.35.9.15 1.05-.45L19 7.6c.15-.65-.15-.9-.75-.6Z"/></svg></a>
  <a className="social-btn" href="https://wa.me/98912XXXXXXX" target="_blank" rel="noopener" aria-label="واتساپ Waynet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0-7.8-4.5L3 21l4.6-1.2A9 9 0 0 0 12 21Z"/><path d="M8.6 8.4c.15-.4.4-.4.65-.4.2 0 .4 0 .55.35.2.45.65 1.5.7 1.6.05.15.1.3 0 .5-.1.2-.15.3-.3.45-.15.15-.3.3-.45.4-.15.15-.3.3-.15.6.15.3.7 1.15 1.5 1.85.9.8 1.6 1.05 1.9 1.2.3.15.5.1.65-.05.2-.2.65-.75.85-1.05.2-.3.4-.25.65-.15.3.1 1.5.75 1.75.9.3.15.45.2.5.35.1.2.1.95-.25 1.35-.4.45-1.35.85-1.85.85-.5.05-1.05.05-3.3-1.35-2.6-1.6-4.25-4-4.4-4.2-.15-.2-1.05-1.4-1.05-2.65 0-1.25.65-1.9.85-2.15Z"/></svg></a>
  <a className="social-btn" href="https://linkedin.com/company/waynet-academy" target="_blank" rel="noopener" aria-label="لینکدین Waynet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3.5"/><line x1="7.3" y1="10.3" x2="7.3" y2="16.5"/><circle cx="7.3" cy="6.9" r="0.9" fill="currentColor" stroke="none"/><path d="M11.3 16.5v-6.2"/><path d="M11.3 13c0-1.6 1-2.7 2.35-2.7 1.4 0 2.15 1 2.15 2.8v3.4"/></svg></a>
</div></div>
<div className="map-block"><div className="section-head centered"><span className="section-label">LOCATION</span><h2>موقعیت ما</h2></div>
  <div className="map-frame small"><iframe src="https://www.google.com/maps?q=Tehran,Iran&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="موقعیت آموزشگاه Waynet"></iframe></div>
  <p className="map-note">برای مشاهده مسیر و مسیریابی، روی نقشه کلیک کنید.</p>
  <div className="map-actions"><a className="btn secondary" href="https://www.google.com/maps?q=Tehran,Iran" target="_blank" rel="noopener">مسیریابی با Google Maps</a><a className="btn secondary" href="https://neshan.org/maps" target="_blank" rel="noopener">مسیریابی با نشان</a><a className="btn secondary" href="https://balad.ir" target="_blank" rel="noopener">مسیریابی با بلد</a></div></div>
<form className="form-card" id="consultForm" onSubmit={submit}><h2>درخواست مشاوره</h2>
  <div className="form-grid"><label>نام و نام خانوادگی *<input name="name" required/></label><label>شماره تماس *<input name="phone" type="tel" required/></label><label>ایمیل<input name="email" type="email"/></label><label>موضوع درخواست *<input name="subject" required/></label></div>
  <label>نوع درخواست *<select name="type" required defaultValue=""><option value="" disabled>انتخاب کنید</option><option value="course">ثبت‌نام دوره</option><option value="edu-consult">مشاوره آموزشی</option><option value="network-service">خدمات شبکه</option><option value="security-service">خدمات امنیت</option><option value="infra">طراحی و اجرای زیرساخت</option><option value="other">سایر</option></select></label>
  <label>توضیحات / پیام *<textarea name="message" rows="6" required></textarea></label><button className="btn primary">ارسال درخواست ←</button></form>
</div></main></Layout>;
}

const PROJECTS = [['ترکیب Cisco و MikroTik','پیاده سازی سناریوهای شبکه ای که در آن تجهیزات سیسکو و میکروتیک در کنار هم کار می کنند.'],['Routing و Switching','پروژه های عملی مسیریابی و سوییچینگ در توپولوژی های چندلایه.'],['پروژه های Server','راه اندازی و مدیریت سرویس های سروری در کنار زیرساخت شبکه.'],['امنیت شبکه','پیاده سازی فایروال، کنترل دسترسی و سیاست های امنیتی روی زیرساخت پروژه.'],['سناریوهای واقعی شبکه','ترکیب موارد بالا در قالب یک سناریوی کامل، شبیه سازی شده از یک شبکه سازمانی واقعی.']];
const EXEC = ['قرارداد پشتیبانی بانک تات و بانک ملت','اجرا و پشتیبانی و امنیت شبکه وارش گستر','اجرا و پشتیبانی و امنیت شبکه شرکت تیرتاش','اجرا و پشتیبانی و امنیت شبکه شهرداری دامغان','اجرا و پشتیبانی و امنیت دانشگاه شمسی پور','قرارداد آموزشی با سازمان آموزش و پرورش تهران','قرارداد آموزشی با وزارت بهداشت'];
const IMGS = [['network-rack', 'رک شبکه و تجهیزات'], ['server-room', 'اتاق سرور'], ['security-lab', 'آزمایشگاه امنیت شبکه'], ['network-router', 'تجهیزات Routing و Switching']];
export function About() {
  const track = useRef(null), idx = useRef(0), [light, setLight] = useState('');
  const rtl = () => getComputedStyle(track.current).direction === 'rtl';
  const step = () => { const it = track.current.querySelector('.equipment-image'); const s = getComputedStyle(track.current); return (it ? it.getBoundingClientRect().width : 320) + (parseFloat(s.columnGap || s.gap || '0') || 0); };
  const goTo = i => { const t = track.current; if (!t) return; idx.current = (i + IMGS.length) % IMGS.length; const d = Math.min(Math.max(0, t.scrollWidth - t.clientWidth), idx.current * step()); t.scrollTo({ left: rtl() ? -d : d, behavior: 'smooth' }); };
  useEffect(() => { const timer = setInterval(() => goTo(idx.current + 1), 2000); const esc = e => { if (e.key === 'Escape') setLight(''); }; document.addEventListener('keydown', esc); return () => { clearInterval(timer); document.removeEventListener('keydown', esc); }; }, []);
  const onScroll = () => { const s = step(); if (s > 0) idx.current = Math.max(0, Math.min(IMGS.length - 1, Math.round(Math.abs(track.current.scrollLeft) / s))); };
  return <Layout title="درباره ما | Waynet"><main className="page"><div className="wrap narrow"><div className="about-scroll-area">
  <div className="page-hero"><span className="section-label">ABOUT WAYNET</span><h1>درباره Waynet</h1><p>مدرسه تخصصی شبکه و امنیت اطلاعات؛ آموزش نزدیک به دنیای واقعی صنعت.</p></div>
  <div className="about-edu-grid">
    <section className="feature-panel about-edu-card"><span className="section-label">ABOUT WAYNET</span><h2>Waynet؛ مدرسه تخصصی امنیت سایبری</h2><p>Waynet یک مجموعه تخصصی در حوزه آموزش و توسعه مهارت های شبکه و امنیت سایبری است؛ جایی برای <strong>یادگیری عمیق</strong>، تجربه عملی و آشنایی با دنیای واقعی امنیت.</p><p>مسیرهای آموزشی Waynet با تمرکز بر مهارت های موردنیاز صنعت طراحی شده اند و موضوعاتی از مبانی شبکه و زیرساخت تا تست نفوذ، دفاع سایبری و حوزه های تخصصی تر این صنعت را پوشش می دهند.</p></section>
    <section className="feature-panel about-edu-card"><span className="section-label">WHY NETWORK &amp; SECURITY</span><h2>چرا آموزش شبکه و امنیت؟</h2><p>زیرساخت هر سازمانی، از شبکه های کوچک تا مراکز داده بزرگ، به متخصصانی نیاز دارد که هم طراحی و پیاده سازی شبکه را بلد باشند و هم بتوانند از آن در برابر تهدیدات دفاع کنند.</p><p>Waynet روی این حوزه تمرکز کرده چون تقاضای بازار کار برای متخصصان شبکه و امنیت رو به رشد است و این مهارت ها پایه بسیاری از مسیرهای شغلی IT محسوب می شوند.</p></section>
  </div>
  <section className="feature-panel about-method-panel"><span className="section-label">METHOD</span><h2>روش آموزشی ما</h2><p>آموزش در Waynet بر پایه کار عملی، سناریومحور و پروژه محور طراحی شده است. هر مبحث تئوری، بلافاصله با پیاده سازی روی تجهیزات و سناریوهای واقعی همراه می شود تا دانشجو نه تنها مفهوم را بفهمد، بلکه توانایی اجرای آن در محیط واقعی را هم داشته باشد.</p></section>
  <div className="section-head centered" style={{ marginTop: 70 }}><span className="section-label">COMBINED PROJECTS</span><h2>پروژه های <em>ترکیبی</em></h2><p>در Waynet، پروژه های آموزشی صرفاً محدود به یک تکنولوژی نیستند؛ تجهیزات و مباحث مختلف در سناریوهای واقعی با یکدیگر ترکیب می شوند تا دانشجو با شرایطی که در محیط کار واقعی با آن روبه رو می شود، آشنا شود.</p></div>
  <div className="career-grid">{PROJECTS.map(p => <div className="career-card" key={p[0]}><div className="career-art"><i>IT</i></div><h3>{p[0]}</h3><p>{p[1]}</p></div>)}</div>
  <div className="section-head centered" style={{ marginTop: 70 }}><span className="section-label">FACILITIES</span><h2>تجهیزات و محیط <em>آموزشی</em></h2><p>محیط آزمایشگاهی و تجهیزات واقعی Waynet، بستری برای تمرین عملی روی سناریوهای واقعی صنعت شبکه فراهم می کند.</p></div>
  <div className="equipment-gallery" id="equipmentGallery">
    <button className="gallery-nav gallery-prev" type="button" aria-label="تصویر قبلی" onClick={() => track.current.scrollBy({ left: rtl() ? step() : -step(), behavior: 'smooth' })}>‹</button>
    <div className="equipment-track" ref={track} onScroll={onScroll}>{IMGS.map(([f, alt]) => <button key={f} className="equipment-image" type="button" onClick={() => setLight('/images/equipment/' + f + '.jpg')}><img src={'/images/equipment/' + f + '.jpg'} alt={alt}/></button>)}</div>
    <button className="gallery-nav gallery-next" type="button" aria-label="تصویر بعدی" onClick={() => track.current.scrollBy({ left: rtl() ? -step() : step(), behavior: 'smooth' })}>›</button>
  </div>
  <p className="gallery-note">برای مشاهده واضح تر روی هر تصویر کلیک کنید.</p>
  <div className="section-head centered projects-executive-head"><span className="section-label">EXECUTIVE PROJECTS</span><h2>پروژه های <em>اجرایی</em></h2><p>بخشی از پروژه ها و قراردادهای اجرایی و آموزشی مجموعه Waynet.</p></div>
  <div className="career-grid executive-projects">{EXEC.map((t, i) => <div className="career-card executive-project-card" key={t}><div className="executive-project-number">{String(i + 1).padStart(2, '0')}</div><div className="executive-project-copy"><h3>{t}</h3><p>پروژه اجرایی و تخصصی در حوزه شبکه، زیرساخت، امنیت یا آموزش.</p></div></div>)}</div>
</div></div></main>
<div className={'lightbox' + (light ? ' open' : '')} id="galleryLightbox" aria-hidden={light ? 'false' : 'true'} onClick={e => { if (e.target === e.currentTarget) setLight(''); }}><button className="lightbox-close" type="button" aria-label="بستن" onClick={() => setLight('')}>×</button><img id="lightboxImage" src={light} alt="نمایش بزرگ تصویر"/></div>
</Layout>;
}

export function Cart() {
  const { user } = useAuth(), loc = useLocation();
  const [items, setItems] = useState(getCart), [msg, setMsg] = useState('');
  const [src] = useData(() => Promise.all([get('/courses/'), get('/products/')]), [[], []]);
  useEffect(() => { const f = () => setItems(getCart()); window.addEventListener('waynet-cart', f); return () => window.removeEventListener('waynet-cart', f); }, []);
  const failed = new URLSearchParams(loc.search).get('payment') === 'failed';
  let total = 0;
  const rows = items.map(item => {
    const source = item.type === 'product' ? src[1].find(p => p.id === item.id) : src[0].find(c => c.id === item.id);
    const title = (source && (source.title || source.name)) || item.title || item.id;
    const price = source ? (item.type === 'product' ? Number(source.price) : toPrice(source.price)) : Number(item.price || 0);
    const qty = item.type === 'course' ? 1 : Math.max(1, Number(item.qty) || 1);
    total += price * qty;
    return { item, title, price, qty };
  });
  const remove = it => setCart(getCart().filter(x => !(x.id === it.id && x.type === it.type)));
  const changeQty = (it, v) => { const c = getCart(); const t = c.find(x => x.id === it.id && x.type === it.type); if (t) { t.qty = Math.max(1, parseInt(v, 10) || 1); setCart(c); } };
  async function checkout() {
    setMsg('');
    if (!user) { window.location.href = '/login?next=' + encodeURIComponent('/cart'); return; }
    try { const r = await post('/checkout/', { items: getCart().map(({ type, id, qty }) => ({ type, id, qty })) }); setCart([]); window.location.href = r.redirect || '/cart?sent=1'; }
    catch (x) { setMsg(x.message || 'خطا در ثبت سفارش. دوباره تلاش کنید.'); }
  }
  return <Layout title="سبد خرید | Waynet"><main className="page"><div className="wrap narrow"><div className="page-hero"><span className="section-label">CART</span><h1>سبد خرید</h1><p>دوره ها و تجهیزات انتخابی شما در یک سبد مشترک نمایش داده می شوند.</p></div>
    {failed && <Msg error="پرداخت ناموفق بود. دوباره تلاش کنید."/>}
    <div id="cartPage" className="cart-box">{!items.length ? <div className="empty">سبد خرید شما خالی است.<br/><br/><Link className="btn primary" to="/courses">مشاهده دوره ها ←</Link></div> : <>
      <div className="cart-items">{rows.map(({ item, title, price, qty }) => <div className="cart-item" key={item.type + item.id}><div><b>{title}</b><small>{fa(price)} تومان × {qty} · {item.type === 'product' ? 'تجهیزات' : 'دوره'}</small></div>
        <div className="cart-row-actions">{item.type === 'product' && <input className="qty-input cart-qty" type="number" min="1" value={qty} aria-label="تعداد" onChange={e => changeQty(item, e.target.value)}/>}<button type="button" onClick={() => remove(item)}>حذف</button></div></div>)}</div>
      <div className="cart-total"><span>جمع کل: {fa(total)} تومان</span><button className="btn primary" id="checkoutBtn" onClick={checkout}>تکمیل خرید / ثبت سفارش ←</button></div><div id="checkoutMsg">{msg}</div></>}</div>
  </div></main></Layout>;
}
