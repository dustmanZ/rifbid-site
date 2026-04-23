/**
 * Rifbid Contact Form — Cloudflare Worker
 *
 * Deploy via Cloudflare Dashboard or Wrangler CLI.
 * Store your SendGrid key as a secret (never in code):
 *   wrangler secret put SENDGRID_API_KEY
 *
 * The worker accepts POST requests from the Rifbid SPA contact form,
 * calls SendGrid's v3 /mail/send API, and returns JSON.
 */

const ALLOWED_ORIGINS = [
  'https://rifbid.com',
  'https://dustmanz.github.io',
  'http://localhost',
  'http://127.0.0.1',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const { role, name, email, organization, roleTitle, message } = body;

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const emailPayload = {
      personalizations: [
        {
          to: [{ email: 'shergaun@rifbid.com', name: 'Shergaun — Rifbid' }],
          subject: `New Contact Request — ${name} (${organization || 'No org'})`,
        },
      ],
      from: { email: 'info@rifbid.com', name: 'Rifbid Contact Form' },
      reply_to: { email: email, name: name },
      content: [
        {
          type: 'text/html',
          value: `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9f9f9">
  <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #eee">
    <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin-bottom:24px">Rifbid — New Contact Request</div>
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#888;font-size:14px;width:120px">Role</td><td style="padding:8px 0;font-size:14px;color:#111">${escapeHtml(role || '—')}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:14px">Name</td><td style="padding:8px 0;font-size:14px;color:#111">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:14px">Email</td><td style="padding:8px 0;font-size:14px;color:#111"><a href="mailto:${escapeHtml(email)}" style="color:#111">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:14px">Organization</td><td style="padding:8px 0;font-size:14px;color:#111">${escapeHtml(organization || '—')}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:14px">Job title</td><td style="padding:8px 0;font-size:14px;color:#111">${escapeHtml(roleTitle || '—')}</td></tr>
    </table>
    <div style="margin-top:24px;padding-top:24px;border-top:1px solid #eee">
      <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;margin-bottom:10px">What they're exploring</div>
      <p style="font-size:15px;color:#111;line-height:1.6;margin:0">${escapeHtml(message || '—').replace(/\n/g, '<br>')}</p>
    </div>
    <div style="margin-top:32px;font-size:12px;color:#bbb">Submitted via rifbid.com contact form</div>
  </div>
</body>
</html>`,
        },
      ],
    };

    try {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (sgRes.status === 202) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }

      const errText = await sgRes.text();
      console.error('SendGrid error:', sgRes.status, errText);
      return new Response(JSON.stringify({ error: 'Email delivery failed', detail: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    } catch (err) {
      console.error('Worker fetch error:', err);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
