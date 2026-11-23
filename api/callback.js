// CMS prisijungimas per GitHub (2 žingsnis): gauna prieigos raktą ir perduoda jį CMS langui.
const page = (status, payload) => `<!doctype html><html lang="lt"><head><meta charset="utf-8"><title>Prisijungimas</title></head><body>
<p>${status === 'success' ? 'Prisijungta. Šis langas užsidarys automatiškai.' : 'Prisijungti nepavyko. Uždarykite langą ir bandykite dar kartą.'}</p>
<script>
(function () {
  var message = 'authorization:github:${status}:' + ${JSON.stringify(JSON.stringify(payload))};
  function receive(e) {
    if (e.origin !== window.location.origin) return;
    window.opener.postMessage(message, e.origin);
    window.removeEventListener('message', receive, false);
    setTimeout(function () { window.close(); }, 300);
  }
  window.addEventListener('message', receive, false);
  if (window.opener) window.opener.postMessage('authorizing:github', window.location.origin);
})();
</script></body></html>`;

const cookie = (req, name) => {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : '';
};

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', 'cms_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

  const { code, state } = req.query || {};
  if (!code || !state || state !== cookie(req, 'cms_oauth_state')) {
    res.status(400).send(page('error', { message: 'Neteisinga prisijungimo būsena. Bandykite dar kartą.' }));
    return;
  }
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
    });
    const data = await r.json();
    if (!data.access_token) throw new Error(data.error_description || data.error || 'Nėra prieigos rakto');
    res.status(200).send(page('success', { token: data.access_token, provider: 'github' }));
  } catch (err) {
    console.error('GitHub OAuth klaida:', err && err.message);
    res.status(500).send(page('error', { message: 'GitHub prisijungimas nepavyko.' }));
  }
};
