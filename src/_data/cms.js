// Surenka visą CMS turinį (content/*) į vieną duomenų objektą šablonams.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', 'content');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const readDir = (dir) => {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(d, f)));
};
const byOrder = (key) => (a, b) => (a[key] ?? 100) - (b[key] ?? 100) || String(a.title || a.name).localeCompare(String(b.title || b.name), 'lt');
const published = (x) => x.published !== false;

module.exports = () => {
  const settings = readJson(path.join(ROOT, 'settings', 'general.json'));
  const base = settings.site_url.replace(/\/$/, '');
  const abs = (u) => (!u ? '' : /^https?:/.test(u) ? u : base + u);

  const pages = readDir('pages').filter(published);
  const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));

  for (const p of pages) {
    p.url = p.slug === 'index' ? '/' : `/${p.slug}`;
    p.permalink = p.slug === 'index' ? '/index.html' : `/${p.slug}/index.html`;
    p.menuText = p.menu_label || p.nav_label || p.title;
    p.hasForm = (p.blocks || []).some((b) => b.type === 'registration');
  }
  for (const p of pages) {
    p.children = pages.filter((c) => c.parent === p.slug).sort(byOrder('menu_order'));
    p.ancestors = [];
    const seen = new Set([p.slug]);
    let q = bySlug[p.parent];
    while (q && !seen.has(q.slug)) { p.ancestors.unshift(q); seen.add(q.slug); q = bySlug[q.parent]; }
  }

  // Navigacija: viršutinio lygio puslapiai su „Rodyti meniu“, o jų vaikai rodomi kaip submeniu.
  const menu = [
    ...pages
      .filter((p) => p.show_in_menu && !(p.parent && bySlug[p.parent] && bySlug[p.parent].show_in_menu))
      .map((p) => ({ order: p.menu_order ?? 100, page: p, children: p.children.filter((c) => c.show_in_menu) })),
    // Papildomi meniu punktai iš Nustatymų (pvz. „Kontaktai“ → #kontaktai)
    ...(settings.menu_extra || []).map((m) => ({ order: m.order ?? 100, page: { url: m.url, menuText: m.text }, children: [] })),
  ].sort((a, b) => a.order - b.order);

  const specialists = readDir('specialistai').filter(published).sort(byOrder('order'));
  const specialistsBySlug = Object.fromEntries(specialists.map((s) => [s.slug, s]));
  for (const sp of specialists) {
    sp.hasPage = sp.landing_page !== false;
    sp.url = `/specialistai/${sp.slug}`;
    sp.roleText = sp.role || sp.card_role || '';
    sp.serviceLinks = (sp.services || []).map((x) => bySlug[x]).filter(Boolean);
    sp.buttonText = (sp.button && sp.button.text) || 'Registruotis konsultacijai';
    sp.buttonUrl = (sp.button && sp.button.url) || '/registracija';
  }
  // Spec. pasiūlymai: kiekvienas – atskiras įrašas su galiojimo datomis.
  const MONTHS = ['SAU', 'VAS', 'KOV', 'BAL', 'GEG', 'BIR', 'LIE', 'RGP', 'RGS', 'SPA', 'LAP', 'GRD'];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius' }).format(new Date());
  const day = (v) => (v ? String(v).slice(0, 10) : '');
  const ltDate = (d) => d.replace(/-/g, '.');
  const offers = readDir('pasiulymai').filter(published).sort(byOrder('order'));
  for (const o of offers) {
    o.url = `/pasiulymai/${o.slug}`;
    o.from = day(o.valid_from); o.until = day(o.valid_until);
    o.isUpcoming = !!o.from && o.from > today;
    o.isExpired = !!o.until && o.until < today;
    o.isActive = !o.isUpcoming && !o.isExpired;
    o.untilDay = o.until ? String(Number(o.until.slice(8, 10))) : '';
    o.untilMonth = o.until ? MONTHS[Number(o.until.slice(5, 7)) - 1] : '';
    o.validText = o.from && o.until ? `Galioja ${ltDate(o.from)}–${ltDate(o.until)}` : o.until ? `Galioja iki ${ltDate(o.until)}` : o.from ? `Galioja nuo ${ltDate(o.from)}` : '';
    o.expiredText = o.until ? `Pasiūlymas galiojo iki ${ltDate(o.until)}` : 'Pasiūlymas nebegalioja';
    o.cardTitle = o.card_title || o.title;
    o.cardImage = (o.image_desktop && o.image_desktop.src) ? o.image_desktop : (o.image_mobile || { src: '', alt: '' });
    o.daysLeft = o.until ? Math.round((Date.parse(o.until) - Date.parse(today)) / 86400000) : null;
    const heroBlock = (o.blocks || []).find((b) => b.type === 'offer_hero');
    o.ctaUrl = (heroBlock && heroBlock.button && heroBlock.button.url) || '/registracija';
  }
  const offersBySlug = Object.fromEntries(offers.map((o) => [o.slug, o]));
  const activeOffers = offers.filter((o) => o.isActive);
  const offerKeys = Object.fromEntries(offers.filter((o) => o.registration_key && o.isActive).map((o) => [o.registration_key, [o.title, o.title_price].filter(Boolean).join(' ')]));
  const inactiveOffers = offers.filter((o) => o.isExpired).sort((a, b) => (a.until < b.until ? 1 : -1));

  // Blokų ryšiai: komandos blokas rodo pasirinktus (arba visus) specialistus, gydytojo blokas – vieną.
  for (const p of [...pages, ...offers]) {
    for (const b of p.blocks || []) {
      if (b.type === 'team') {
        const picked = (b.specialists || []).map((x) => specialistsBySlug[x]).filter(Boolean);
        b.members = picked.length ? picked : specialists.filter((x) => x.show_in_team !== false);
      }
      if (b.type === 'doctor') b.person = specialistsBySlug[b.specialist] || null;
      if (b.type === 'hero') {
        // Kortelė rodo pasirinktą pasiūlymą arba pirmą šiuo metu galiojantį.
        b.offerItem = b.show_offer === false ? null : (b.offer ? offersBySlug[b.offer] : activeOffers[0]) || null;
      }
    }
  }

  // Struktūriniai duomenys (schema.org) kiekvienam puslapiui.
  const clinic = {
    '@type': 'Dentist', '@id': `${base}/#clinic`, name: settings.site_name, url: `${base}/`,
    telephone: settings.phone_link, email: settings.email, logo: abs(settings.logo), image: abs(settings.og_image),
    address: { '@type': 'PostalAddress', streetAddress: settings.street, addressLocality: settings.city, postalCode: settings.postal_code, addressCountry: settings.country },
    openingHoursSpecification: (settings.opening_hours || []).map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes })),
    sameAs: [settings.facebook, settings.instagram].filter(Boolean),
  };
  const website = { '@type': 'WebSite', '@id': `${base}/#website`, url: `${base}/`, name: settings.site_name, inLanguage: 'lt-LT', publisher: { '@id': `${base}/#clinic` } };
  for (const p of pages) {
    const url = p.url === '/' ? `${base}/` : base + p.url;
    const graph = [clinic, website, {
      '@type': 'WebPage', '@id': `${url}#webpage`, url, name: p.meta_title, description: p.meta_description, inLanguage: 'lt-LT',
      isPartOf: { '@id': `${base}/#website` }, about: { '@id': `${base}/#clinic` },
    }];
    if (p.slug !== 'index') {
      const chain = [{ name: 'Pradžia', item: `${base}/` }, ...p.ancestors.map((a) => ({ name: a.nav_label || a.title, item: base + a.url })), { name: p.title, item: url }];
      graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: chain.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })) });
    }
    if (p.parent === 'paslaugos') {
      graph.push({ '@type': 'Service', '@id': `${url}#service`, name: p.title, serviceType: p.title, url, provider: { '@id': `${base}/#clinic` } });
    }
    for (const b of p.blocks || []) {
      const s = b.type === 'doctor' && specialistsBySlug[b.specialist];
      if (s && p.parent === 'paslaugos') {
        graph.push({ '@type': 'Person', '@id': `${base}/#${s.slug}`, name: s.name, jobTitle: s.job_title || s.role, image: abs(s.photo), worksFor: { '@id': `${base}/#clinic` }, url: `${url}#${s.slug}` });
      }
    }
    p.schema = { '@context': 'https://schema.org', '@graph': graph };
  }

  // Specialistų landing puslapiai (/specialistai/<slug>)
  const plain = (t) => String(t || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();
  const clip = (t, n) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1)).replace(/[,.;:–-]+$/, '') + '…');
  const about = bySlug['apie-mus'];
  const specialistPages = specialists.filter((sp) => sp.hasPage).map((sp) => {
    const url = base + sp.url;
    const desc = sp.meta_description || clip(plain(sp.bio) || `${sp.name} – ${sp.roleText} GOJA odontologijos klinikoje Mažeikiuose. Registruokitės konsultacijai.`, 155);
    const ancestors = about ? [about] : [];
    const graph = [clinic, website,
      { '@type': 'ProfilePage', '@id': `${url}#webpage`, url, name: sp.meta_title || `${sp.name} | ${settings.site_name}`, description: desc, inLanguage: 'lt-LT', isPartOf: { '@id': `${base}/#website` }, mainEntity: { '@id': `${base}/#${sp.slug}` } },
      { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [{ name: 'Pradžia', item: `${base}/` }, ...ancestors.map((a) => ({ name: a.nav_label || a.title, item: base + a.url })), { name: sp.name, item: url }].map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })) },
      { '@type': 'Person', '@id': `${base}/#${sp.slug}`, name: sp.name, jobTitle: sp.job_title || sp.roleText, image: abs(sp.photo), url, worksFor: { '@id': `${base}/#clinic` }, ...(plain(sp.bio) ? { description: clip(plain(sp.bio), 300) } : {}) },
    ];
    return {
      slug: sp.slug, url: sp.url, permalink: `${sp.url}/index.html`, title: sp.name, nav_label: sp.name, ancestors,
      meta_title: sp.meta_title || `${sp.name} – ${sp.card_role || sp.roleText || 'specialistas'} | ${settings.site_name}`,
      meta_description: desc, og_image: sp.photo, noindex: false, sitemap: true,
      blocks: [{ type: 'specialist_profile', person: sp }, { type: 'global_contact', hidden: false }],
      schema: { '@context': 'https://schema.org', '@graph': graph },
    };
  });
  // Pasiūlymų vidiniai puslapiai (/pasiulymai/<slug>)
  const offersPage = bySlug['pasiulymai'];
  const priceNumber = (t) => { const m = String(t || '').replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/); return m ? m[1].replace(',', '.') : null; };
  const offerPages = offers.filter((o) => !o.isUpcoming).map((o) => {
    const url = base + o.url;
    const name = [o.title, o.title_price].filter(Boolean).join(' ');
    const ancestors = offersPage ? [offersPage] : [];
    const price = priceNumber(o.title_price);
    const graph = [clinic, website,
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: o.meta_title || name, description: o.meta_description || o.summary || '', inLanguage: 'lt-LT', isPartOf: { '@id': `${base}/#website` }, about: { '@id': `${base}/#clinic` } },
      { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [{ name: 'Pradžia', item: `${base}/` }, ...ancestors.map((a) => ({ name: a.nav_label || a.title, item: base + a.url })), { name, item: url }].map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })) },
      { '@type': 'Offer', '@id': `${url}#offer`, name, url, ...(price ? { price, priceCurrency: 'EUR' } : {}), ...(o.from ? { validFrom: o.from } : {}), ...(o.until ? { validThrough: o.until } : {}), availability: o.isExpired ? 'https://schema.org/Discontinued' : 'https://schema.org/InStock', seller: { '@id': `${base}/#clinic` } },
    ];
    const blocks = (o.blocks || []).map((b) => ({ ...b }));
    const faqItems = blocks.filter((b) => b.type === 'faq' && !b.hidden).flatMap((b) => b.items || []).filter((x) => x.question && x.answer && !/\[PAVYZDYS/.test(x.answer));
    if (faqItems.length) graph.push({ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: faqItems.map((x) => ({ '@type': 'Question', name: x.question, acceptedAnswer: { '@type': 'Answer', text: plain(x.answer) } })) });
    return {
      slug: o.slug, url: o.url, permalink: `${o.url}/index.html`, title: name, nav_label: o.cardTitle, ancestors, offer: o,
      meta_title: o.meta_title || `${name} | ${settings.site_name}`, meta_description: o.meta_description || o.summary || '',
      og_image: (o.image_desktop && o.image_desktop.src) || '', noindex: false, sitemap: true, blocks,
      hasForm: false, schema: { '@context': 'https://schema.org', '@graph': graph },
    };
  });
  const renderPages = [...pages, ...specialistPages, ...offerPages];

  return { settings, base, pages, renderPages, bySlug, menu, specialists, specialistsBySlug, offers, activeOffers, inactiveOffers, offerKeys, today };
};
