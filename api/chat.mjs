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

function buildReply(message) {
  const k = knowledge;
  const msg = message.toLowerCase();
  const contacto = k.negocio.contacto;
  const whatsapp = '+52 33 2953 1372';
  const email = 'admin@workforcemx.com';

  if (msg.includes('servicio') || msg.includes('servicios')) {
    const lista = k.servicios.map(s => `• ${s.nombre}: ${s.descripcion}`).join('\n');
    return fixMojibake(`¡Claro! Te cuento qué servicios ofrecemos:\n\n${lista}\n\n¿Te interesa alguno en particular? Escríbenos por WhatsApp al ${whatsapp} o al correo ${email} y te cotizamos sin compromiso.`);
  }

  if (msg.includes('producto') || msg.includes('productos')) {
    const lista = k.productos.map(p => `• ${p.nombre}: ${p.descripcion}`).join('\n');
    return fixMojibake(`Tenemos estos sistemas listos para usar:\n\n${lista}\n\nLos precios son personalizados. Contáctanos por WhatsApp al ${whatsapp} o al correo ${email} y te pasamos la cotización.`);
  }

  if (msg.includes('whatsapp') || msg.includes('contacto') || msg.includes('llamar') || msg.includes('llámanos')) {
    return fixMojibake(`¡Claro! Puedes escribirnos directo por WhatsApp al ${whatsapp} o mandarnos un correo a ${email}. Te respondemos el mismo día.`);
  }

  if (msg.includes('precio') || msg.includes('cotizar')) {
    return fixMojibake(`Los precios los damos solo por WhatsApp para que sean precisos a tu caso. Escríbenos al ${whatsapp} y te cotizamos sin compromiso.`);
  }

  if (msg.includes('horario')) {
    return fixMojibake(`Nuestro horario es: ${contacto.horario}.\n\nSi necesitas algo fuera de ese horario, mándanos WhatsApp al ${whatsapp} y te contestamos en cuanto podamos.`);
  }

  if (msg.includes('ubicación') || msg.includes('donde') || msg.includes('dónde')) {
    return fixMojibake(`Estamos en ${contacto.ubicacion}.\n\nAtendemos en línea a todo México. Si quieres la ubicación exacta o agendar una visita, escríbenos por WhatsApp al ${whatsapp}.`);
  }

  return fixMojibake(`¡Hola! ?? Soy el asistente de Workforce MX. Puedo contarte sobre nuestros servicios, productos, horarios o ubicación.\n\nSi necesitas una cotización o tienes alguna duda específica, escríbenos directo por WhatsApp al ${whatsapp} o al correo ${email} y te atendemos al tiro.`);
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

  const reply = buildReply(message);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ reply });
}