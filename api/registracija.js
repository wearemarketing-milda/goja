// Registracijos formos apdorojimas: siunčia užklausą el. laišku per SMTP (Hostinger paštas).
// Reikalingi Vercel Environment Variables:
//   SMTP_USER  – pašto dėžutė, iš kurios siunčiama (pvz. info@gojaklinika.lt)
//   SMTP_PASS  – tos dėžutės slaptažodis
// Nebūtini:
//   MAIL_TO    – kam siųsti užklausas (numatyta: info@gojaklinika.lt)
//   SMTP_HOST  – numatyta smtp.hostinger.com
//   SMTP_PORT  – numatyta 465
const nodemailer = require('nodemailer');

const SERVICES = {
  'nemokama-implantacijos-konsultacija': 'Nemokama konsultacija dėl implantacijos',
  'burnos-higiena': 'Burnos higiena',
  'terapine-odontologija': 'Terapinė odontologija',
  'vaiku-odontologija': 'Vaikų odontologija',
  'estetinis-plombavimas': 'Estetinis plombavimas',
  'dantu-protezavimas': 'Dantų protezavimas',
  'dantu-implantacija': 'Dantų implantacija',
  'konsultacija': 'Konsultacija / kita paslauga',
};

const FAIL = 'Nepavyko išsiųsti užklausos. Bandykite dar kartą arba skambinkite +370 611 80077.';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // Botų spąstai: užpildytas paslėptas laukas reiškia botą. Atsakome „ok“, bet nesiunčiame.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  const fullname = clean(body.fullname, 100);
  const phone = clean(body.phone, 25);
  const email = clean(body.email, 150);
  const service = SERVICES[body.service] || 'Nepasirinkta';
  const message = clean(body.message, 1500);

  if (!fullname || !/^[+0-9() \-]{6,25}$/.test(phone)) {
    return res.status(400).json({ ok: false, message: 'Įveskite vardą ir teisingą telefono numerį.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: 'Patikrinkite el. pašto adresą.' });
  }
  if (body.consent !== true) {
    return res.status(400).json({ ok: false, message: 'Pažymėkite sutikimą su privatumo politika.' });
  }

  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    console.error('Trūksta SMTP_USER arba SMTP_PASS aplinkos kintamųjų');
    return res.status(500).json({ ok: false, message: FAIL });
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const rows = [
    ['Vardas ir pavardė', fullname],
    ['Telefonas', phone],
    ['El. paštas', email || '–'],
    ['Paslauga', service],
    ['Komentaras', message || '–'],
  ];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nUžklausos ID: ${clean(body.requestId, 64)}`;
  const html = `<h2>Nauja registracijos užklausa</h2><table cellpadding="6" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#666;vertical-align:top"><b>${esc(k)}</b></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`)
    .join('')}</table>`;

  try {
    await transporter.sendMail({
      from: `"GOJA svetainė" <${SMTP_USER}>`,
      to: process.env.MAIL_TO || 'info@gojaklinika.lt',
      replyTo: email || undefined,
      subject: `Registracija: ${service} – ${fullname}`,
      text,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Laiško išsiųsti nepavyko:', err && err.message);
    return res.status(500).json({ ok: false, message: FAIL });
  }
};
