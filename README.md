# Workforce MX

**workforcemx.com** — Sitio web oficial de Workforce MX (soluciones digitales).

## Publica (después de que este repo exista)

1. [Vercel](https://vercel.com) → **Add New...** → **Project**
2. Importa `hiqmxx/workforce-mx` desde GitHub
3. **Deploy**

Luego: **Settings → Domains** → `workforcemx.com` → seguir instrucciones DNS (A/AAAA o CNAME) en IONOS.

El chatbot se activará automáticamente. **No se requiere configuración adicional en el código** — las credenciales viven en Vercel como variables de entorno (`Settings → Environment Variables`):

| Variable | Descripción |
|---|---|
| `GEMINI_API_KEY` | Clave de Google AI Studio (generada en https://aistudio.google.com/apikey) |

> **Nunca** subir llaves al repositorio.
