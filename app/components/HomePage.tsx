'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const PLANS = [
  { id: 'solo',   name: 'SOLO',   price: '299', daily: '0.82', desc: '1 специалист',     tag: null },
  { id: 'ekip',   name: 'ЕКИП',   price: '399', daily: '1.09', desc: 'до 3 специалисти', tag: 'Най-популярен' },
  { id: 'studio', name: 'СТУДИО', price: '599', daily: '1.64', desc: 'без ограничения',   tag: null },
];

const STEPS = [
  { n: '01', head: 'Избери план',      body: 'SOLO, ЕКИП или СТУДИО — без скрити такси, без изненади.' },
  { n: '02', head: 'Попълни данните',  body: 'Снимки, ценоразпис, работно време. Без технически познания. 15 минути.' },
  { n: '03', head: 'Получи своя сайт', body: 'Активен, с резервационна система, готов за клиенти от ден 1.' },
];

const BENEFITS = [
  { icon: '⭐', head: 'Повече ревюта в Google — автоматично', body: 'След всяка приключила услуга клиентът получава имейл или SMS с директен линк към твоя Google профил. Един клик и оставя ревю. Повече ревюта = по-висок ранг в Google = повече нови клиенти от района.', label: 'GOOGLE РЕПУТАЦИЯ' },
  { icon: '📍', head: 'По-добро присъствие в Google търсенето', body: 'Собственият ти сайт с правилно SEO, Google My Business профил и натрупани ревюта те показват по-напред когато някой търси „фризьор до мен". Клиентите намират теб, не конкурент.', label: 'ЛОКАЛНА ВИДИМОСТ' },
  { icon: '📅', head: 'Синхрон с Google & iOS Calendar', body: 'При всяка нова резервация — автоматично събитие в телефона ти. Клиент, услуга, час. Без ръчно въвеждане. Работи с Google Calendar, Apple Calendar и всеки CalDAV клиент.', label: 'АВТОМАТИЗАЦИЯ' },
  { icon: '📩', head: 'Telegram известия в реално време', body: 'Нова резервация → моментално съобщение в Telegram. Потвърди или откажи с един бутон. Без да отваряш приложение, без да чакаш имейл.', label: 'НОТИФИКАЦИИ' },
  { icon: '✉️', head: 'Email и SMS потвърждения', body: 'Клиентът получава потвърждение веднага след резервацията — услуга, дата, час, адрес на салона. После и напомняне преди часа. Без пропуснати записвания.', label: 'КОМУНИКАЦИЯ' },
  { icon: '🔒', head: 'Клиентите са изцяло твои', body: 'Платформите за резервации вземат % от всеки час и изграждат тяхна клиентска база, не твоя. При нас — данните, историята и клиентите са само твои. Никога не ги споделяме.', label: '0% КОМИСИОННА' },
];

const MARQUEE = ['Повече ревюта в Google','Telegram нотификации','Google Calendar sync','Локална видимост','0% комисионна','Клиентите са твои','Готов за 15 мин','Без технически познания'];

const PLAN_FEATURES = ['Готов сайт за 15 минути','Резервационна система','Google Calendar sync','Telegram нотификации','Email потвърждения','Собствен домейн с 1 клик','Хостинг включен'];

const CSS = `
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes mq       { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes float1   { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-28px,18px) scale(1.04)} }
  @keyframes float2   { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(22px,-26px) scale(1.07)} }
  @keyframes float3   { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-14px,-18px) scale(.96)} }

  .hp { font-family:'Inter',system-ui,sans-serif; background:#FAFAF8; color:#0D0D12; overflow-x:hidden; }

  [data-reveal] { opacity:0; transform:translateY(22px); transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1); }

  .orb { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }

  .nav-glass {
    background:rgba(250,250,248,.9);
    backdrop-filter:blur(28px) saturate(180%);
    -webkit-backdrop-filter:blur(28px) saturate(180%);
    border-bottom:1px solid rgba(0,0,0,.06);
    box-shadow:0 1px 3px rgba(0,0,0,.04);
  }

  .mq { display:flex; animation:mq 28s linear infinite; width:max-content; }

  .glass-pill {
    background:rgba(255,255,255,.75);
    backdrop-filter:blur(24px) saturate(200%);
    -webkit-backdrop-filter:blur(24px) saturate(200%);
    border:1px solid rgba(255,255,255,.9);
    box-shadow:0 4px 20px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04),inset 0 1px 0 rgba(255,255,255,.8);
    border-radius:100px;
  }

  .glass-card {
    background:rgba(255,255,255,.72);
    backdrop-filter:blur(24px) saturate(180%);
    -webkit-backdrop-filter:blur(24px) saturate(180%);
    border:1px solid rgba(255,255,255,.88);
    box-shadow:0 4px 24px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
    border-radius:20px;
    transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s ease;
  }
  .glass-card:hover { transform:translateY(-5px); box-shadow:0 20px 60px rgba(124,58,237,.12),0 6px 20px rgba(0,0,0,.08); }

  .benefit-card {
    background:rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.1);
    border-radius:20px;
    padding:32px;
    transition:background .3s,border-color .3s,transform .3s;
  }
  .benefit-card:hover { background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.18); transform:translateY(-3px); }

  .step-card {
    background:#fff;
    border:1.5px solid rgba(0,0,0,.06);
    border-radius:20px;
    padding:36px;
    box-shadow:0 2px 12px rgba(0,0,0,.04);
    transition:transform .3s,box-shadow .3s,border-color .3s;
  }
  .step-card:hover { transform:translateY(-4px); box-shadow:0 16px 48px rgba(124,58,237,.1); border-color:rgba(124,58,237,.22); }

  .pricing-card {
    background:#fff;
    border:1.5px solid rgba(0,0,0,.07);
    border-radius:24px;
    padding:36px;
    display:flex;
    flex-direction:column;
    transition:transform .3s,box-shadow .3s,border-color .3s;
  }
  .pricing-card:hover { transform:translateY(-4px); box-shadow:0 20px 56px rgba(0,0,0,.1); border-color:rgba(124,58,237,.22); }
  .pricing-featured {
    background:linear-gradient(148deg,#7C3AED,#5B21B6) !important;
    border-color:transparent !important;
    box-shadow:0 24px 72px rgba(124,58,237,.42) !important;
    color:#fff;
  }
  .pricing-featured:hover { box-shadow:0 32px 88px rgba(124,58,237,.58) !important; }

  .btn-primary {
    background:linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%);
    color:#fff; border-radius:100px; font-weight:700;
    text-decoration:none; display:inline-block;
    transition:transform .2s ease,box-shadow .2s ease;
    box-shadow:0 8px 32px rgba(124,58,237,.38);
  }
  .btn-primary:hover { transform:translateY(-2px) scale(1.02); box-shadow:0 16px 48px rgba(124,58,237,.52); }

  .btn-ghost {
    background:rgba(255,255,255,.82);
    backdrop-filter:blur(12px);
    color:#0D0D12; border:1.5px solid rgba(0,0,0,.1);
    border-radius:100px; font-weight:600;
    text-decoration:none; display:inline-block;
    transition:all .2s ease;
  }
  .btn-ghost:hover { background:#fff; border-color:rgba(124,58,237,.32); box-shadow:0 4px 16px rgba(0,0,0,.08); }

  .g-purple { background:linear-gradient(135deg,#7C3AED 0%,#A855F7 60%,#C084FC 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .g-gold   { background:linear-gradient(135deg,#92601A 0%,#D4A853 45%,#F0C878 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }

  .label-pill {
    display:inline-block; font-size:10px; font-weight:800; letter-spacing:.16em; text-transform:uppercase;
    border-radius:100px; padding:4px 12px; white-space:nowrap;
  }

  @media (prefers-color-scheme:dark) {
    .hp { background:#0C0C10; color:#F2F2F4; }
    .nav-glass { background:rgba(12,12,16,.9); border-bottom:1px solid rgba(255,255,255,.06); }
    .glass-pill { background:rgba(20,20,28,.75); border:1px solid rgba(255,255,255,.1); }
    .glass-card { background:rgba(20,20,28,.75); border:1px solid rgba(255,255,255,.08); }
    .step-card  { background:#131318; border-color:rgba(255,255,255,.07); }
    .pricing-card { background:#131318; border-color:rgba(255,255,255,.07); color:#F2F2F4; }
    .btn-ghost { background:rgba(255,255,255,.08); color:#F2F2F4; border-color:rgba(255,255,255,.12); }
    .btn-ghost:hover { background:rgba(255,255,255,.14); }
  }

  @media (max-width:600px) {
    .hero-btns { flex-direction:column; align-items:stretch; }
    .hero-btns a { text-align:center; }
  }
`;

export default function HomePage() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = 247;
    let cur = 0;
    const tick = () => { cur += Math.ceil((target - cur) / 8); setCount(cur); if (cur < target) requestAnimationFrame(tick); };
    const t = setTimeout(() => requestAnimationFrame(tick), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).style.opacity = '1';
          (e.target as HTMLElement).style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="hp">
      <style>{CSS}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="nav-glass" style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:64, padding:'0 clamp(16px,4vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#7C3AED,#6D28D9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.04em', boxShadow:'0 4px 14px rgba(124,58,237,.45)' }}>c</div>
          <span style={{ fontSize:17, fontWeight:700, letterSpacing:'-0.04em' }}>clicka.bg</span>
        </div>
        <Link href="/create" className="btn-primary" style={{ padding:'10px 24px', fontSize:13, letterSpacing:'-0.01em' }}>
          Започни сега →
        </Link>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{ minHeight:'100svh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'clamp(110px,16vh,180px) clamp(20px,4vw,60px) clamp(60px,8vh,100px)', position:'relative', overflow:'hidden', background:'#FAFAF8' }}>
        <div className="orb" style={{ width:700, height:700, background:'rgba(124,58,237,.13)', top:'-280px', left:'-180px', animation:'float1 12s ease-in-out infinite' }} />
        <div className="orb" style={{ width:500, height:500, background:'rgba(59,130,246,.09)', top:'60px', right:'-150px', animation:'float2 10s ease-in-out infinite' }} />
        <div className="orb" style={{ width:600, height:600, background:'rgba(212,168,83,.07)', bottom:'-250px', right:'15%', animation:'float3 14s ease-in-out infinite' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(124,58,237,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.05) 1px,transparent 1px)', backgroundSize:'56px 56px', maskImage:'radial-gradient(ellipse 90% 80% at center,black 30%,transparent 80%)', WebkitMaskImage:'radial-gradient(ellipse 90% 80% at center,black 30%,transparent 80%)' }} />

        <div data-reveal className="glass-pill" style={{ position:'relative', zIndex:1, marginBottom:32, display:'inline-flex', alignItems:'center', gap:10, padding:'9px 20px' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#22C55E', display:'inline-block', animation:'blink 2s infinite', boxShadow:'0 0 8px rgba(34,197,94,.6)' }} />
          <span style={{ fontSize:13, fontWeight:500, color:'#555', whiteSpace:'nowrap' }}>
            Над <strong style={{ color:'#0D0D12', fontWeight:700 }}>{count}</strong> салона вече работят с Clicka
          </span>
        </div>

        <h1 data-reveal style={{ position:'relative', zIndex:1, fontSize:'clamp(42px,7.5vw,100px)', fontWeight:800, letterSpacing:'-0.048em', lineHeight:.97, marginBottom:28, maxWidth:900, transitionDelay:'.05s' }}>
          Спри да даваш %<br />
          <span className="g-gold">на чужди платформи.</span>
        </h1>

        <p data-reveal style={{ position:'relative', zIndex:1, fontSize:'clamp(16px,1.9vw,21px)', color:'#667085', maxWidth:540, lineHeight:1.72, marginBottom:44, transitionDelay:'.12s' }}>
          Твоят собствен сайт с резервационна система — с Google Calendar sync,
          Telegram нотификации и автоматично събиране на Google ревюта за по-добра
          локална видимост. Готов за 15 минути.
        </p>

        <div data-reveal className="hero-btns" style={{ position:'relative', zIndex:1, display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', transitionDelay:'.2s' }}>
          <Link href="/create" className="btn-primary" style={{ padding:'17px 44px', fontSize:16, letterSpacing:'-0.02em' }}>Стартирай безплатно</Link>
          <a href="/demo" className="btn-ghost" style={{ padding:'17px 36px', fontSize:16 }}>Виж как изглежда →</a>
        </div>

        <p data-reveal style={{ position:'relative', zIndex:1, marginTop:22, fontSize:13, color:'#aaa', transitionDelay:'.3s' }}>
          от 0.82 € / ден · без скрити такси · без комисионна
        </p>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,#0D0F1F 0%,#120E28 100%)', padding:'20px 0', overflow:'hidden', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,#0D0F1F 0%,transparent 12%,transparent 88%,#0D0F1F 100%)', zIndex:2, pointerEvents:'none' }} />
        <div className="mq">
          {[...MARQUEE,...MARQUEE].map((item, i) => (
            <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:20, padding:'0 28px', whiteSpace:'nowrap', fontSize:13, fontWeight:500, color:'rgba(255,255,255,.52)', letterSpacing:'.01em' }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(167,139,250,.65)', display:'inline-block', flexShrink:0 }} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── MYTH BUSTER ─────────────────────────────────────── */}
      <section style={{ padding:'clamp(80px,10vw,130px) clamp(20px,4vw,60px)', background:'#F5F3FF', position:'relative', overflow:'hidden' }}>
        <div className="orb" style={{ width:500, height:500, background:'rgba(124,58,237,.1)', top:'-150px', right:'-100px', opacity:1, filter:'blur(100px)' }} />
        <div style={{ maxWidth:900, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div data-reveal style={{ marginBottom:16 }}>
            <span className="label-pill" style={{ color:'#7C3AED', background:'rgba(124,58,237,.1)' }}>За собственици на салони</span>
          </div>
          <h2 data-reveal style={{ fontSize:'clamp(28px,4.5vw,54px)', fontWeight:800, letterSpacing:'-0.038em', marginBottom:20, lineHeight:1.08 }}>
            Отдавна искаш да спреш<br />да даваш комисионна?
          </h2>
          <p data-reveal style={{ fontSize:'clamp(16px,1.8vw,20px)', color:'#667085', lineHeight:1.72, maxWidth:680, marginBottom:40 }}>
            Платформите за онлайн резервации вземат процент от всеки записан час —
            дори когато клиентът е твой от години. Ние имаме готово решение:
            твоят сайт е активен за 15 минути, без да даваш нищо на никого.
          </p>
          {[
            { em: '→ Без технически познания', rest: ' — ние изграждаме всичко за теб.' },
            { em: '→ Без скрити такси',        rest: ' — плащаш веднъж годишно, толкова.' },
            { em: '→ Без главоболия',           rest: ' — поемаме цялата поддръжка.' },
          ].map((b, i) => (
            <div key={i} data-reveal className="glass-card" style={{ fontSize:'clamp(16px,1.9vw,21px)', marginBottom:10, padding:'18px 28px', transitionDelay:`${i*0.08}s` }}>
              <strong style={{ fontWeight:700 }}>{b.em}</strong>
              <span style={{ color:'#667085' }}>{b.rest}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── VALUE STATEMENTS ────────────────────────────────── */}
      <section style={{ padding:'clamp(70px,9vw,120px) clamp(20px,4vw,60px)', background:'#FAFAF8' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          {[
            { line: 'Твоят сайт за 15 минути.',                note: null },
            { line: 'Клиентите записват директно при теб.',     note: null },
            { line: 'Нито стотинка комисионна.',                note: 'Никога. За нищо.' },
          ].map((item, i) => (
            <div key={i} data-reveal style={{ padding:'clamp(28px,4vw,52px) 0', borderBottom: i < 2 ? '1px solid rgba(0,0,0,.07)' : 'none', transitionDelay:`${i*0.1}s` }}>
              <p style={{ fontSize:'clamp(26px,5.2vw,64px)', fontWeight:800, margin:0, letterSpacing:'-0.038em', lineHeight:1.08 }}>
                {i === 2 ? <span className="g-purple">{item.line}</span> : item.line}
              </p>
              {item.note && <p style={{ fontSize:'clamp(14px,1.5vw,18px)', color:'#9CA3AF', marginTop:8 }}>{item.note}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ────────────────────────────────────────── */}
      <section style={{ padding:'clamp(80px,10vw,130px) clamp(20px,4vw,60px)', background:'linear-gradient(160deg,#0D0F1F 0%,#150D2A 42%,#0E1B28 100%)', color:'#F4F4F8', position:'relative', overflow:'hidden' }}>
        <div className="orb" style={{ width:600, height:600, background:'rgba(124,58,237,.2)', top:'-200px', left:'-100px' }} />
        <div className="orb" style={{ width:400, height:400, background:'rgba(59,130,246,.12)', bottom:'-100px', right:'-100px' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <span data-reveal className="label-pill" style={{ marginBottom:20, color:'rgba(167,139,250,.85)', background:'rgba(124,58,237,.18)', border:'1px solid rgba(124,58,237,.3)' }}>
            Само в Clicka
          </span>
          <h2 data-reveal style={{ fontSize:'clamp(30px,5.5vw,68px)', fontWeight:800, letterSpacing:'-0.042em', lineHeight:1.02, marginBottom:16 }}>
            Функции, които<br /><span style={{ color:'rgba(244,244,248,.28)' }}>правят разликата.</span>
          </h2>
          <p data-reveal style={{ fontSize:'clamp(15px,1.6vw,18px)', color:'rgba(244,244,248,.45)', maxWidth:560, lineHeight:1.72, marginBottom:60 }}>
            Не просто сайт — цялостна система, която работи вместо теб.
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:10 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} data-reveal className="benefit-card" style={{ transitionDelay:`${i*0.07}s` }}>
                <span className="label-pill" style={{ marginBottom:18, color:'rgba(167,139,250,.9)', background:'rgba(124,58,237,.16)', border:'1px solid rgba(124,58,237,.25)' }}>{b.label}</span>
                <div style={{ fontSize:28, marginBottom:14, lineHeight:1 }}>{b.icon}</div>
                <h3 style={{ fontSize:17, fontWeight:700, margin:'0 0 12px', letterSpacing:'-0.025em', lineHeight:1.3, color:'#F4F4F8' }}>{b.head}</h3>
                <p style={{ fontSize:14, color:'rgba(244,244,248,.45)', lineHeight:1.72, margin:0 }}>{b.body}</p>
              </div>
            ))}
          </div>

          {/* Google Reviews flow card */}
          <div data-reveal style={{ marginTop:10, padding:'clamp(28px,4vw,48px)', background:'rgba(212,168,83,.06)', border:'1px solid rgba(212,168,83,.2)', borderRadius:24 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:24, flexWrap:'wrap' }}>
              <div style={{ width:56, height:56, borderRadius:16, background:'rgba(212,168,83,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>⭐</div>
              <div style={{ flex:1, minWidth:240 }}>
                <span className="label-pill" style={{ marginBottom:14, color:'#D4A853', background:'rgba(212,168,83,.12)', border:'1px solid rgba(212,168,83,.25)' }}>ЛОКАЛНА ВИДИМОСТ</span>
                <h3 style={{ fontSize:'clamp(18px,2.5vw,24px)', fontWeight:800, margin:'0 0 14px', letterSpacing:'-0.03em', lineHeight:1.2 }}>
                  Повече ревюта в Google = повече клиенти от района
                </h3>
                <p style={{ fontSize:15, color:'rgba(244,244,248,.5)', lineHeight:1.75, margin:0, maxWidth:600 }}>
                  След всяка приключила услуга клиентът получава имейл или SMS с директен линк към твоя Google профил — един клик и оставя ревю.
                </p>
              </div>
            </div>
            <div style={{ marginTop:28, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:8 }}>
              {[
                { n:'1', icon:'✂️', text:'Услугата приключва' },
                { n:'2', icon:'📧', text:'Автоматичен имейл / SMS до клиента' },
                { n:'3', icon:'⭐', text:'Клиентът оставя ревю в Google' },
                { n:'4', icon:'📍', text:'Ти се появяваш по-напред в местното търсене' },
              ].map((step, i) => (
                <div key={i} style={{ padding:'18px 20px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14 }}>
                  <span style={{ display:'block', fontSize:10, fontWeight:800, color:'rgba(212,168,83,.55)', letterSpacing:'.1em', marginBottom:10 }}>СТЪПКА {step.n}</span>
                  <span style={{ fontSize:22, display:'block', marginBottom:8 }}>{step.icon}</span>
                  <p style={{ fontSize:13, color:'rgba(244,244,248,.5)', margin:0, lineHeight:1.55 }}>{step.text}</p>
                </div>
              ))}
            </div>
            <p style={{ marginTop:20, fontSize:12, color:'rgba(244,244,248,.25)', fontStyle:'italic' }}>
              * Функцията е в разработка и ще бъде включена автоматично при всички планове.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section style={{ padding:'clamp(80px,10vw,130px) clamp(20px,4vw,60px)', background:'#FAFAF8' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <span data-reveal className="label-pill" style={{ marginBottom:20, color:'#7C3AED', background:'rgba(124,58,237,.09)' }}>Как работи</span>
          <h2 data-reveal style={{ fontSize:'clamp(30px,5vw,62px)', fontWeight:800, letterSpacing:'-0.038em', lineHeight:1.05, marginBottom:60 }}>
            Три стъпки до твоя сайт.
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
            {STEPS.map((step, i) => (
              <div key={step.n} data-reveal className="step-card" style={{ transitionDelay:`${i*0.1}s` }}>
                <span style={{ display:'block', fontSize:72, fontWeight:800, color:'rgba(124,58,237,.09)', lineHeight:1, marginBottom:20, letterSpacing:'-0.05em' }}>{step.n}</span>
                <h3 style={{ fontSize:19, fontWeight:700, margin:'0 0 10px', letterSpacing:'-0.025em' }}>{step.head}</h3>
                <p style={{ fontSize:14, color:'#6B7280', lineHeight:1.68, margin:0 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section style={{ padding:'clamp(80px,10vw,130px) clamp(20px,4vw,60px)', background:'#F5F3FF', position:'relative', overflow:'hidden' }}>
        <div className="orb" style={{ width:600, height:600, background:'rgba(124,58,237,.1)', top:'-200px', right:'-150px', opacity:1, filter:'blur(100px)' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <span data-reveal className="label-pill" style={{ marginBottom:16, color:'#7C3AED', background:'rgba(124,58,237,.1)' }}>Ценови планове</span>
          <h2 data-reveal style={{ fontSize:'clamp(30px,5vw,60px)', fontWeight:800, letterSpacing:'-0.038em', marginBottom:10, lineHeight:1.08 }}>Ясно. Прозрачно.</h2>
          <p data-reveal style={{ fontSize:17, color:'#667085', marginBottom:52 }}>Без скрити такси. Плащаш веднъж за цяла година.</p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))', gap:16, marginBottom:16 }}>
            {PLANS.map((plan, i) => (
              <div key={plan.id} data-reveal className={`pricing-card${plan.tag ? ' pricing-featured' : ''}`} style={{ position:'relative', transitionDelay:`${i*0.1}s` }}>
                {plan.tag && (
                  <span style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'#D4A853', color:'#0D0D12', fontSize:10, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', padding:'5px 16px', borderRadius:100, whiteSpace:'nowrap', boxShadow:'0 4px 14px rgba(212,168,83,.4)' }}>
                    {plan.tag}
                  </span>
                )}
                <p style={{ fontSize:11, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color: plan.tag ? 'rgba(255,255,255,.5)' : '#9CA3AF', margin:'0 0 4px' }}>{plan.name}</p>
                <p style={{ fontSize:14, color: plan.tag ? 'rgba(255,255,255,.6)' : '#9CA3AF', margin:'0 0 24px' }}>{plan.desc}</p>
                <div style={{ marginBottom:28 }}>
                  <span style={{ fontSize:54, fontWeight:800, letterSpacing:'-0.04em', lineHeight:1, color: plan.tag ? '#fff' : '#0D0D12' }}>{plan.price}€</span>
                  <span style={{ fontSize:13, color: plan.tag ? 'rgba(255,255,255,.45)' : '#9CA3AF', marginLeft:5 }}> / год.</span>
                  <p style={{ fontSize:13, color: plan.tag ? 'rgba(255,255,255,.38)' : '#B0B8C8', margin:'6px 0 0' }}>по-малко от {plan.daily} € на ден</p>
                </div>
                <div style={{ borderTop:`1px solid ${plan.tag ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.07)'}`, paddingTop:22, marginBottom:28, flex:1 }}>
                  {PLAN_FEATURES.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 0', fontSize:13, color: plan.tag ? 'rgba(255,255,255,.76)' : '#555' }}>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                        <circle cx="8" cy="8" r="7.5" fill={plan.tag ? 'rgba(255,255,255,.15)' : 'rgba(124,58,237,.1)'} />
                        <path d="M5 8l2 2.5L11 5.5" stroke={plan.tag ? '#fff' : '#7C3AED'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
                <Link href={`/create?plan=${plan.id}`} style={{ display:'block', textAlign:'center', padding:'14px 24px', borderRadius:100, fontSize:14, fontWeight:700, textDecoration:'none', letterSpacing:'-0.01em', background: plan.tag ? '#fff' : 'linear-gradient(135deg,#7C3AED,#6D28D9)', color: plan.tag ? '#7C3AED' : '#fff', boxShadow: plan.tag ? '0 4px 16px rgba(0,0,0,.1)' : '0 4px 20px rgba(124,58,237,.3)', transition:'transform .2s,box-shadow .2s' }}>
                  Избери {plan.name}
                </Link>
              </div>
            ))}
          </div>

          <div data-reveal style={{ padding:'22px 30px', background:'#fff', border:'1.5px solid rgba(0,0,0,.07)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap', boxShadow:'0 2px 12px rgba(0,0,0,.04)' }}>
            <div>
              <p style={{ fontWeight:700, margin:'0 0 3px', fontSize:15, color:'#0D0D12' }}>+ SMS напомняния</p>
              <p style={{ color:'#9CA3AF', margin:0, fontSize:13 }}>Автоматични SMS до клиентите — по желание</p>
            </div>
            <span style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', flexShrink:0, color:'#0D0D12' }}>9 € / мес.</span>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{ padding:'clamp(100px,14vw,180px) clamp(20px,4vw,60px)', textAlign:'center', background:'linear-gradient(160deg,#0D0F1F 0%,#160D30 50%,#0D1520 100%)', color:'#F4F4F8', position:'relative', overflow:'hidden' }}>
        <div className="orb" style={{ width:700, height:700, background:'rgba(124,58,237,.22)', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />
        <div className="orb" style={{ width:400, height:400, background:'rgba(212,168,83,.07)', bottom:'-100px', right:'-100px', opacity:1 }} />
        <h2 data-reveal style={{ position:'relative', zIndex:1, fontSize:'clamp(40px,8vw,104px)', fontWeight:800, letterSpacing:'-0.048em', lineHeight:.95, marginBottom:44 }}>
          Готова ли си?
        </h2>
        <div data-reveal style={{ position:'relative', zIndex:1 }}>
          <Link href="/create" style={{ display:'inline-block', background:'linear-gradient(135deg,#D4A853 0%,#B8882E 100%)', color:'#0D0D12', padding:'20px 56px', borderRadius:100, fontSize:18, fontWeight:800, letterSpacing:'-0.02em', textDecoration:'none', boxShadow:'0 16px 48px rgba(212,168,83,.35)', transition:'transform .2s,box-shadow .2s' }}>
            Стартирай своя сайт →
          </Link>
          <p style={{ marginTop:18, fontSize:13, color:'rgba(244,244,248,.3)' }}>
            Готов за 15 минути · без технически познания · без комисионна
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ background:'#0D0F1F', color:'#F4F4F8', borderTop:'1px solid rgba(255,255,255,.05)', padding:'28px clamp(20px,4vw,48px)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
        <span style={{ fontSize:13, color:'rgba(244,244,248,.3)' }}>© 2025 Clicka.bg</span>
        <div style={{ display:'flex', gap:24, fontSize:13 }}>
          {[{href:'/terms',label:'Условия'},{href:'/privacy',label:'Поверителност'},{href:'mailto:hello@clicka.bg',label:'hello@clicka.bg'}].map(({ href, label }) => (
            <Link key={href} href={href} style={{ color:'rgba(244,244,248,.35)', textDecoration:'none' }}>{label}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
