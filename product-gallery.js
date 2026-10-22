const mainImage = document.querySelector('[data-product-main]');
const thumbnails = [...document.querySelectorAll('.product-thumb')];
const slider = document.querySelector('[data-product-slider]');

if (mainImage && thumbnails.length && slider) {
  const frame = slider.querySelector('[data-product-slide-frame]');
  const firstSlide = frame.querySelector('.description-slide');
  const counter = slider.querySelector('[data-slide-count]');
  const slides = thumbnails.map((button, index) => {
    const image = button.querySelector('img');
    if (index === 0) return firstSlide;
    const slide = document.createElement('img');
    slide.className = 'description-slide';
    slide.src = image.src;
    slide.alt = image.alt;
    slide.loading = 'lazy';
    slide.setAttribute('aria-hidden', 'true');
    frame.append(slide);
    return slide;
  });

  thumbnails.forEach((button, index) => button.addEventListener('click', () => {
    const image = button.querySelector('img');
    mainImage.src = image.src;
    mainImage.alt = image.alt;
    thumbnails.forEach((thumb, thumbIndex) => thumb.setAttribute('aria-pressed', String(thumbIndex === index)));
  }));

  let current = 0;
  const show = (next) => {
    slides[current].classList.remove('is-active');
    slides[current].setAttribute('aria-hidden', 'true');
    current = (next + slides.length) % slides.length;
    slides[current].classList.add('is-active');
    slides[current].removeAttribute('aria-hidden');
    counter.textContent = `${current + 1} / ${slides.length}`;
  };

  let timer;
  let paused = false;
  const toggle = slider.querySelector('[data-slide-toggle]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const stop = () => clearInterval(timer);
  const start = (force = false) => {
    stop();
    if (!paused && !document.hidden && !reducedMotion.matches && (force || !slider.matches(':hover, :focus-within'))) {
      timer = setInterval(() => show(current + 1), 5500);
    }
  };

  slider.querySelector('[data-slide-prev]').addEventListener('click', () => { show(current - 1); start(); });
  slider.querySelector('[data-slide-next]').addEventListener('click', () => { show(current + 1); start(); });
  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.textContent = paused ? 'Tiếp tục' : 'Tạm dừng';
    if (paused) stop(); else start(true);
  });
  slider.addEventListener('pointerenter', stop);
  slider.addEventListener('pointerleave', () => start());
  slider.addEventListener('focusin', stop);
  slider.addEventListener('focusout', () => start());
  document.addEventListener('visibilitychange', () => start());
  reducedMotion.addEventListener('change', () => start());
  start();
}
