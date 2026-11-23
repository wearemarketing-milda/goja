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
  const menu = pages
    .filter((p) => p.show_in_menu && !(p.parent && bySlug[p.parent] && bySlug[p.parent].show_in_menu))
    .sort(byOrder('menu_order'))
    .map((p) => ({ page: p, children: p.children.filter((c) => c.show_in_menu) }));

  const specialists = readDir('specialistai').filter(published).sort(byOrder('order'));
  const specialistsBySlug = Object.fromEntries(specialists.map((s) => [s.slug, s]));
  const offers = readDir('pasiulymai').filter(published).sort(byOrder('order'));

  // Blokų ryšiai: komandos blokas rodo pasirinktus (arba visus) specialistus, gydytojo blokas – vieną.
  for (const p of pages) {
    for (const b of p.blocks || []) {
      if (b.type === 'team') {
        const picked = (b.specialists || []).map((x) => specialistsBySlug[x]).filter(Boolean);
        b.members = picked.length ? picked : specialists.filter((x) => x.show_in_team !== false);
      }
      if (b.type === 'doctor') b.person = specialistsBySlug[b.specialist] || null;
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

  return { settings, base, pages, bySlug, menu, specialists, specialistsBySlug, offers };
};
