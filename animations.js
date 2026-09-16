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
    '.board-layout > *',
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

  document.querySelectorAll('.directory-link').forEach((link) => {
    const arrow = link.querySelector('strong span');
    const enter = () => {
      animate(link, { x: 10, scale: 1.015, duration: 280, ease: 'outExpo' });
      animate(arrow, { x: 6, y: -6, rotate: -5, duration: 280, ease: 'outExpo' });
    };
    const leave = () => {
      animate(link, { x: 0, scale: 1, duration: 320, ease: 'outExpo' });
      animate(arrow, { x: 0, y: 0, rotate: 0, duration: 320, ease: 'outExpo' });
    };

    link.addEventListener('pointerenter', enter);
    link.addEventListener('pointerleave', leave);
    link.addEventListener('focus', enter);
    link.addEventListener('blur', leave);
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      animate(link, {
        x: 34,
        opacity: [.95, 0],
        duration: 280,
        ease: 'inExpo',
        onComplete: () => window.location.assign(link.href),
      });
    });
  });

  const motionCards = document.querySelectorAll('.game-card, .rule-control, .product-thumb');
  motionCards.forEach((card) => {
    card.addEventListener('pointerenter', () => {
      animate(card, { y: -6, rotate: -1, duration: 240, ease: 'outExpo' });
    });
    card.addEventListener('pointerleave', () => {
      animate(card, { y: 0, rotate: 0, duration: 300, ease: 'outExpo' });
    });
  });

  const boardCells = document.querySelectorAll('.board span');
  if (boardCells.length) {
    animate(boardCells, {
      opacity: [0, 1],
      scale: [0, 1],
      delay: stagger(18, { from: 'center' }),
      duration: 420,
      ease: 'outBack',
    });
  }
}
