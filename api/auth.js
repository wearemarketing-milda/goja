// CMS prisijungimas per GitHub (1 žingsnis): nukreipia į GitHub autorizacijos langą.
// Reikalingi Vercel Environment Variables: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.
const crypto = require('crypto');

module.exports = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Trūksta GITHUB_CLIENT_ID aplinkos kintamojo.');
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `https://${host}/api/callback`;
  const scope = 'repo,user';
  res.setHeader('Set-Cookie', `cms_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.setHeader('Cache-Control', 'no-store');
  const url = 'https://github.com/login/oauth/authorize'
    + `?client_id=${encodeURIComponent(clientId)}`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`
    + `&scope=${encodeURIComponent(scope)}`
    + `&state=${state}`;
  res.writeHead(302, { Location: url });
  res.end();
};
