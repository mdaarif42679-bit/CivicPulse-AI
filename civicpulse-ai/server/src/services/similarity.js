import { config } from '../config.js';
import { embedText } from './gemini.js';
import { store } from './store.js';
import { conceptVector, locationSimilarity } from '../utils/text.js';

export function calculateSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? d / Math.sqrt(na * nb) : 0;
}
export const embeddingText = (report, analysis) =>
  [analysis?.title, report.description, analysis?.location || report.location].filter(Boolean).join('. ');

/** Gemini embedding when connected; deterministic concept vector otherwise. `source` tells which one was used. */
export async function generateEmbedding(text, { force } = {}) {
  if (force !== 'demo-concept' && !config.demoMode) {
    try { return { vector: await embedText(text), source: 'gemini' }; }
    catch (e) { console.warn('[embedding] Gemini failed, using fallback:', e.message); }
  }
  return { vector: conceptVector(text), source: 'demo-concept' };
}

/** Scores `report` against every other analyzed report. Combined score = 0.75 text similarity + 0.25 location similarity. */
export async function findRelatedReports(report) {
  const src = report.embeddingSource;
  const out = [];
  for (const c of store.all('reports')) {
    if (c.id === report.id || !c.aiAnalysis) continue;
    let vec = c.embeddingSource === src ? c.embedding : null;
    if (!vec) {
      try {
        const r = await generateEmbedding(embeddingText(c, c.aiAnalysis), { force: src === 'demo-concept' ? 'demo-concept' : undefined });
        if (r.source !== src) continue;
        vec = r.vector;
        store.update('reports', c.id, { embedding: vec, embeddingSource: src });
      } catch { continue; }
    }
    const textScore = calculateSimilarity(report.embedding, vec);
    const locScore = locationSimilarity(report.aiAnalysis.location || report.location, c.aiAnalysis.location || c.location);
    const sameCategory = report.aiAnalysis.category === c.aiAnalysis.category;
    let score = 0.75 * textScore + 0.25 * locScore;
    if (!sameCategory && textScore < 0.85) score = Math.min(score, 0.4);
    out.push({
      reportId: c.id, issueId: c.issueId || null, sameCategory,
      textScore: +textScore.toFixed(3), locScore: +locScore.toFixed(3), score: +score.toFixed(3),
      related: score >= config.similarityThreshold,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}
