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
submenuButton?.addEventListener('click', () => {
  const open = submenuButton.getAttribute('aria-expanded') !== 'true';
  submenuButton.setAttribute('aria-expanded', String(open));
  submenu.classList.toggle('open', open);
});
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
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
nav?.querySelectorAll('a').forEach(a => {
  const path = new URL(a.href).pathname.replace(/\/$/, '');
  if (path === currentPath) a.setAttribute('aria-current', 'page');
});
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: .08 });
  document.querySelectorAll('.section-heading,.approach-grid,.principles,.contact-grid,.team-grid').forEach(el => {
    el.classList.add('reveal'); observer.observe(el);
  });
}
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
  if (requestedOffer === 'vieno-danties-1100' && select.value === 'dantu-implantacija') {
    registrationForm.elements.message.value = 'Domina specialus vieno danties implantacijos pasiūlymas – 1 100 €. ';
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
      const received = await response.json();
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
