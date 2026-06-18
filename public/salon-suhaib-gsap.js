(function() {
  if (typeof gsap === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  const lines = document.querySelectorAll('.reveal-line');
  gsap.set(lines, { transformPerspective: 900 });
  gsap.from(lines, {
    rotateX: -55, y: 60, opacity: 0, transformOrigin: 'top center',
    duration: 1.1, ease: 'expo.out',
    stagger: 0.14, delay: 0.2
  });

  gsap.from('.service-card', {
    scrollTrigger: { trigger: '.services-grid', start: 'top 82%' },
    rotateX: -22, y: 55, opacity: 0,
    transformPerspective: 800, transformOrigin: 'top center',
    duration: 0.9, ease: 'expo.out', stagger: 0.10, clearProps: 'all'
  });

  gsap.from('.style-card:nth-child(odd)', {
    scrollTrigger: { trigger: '.styles-row', start: 'top 80%' },
    x: -50, rotateY: 12, opacity: 0,
    transformPerspective: 900, duration: 1, ease: 'expo.out',
    stagger: 0.15, clearProps: 'all'
  });
  gsap.from('.style-card:nth-child(even)', {
    scrollTrigger: { trigger: '.styles-row', start: 'top 80%' },
    x: 50, rotateY: -12, opacity: 0,
    transformPerspective: 900, duration: 1, ease: 'expo.out',
    stagger: 0.15, clearProps: 'all'
  });

  gsap.to('.about-media-frame img', {
    scrollTrigger: {
      trigger: '.section-about',
      start: 'top bottom', end: 'bottom top', scrub: 1.5
    },
    y: -60, ease: 'none'
  });

  gsap.from('.master-card', {
    scrollTrigger: { trigger: '.master-grid', start: 'top 78%' },
    y: 80, opacity: 0, rotateX: -10,
    transformPerspective: 700, duration: 1.1, ease: 'expo.out',
    stagger: 0.2, clearProps: 'all'
  });

  gsap.utils.toArray('.section-eyebrow').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      y: 20, opacity: 0, duration: 0.7, ease: 'power3.out', clearProps: 'all'
    });
  });

  gsap.from('.review-card', {
    scrollTrigger: { trigger: '.reviews-track', start: 'top 85%' },
    x: 40, rotateY: -8, opacity: 0,
    transformPerspective: 700, duration: 0.85, ease: 'expo.out',
    stagger: 0.08, clearProps: 'all'
  });

  if (matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width  - 0.5;
        const cy = (e.clientY - r.top)  / r.height - 0.5;
        gsap.to(card, {
          rotateY: cx * 12, rotateX: -cy * 8,
          transformPerspective: 700, transformOrigin: 'center center',
          duration: 0.4, ease: 'power2.out'
        });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'expo.out' });
      });
    });
  }

  if (matchMedia('(pointer: coarse)').matches) {
    document.querySelectorAll('.style-card').forEach(card => {
      card.addEventListener('click', () => card.classList.toggle('flipped'));
    });
  }
})();
