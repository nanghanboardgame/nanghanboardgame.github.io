import { animate, stagger } from 'https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion) {
  animate('.site-header', {
    opacity: [0, 1],
    y: [-18, 0],
    duration: 650,
    ease: 'outExpo',
  });

  const introTargets = document.querySelectorAll([
    '.home-note',
    '.character-frame',
    '.home-copy',
    '.directory-link',
    '.story-media',
    '.story-intro .eyebrow',
    '.story-intro h1',
    '.story-intro .lead',
    '.story-intro .button',
    '.page-title > *',
    '.board-panel',
    '.card-section-heading > *',
    '.game-card',
    '.product-gallery',
    '.product-info',
  ].join(','));

  animate(introTargets, {
    opacity: [0, 1],
    y: [28, 0],
    delay: stagger(75),
    duration: 720,
    ease: 'outExpo',
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      animate(entry.target, {
        opacity: [0, 1],
        y: [36, 0],
        duration: 760,
        ease: 'outExpo',
      });
      observer.unobserve(entry.target);
    }
  }, { threshold: .14 });

  document.querySelectorAll('main > section:not(:first-child), .site-footer').forEach((section) => {
    revealObserver.observe(section);
  });

  document.querySelectorAll('.directory-link').forEach((link, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    const label = link.querySelector('strong');
    const enter = () => {
      animate(link, { x: direction * 10, scale: 1.015, duration: 280, ease: 'outExpo' });
      animate(label, { x: direction * 6, duration: 280, ease: 'outExpo' });
    };
    const leave = () => {
      animate(link, { x: 0, scale: 1, duration: 320, ease: 'outExpo' });
      animate(label, { x: 0, duration: 320, ease: 'outExpo' });
    };

    link.addEventListener('pointerenter', enter);
    link.addEventListener('pointerleave', leave);
    link.addEventListener('focus', enter);
    link.addEventListener('blur', leave);
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      animate(link, {
        x: direction * 34,
        opacity: [.95, 0],
        duration: 280,
        ease: 'inExpo',
        onComplete: () => window.location.assign(link.href),
      });
    });
  });

  const motionCards = document.querySelectorAll('.team-card, .product-thumb');
  motionCards.forEach((card) => {
    card.addEventListener('pointerenter', () => {
      animate(card, { y: -6, rotate: -1, duration: 240, ease: 'outExpo' });
    });
    card.addEventListener('pointerleave', () => {
      animate(card, { y: 0, rotate: 0, duration: 300, ease: 'outExpo' });
    });
  });

}

document.querySelectorAll('[data-card-toggle]').forEach((card) => {
  card.addEventListener('click', () => {
    const isOpen = !card.classList.contains('is-open');
    document.querySelectorAll('[data-card-toggle].is-open').forEach((otherCard) => {
      otherCard.classList.remove('is-open');
      otherCard.setAttribute('aria-expanded', 'false');
      otherCard.querySelector('[data-card-detail]')?.setAttribute('aria-hidden', 'true');
    });
    card.classList.toggle('is-open', isOpen);
    card.setAttribute('aria-expanded', String(isOpen));
    card.querySelector('[data-card-detail]')?.setAttribute('aria-hidden', String(!isOpen));
  });
});
