// Home page only: the pinned 3D hood cleaning story.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const stillMode = new URLSearchParams(location.search).has('still'); // screenshots/testing: render only while scrolling
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const story = $('.story');
const steps = $$('.panel.step');
const railItems = $$('.story-rail li');
const rail = $('.story-rail');

function storyProgress() {
  const r = story.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
}

let lastActive = -1;
function updateDom() {
  const t = storyProgress() * 6;
  const active = Math.round(t);
  if (active !== lastActive) {
    lastActive = active;
    steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === active));
    railItems.forEach((li) => {
      const n = Number(li.dataset.rail);
      li.classList.toggle('is-active', n === active);
      li.classList.toggle('is-done', n < active);
    });
  }
  rail.classList.toggle('is-visible', t > 0.5 && story.getBoundingClientRect().bottom > window.innerHeight * 0.6);
}
let queued = false;
window.addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; updateDom(); });
}, { passive: true });
window.addEventListener('resize', updateDom);
updateDom();

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

async function startScene() {
  const canvas = $('#hood-canvas');
  if (!webglAvailable()) { story.classList.add('no-webgl'); return; }

  const lowPower = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 700 || navigator.connection?.saveData === true;
  let api;
  try {
    const mod = await import('./hood-scene.js');
    api = mod.createHoodScene(canvas, { lowPower, reducedMotion: reducedMotion.matches });
  } catch (err) {
    console.warn('3D scene unavailable', err);
    story.classList.add('no-webgl');
    return;
  }

  const stage = $('.story-stage');
  const sizeTo = () => api.resize(stage.clientWidth, stage.clientHeight);
  sizeTo();
  new ResizeObserver(sizeTo).observe(stage);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe(stage);

  let tShown = storyProgress() * 6;
  let last = performance.now();
  let running = false;
  let firstFrame = true;

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const target = storyProgress() * 6;
    if (reducedMotion.matches) {
      tShown = Math.round(target);
    } else {
      tShown += (target - tShown) * Math.min(1, dt * 5.5);
      if (Math.abs(target - tShown) < 0.0005) tShown = target;
    }
    const moving = Math.abs(target - tShown) > 0.0005;
    const s = api.render(tShown, now / 1000, dt);
    if (firstFrame) { firstFrame = false; canvas.classList.add('is-ready'); }
    if (visible && !document.hidden && (moving || (!stillMode && (s.animating || !reducedMotion.matches)))) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }
  function kick() {
    if (running || !visible) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  window.addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', kick);
  kick();
}

const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
if (document.readyState === 'complete') idle(startScene);
else window.addEventListener('load', () => idle(startScene));
