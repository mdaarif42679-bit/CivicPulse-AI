import { config } from '../config.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const geminiState = { ok: null, lastError: null, lastCallAt: null };

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini API ${res.status}: ${t.slice(0, 160)}`);
  }
  return res.json();
}
const mark = (ok, err) => { geminiState.ok = ok; geminiState.lastError = ok ? null : String(err.message).slice(0, 180); geminiState.lastCallAt = new Date().toISOString(); };

/** Calls generateContent and returns parsed JSON. `parts` = [{text}|{inline_data:{mime_type,data}}] */
export async function generateJson(parts) {
  try {
    const data = await post(`${BASE}/${config.geminiModel}:generateContent`, {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    });
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    mark(true);
    return parsed;
  } catch (e) { mark(false, e); throw e; }
}

export async function embedText(text) {
  try {
    const data = await post(`${BASE}/${config.embeddingModel}:embedContent`, {
      model: `models/${config.embeddingModel}`,
      content: { parts: [{ text }] },
      taskType: 'SEMANTIC_SIMILARITY',
    });
    const values = data?.embedding?.values;
    if (!Array.isArray(values)) throw new Error('Gemini embedding response had no values');
    mark(true);
    return values;
  } catch (e) { mark(false, e); throw e; }
}
