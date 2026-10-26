import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, post } from './api';
import { Layout, Loading, useData, useAuth } from './components';

const ROADMAP = [['01','مبانی شبکه و سیستم‌عامل','آشنایی با مفاهیم پایه شبکه، لینوکس و سخت‌افزار به‌عنوان زیربنای مسیر.'],['02','تجهیزات و زیرساخت','کار عملی با سیسکو، میکروتیک و سرور برای پیاده‌سازی شبکه‌های واقعی.'],['03','امنیت شبکه و فایروال','یادگیری اصول دفاعی، پیکربندی فایروال و کنترل دسترسی‌ها.'],['04','تخصص و تست نفوذ','ورود به حوزه‌های تخصصی‌تر مثل SOC، NOC و تست نفوذ برای رشد حرفه‌ای.']];

function TestimonialForm({ onDone }) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: '', role: '', text: '' }), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  async function submit(e) { e.preventDefault(); setErr(''); setMsg('');
    try { await post('/testimonials/', f); setF({ name: '', role: '', text: '' }); setMsg('نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.'); onDone && onDone(); } catch (x) { setErr(x.message); } }
  return <div className="form-card testimonial-form">
    {user ? <>
      <h2>ثبت نظر شما</h2>
      {msg && <div className="success">{msg}</div>}
      {err && <div className="success" style={{ borderColor: 'rgba(230,90,70,.3)', color: '#c65042' }}>{err}</div>}
      <form onSubmit={submit}>
        <div className="form-grid"><label>نام<input name="name" placeholder="نام شما" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })}/></label><label>سمت شغلی (اختیاری)<input name="role" placeholder="مثلاً کارشناس شبکه" value={f.role} onChange={e => setF({ ...f, role: e.target.value })}/></label></div>
        <label>تجربه شما از Waynet<textarea name="text" rows="4" required value={f.text} onChange={e => setF({ ...f, text: e.target.value })}></textarea></label>
        <button className="btn primary" type="submit">ثبت نظر ←</button>
      </form></> : <>
      <h2>تجربه‌ی خود را ثبت کنید</h2>
      <p>برای ثبت نظر، ابتدا وارد پنل کاربری خود شوید.</p>
      <Link className="btn primary" to={'/login?next=' + encodeURIComponent('/#testimonials')}>ورود برای ثبت نظر ←</Link></>}
  </div>;
}

export function Home() {
  const [d, e] = useData(api.home, { courses: [], careers: [], testimonials: [], instructors: [] });
  if (e) return <Loading error={e}/>;
  return <Layout title="Waynet | مدرسه تخصصی امنیت اطلاعات"><main>
<section className="hero">
  <div className="hero-orb orb-a"></div><div className="hero-orb orb-b"></div>
  <div className="wrap hero-inner">
    <div className="eyebrow"><span className="pulse"></span><span>WAYNET ACADEMY / SYSTEMS ONLINE</span></div>
    <div className="hero-layout">
      <div className="hero-copy">
        <span className="hero-kicker">مدرسه تخصصی امنیت اطلاعات</span>
        <h2>امنیت را فقط یاد نگیر، <strong>بخشی از دنیای آن باش.</strong></h2>
        <p>مسیرهای آموزشی تخصصی در شبکه، زیرساخت و امنیت سایبری؛ با محتوایی نزدیک به فضای واقعی صنعت.</p>
        <div className="hero-cta"><Link className="btn primary" to="/courses">مشاهده دوره‌ها <span>←</span></Link><Link className="btn secondary" to="/services">خدمات شبکه و امنیت</Link></div>
        <div className="hero-stats"><div><b>+35</b><small>دوره تخصصی</small></div><div><b>+2400</b><small>هنرجوی فارغ‌التحصیل</small></div><div><b>18</b><small>مدرس صنعتی</small></div><div><b>+60</b><small>شرکت همکار</small></div></div>
      </div>
      <div className="server-gallery" aria-label="تصاویر آموزش شبکه، سرور و تجهیزات آزمایشگاهی">
        <div className="gallery-image gallery-image-a"><img src="/images/equipment/network-rack.jpg" alt="رک شبکه و تجهیزات"/></div>
        <div className="gallery-image gallery-image-b"><img src="/images/equipment/server-room.jpg" alt="اتاق سرور"/></div>
        <div className="gallery-image gallery-image-c"><img src="/images/equipment/security-lab.jpg" alt="آزمایشگاه امنیت شبکه"/></div>
        <div className="gallery-image gallery-image-d"><img src="/images/equipment/network-router.jpg" alt="تجهیزات Routing و Switching"/></div>
      </div>
    </div>
  </div>
</section>

<section id="courses">
  <div className="wrap">
    <div className="section-head"><div><span className="section-label">LEARNING PATHS</span><h2>دوره‌های <em>Waynet</em></h2></div><p>دوره موردنظرت را لمس کن؛ جزئیات، استاد، ظرفیت و شهریه را ببین.</p></div>
    <div className="course-scroll">
      {d.courses.map(c => <Link key={c.id} className="course-card home-course-card" to={'/course/' + c.id}>
        <div className={'course-art art-' + c.type}>
          <span style={{ display: 'block', marginBottom: 20 }}>{c.category_name}</span>
          <b style={{ display: 'block' }}>WAYNET</b>
        </div>
        <div className="course-info"><h3>{c.title.split('(')[0].trim()}</h3><p>{c.duration} · {c.capacity}</p><span className="view-link">مشاهده دوره ←</span></div>
      </Link>)}
    </div>
    <div className="center-note">مسیر حرفه‌ای بسیاری از متخصصان امنیت کشور، <strong>از همین‌جا آغاز شده است.</strong></div>
  </div>
</section>

<section className="trust">
  <div className="wrap"><p>دانشجویان Waynet در مجموعه‌های مختلف فناوری، بانک‌ها و کسب‌وکارهای بزرگ فعالیت می‌کنند.</p><div className="trust-row"><span>TECH GROUP</span><span>TEPSI</span><span>BANKING</span><span>DATA CENTER</span><span>FINTECH</span><span>ENTERPRISE</span></div></div>
</section>

<section id="careers">
  <div className="wrap">
    <div className="section-head centered"><span className="section-label">CAREER MAP</span><h2>مسیرهای شغلی حوزه <em>IT</em></h2><p>اگر قصد ورود به دنیای IT را دارید یا می‌خواهید مسیر شغلی خود را تغییر دهید، این بخش کمک می‌کند بهترین انتخاب را داشته باشید.</p></div>
    <div className="career-grid">
      {d.careers.map((c, i) => <Link key={c.id} className="career-card" to={'/career/' + c.id}><div className="career-art"><span>{String(i + 1).padStart(2, '0')}</span><i>IT</i></div><h3>{c.title}</h3><p>{c.summary}</p><span>مسیر یادگیری ←</span></Link>)}
    </div>
  </div>
</section>

<section id="roadmap" className="roadmap-section">
 <div className="wrap">
  <div className="section-head centered"><span className="section-label">ROADMAP</span><h2>از کجا <em>شروع کنم؟</em></h2><p>یک نقشه راه مرحله‌به‌مرحله برای ورود اصولی به مسیر شبکه و امنیت.</p></div>
  <div className="roadmap"><div className="road-line"></div>
   {ROADMAP.map(s => <div key={s[0]} className="road-step"><b>{s[0]}</b><div><h3>{s[1]}</h3><p>{s[2]}</p></div></div>)}
  </div>
 </div>
</section>

<section id="instructors">
    <div className="wrap">
        <div className="feature-panel instructors-panel">
            <span className="section-label">INSTRUCTORS</span>
            <h2>اساتید Waynet</h2>
            <h3>یادگیری عمیق، با تجربه‌ای که از دل صنعت می‌آید.</h3>
            <p>در Waynet، آموزش توسط متخصصانی ارائه می‌شود که تجربه مواجهه با مسائل واقعی صنعت را دارند و دانش خود را بر پایه استانداردها، ابزارها و رویکردهای روز دنیا منتقل می‌کنند.</p>
            {d.instructors && d.instructors.length ? <div className="instructors-slider">
                {d.instructors.map(t => <div className="instructor-card" key={t.id}>
                    {t.avatar ? <img src={t.avatar} alt={t.fullname}/> : <div className="instructor-photo-fallback">{(t.fullname || '?').trim().charAt(0)}</div>}
                    <div className="instructor-info">
                        <h3>{t.fullname}</h3>
                        {t.teaching_field && <span>{t.teaching_field}</span>}
                        {t.specialty && <p>{t.specialty}</p>}
                        <Link className="btn secondary instructor-link" to={'/instructors/' + t.id}>مشاهده دوره‌های مدرس</Link>
                    </div>
                </div>)}
            </div> : <p>به‌زودی اساتید Waynet در این بخش معرفی می‌شوند.</p>}
        </div>
    </div>
</section>

<section id="testimonials">
 <div className="wrap"><div className="section-head centered"><span className="section-label">STUDENT VOICES</span><h2>از زبان دانشجویان <em>Waynet</em></h2><p>تجربه‌ی یادگیری، از نگاه کسانی که این مسیر را طی کرده‌اند.</p></div>
 {d.testimonials && d.testimonials.length ? <div className="testimonial-scroll">
  {d.testimonials.map(t => <article className="testimonial" key={t.id}><div className="stars">★★★★★</div><p>«{t.text}»</p><div className="student"><span>{t.name.slice(0, 1)}</span><div><b>{t.name}</b>{t.role && <small>{t.role}</small>}</div></div>{t.reply && t.reply.text && <div className="testimonial-reply"><b>پاسخ Waynet</b><p>{t.reply.text}</p></div>}</article>)}
 </div> : <div className="empty">هنوز نظری ثبت نشده است. اولین نفری باشید که تجربه‌ی خود را با ما به اشتراک می‌گذارید.</div>}
 <TestimonialForm/>
 </div>
</section>

<section className="cta-section" id="services"><div className="wrap cta-box"><div><span className="section-label">WAYNET SERVICES</span><h2>زیرساخت امن، برای کسب‌وکار امن.</h2><p>طراحی شبکه، کانفیگ تجهیزات، فایروال، سرور و خدمات زیرساختی را با تیم Waynet شروع کنید.</p></div><Link className="btn primary" to="/services">ثبت درخواست خدمات ←</Link></div></section>
</main></Layout>;
}
