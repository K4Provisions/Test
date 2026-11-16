// Shared behaviour for every page: header, mobile menu, before/after sliders, schedule tool, quote form.

// Quote requests are emailed through FormSubmit (formsubmit.co).
// The very first submission sends an activation email to this address; click the link in it once.
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/k4provisions@gmail.com';
const BUSINESS_PHONE = '+12149317844';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------- Header and mobile bar ---------- */
const header = $('[data-header]');
const mobileBar = $('[data-mobile-bar]');
const onContact = !!$('#quote-form');
let queued = false;
function onScroll() {
  header.classList.toggle('is-solid', window.scrollY > 24);
  if (mobileBar) mobileBar.classList.toggle('is-visible', !onContact && window.scrollY > window.innerHeight * 0.5);
}
window.addEventListener('scroll', () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; onScroll(); });
}, { passive: true });
onScroll();

/* ---------- Mobile menu ---------- */
const menuBtn = $('[data-menu-btn]');
const menuPanel = $('[data-menu-panel]');
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  header.classList.toggle('menu-open', open);
  if (open) {
    menuPanel.hidden = false;
    requestAnimationFrame(() => menuPanel.classList.add('is-open'));
  } else {
    menuPanel.classList.remove('is-open');
    setTimeout(() => { if (menuBtn.getAttribute('aria-expanded') === 'false') menuPanel.hidden = true; }, 200);
  }
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuBtn?.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
});
menuPanel?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
window.matchMedia('(min-width: 1080px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* ---------- Before / after sliders ---------- */
function initSlider(fig) {
  const frame = $('.ba-frame', fig);
  const range = $('.ba-range', fig);
  let hinting = false;
  const set = (v) => {
    const pos = Math.min(100, Math.max(0, v));
    fig.style.setProperty('--pos', `${pos}%`);
    range.value = String(Math.round(pos));
    range.setAttribute('aria-valuetext', `${Math.round(pos)}% before, ${100 - Math.round(pos)}% after`);
  };
  set(50);
  range.addEventListener('input', () => { hinting = false; set(Number(range.value)); });

  // Drag anywhere on the image; vertical swipes still scroll the page (touch-action: pan-y).
  let dragging = false;
  const fromEvent = (e) => {
    const r = frame.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };
  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    hinting = false;
    dragging = true;
    fig.classList.add('is-dragging');
    frame.setPointerCapture(e.pointerId);
    fromEvent(e);
  });
  frame.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
  const end = () => { dragging = false; fig.classList.remove('is-dragging'); };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);

  // One gentle sweep the first time it scrolls into view, to show it can be dragged.
  if (fig.hasAttribute('data-ba-hint') || fig.hasAttribute('data-ba-switchable')) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      if (reducedMotion.matches) return;
      hinting = true;
      const start = performance.now();
      const keys = [[0, 50], [700, 72], [1500, 30], [2200, 50]];
      const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
      const step = (now) => {
        if (!hinting) return;
        const t = now - start;
        if (t >= keys[keys.length - 1][0]) { set(50); hinting = false; return; }
        let i = 0;
        while (t > keys[i + 1][0]) i++;
        const [t0, v0] = keys[i];
        const [t1, v1] = keys[i + 1];
        set(v0 + (v1 - v0) * ease((t - t0) / (t1 - t0)));
        requestAnimationFrame(step);
      };
      setTimeout(() => requestAnimationFrame(step), 400);
    }, { threshold: 0.6 });
    io.observe(fig);
  }
  return { set };
}
const sliders = $$('[data-ba]').map((fig) => [fig, initSlider(fig)]);

// Scene tabs on the home page swap the images in the slider
const SCENES = {
  hood: ['Illustration: a kitchen hood coated in grease before cleaning', 'Illustration: the hood after cleaning, bare stainless steel'],
  lot: ['Illustration: a stained parking area with oil spots and faded lines', 'Illustration: the parking area after pressure washing'],
  bin: ['Illustration: grimy garbage bins with streaks and flies', 'Illustration: the bins after washing, clean and shiny'],
};
const tabs = $('[data-ba-tabs]');
if (tabs) {
  const fig = $('[data-ba-switchable]');
  const slider = sliders.find(([f]) => f === fig)?.[1];
  const before = $('[data-ba-before]', fig);
  const after = $('[data-ba-after]', fig);
  // warm the cache so switching is instant
  const warm = () => Object.keys(SCENES).forEach((k) => { new Image().src = `assets/img/ba/${k}-before.svg`; new Image().src = `assets/img/ba/${k}-after.svg`; });
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { warm(); io.disconnect(); } }, { rootMargin: '300px' }).observe(fig);
  $$('button', tabs).forEach((btn) => btn.addEventListener('click', () => {
    const key = btn.dataset.scene;
    $$('button', tabs).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    fig.classList.add('is-swapping');
    setTimeout(() => {
      before.src = `assets/img/ba/${key}-before.svg`;
      after.src = `assets/img/ba/${key}-after.svg`;
      [before.alt, after.alt] = SCENES[key];
      slider?.set(50);
      fig.classList.remove('is-swapping');
    }, reducedMotion.matches ? 0 : 160);
  }));
}

/* ---------- Service area map: dots light up once ---------- */
const map = $('[data-map]');
if (map) {
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { map.classList.add('is-lit'); io.disconnect(); } }, { threshold: 0.3 }).observe(map);
}

/* ---------- Cleaning schedule tool ---------- */
const FREQ = {
  solid: { value: 'Every month', note: '12 times a year', share: 1 },
  high: { value: 'Every 3 months', note: 'About 4 times a year', share: 4 / 12 },
  moderate: { value: 'Every 6 months', note: 'Twice a year', share: 2 / 12 },
  low: { value: 'Once a year', note: 'Annually', share: 1 / 12 },
};
const freqValue = $('[data-freq-value]');
if (freqValue) {
  const freqNote = $('[data-freq-note]');
  const freqBar = $('[data-freq-bar]');
  const setFreq = (key) => {
    const f = FREQ[key];
    if (!f) return;
    freqValue.textContent = f.value;
    freqNote.textContent = f.note;
    freqBar.style.width = `${Math.max(8, f.share * 100)}%`;
  };
  $$('input[name="kitchen"]').forEach((r) => r.addEventListener('change', () => setFreq(r.value)));
  setFreq($('input[name="kitchen"]:checked')?.value || 'high');
}

/* ---------- Quote form ---------- */
const form = $('#quote-form');
if (form) {
  const statusEl = $('[data-form-status]');
  const submitBtn = $('.btn-submit', form);

  // contact.html?service=hood preselects that service
  const pre = new URLSearchParams(location.search).get('service');
  if (pre) { const box = $(`input[data-key="${pre}"]`, form); if (box) box.checked = true; }

  const setError = (input, msg) => {
    const err = $(`#${input.id}-err`);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg || '';
  };
  const validate = () => {
    const { name, phone, email } = form.elements;
    let firstBad = null;
    if (!name.value.trim()) { setError(name, 'Enter your name so we know who to ask for.'); firstBad ||= name; } else setError(name, '');
    if (phone.value.replace(/\D/g, '').length < 10) { setError(phone, 'Enter a 10-digit phone number, like 214 555 0123.'); firstBad ||= phone; } else setError(phone, '');
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { setError(email, 'Check the email address, or leave it blank.'); firstBad ||= email; } else setError(email, '');
    return firstBad;
  };
  ['name', 'phone', 'email'].forEach((n) => form.elements[n].addEventListener('blur', () => {
    if (form.elements[n].getAttribute('aria-invalid') === 'true') validate();
  }));

  const summary = (data) => [
    'Quote request from the K4 Provisions website',
    `Name: ${data.get('name')}`,
    data.get('business') && `Business: ${data.get('business')}`,
    `Phone: ${data.get('phone')}`,
    data.get('email') && `Email: ${data.get('email')}`,
    data.get('city') && `City: ${data.get('city')}`,
    `Services: ${data.getAll('services').join(', ') || 'Not specified'}`,
    data.get('notes') && `Notes: ${data.get('notes')}`,
  ].filter(Boolean).join('\n');

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
      return;
    }

    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.disabled = true;
    $('.btn-label', submitBtn).textContent = 'Sending…';
    try {
      const payload = Object.fromEntries([...data.entries()].filter(([k]) => k !== 'services'));
      payload.services = data.getAll('services').join(', ') || 'Not specified';
      payload._subject = `New quote request: ${data.get('business') || data.get('name')}`;
      payload._template = 'table';
      if (data.get('email')) payload._replyto = data.get('email');
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || String(json.success) === 'false') throw new Error(json.message || String(res.status));
      form.reset();
      statusEl.classList.add('is-success');
      statusEl.textContent = 'Quote request sent. We’ll call or text you soon.';
      statusEl.focus?.();
    } catch {
      statusEl.classList.add('is-error');
      statusEl.innerHTML = 'Your request didn’t send. Check your connection and try again, or call <a href="tel:+12149317844">(214) 931-7844</a>.';
    } finally {
      submitBtn.removeAttribute('aria-busy');
      submitBtn.disabled = false;
      $('.btn-label', submitBtn).textContent = 'Request my quote';
    }
  });
}
