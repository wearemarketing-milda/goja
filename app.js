const menu = document.querySelector('.menu');
const nav = document.querySelector('#nav');
const submenuButton = document.querySelector('.submenu-toggle');
const submenu = document.querySelector('#services-menu');
function closeMenu() {
  nav?.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-label', 'Atverti meniu');
  if (menu) menu.textContent = '☰';
}
function closeSubmenu() {
  submenu?.classList.remove('open');
  submenuButton?.setAttribute('aria-expanded', 'false');
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Užverti meniu' : 'Atverti meniu');
  nav.classList.toggle('open', open);
  menu.textContent = open ? '×' : '☰';
  if (!open) closeSubmenu();
});
function toggleSubmenu() {
  const open = submenuButton.getAttribute('aria-expanded') !== 'true';
  submenuButton.setAttribute('aria-expanded', String(open));
  submenu.classList.toggle('open', open);
}
submenuButton?.addEventListener('click', toggleSubmenu);
// „Paslaugos“ nėra nuoroda: kompiuteryje meniu atsidaro užvedus pelę, telefone – paspaudus.
document.querySelector('.nav-parent')?.addEventListener('click', e => { e.preventDefault(); toggleSubmenu(); });
nav?.querySelectorAll('a:not(.nav-parent)').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('click', e => {
  if (!e.target.closest('.nav-services')) closeSubmenu();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (submenu?.classList.contains('open')) { closeSubmenu(); submenuButton.focus(); }
    else if (nav?.classList.contains('open')) { closeMenu(); menu.focus(); }
  }
});
const currentPath = location.pathname.replace(/\/$/, '');
nav?.querySelectorAll('a:not(.nav-parent)').forEach(a => {
  const path = new URL(a.href).pathname.replace(/\/$/, '');
  if (path === currentPath) a.setAttribute('aria-current', 'page');
});
// Mikro animacijos: turinys švelniai išnyra slenkant puslapį.
// Elementai, kurie jau matomi užsikrovus, nepaslepiami (kad nemirksėtų);
// grupių vaikai (kortelės, komanda, žingsniai...) atsiranda paeiliui.
(() => {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const SINGLE = [
    '.section-heading', '.service-content > div', '.treatment-guidance > h2', '.process > .eyebrow', '.process > h2',
    '.page-cta > div', '.approach-grid > div', '.approach-grid > figure', '.home-about > figure', '.home-about > div',
    '.home-clinic > div', '.home-clinic > figure', '.home-services > .text-link', '.contact-grid > div', '.contact-photo > img', '.contact-photo > div',
    '.registration > div', '.registration > form', '.price-tools', '.price-group', '.price-notes',
    '.implant-offer-summary', '.implant-offer-inclusions', '.implant-doctor-portrait', '.implant-doctor-copy',
    '.services-index .service-card', '.related-links', '.goja-pp > *',
  ];
  const GROUPS = [
    '.home-service-catalog', '.team-grid', '.steps', '.guidance-columns', '.clinic-gallery-grid',
    '.treatment-list', '.care-planning', '.visit-strip', '.clinic-contact-head', '.clinic-contact-details', '.clinic-contact-media', '.prose', '.contact-details', '.implant-offer-inclusions ul',
  ];
  const vh = window.innerHeight;
  const inView = el => { const r = el.getBoundingClientRect(); return r.top < vh * 0.92 && r.bottom > 0; };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const prepare = (el, delay) => {
    if (el.closest('.hero, .hero-full, .page-top, .service-hero, .offer-page-hero') || el.classList.contains('reveal')) return;
    if (inView(el)) return;
    el.classList.add('reveal');
    if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
    observer.observe(el);
  };
  document.querySelectorAll(GROUPS.join(',')).forEach(group => {
    [...group.children].forEach((child, i) => prepare(child, Math.min(i, 6) * 90));
    group.dataset.revealGroup = '';
  });
  document.querySelectorAll(SINGLE.join(',')).forEach(el => {
    if (el.hasAttribute('data-reveal-group')) return;
    prepare(el, 0);
  });
})();
const priceSearch = document.querySelector('#price-search');
function normalizeSearch(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
if (priceSearch) {
  const groups = [...document.querySelectorAll('.price-group')];
  const groupState = new Map();
  let searching = false;
  const filterPrices = () => {
    const query = normalizeSearch(priceSearch.value.trim());
    if (query && !searching) groups.forEach(g => groupState.set(g, g.open));
    let visibleCount = 0;
    groups.forEach(group => {
      const categoryMatches = normalizeSearch(group.querySelector('summary').textContent).includes(query);
      let groupCount = 0;
      group.querySelectorAll('.price-row').forEach(row => {
        const visible = !query || categoryMatches || normalizeSearch(row.textContent).includes(query);
        row.hidden = !visible;
        if (visible) groupCount++;
      });
      group.hidden = groupCount === 0;
      if (query && groupCount) group.open = true;
      if (!query && searching) group.open = groupState.get(group) ?? true;
      visibleCount += groupCount;
    });
    searching = Boolean(query);
    document.querySelector('#price-empty').hidden = visibleCount > 0;
    document.querySelector('#price-count').textContent = query ? `Rasta paslaugų: ${visibleCount}` : `Kainoraštyje – ${visibleCount} paslaugų`;
  };
  priceSearch.addEventListener('input', filterPrices);
  filterPrices();
}
const registrationForm = document.querySelector('#registration-form');
if (registrationForm) {
  const select = registrationForm.elements.service;
  const selectedService = new URLSearchParams(location.search).get('paslauga');
  if ([...select.options].some(o => o.value === selectedService)) select.value = selectedService;
  const requestedOffer = new URLSearchParams(location.search).get('pasiulymas');
  if (requestedOffer === 'vieno-danties-1100' && ['dantu-implantacija', 'nemokama-implantacijos-konsultacija'].includes(select.value)) {
    select.value = 'nemokama-implantacijos-konsultacija';
  }
  let pending = false;
  let attempt = null;
  registrationForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (pending || !registrationForm.reportValidity()) return;
    const fields = registrationForm.elements;
    const payload = {
      fullname: fields.fullname.value.trim(), phone: fields.phone.value.trim(),
      email: fields.email.value.trim(), service: select.value,
      message: fields.message.value.trim(), consent: fields.consent.checked,
      website: fields.website.value,
    };
    const signature = JSON.stringify(payload);
    if (!attempt || attempt.signature !== signature) attempt = { signature, requestId: crypto.randomUUID() };
    const submit = registrationForm.querySelector('button[type="submit"]');
    const error = document.querySelector('#form-error');
    const result = document.querySelector('#form-result');
    const originalLabel = submit.innerHTML;
    pending = true; submit.disabled = true;
    registrationForm.setAttribute('aria-busy', 'true');
    submit.textContent = 'Siunčiama…'; error.hidden = true; result.hidden = true;
    try {
      const response = await fetch('/api/registracija', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId: attempt.requestId }),
      });
      const received = await response.json().catch(() => ({}));
      if (!response.ok || received.ok !== true) throw new Error(received.message || 'Nepavyko išsiųsti užklausos. Bandykite dar kartą arba skambinkite +370 611 80077.');
      registrationForm.reset(); attempt = null;
      result.hidden = false; result.focus();
    } catch (err) {
      error.textContent = err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'Nepavyko išsiųsti užklausos. Patikrinkite ryšį arba skambinkite +370 611 80077.';
      error.hidden = false;
    } finally {
      pending = false; submit.disabled = false; submit.innerHTML = originalLabel;
      registrationForm.removeAttribute('aria-busy');
    }
  });
}

// Hero video: kompiuteryje horizontalus, telefone vertikalus. Kol video kraunasi, matoma nuotrauka;
// video neįkeliamas, jei lankytojas nepageidauja judesio arba taupo duomenis.
(() => {
  const video = document.querySelector('.hero-video');
  if (!video) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) return;
  const mobile = matchMedia('(max-width: 760px)');
  const pick = () => (mobile.matches ? video.dataset.srcMobile : video.dataset.src);
  const load = () => {
    const src = pick();
    if (!src || video.getAttribute('src') === src) return;
    video.classList.remove('is-playing');
    video.src = src;
    video.play().catch(() => {});
  };
  video.addEventListener('playing', () => video.classList.add('is-playing'));
  mobile.addEventListener?.('change', load);
  load();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { if (e.isIntersecting) video.play().catch(() => {}); else video.pause(); }).observe(video);
  }
})();

// Gydymo planavimas: kompiuteryje vienu metu atviras tik vienas punktas; telefone – kaip anksčiau.
(() => {
  const desktop = matchMedia('(min-width: 761px)');
  document.querySelectorAll('.care-planning').forEach(group => {
    const items = [...group.querySelectorAll(':scope > details')];
    items.forEach(item => item.addEventListener('toggle', () => {
      if (!item.open || !desktop.matches) return;
      items.forEach(other => { if (other !== item && other.open) other.open = false; });
    }));
  });
})();

// Nuorodos į #kontaktai: jei šiame puslapyje kontaktų sekcijos nėra – į pradžios puslapio kontaktus.
document.querySelectorAll('a[href="#kontaktai"]').forEach(a => a.addEventListener('click', e => {
  if (!document.getElementById('kontaktai')) { e.preventDefault(); location.href = '/#kontaktai'; }
}));
// Specialisto drawer'is: paspaudus kortelę atsidaro šone; be JS – nuoroda į profilio puslapį.
(() => {
  document.querySelectorAll('[data-specialist]').forEach(a => a.addEventListener('click', e => {
    const d = document.getElementById(`specialistas-${a.dataset.specialist}`);
    if (!d || typeof d.showModal !== 'function' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); d.showModal(); document.documentElement.classList.add('drawer-open');
  }));
  document.querySelectorAll('.specialist-drawer').forEach(d => {
    d.querySelector('.specialist-drawer-close')?.addEventListener('click', () => d.close());
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => document.documentElement.classList.remove('drawer-open'));
  });
})();
