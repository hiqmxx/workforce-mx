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

function systemPrompt() {
  const k = knowledge;
  return `Eres el asistente de Workforce MX. Responde en español, de forma breve y directa.
Servicios: ${k.servicios.map(s => `${s.nombre}: ${s.descripcion}`).join('; ')}
Productos: ${k.productos.map(p => `${p.nombre}: ${p.descripcion}`).join('; ')}
Contacto: ${k.negocio.contacto.horario}, ${k.negocio.contacto.ubicacion}
WhatsApp: +52 33 2953 1372 | Email: admin@workforcemx.com
Si no sabes algo, deriva a WhatsApp/Email.`;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_MODEL_FALLBACK = process.env.GEMINI_MODEL_FALLBACK || 'gemini-2.5-pro';

async function callGemini(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2000 }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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

  if (!GEMINI_API_KEY) {
    res.status(500).json({ error: 'Servidor mal configurado: falta GEMINI_API_KEY' });
    return;
  }

  const prompt = `${systemPrompt()}\n\nUsuario: ${message}`;

  try {
    let reply = await callGemini(GEMINI_MODEL, prompt);
    if (!reply) throw new Error('empty');
    reply = fixMojibake(reply);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ reply });
  } catch (e1) {
    try {
      let reply = await callGemini(GEMINI_MODEL_FALLBACK, prompt);
      if (!reply) throw new Error('empty');
      reply = fixMojibake(reply);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).json({ reply });
    } catch (e2) {
      res.status(502).json({ error: 'El servicio de IA no está disponible, intenta más tarde.' });
    }
  }
}
