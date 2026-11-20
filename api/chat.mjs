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
  const c = k.negocio.contacto;
  return `Eres el asistente de Workforce MX. Responde en español, de forma breve y directa.
Servicios: ${k.servicios.map(s => `${s.nombre}: ${s.descripcion}`).join('; ')}
Productos: ${k.productos.map(p => `${p.nombre}: ${p.descripcion}`).join('; ')}
Contacto: ${c.horario}, ${c.ubicacion}
WhatsApp: ${c.whatsapp} | Email: ${c.correo}
Tono: ${k.tono?.estilo ?? 'Tuteo, cercano y profesional. Respuestas cortas.'}
Si no sabes algo, deriva a WhatsApp/Email. Nunca inventes precios que no esten en este archivo.`;
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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const GEMINI_MODEL_FALLBACK = process.env.GEMINI_MODEL_FALLBACK || 'gemini-3.1-flash-lite';
const BUDGET_MS = 9000;
const PER_MODEL_MS = 3500;

async function callGemini(model, prompt, timeoutMs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('respuesta vacia');
  return text;
}

function send(res, reply) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ reply });
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

  // IA con presupuesto de tiempo; si falla o se tarda, responde el bot estatico.
  if (GEMINI_API_KEY) {
    // Los modelos buenos van siempre al final: aunque Vercel tenga un modelo
    // viejo configurado (ej. gemini-2.5-flash, hoy 404), se llega a ellos.
    const models = [...new Set([GEMINI_MODEL, GEMINI_MODEL_FALLBACK, 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'])];
    const start = Date.now();
    for (const model of models) {
      const remaining = BUDGET_MS - (Date.now() - start);
      if (remaining < 1000) break;
      const timeoutMs = Math.min(remaining, PER_MODEL_MS);
      try {
        const reply = fixMojibake(await callGemini(model, systemPrompt() + `\n\nUsuario: ${message}`, timeoutMs));
        send(res, reply);
        return;
      } catch (e) {
        console.error(`[chat] Gemini ${model} fallo: ${e.message}`);
      }
    }
  } else {
    console.error('[chat] falta GEMINI_API_KEY; usando respuesta estatica');
  }

  send(res, fixMojibake(keywordResponse(message)));
}
