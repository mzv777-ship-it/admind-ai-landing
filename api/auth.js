export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords',
      access_type: 'offline',
      prompt: 'consent',
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();

  if (tokens.error) {
    return res.status(400).json({ error: tokens.error, description: tokens.error_description });
  }

  res.send(`
    <html>
    <body style="font-family:monospace;background:#0a0a0a;color:#00ff88;padding:40px;">
      <h2>✅ Авторизация успешна!</h2>
      <p>Скопируй Refresh Token и добавь в Vercel как переменную окружения:</p>
      <p><b>GOOGLE_REFRESH_TOKEN</b></p>
      <textarea style="width:100%;height:80px;background:#111;color:#00ff88;border:1px solid #00ff88;padding:10px;font-size:12px;">${tokens.refresh_token}</textarea>
      <br><br>
      <p>После добавления переменной — <a href="/dashboard.html" style="color:#00ff88;">открой дашборд</a></p>
    </body>
    </html>
  `);
}
