import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  // CORS — allow same-origin and local dev
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { role, name, email, organization, roleTitle, message } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const msg = {
    to:       { email: 'shergaun@rifbid.com', name: 'Shergaun — Rifbid' },
    from:     { email: 'info@rifbid.com',      name: 'Rifbid Contact Form' },
    replyTo:  { email: email, name: name },
    subject:  `New Contact Request — ${name} (${organization || 'No org'})`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9f9f9">
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #eee">
    <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin-bottom:24px">Rifbid — New Contact Request</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#888;font-size:14px;width:120px">Role</td><td style="padding:8px 0;font-size:14px;color:#111">${e(role)}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:14px">Name</td><td style="padding:8px 0;font-size:14px;color:#111">${e(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:14px">Email</td><td style="padding:8px 0;font-size:14px;color:#111"><a href="mailto:${e(email)}" style="color:#111">${e(email)}</a></td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:14px">Organization</td><td style="padding:8px 0;font-size:14px;color:#111">${e(organization)}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:14px">Job title</td><td style="padding:8px 0;font-size:14px;color:#111">${e(roleTitle)}</td></tr>
    </table>
    <div style="margin-top:24px;padding-top:24px;border-top:1px solid #eee">
      <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;margin-bottom:10px">What they're exploring</div>
      <p style="font-size:15px;color:#111;line-height:1.6;margin:0">${e(message).replace(/\n/g, '<br>')}</p>
    </div>
    <div style="margin-top:32px;font-size:12px;color:#bbb">Submitted via rifbid.com contact form</div>
  </div>
</body>
</html>`,
  };

  try {
    await sgMail.send(msg);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('SendGrid error:', err?.response?.body || err.message);
    return res.status(502).json({ error: 'Email delivery failed' });
  }
}

function e(str) {
  return String(str || '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
