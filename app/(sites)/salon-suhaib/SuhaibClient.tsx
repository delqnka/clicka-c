'use client';

import { useRef, useCallback } from 'react';
import Script from 'next/script';
import { BookingWidget } from '@/components/booking/BookingWidget';
import type { BookingWidgetHandle } from '@/components/booking/types';

type Props = {
  slug: string;
  salon: Record<string, unknown>;
};

export function SuhaibClient({ slug, salon }: Props) {
  const bookingRef = useRef<BookingWidgetHandle>(null);
  const open = useCallback(() => bookingRef.current?.open(), []);

  return (
    <>
      <a href="#main" className="skip-link">Прескочи към съдържанието</a>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="site-header" id="siteHeader">
        <div className="container header-inner">
          <a href="#home" className="logo" aria-label="Салон Сухайб начало">
            <span className="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 4 L18 16 L6 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="22" cy="16" r="2.5" fill="currentColor"/>
              </svg>
            </span>
            <span className="logo-text">Салон <em>Сухайб</em></span>
          </a>

          <nav className="primary-nav" aria-label="Основна навигация">
            <ul>
              <li><a href="#home">Начало</a></li>
              <li><a href="#about">За нас</a></li>
              <li><a href="#services">Услуги</a></li>
              <li><a href="#gallery">Галерия</a></li>
              <li><a href="#reviews">Отзиви</a></li>
              <li><a href="#contact">Контакти</a></li>
            </ul>
          </nav>

          <button onClick={open} className="btn btn-primary btn-cta">
            <span>Резервирай</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="menu-toggle" id="menuToggle" aria-label="Отвори меню" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ────────────────────────────────────────── */}
      <div className="mobile-drawer" id="mobileDrawer" aria-hidden="true">
        <div className="drawer-panel">
          <div className="drawer-top">
            <a href="#home" className="logo" aria-label="Начало">
              <span className="logo-text">Салон <em>Сухайб</em></span>
            </a>
            <button className="drawer-close" id="drawerClose" aria-label="Затвори меню">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <nav aria-label="Мобилна навигация">
            <ul>
              <li><a href="#home">Начало</a></li>
              <li><a href="#about">За нас</a></li>
              <li><a href="#services">Услуги</a></li>
              <li><a href="#gallery">Галерия</a></li>
              <li><a href="#reviews">Отзиви</a></li>
              <li><a href="#contact">Контакти</a></li>
            </ul>
          </nav>

          <button className="drawer-cta" onClick={open}>Резервирай онлайн</button>

          <div className="drawer-foot">
            <a href="tel:+359876140020">087 614 0020</a>
            <span>ул. „Цар Симеон" 73, София</span>
          </div>
        </div>
      </div>

      <main id="main">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="hero" id="home">
          <div className="hero-bg" aria-hidden="true">
            <img src="/soh1.webp" alt="" />
            <div className="hero-overlay"></div>
          </div>

          <div className="container hero-inner">
            <div className="hero-eyebrow reveal">
              <span className="dot" aria-hidden="true"></span>
              <span>Премиум бръснарски салон · София център</span>
            </div>

            <h1 className="hero-title">
              <span className="reveal-line"><span>Изкуството</span></span>
              <span className="reveal-line"><span>на детайла</span></span>
              <span className="reveal-line"><em>в ръцете на майстор</em></span>
            </h1>

            <p className="hero-sub reveal">
              От 2015 година Сухайб създава прически и оформя брада с прецизност, която клиентите наричат „моят втори дом". 242 петзвездни отзива в Google говорят сами.
            </p>

            <div className="hero-cta reveal">
              <button onClick={open} className="btn btn-primary btn-lg">
                <span>Резервирай час</span>
              </button>
              <a href="#services" className="btn btn-ghost btn-outline-anim">
                Виж услугите
              </a>
            </div>

            <div className="hero-meta reveal">
              <div className="meta-item">
                <span className="meta-num">4,9<small>/5</small></span>
                <span className="meta-label">Google рейтинг</span>
              </div>
              <div className="meta-sep" aria-hidden="true"></div>
              <div className="meta-item">
                <span className="meta-num">242<small>+</small></span>
                <span className="meta-label">Отзива от клиенти</span>
              </div>
              <div className="meta-sep" aria-hidden="true"></div>
              <div className="meta-item">
                <span className="meta-num">10<small>г.</small></span>
                <span className="meta-label">Опит и доверие</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── About ─────────────────────────────────────────────── */}
        <section className="section section-about" id="about">
          <div className="container about-grid">
            <div className="about-media reveal-left">
              <div className="about-media-frame">
                <img src="/soh2.webp" alt="Майстор Сухайб в салона" loading="lazy"/>
              </div>
              <div className="about-badge">
                <span className="badge-num">2015</span>
                <span className="badge-text">Година на основаване</span>
              </div>
            </div>

            <div className="about-content">
              <span className="section-eyebrow reveal">За салона</span>
              <h2 className="section-title reveal">Място, където стилът среща майсторството</h2>
              <p className="reveal">
                Салон Сухайб е създаден с една идея. Клиентът да си тръгва уверен, че е получил най‑доброто. Сухайб (St) живя и работи в Ню Йорк, преди да отвори собствен салон в София, и носи със себе си усещане за прецизност, което се вижда във всяка прическа.
              </p>
              <p className="reveal">
                Работим с мъже и жени. Класически кройки, модерни фейдове, mullet, корейски стайл, оформяне на брада и вежди. Всеки клиент получава индивидуална консултация, а резултатът се пасва на формата на лицето и на ежедневието.
              </p>

              <ul className="about-points">
                <li className="reveal">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Авторски подход и внимание към детайла
                </li>
                <li className="reveal">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Английски език, международен опит
                </li>
                <li className="reveal">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Спокойна атмосфера в центъра на София
                </li>
              </ul>

              <div className="about-cta reveal">
                <button onClick={open} className="btn btn-primary">Запази своя час</button>
                <a href="tel:+359876140020" className="phone-link">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 4h4l2 5l-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  </svg>
                  087 614 0020
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Services ──────────────────────────────────────────── */}
        <section className="section section-services" id="services">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow reveal">Услуги и цени</span>
              <h2 className="section-title reveal">Услуги, които правят разлика</h2>
              <p className="section-lead reveal">Всяка услуга включва консултация, измиване и финален стайлинг. Ориентировъчните цени са в евро.</p>
            </div>

            <div className="services-grid">
              {[
                {
                  icon: <svg viewBox="0 0 32 32" fill="none"><path d="M6 6l10 10M6 26l10-10M16 16l10 10M16 16l10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
                  name: 'Мъжка прическа',
                  desc: 'Класически или модерен фейд, текстурирана кройка, индивидуален стайлинг по форма на лицето.',
                  price: 'от 18 €',
                },
                {
                  icon: <svg viewBox="0 0 32 32" fill="none"><path d="M8 22c0-5 4-10 8-10s8 5 8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="16" cy="9" r="3" stroke="currentColor" strokeWidth="2"/></svg>,
                  name: 'Оформяне на брада',
                  desc: 'Горещ компрес, прецизна линия с бръснач, подхранващи масла за здрава и подредена брада.',
                  price: 'от 10 €',
                },
                {
                  icon: <svg viewBox="0 0 32 32" fill="none"><path d="M4 16c4-6 10-10 14-10s10 4 10 10-6 10-10 10S8 22 4 16z" stroke="currentColor" strokeWidth="2"/><path d="M4 16h24" stroke="currentColor" strokeWidth="2"/></svg>,
                  name: 'Дамска прическа',
                  desc: 'Авторски кройки, форма, която отваря лицето, и стайлинг, който държи извън салона.',
                  price: 'от 26 €',
                },
                {
                  icon: <svg viewBox="0 0 32 32" fill="none"><path d="M4 24l8-16 4 8 4-6 8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  name: 'Корейски стил & mullet',
                  desc: 'Трендови прически с мек преход и текстура. Сухайб е специалист в smooth mullet и K‑style.',
                  price: 'от 23 €',
                },
                {
                  icon: <svg viewBox="0 0 32 32" fill="none"><path d="M5 10h22M5 16h22M5 22h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
                  name: 'Оформяне на вежди',
                  desc: 'Прецизна форма, която изважда чертите. Подходящо като допълнение към прическата.',
                  price: 'от 6 €',
                },
                {
                  icon: <svg viewBox="0 0 32 32" fill="none"><circle cx="11" cy="21" r="5" stroke="currentColor" strokeWidth="2"/><circle cx="21" cy="21" r="5" stroke="currentColor" strokeWidth="2"/><path d="M14.5 18l4-13M17.5 18l4-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
                  name: 'Подстригване с бръснач',
                  desc: 'Тръпката на класическия barber experience. Гореща кърпа, бръснач, кожа която диша.',
                  price: 'от 15 €',
                },
              ].map((svc) => (
                <article key={svc.name} className="service-card reveal">
                  <div className="service-icon" aria-hidden="true">{svc.icon}</div>
                  <h3>{svc.name}</h3>
                  <p>{svc.desc}</p>
                  <div className="service-foot">
                    <span className="service-price">{svc.price}</span>
                    <button onClick={open} className="service-book">Резервирай</button>
                  </div>
                </article>
              ))}
            </div>

            <div className="services-note reveal">
              Цените са ориентировъчни в евро и може да варират според дължината на косата и сложността. За точна оферта се свържете с нас.
            </div>
          </div>
        </section>

        {/* ── Master ────────────────────────────────────────────── */}
        <section className="section section-master" id="master">
          <div className="container master-grid">
            <div className="master-content">
              <span className="section-eyebrow reveal">Майсторът</span>
              <h2 className="section-title reveal">Сухайб <em>St.</em></h2>
              <p className="reveal">
                Сухайб е лицето и душата на салона. Стилист с над 10 години опит и международна биография, който превръща всяка визита в личен ритуал. Клиентите казват, че неговите ръце познават косата им по‑добре от тях самите.
              </p>
              <blockquote className="reveal">
                „Перфекционист във всяко отношение. Истински професионалист, който ще те изслуша и ще предложи най‑добрия стил за теб."
                <cite>Цветелин · Google</cite>
              </blockquote>
              <div className="master-tags reveal">
                <span>Mullet</span><span>K‑Style</span><span>Fade</span><span>Beard work</span><span>Color</span>
              </div>
            </div>

            <div className="master-media reveal-right">
              <div className="master-card master-card-a">
                <img src="/soh3.webp" alt="Резултат от салона" loading="lazy"/>
              </div>
              <div className="master-card master-card-b">
                <img src="/soh4.webp" alt="Работа на майстор Сухайб" loading="lazy"/>
              </div>
            </div>
          </div>
        </section>

        {/* ── Gallery ───────────────────────────────────────────── */}
        <section className="section section-gallery" id="gallery">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow reveal">Галерия</span>
              <h2 className="section-title reveal">Резултати, които говорят</h2>
              <p className="section-lead reveal">Подбрани кадри от ежедневието и работата на салона.</p>
            </div>

            <div className="gallery-slider-wrap reveal">
              <div className="gallery-slider" id="gallerySlider" aria-label="Галерия от снимки">
                <div className="gs-track" id="gsTrack">
                  {[
                    { src: '/soh1.webp', alt: 'Кадър от салон Сухайб' },
                    { src: '/soh2.webp', alt: 'Стайлинг в салона' },
                    { src: '/soh3.webp', alt: 'Финална прическа' },
                    { src: '/soh4.webp', alt: 'Атмосфера в салона' },
                    { src: '/soh5.webp', alt: 'Авторски стил' },
                    { src: '/soh6.webp', alt: 'Работен момент' },
                    { src: '/soh7.jpg',  alt: 'Завършен look' },
                    { src: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80', alt: 'Мъжка прическа' },
                  ].map((img) => (
                    <div key={img.src} className="gs-slide">
                      <img src={img.src} alt={img.alt} loading="lazy"/>
                      <div className="gs-overlay" aria-hidden="true"></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="gs-ui">
                <button className="gs-arrow gs-arrow-prev" id="gsPrev" aria-label="Предишна снимка">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <div className="gs-dots" id="gsDots" role="tablist" aria-label="Избери снимка"></div>
                <button className="gs-arrow gs-arrow-next" id="gsNext" aria-label="Следваща снимка">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Styles ────────────────────────────────────────────── */}
        <section className="section section-styles">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow reveal">Стилове</span>
              <h2 className="section-title reveal">Намерете своя look</h2>
              <p className="section-lead reveal">Няколко посоки, от които може да тръгнем по време на консултацията.</p>
            </div>

            <div className="styles-row">
              {[
                { img: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&q=80', alt: 'Класически fade', name: 'Classic Fade', desc: 'Чист преход, кратки страни, форма която работи и в офиса, и навън. Вечна класика.' },
                { img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&q=80', alt: 'Текстуриран кроп', name: 'Textured Crop', desc: 'Текстура и движение в горната част, подчертана линия отпред. Модерен и лесен за поддръжка.' },
                { img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=80', alt: 'Smooth mullet', name: 'Smooth Mullet', desc: 'Модерна интерпретация на mullet с мек преход и удължен тил. Специалитет на Сухайб.' },
                { img: 'https://images.unsplash.com/photo-1635273051937-e83b08fc9e63?w=900&q=80', alt: 'Korean style', name: 'Korean Style', desc: 'Леки вълни, обем отгоре, нежна асиметрия. Тренд, който стои изключително чисто.' },
              ].map((style) => (
                <article key={style.name} className="style-card">
                  <div className="style-card-inner">
                    <div className="style-card-front">
                      <div className="style-img">
                        <img src={style.img} alt={style.alt} loading="lazy"/>
                      </div>
                      <div className="style-info">
                        <h3>{style.name}</h3>
                        <p className="style-hint">Задръж за детайли</p>
                      </div>
                    </div>
                    <div className="style-card-back">
                      <h3>{style.name}</h3>
                      <p>{style.desc}</p>
                      <button onClick={open} className="btn btn-primary">Запази час</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Reviews ───────────────────────────────────────────── */}
        <section className="section section-reviews" id="reviews">
          <div className="container">
            <div className="reviews-head">
              <div>
                <span className="section-eyebrow reveal">Отзиви от клиенти</span>
                <h2 className="section-title reveal">242 петзвездни отзива в Google</h2>
              </div>
              <div className="rating-card reveal">
                <div className="rating-stars" aria-hidden="true">★ ★ ★ ★ ★</div>
                <div className="rating-num">4,9 <span>/ 5</span></div>
                <a href="https://www.google.com/search?q=Салон+Сухайб+София" target="_blank" rel="noopener">Виж всички отзиви</a>
              </div>
            </div>

            <div className="reviews-track-wrap">
              <div className="reviews-track" id="reviewsTrack">
                {[
                  { name: 'Димитър Ангелов', when: 'преди 2 години', text: '„Моят втори дом. Тук се успокоявам, всичко винаги е на ниво и съм адски доволен."' },
                  { name: 'P. V.', when: 'преди 3 години', text: '„Перфекционист във всяко отношение. Най‑добрият фризьор, при когото жена може да се довери на опитните му ръце."' },
                  { name: 'Милена Гайдова', when: 'преди година', text: '„Прическа на тийнейджър момче, 100 точки. Истински професионалист, ще се връщаме всеки път с огромно удоволствие."' },
                  { name: 'Valentina Aloisio', when: 'преди 2 години', text: '„Sohay speaks English very well since he lived in NYC before. Very good to do smooth mullet or Korean style."' },
                  { name: 'Цветелин Антов', when: 'преди 3 години', text: '„Очарован съм от вниманието и мнението. Фризьорът ме слушаше внимателно и предложи най‑добрия стил за моята визия."' },
                  { name: 'Елена', when: 'преди година', text: '„Намерих своя фризьор. Много мил, с поглед към детайла и качество, което усещаш още с първото посещение."' },
                ].map((r) => (
                  <article key={r.name} className="review-card">
                    <div className="review-stars" aria-hidden="true">★★★★★</div>
                    <p>{r.text}</p>
                    <footer><strong>{r.name}</strong><span>{r.when}</span></footer>
                  </article>
                ))}
              </div>

              <div className="reviews-controls">
                <button className="rev-btn" id="revPrev" aria-label="Предишен отзив">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button className="rev-btn" id="revNext" aria-label="Следващ отзив">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Booking section — BookingWidget replaces static form ─ */}
        <section className="section section-book" id="book">
          <div className="container book-grid">
            <div className="book-side">
              <span className="section-eyebrow reveal">Резервация</span>
              <h2 className="section-title reveal">Запази своя час онлайн</h2>
              <p className="reveal">Изберете услуга, дата и удобен час. Потвърждението идва веднага след резервацията.</p>

              <ul className="book-info">
                <li className="reveal">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/></svg>
                  Понеделник до неделя · 10:00 до 20:00
                </li>
                <li className="reveal">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg>
                  ул. „Цар Симеон" 73, 1202 София
                </li>
                <li className="reveal">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                  087 614 0020
                </li>
              </ul>
            </div>

            {/* Real booking widget — no iframe, no redirect */}
            <div className="book-form reveal" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
              <button
                onClick={open}
                className="btn btn-primary btn-lg btn-block"
                style={{ width: '100%' }}
              >
                <span>Запази час онлайн</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10m0 0L9 4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted, #888)', margin: 0 }}>
                Изберете услуга и удобен час. Потвърждение веднага.
              </p>
            </div>
          </div>
        </section>

        {/* ── Contact ───────────────────────────────────────────── */}
        <section className="section section-contact" id="contact">
          <div className="container contact-grid">
            <div className="contact-info">
              <span className="section-eyebrow reveal">Контакти</span>
              <h2 className="section-title reveal">Намерете ни в сърцето на София</h2>

              <div className="contact-block reveal">
                <h4>Адрес</h4>
                <p>ул. „Цар Симеон" 73<br/>1202 София център</p>
              </div>
              <div className="contact-block reveal">
                <h4>Телефон</h4>
                <p><a href="tel:+359876140020">087 614 0020</a></p>
              </div>
              <div className="contact-block reveal">
                <h4>Работно време</h4>
                <p>Понеделник до събота · 10:00 до 20:00<br/>Неделя · 10:00 до 20:00</p>
              </div>

              <div className="socials reveal">
                <a href="https://www.facebook.com/" target="_blank" rel="noopener" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 22v-8h3l1-4h-4V7.5C13 6.5 13.5 6 14.7 6H17V2.3C16.5 2.2 15 2 13.7 2C10.8 2 9 3.8 9 7v3H6v4h3v8h4z"/></svg>
                </a>
                <a href="https://www.instagram.com/" target="_blank" rel="noopener" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
                </a>
                <a href="https://www.google.com/maps" target="_blank" rel="noopener" aria-label="Google Maps">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
                </a>
              </div>
            </div>

            <div className="contact-map reveal">
              <iframe
                title="Карта на Салон Сухайб"
                src="https://maps.google.com/maps?q=%D1%83%D0%BB.%20%D0%A6%D0%B0%D1%80%20%D0%A1%D0%B8%D0%BC%D0%B5%D0%BE%D0%BD%2073%2C%20%D0%A1%D0%BE%D1%84%D0%B8%D1%8F&t=&z=16&ie=UTF8&iwloc=&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="foot-brand">
            <a href="#home" className="logo logo-foot">
              <span className="logo-mark" aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="none"><path d="M6 4 L18 16 L6 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="22" cy="16" r="2.5" fill="currentColor"/></svg>
              </span>
              <span className="logo-text">Салон <em>Сухайб</em></span>
            </a>
            <p>Премиум бръснарски салон в центъра на София. Прецизност, стил и доверие от 2015 година.</p>
          </div>

          <div className="foot-col">
            <h5>Навигация</h5>
            <ul>
              <li><a href="#about">За нас</a></li>
              <li><a href="#services">Услуги</a></li>
              <li><a href="#gallery">Галерия</a></li>
              <li><a href="#reviews">Отзиви</a></li>
            </ul>
          </div>

          <div className="foot-col">
            <h5>Контакти</h5>
            <ul>
              <li><a href="tel:+359876140020">087 614 0020</a></li>
              <li>ул. „Цар Симеон" 73, София</li>
              <li>Всеки ден · 10:00 до 20:00</li>
            </ul>
          </div>

          <div className="foot-col">
            <h5>Резервация</h5>
            <ul>
              <li><button onClick={open} className="foot-book-link">Запази онлайн</button></li>
            </ul>
          </div>
        </div>

        <div className="foot-bottom">
          <div className="container">
            <span>© {new Date().getFullYear()} Салон Сухайб. Всички права запазени.</span>
            <span className="foot-cred">Дизайн с внимание към детайла</span>
          </div>
        </div>
      </footer>

      {/* ── Floating call button ─────────────────────────────────── */}
      <a href="tel:+359876140020" className="floating-call" aria-label="Обади се на 087 614 0020">
        <span className="fc-ring" aria-hidden="true"></span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
        <span className="fc-label">087 614 0020</span>
      </a>

      <button className="to-top" id="toTop" aria-label="Към началото" hidden>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {/* ── BookingWidget — the real booking engine ──────────────── */}
      <BookingWidget ref={bookingRef} slug={slug} salon={salon} />

      {/* ── Scripts — same order as original HTML ────────────────── */}
      <Script src="/salon-suhaib.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" strategy="afterInteractive" />
      <Script src="/salon-suhaib-gsap.js" strategy="afterInteractive" />

      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400;1,500;1,700&display=swap"
        rel="stylesheet"
      />
    </>
  );
}
