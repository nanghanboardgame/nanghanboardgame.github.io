import { animate, stagger } from './assets/vendor/anime.esm.min.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroVideo = document.querySelector('.hero-video');
if (reducedMotion) heroVideo?.pause();

const heroClouds = document.querySelector('.hero-clouds');
if (heroVideo && heroClouds) {
  const syncClouds = () => {
    const { currentTime, duration } = heroVideo;
    if (!Number.isFinite(duration) || duration <= 0) return;
    const fade = duration * .17;
    heroClouds.style.opacity = Math.max(0, 1 - currentTime / fade, 1 - (duration - currentTime) / fade).toFixed(3);
  };
  heroVideo.addEventListener('loadedmetadata', syncClouds);
  heroVideo.addEventListener('timeupdate', syncClouds);
  heroVideo.addEventListener('seeked', syncClouds);
}

function initMapExplorer() {
  const map = document.querySelector('[data-interactive-map]');
  if (!map) return;

  const board = map.querySelector('.rules-map-board');
  const markerLayer = map.querySelector('.map-markers');
  const normalCells = [
    '0-6:map-note-north-normal', '0-8:map-note-north-normal', '1-5:map-note-north-normal', '1-9:map-note-north-normal',
    '2-5:map-note-north-normal', '3-9:map-note-north-normal', '4-5:map-note-north-normal', '4-9:map-note-north-normal',
    '5-2:map-note-west-normal', '5-3:map-note-west-normal', '5-4:map-note-west-normal', '5-5:map-note-west-normal',
    '6-0:map-note-west-normal', '8-0:map-note-west-normal', '9-1:map-note-west-normal', '9-2:map-note-west-normal',
    '9-3:map-note-west-normal', '9-5:map-note-west-normal', '5-9:map-note-east-normal', '5-10:map-note-east-normal',
    '5-11:map-note-east-normal', '5-13:map-note-east-normal', '6-14:map-note-east-normal', '8-14:map-note-east-normal',
    '9-9:map-note-east-normal', '9-10:map-note-east-normal', '9-12:map-note-east-normal', '9-13:map-note-east-normal',
    '10-5:map-note-south-normal', '10-9:map-note-south-normal', '11-5:map-note-south-normal', '12-5:map-note-south-normal',
    '12-9:map-note-south-normal', '13-9:map-note-south-normal', '14-6:map-note-south-normal', '14-8:map-note-south-normal',
  ];

  normalCells.forEach((cell) => {
    const [position, noteId] = cell.split(':');
    const [row, column] = position.split('-').map(Number);
    const hotspot = document.createElement('button');
    hotspot.type = 'button';
    hotspot.className = 'map-marker map-group-cell marker-normal-cell';
    hotspot.dataset.mapHotspot = '';
    hotspot.dataset.mapGroup = 'normal';
    hotspot.dataset.mapCell = position;
    hotspot.setAttribute('aria-label', 'Ô di chuyển thường');
    hotspot.setAttribute('aria-controls', noteId);
    hotspot.setAttribute('aria-expanded', 'false');
    hotspot.style.setProperty('--cell-top', `${(row * 100 / 15).toFixed(3)}%`);
    hotspot.style.setProperty('--cell-left', `${(column * 100 / 15).toFixed(3)}%`);
    hotspot.style.setProperty('--cell-x', `${(column * 100 / 14).toFixed(3)}%`);
    hotspot.style.setProperty('--cell-y', `${(row * 100 / 14).toFixed(3)}%`);
    markerLayer.append(hotspot);
  });

  const hotspots = [...map.querySelectorAll('[data-map-hotspot]')];
  let activeHotspot = null;

  const resizeHotspot = (hotspot, scale) => animate(hotspot, {
    scale: hotspot.matches('[class*="-goal"]') ? 1 : scale,
    duration: reducedMotion ? 1 : 280,
    ease: 'outExpo',
  });

  const hideNote = (hotspot) => {
    const note = document.getElementById(hotspot.getAttribute('aria-controls'));
    hotspot.classList.remove('is-active');
    hotspot.setAttribute('aria-expanded', 'false');
    if (!note) return;
    note.classList.remove('is-visible');
    animate(note, {
      opacity: 0,
      y: reducedMotion ? 0 : -6,
      duration: reducedMotion ? 1 : 140,
      ease: 'inQuad',
      onComplete: () => {
        if (!note.classList.contains('is-visible')) note.hidden = true;
      },
    });
  };

  const showNote = (hotspot) => {
    const note = document.getElementById(hotspot.getAttribute('aria-controls'));
    hotspot.classList.add('is-active');
    hotspot.setAttribute('aria-expanded', 'true');
    if (!note) return;
    note.hidden = false;
    note.classList.add('is-visible');
    animate(note, {
      opacity: [0, 1],
      y: reducedMotion ? 0 : [8, 0],
      duration: reducedMotion ? 1 : 360,
      ease: 'outExpo',
    });
  };

  const highlightGroup = (hotspot) => {
    map.querySelectorAll('.is-group-highlight').forEach((item) => item.classList.remove('is-group-highlight'));
    const group = hotspot?.dataset.mapGroup || hotspot?.dataset.mapGroupCell;
    if (!group) return;
    map.querySelectorAll(`[data-map-group="${group}"], [data-map-group-cell="${group}"]`).forEach((item) => item.classList.add('is-group-highlight'));
  };

  const preview = (hotspot) => {
    hotspots.forEach((item) => {
      item.classList.toggle('is-preview', item === hotspot);
      if (item !== hotspot && item.classList.contains('is-active')) hideNote(item);
    });
    highlightGroup(hotspot);
    showNote(hotspot);
    board.classList.add('is-exploring');
    resizeHotspot(hotspot, 1.26);
  };

  const restorePreview = (hotspot) => {
    hotspot.classList.remove('is-preview');
    if (hotspot !== activeHotspot) {
      hideNote(hotspot);
      resizeHotspot(hotspot, 1);
    }
    if (activeHotspot) {
      highlightGroup(activeHotspot);
      showNote(activeHotspot);
      board.classList.add('is-exploring');
      resizeHotspot(activeHotspot, 1.14);
      return;
    }
    highlightGroup(null);
    board.classList.remove('is-exploring');
  };

  const clearMapSelection = () => {
    if (!activeHotspot) return null;
    const hotspot = activeHotspot;
    hideNote(hotspot);
    activeHotspot = null;
    restorePreview(hotspot);
    return hotspot;
  };

  const selectHotspot = (hotspot) => {
    const isClosing = activeHotspot === hotspot;
    if (activeHotspot) {
      hideNote(activeHotspot);
      resizeHotspot(activeHotspot, 1);
    }
    activeHotspot = isClosing ? null : hotspot;

    if (activeHotspot) {
      showNote(activeHotspot);
      preview(activeHotspot);
      return;
    }

    restorePreview(hotspot);
  };

  hotspots.forEach((hotspot) => {
    hotspot.addEventListener('pointerenter', () => preview(hotspot));
    hotspot.addEventListener('pointerleave', () => restorePreview(hotspot));
    hotspot.addEventListener('focus', () => preview(hotspot));
    hotspot.addEventListener('blur', () => restorePreview(hotspot));
    hotspot.addEventListener('click', () => selectHotspot(hotspot));
  });

  map.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !activeHotspot) return;
    const hotspot = clearMapSelection();
    hotspot.focus();
  });

  document.addEventListener('click', (event) => {
    if (!activeHotspot || event.target.closest('[data-map-hotspot]')) return;
    clearMapSelection();
  });
}

initMapExplorer();

function initStorySceneMotion() {
  if (reducedMotion || !document.querySelector('.story-product-scene')) return;

  animate('.story-scene-piece-male', { y: [0, -7, 0], rotate: [0, -1.2, 0], duration: 3600, loop: true, ease: 'inOutSine' });
  animate('.story-scene-piece-female', { y: [0, -6, 0], rotate: [0, 1, 0], duration: 3900, loop: true, ease: 'inOutSine' });
  animate('.story-scene-die', { y: [0, -10, 0], rotate: [-4, 5, -4], delay: stagger(450), duration: 3200, loop: true, ease: 'inOutSine' });
}

initStorySceneMotion();

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

const cardReader = document.querySelector('[data-card-reader]');
const cardReaderImage = cardReader?.querySelector('[data-card-reader-image]');
const cardReaderTitle = cardReader?.querySelector('[data-card-reader-title]');
const cardReaderEffect = cardReader?.querySelector('[data-card-reader-effect]');
const cardReaderDescription = cardReader?.querySelector('[data-card-reader-description]');
const cardReaderClose = cardReader?.querySelector('[data-card-reader-close]');

document.querySelectorAll('[data-card-toggle]').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('[data-card-toggle].is-open').forEach((otherCard) => {
      otherCard.classList.remove('is-open');
      otherCard.setAttribute('aria-expanded', 'false');
    });
    if (!cardReader) return;

    const cardImage = card.querySelector('img');
    cardReaderImage.src = cardImage.currentSrc || cardImage.src;
    cardReaderImage.alt = cardImage.alt;
    cardReaderTitle.textContent = card.dataset.cardTitle;
    cardReaderEffect.textContent = card.dataset.cardEffect;
    cardReaderDescription.textContent = card.dataset.cardDescription;
    card.classList.add('is-open');
    card.setAttribute('aria-expanded', 'true');
    cardReader.showModal();
  });
});

cardReaderClose?.addEventListener('click', () => cardReader.close());
cardReader?.addEventListener('click', (event) => {
  if (event.target === cardReader) cardReader.close();
});
cardReader?.addEventListener('close', () => {
  document.querySelectorAll('[data-card-toggle].is-open').forEach((card) => {
    card.classList.remove('is-open');
    card.setAttribute('aria-expanded', 'false');
  });
});
