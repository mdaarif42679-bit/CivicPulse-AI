import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { generateJson } from './gemini.js';
import { CATEGORIES, SEVERITIES, ruleAnalysis } from '../utils/text.js';

const IMG_OK = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const readB64 = (name) => { try { return fs.readFileSync(path.join(config.uploadDir, name)).toString('base64'); } catch { return null; } };

const PROMPT = `You assist a civic issue triage tool. Extract structured data from ONE citizen report (text, and optionally a photo and/or a voice note).
Rules: use only what the report says or the media clearly shows. Do not invent facts. If unsure, lower "confidence".
Return JSON only, with exactly these keys:
{"category": one of ${JSON.stringify(CATEGORIES)},
 "topic": short noun phrase for the underlying problem (e.g. "Waterlogging"),
 "title": "<Problem> near <Place>" (max 70 chars),
 "location": place named or shown, or "",
 "summary": one sentence (max 200 chars),
 "severity": one of ${JSON.stringify(SEVERITIES)},
 "affectedArea": who or what may be affected,
 "keyEntities": string[] (max 6),
 "evidence": string[] of observable facts stated in the report or visible in the media,
 "confidence": number between 0 and 1,
 "transcript": transcription of the voice note, or "" if none}`;

function normalize(raw, report) {
  const num = Number(raw.confidence);
  return {
    topic: String(raw.topic || 'Local issue').slice(0, 60),
    category: CATEGORIES.includes(report.category) ? report.category : CATEGORIES.includes(raw.category) ? raw.category : 'Other',
    title: String(raw.title || raw.topic || 'Local issue').slice(0, 90),
    location: String(raw.location || report.location || '').slice(0, 120),
    summary: String(raw.summary || '').slice(0, 220),
    severity: SEVERITIES.includes(raw.severity) ? raw.severity : 'medium',
    affectedArea: String(raw.affectedArea || '').slice(0, 160),
    keyEntities: (Array.isArray(raw.keyEntities) ? raw.keyEntities : []).map(String).slice(0, 6),
    evidence: (Array.isArray(raw.evidence) ? raw.evidence : []).map(String).slice(0, 6),
    confidence: Number.isFinite(num) ? Math.max(0, Math.min(1, +num.toFixed(2))) : 0.5,
    transcript: String(raw.transcript || '').slice(0, 2000),
  };
}

/** Returns an analysis object. Uses Gemini when connected, otherwise (or on failure) deterministic rules. */
export async function analyzeReport(report) {
  const flags = { hasImage: !!report.imageFile, hasAudio: !!report.audioFile };
  if (config.demoMode) return { ...ruleAnalysis(report, flags), source: 'demo-rules' };
  try {
    const parts = [{ text: PROMPT }, { text: `Report text: ${report.description || '(none, see voice note)'}\nLocation given by reporter: ${report.location || '(none)'}\nCategory given by reporter: ${report.category || '(none)'}` }];
    if (report.imageFile && IMG_OK.has(report.imageMime)) { const d = readB64(report.imageFile); if (d) parts.push({ inline_data: { mime_type: report.imageMime, data: d } }); }
    if (report.audioFile) { const d = readB64(report.audioFile); if (d) parts.push({ inline_data: { mime_type: (report.audioMime || 'audio/webm').split(';')[0], data: d } }); }
    const raw = await generateJson(parts);
    return { ...normalize(raw, report), source: 'gemini' };
  } catch (e) {
    console.warn('[analysis] Gemini failed, using rule-based fallback:', e.message);
    return { ...ruleAnalysis(report, flags), source: 'rules-fallback', note: 'Gemini was unavailable for this report; deterministic fallback used.' };
  }
}
