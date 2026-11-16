// Page behaviour: header, story progress, 3D scene loading, schedule tool, quote form.

// Where quote requests are sent. Set this to a form service endpoint, for example
// "https://formsubmit.co/ajax/you@yourbusiness.com" or a Formspree URL.
// While it is empty, the form opens a pre-filled text message to the business phone instead.
const FORM_ENDPOINT = '';
const BUSINESS_PHONE = '+12149317844';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const stillMode = new URLSearchParams(location.search).has('still'); // screenshots/testing: render only while scrolling
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------- Story progress ---------- */
const story = $('.story');
const steps = $$('.panel.step');
const railItems = $$('.story-rail li');
const rail = $('.story-rail');
const header = $('[data-header]');
const mobileBar = $('[data-mobile-bar]');

function storyProgress() {
  const r = story.getBoundingClientRect();
  const vh = window.innerHeight;
  const total = r.height - vh;
  return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
}

let lastActive = -1;
function updateDom() {
  const p = storyProgress();
  const t = p * 6;
  const active = Math.round(t); // 0 = hero, 1..6 = steps
  if (active !== lastActive) {
    lastActive = active;
    steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === active));
    railItems.forEach((li) => {
      const n = Number(li.dataset.rail);
      li.classList.toggle('is-active', n === active);
      li.classList.toggle('is-done', n < active);
    });
  }
  const storyBottom = story.getBoundingClientRect().bottom;
  rail.classList.toggle('is-visible', t > 0.5 && storyBottom > window.innerHeight * 0.6);
  header.classList.toggle('is-solid', window.scrollY > 40);
  mobileBar.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
}

let domQueued = false;
window.addEventListener('scroll', () => {
  if (domQueued) return;
  domQueued = true;
  requestAnimationFrame(() => { domQueued = false; updateDom(); });
}, { passive: true });
window.addEventListener('resize', updateDom);
updateDom();

/* ---------- 3D scene (loaded after first paint) ---------- */
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
  let animating = true;
  let firstFrame = true;

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const target = storyProgress() * 6;
    if (reducedMotion.matches) {
      tShown = Math.round(target); // jump between steps, no continuous camera motion
    } else {
      tShown += (target - tShown) * Math.min(1, dt * 5.5);
      if (Math.abs(target - tShown) < 0.0005) tShown = target;
    }
    const moving = Math.abs(target - tShown) > 0.0005;
    const s = api.render(tShown, now / 1000, dt);
    animating = s.animating;
    if (firstFrame) { firstFrame = false; canvas.classList.add('is-ready'); }
    if (visible && !document.hidden && (moving || (!stillMode && (animating || !reducedMotion.matches)))) {
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

/* ---------- Cleaning schedule tool ---------- */
const FREQ = {
  solid: { value: 'Every month', note: '12 times a year', share: 1 },
  high: { value: 'Every 3 months', note: 'About 4 times a year', share: 4 / 12 },
  moderate: { value: 'Every 6 months', note: 'Twice a year', share: 2 / 12 },
  low: { value: 'Once a year', note: 'Annually', share: 1 / 12 },
};
const freqValue = $('[data-freq-value]');
const freqNote = $('[data-freq-note]');
const freqBar = $('[data-freq-bar]');
function setFreq(key) {
  const f = FREQ[key];
  if (!f) return;
  freqValue.textContent = f.value;
  freqNote.textContent = f.note;
  freqBar.style.width = `${Math.max(8, f.share * 100)}%`;
}
$$('input[name="kitchen"]').forEach((r) => r.addEventListener('change', () => setFreq(r.value)));
setFreq($('input[name="kitchen"]:checked')?.value || 'high');

/* ---------- Quote form ---------- */
const form = $('#quote-form');
const statusEl = $('[data-form-status]');
const submitBtn = $('.btn-submit', form);

// Service links preselect the matching checkbox
const serviceMap = { hood: 'Kitchen hood and exhaust', lot: 'Parking lot pressure washing', cans: 'Garbage cans and dumpster pad' };
$$('[data-service]').forEach((a) => a.addEventListener('click', () => {
  const val = serviceMap[a.dataset.service];
  const box = $$('input[name="services"]', form).find((b) => b.value === val);
  if (box) box.checked = true;
}));

function setError(input, msg) {
  const err = $(`#${input.id}-err`);
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (err) err.textContent = msg || '';
}
function validate() {
  const name = form.elements.name;
  const phone = form.elements.phone;
  const email = form.elements.email;
  let firstBad = null;
  const digits = phone.value.replace(/\D/g, '');
  if (!name.value.trim()) { setError(name, 'Enter your name so we know who to ask for.'); firstBad ||= name; } else setError(name, '');
  if (digits.length < 10) { setError(phone, 'Enter a 10-digit phone number, like 214 555 0123.'); firstBad ||= phone; } else setError(phone, '');
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { setError(email, 'Check the email address, or leave it blank.'); firstBad ||= email; } else setError(email, '');
  return firstBad;
}
['name', 'phone', 'email'].forEach((n) => form.elements[n].addEventListener('blur', () => {
  if (form.elements[n].getAttribute('aria-invalid') === 'true') validate();
}));

function summary(data) {
  const services = data.getAll('services').join(', ') || 'Not specified';
  return [
    'Quote request from the K4 Provisions website',
    `Name: ${data.get('name')}`,
    data.get('business') && `Business: ${data.get('business')}`,
    `Phone: ${data.get('phone')}`,
    data.get('email') && `Email: ${data.get('email')}`,
    data.get('city') && `City: ${data.get('city')}`,
    `Services: ${services}`,
    data.get('notes') && `Notes: ${data.get('notes')}`,
  ].filter(Boolean).join('\n');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.className = 'form-status';
  statusEl.textContent = '';
  const bad = validate();
  if (bad) { bad.focus(); return; }
  const data = new FormData(form);
  if (data.get('_honey')) return;

  if (!FORM_ENDPOINT) {
    window.location.href = `sms:${BUSINESS_PHONE}?&body=${encodeURIComponent(summary(data))}`;
    statusEl.classList.add('is-success');
    statusEl.innerHTML = 'Your messaging app should open with your request filled in. Send it to reach us. If nothing opened, call or text <a href="tel:+12149317844">(214) 931-7844</a>.';
    return;
  }

  submitBtn.setAttribute('aria-busy', 'true');
  submitBtn.disabled = true;
  $('.btn-label', submitBtn).textContent = 'Sending…';
  try {
    const payload = Object.fromEntries([...data.entries()].filter(([k]) => k !== 'services' && k !== '_honey'));
    payload.services = data.getAll('services').join(', ');
    payload._subject = 'New quote request from the website';
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(String(res.status));
    form.reset();
    statusEl.classList.add('is-success');
    statusEl.textContent = 'Quote request sent. We’ll call or text you soon.';
  } catch {
    statusEl.classList.add('is-error');
    statusEl.innerHTML = 'Your request didn’t send. Check your connection and try again, or call <a href="tel:+12149317844">(214) 931-7844</a>.';
  } finally {
    submitBtn.removeAttribute('aria-busy');
    submitBtn.disabled = false;
    $('.btn-label', submitBtn).textContent = 'Request my quote';
  }
});
