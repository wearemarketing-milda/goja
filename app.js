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
  if (open) { const h = nav.parentElement.offsetHeight + 'px'; nav.style.setProperty('--nav-top', h); nav.parentElement.style.setProperty('--nav-top', h); }
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
  if ((a.getAttribute('href') || '').startsWith('#')) return;
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
  // Atėjus iš pasiūlymo – parodom, kuriam pasiūlymui registruojamasi, ir perduodam jį laiške.
  let offerMap = {};
  try { offerMap = JSON.parse(registrationForm.dataset.offers || '{}'); } catch {}
  if (requestedOffer && offerMap[requestedOffer]) {
    const note = registrationForm.querySelector('.form-offer');
    note.textContent = `Registruojatės pasiūlymui: ${offerMap[requestedOffer]}`;
    note.hidden = false;
    registrationForm.elements.offer.value = offerMap[requestedOffer];
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
      offer: fields.offer ? fields.offer.value : '',
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

// Gydymo planavimas: punktai sklandžiai išsiskleidžia ir susitraukia; kompiuteryje vienu metu atviras tik vienas.
(() => {
  const desktop = matchMedia('(min-width: 761px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const closedHeight = d => {
    const cs = getComputedStyle(d);
    return d.querySelector('summary').offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
  };
  const setOpen = (d, open) => {
    if (d._target === open && (d._anim || d.open === open)) return;
    d._target = open;
    if (reduce.matches) { d.open = open; return; }
    const from = d.offsetHeight;
    if (d._anim) d._anim.cancel();
    if (open) d.open = true;
    const to = open ? d.scrollHeight + parseFloat(getComputedStyle(d).borderBottomWidth) : closedHeight(d);
    d.style.overflow = 'hidden';
    const a = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 420, easing: 'cubic-bezier(.33,0,.2,1)' });
    d._anim = a;
    a.onfinish = () => { d._anim = null; d.open = open; d.style.overflow = ''; };
  };
  document.querySelectorAll('.care-planning').forEach(group => {
    const items = [...group.querySelectorAll(':scope > details')];
    items.forEach(item => item.querySelector('summary').addEventListener('click', e => {
      e.preventDefault();
      const open = !(item._anim ? item._target : item.open);
      setOpen(item, open);
      if (open && desktop.matches) items.forEach(other => { if (other !== item && (other.open || other._anim)) setOpen(other, false); });
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
    if (!d || typeof d.showModal !== 'function' || matchMedia('(max-width: 760px)').matches || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); d.showModal(); document.documentElement.classList.add('drawer-open');
    requestAnimationFrame(() => dispatchEvent(new Event('resize')));
  }));
  document.querySelectorAll('.specialist-drawer').forEach(d => {
    d.querySelector('.specialist-drawer-close')?.addEventListener('click', () => d.close());
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => document.documentElement.classList.remove('drawer-open'));
  });
})();

// Paslaugų slider'is: tempiamas pele ar pirštu, valdomas rodyklėmis.
document.querySelectorAll('[data-slider]').forEach(slider => {
  const track = slider.querySelector('[data-slider-track]');
  const prev = slider.querySelector('[data-slider-prev]');
  const next = slider.querySelector('[data-slider-next]');
  if (!track) return;
  const step = () => {
    const card = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
  };
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max;
    slider.classList.toggle('is-static', max <= 0);
  };
  prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
  // Tempimas pele (lietimui naudojamas natūralus slinkimas)
  let startX = 0, startLeft = 0, moved = false, down = false;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
  });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
    if (moved) { e.preventDefault(); track.scrollLeft = startLeft - dx; }
  });
  addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    if (moved) {
      track.classList.remove('is-dragging');
      const s = step(); track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: 'smooth' });
    }
  });
  track.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  track.addEventListener('dragstart', e => e.preventDefault());
});

// Pasiūlymų galiojimas tikrinamas ir naršyklėje – kad pasibaigęs pasiūlymas iškart taptų neaktyvus.
(() => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius' }).format(new Date());
  document.querySelectorAll('.offer-card[data-valid-until]').forEach(c => { if (c.dataset.validUntil < today) c.classList.add('is-inactive'); });
  document.querySelectorAll('.hero-offer[data-valid-until]').forEach(c => { if (c.dataset.validUntil < today) c.hidden = true; });
  const until = document.body.dataset.offerUntil;
  if (until && until < today) {
    document.body.classList.add('offer-expired');
    document.querySelectorAll('.offer-expired-notice').forEach(n => { n.hidden = false; });
  }
})();

// Pasiūlymo puslapis: likusių dienų skaičius ir lipnus registracijos mygtukas telefone.
(() => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius' }).format(new Date());
  document.querySelectorAll('.offer-countdown[data-until]').forEach(el => {
    const days = Math.round((Date.parse(el.dataset.until) - Date.parse(today)) / 86400000);
    if (days < 0) el.remove(); else el.textContent = days === 0 ? 'Paskutinė diena' : `Liko ${days} d.`;
  });
  const sticky = document.querySelector('[data-offer-sticky]');
  const cta = document.querySelector('[data-offer-cta]');
  if (!sticky || !cta || !('IntersectionObserver' in window)) return;
  if (document.body.classList.contains('offer-expired')) { sticky.remove(); return; }
  const contact = document.getElementById('kontaktai');
  let ctaVisible = true, contactVisible = false;
  const update = () => {
    const show = !ctaVisible && !contactVisible;
    sticky.classList.toggle('is-visible', show);
    sticky.setAttribute('aria-hidden', String(!show));
    sticky.querySelector('a').tabIndex = show ? 0 : -1;
    document.body.classList.toggle('has-sticky-cta', show);
  };
  new IntersectionObserver(([e]) => { ctaVisible = e.isIntersecting || e.boundingClientRect.top > 0; update(); }).observe(cta);
  if (contact) new IntersectionObserver(([e]) => { contactVisible = e.isIntersecting; update(); }).observe(contact);
})();

// Telefone skambučio mygtukas rodomas tik tada, kai hero mygtukai nebematomi.
(() => {
  const call = document.querySelector('.mobile-call');
  const heroActions = document.querySelector('.hero-full .hero-actions');
  if (!call || !heroActions || !('IntersectionObserver' in window)) return;
  call.classList.add('is-hidden');
  new IntersectionObserver(([e]) => call.classList.toggle('is-hidden', e.isIntersecting || e.boundingClientRect.top > 0)).observe(heroActions);
})();
