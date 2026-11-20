import fs from 'node:fs';

const knowledge = JSON.parse(fs.readFileSync(new URL('./knowledge.json', import.meta.url)));
const RL = new Map();

function fixMojibake(text) {
  try {
    const fixed = Buffer.from(text, 'latin1').toString('utf8');
    if (!fixed.includes('\uFFFD')) return fixed;
  } catch {}
  return text.replace(/Â/g, '').trim();
}

function keywordResponse(message) {
  const m = message.toLowerCase();
  const k = knowledge;
  if (m.includes('servicio') || m.includes('servicios')) {
    return 'Servicios:\n' + k.servicios.map(s => '- ' + s.nombre + ': ' + s.descripcion).join('\n');
  }
  if (m.includes('producto') || m.includes('productos')) {
    return 'Productos:\n' + k.productos.map(p => '- ' + p.nombre + ': ' + p.descripcion).join('\n');
  }
  if (m.includes('whatsapp') || m.includes('contacto') || m.includes('llamar') || m.includes('llámanos')) {
    return 'Contacto: WhatsApp +52 33 2953 1372 | Email: admin@workforcemx.com';
  }
  if (m.includes('precio') || m.includes('cotizar')) {
    return 'Los precios son por cotización. Escríbenos por WhatsApp al +52 33 2953 1372 para una cotización personalizada.';
  }
  if (m.includes('horario')) {
    return 'Horario: ' + k.negocio.contacto.horario;
  }
  if (m.includes('ubicación') || m.includes('ubicacion') || m.includes('donde') || m.includes('dónde')) {
    return 'Ubicación: ' + k.negocio.contacto.ubicacion;
  }
  return 'Hola, soy el asistente de Workforce MX. Puedo ayudarte con servicios, productos, precios, horario y ubicación. Para cotizaciones o más info, escríbenos por WhatsApp al +52 33 2953 1372 o por email a admin@workforcemx.com.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon').toString().split(',')[0].trim();
  const now = Date.now();
  const hits = (RL.get(ip) || []).filter(t => now - t < 60_000);
  if (hits.length >= 15) {
    res.status(429).json({ error: 'Demasiados mensajes, intenta en un minuto.' });
    return;
  }
  hits.push(now);
  RL.set(ip, hits);

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const message = (body && typeof body.message === 'string' ? body.message : '').trim();
  if (!message || message.length > 500) {
    res.status(400).json({ error: 'Mensaje vacío o demasiado largo (máx 500 caracteres)' });
    return;
  }

  const reply = fixMojibake(keywordResponse(message));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ reply });
}
