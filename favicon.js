const favicon = document.querySelector('link[rel="icon"]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (favicon && !reducedMotion) {
  const frames = ['assets/favicon-open.png', 'assets/favicon-closed.png'];
  const delays = [1800, 350];
  let frame = 0;

  const swapFrame = () => {
    frame = (frame + 1) % frames.length;
    favicon.href = frames[frame];
    window.setTimeout(swapFrame, delays[frame]);
  };

  window.setTimeout(swapFrame, delays[frame]);
}
