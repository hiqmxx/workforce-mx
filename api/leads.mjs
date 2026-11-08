export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const origin = req.headers.origin || '';
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  const corsOrigin = allowedOrigin === '*' ? '*' : (origin === allowedOrigin ? origin : allowedOrigin);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const nombre = (body && typeof body.nombre === 'string' ? body.nombre : '').trim().slice(0, 120);
  const whatsapp = (body && typeof body.whatsapp === 'string' ? body.whatsapp : '').trim().slice(0, 30);
  const mensaje = (body && typeof body.mensaje === 'string' ? body.mensaje : '').trim().slice(0, 1000);
  const origen = (body && typeof body.origen === 'string' ? body.origen : '').trim().slice(0, 50) || 'web';
  const consentimiento = body && body.consentimiento === true;

  if (!whatsapp) {
    res.status(400).json({ error: 'WhatsApp es obligatorio' });
    return;
  }

  const phoneDigits = whatsapp.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    res.status(400).json({ error: 'WhatsApp inválido' });
    return;
  }

  const payload = {
    nombre: nombre || '(chat)',
    whatsapp: phoneDigits,
    mensaje,
    origen,
    consentimiento,
    timestamp: new Date().toISOString(),
    ua: req.headers['user-agent'] || '',
    referrer: req.headers.referer || '',
  };

  const webhookUrl = process.env.LEADS_WEBHOOK_URL;
  if (!webhookUrl) {
    res.status(202).json({ ok: true, stored: 'disabled' });
    return;
  }

  try {
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      res.status(200).json({ ok: true, stored: 'webhook' });
    } else {
      res.status(202).json({ ok: true, stored: 'pending' });
    }
  } catch {
    res.status(202).json({ ok: true, stored: 'pending' });
  }
}