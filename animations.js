import { animate, stagger } from './assets/vendor/anime.esm.min.js';

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
    '.story-hero h1',
    '.story-hero-art',
    '.story-hero .story-cta',
    '.rules-title > *',
    '.rules-map',
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

  const animatedButtons = document.querySelectorAll('[data-animated-button]');
  animate(animatedButtons, {
    opacity: [0, 1],
    y: [14, 0],
    scale: [.94, 1],
    delay: stagger(90),
    duration: 520,
    ease: 'outExpo',
  });

  animatedButtons.forEach((button) => {
    const enter = () => animate(button, { y: -4, scale: 1.025, duration: 220, ease: 'outExpo' });
    const leave = () => animate(button, { y: 0, scale: 1, duration: 260, ease: 'outExpo' });
    button.addEventListener('pointerenter', enter);
    button.addEventListener('pointerleave', leave);
    button.addEventListener('focus', enter);
    button.addEventListener('blur', leave);
    button.addEventListener('pointerdown', () => animate(button, { scale: .97, duration: 100 }));
    button.addEventListener('pointerup', enter);
  });

  document.querySelectorAll('.directory-link').forEach((link, index) => {
    const direction = index % 2 === 0 ? -1 : 1;
    const text = link.querySelectorAll('small, strong');
    const enter = () => {
      animate(text, {
        x: direction * 8,
        delay: stagger(35),
        duration: 300,
        ease: 'outExpo',
      });
    };
    const leave = () => {
      animate(text, {
        x: 0,
        delay: stagger(25),
        duration: 340,
        ease: 'outExpo',
      });
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
