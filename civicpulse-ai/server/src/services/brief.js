import { config } from '../config.js';
import { generateJson } from './gemini.js';
import { TOPIC_PHRASES } from '../utils/text.js';

const uniq = (a) => [...new Set(a.filter(Boolean))];

function templateBrief(issue, reports) {
  const n = reports.length;
  const images = reports.filter((r) => r.imageUrl).length;
  const topic = issue.topic || reports[0]?.aiAnalysis?.topic || 'a local issue';
  const phrase = TOPIC_PHRASES[topic] || { what: topic.toLowerCase(), impact: 'Impact is not yet confirmed.' };
  const areas = uniq(reports.map((r) => r.aiAnalysis?.affectedArea));
  return {
    whatHappened: n > 1
      ? `${n} separate reports indicate ${phrase.what} at this location.`
      : `One report indicates ${phrase.what}. No other reports match yet.`,
    where: issue.location || 'Location not specified',
    evidence: `${n} related report${n === 1 ? '' : 's'}${images ? ` and ${images} uploaded image${images === 1 ? '' : 's'}` : ' (no images uploaded)'}.`,
    impact: `${phrase.impact}${areas[0] ? ` Possibly affected: ${areas[0].toLowerCase()}.` : ''}`,
    needsVerification: [
      'Confirm the condition on site',
      'Check whether the uploaded photos match the reported location',
      n > 1 ? 'Confirm the grouped reports describe the same problem' : 'Wait for or request further reports',
    ],
    source: 'template',
  };
}

export async function generateBrief(issue, reports) {
  if (config.demoMode) return { ...templateBrief(issue, reports), generatedAt: new Date().toISOString() };
  try {
    const lines = reports.slice(0, 15).map((r, i) => `${i + 1}. [${r.timestamp}] ${r.description || r.aiAnalysis?.summary} (location: ${r.aiAnalysis?.location || r.location || 'n/a'}, image: ${r.imageUrl ? 'yes' : 'no'})`);
    const raw = await generateJson([{ text:
      `You write a short neutral brief for a civic issue reviewer. The reports below were grouped by software and are UNVERIFIED.
Use hedged wording ("reports indicate"). Do not invent facts, causes or numbers.
Reports (${reports.length} total):\n${lines.join('\n')}
Return JSON only: {"whatHappened": string, "where": string, "evidence": string, "impact": string, "needsVerification": string[] (2-4 items)}` }]);
    const b = {
      whatHappened: String(raw.whatHappened || ''), where: String(raw.where || issue.location || ''),
      evidence: String(raw.evidence || ''), impact: String(raw.impact || ''),
      needsVerification: (Array.isArray(raw.needsVerification) ? raw.needsVerification : []).map(String).slice(0, 4),
      source: 'gemini',
    };
    if (!b.whatHappened) throw new Error('empty brief');
    return { ...b, generatedAt: new Date().toISOString() };
  } catch (e) {
    console.warn('[brief] Gemini failed, using template:', e.message);
    return { ...templateBrief(issue, reports), source: 'template-fallback', generatedAt: new Date().toISOString() };
  }
}
