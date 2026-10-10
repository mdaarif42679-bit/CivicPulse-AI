// Deterministic text utilities used by Demo Mode (and as fallback when Gemini is unavailable).
export const CATEGORIES = ['Infrastructure', 'Sanitation', 'Electrical', 'Water Supply', 'Safety', 'Other'];
export const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const STOP = new Set(('a an the is are was were be been being to of in on at near by for from and or but with has have had it its this that there ' +
  'their they them we our you your very after before due because while into out over under again also so as if then than too can could should ' +
  'would will just do does did i me my main some any since').split(' '));

// Groups of words that mean the same thing for matching purposes.
const CONCEPTS = [
  ['WATERLOG', /^(water|flood|rain|puddl|waterlog|drain|sewage|sewer|accumulat|stagnan|standing|submerg|inundat|clog)/],
  ['GATE', /^(gate|entranc|entry|entering|enter)/],
  ['CAMPUS', /^(college|campus|university)/],
  ['HOSTEL', /^(hostel|dorm)/],
  ['CANTEEN', /^(canteen|mess|cafeteria)/],
  ['LIBRARY', /^librar/],
  ['PARKING', /^parking/],
  ['LIGHT', /^(light|lamp|bulb|dark|flicker)/],
  ['GARBAGE', /^(garbage|trash|waste|dustbin|bins?$|litter|rubbish|smell|stink)/],
  ['SUPPLY', /^(leak|pipe|tap|plumb)/],
  ['ROADDMG', /^(pothol|crater)/],
  ['SAFETY', /^(spark|shock|fire|accident|unsafe|danger|stray)/],
];
const DIM = 256;
const CONCEPT_NAMES = CONCEPTS.map((c) => c[0]);

export function tokenize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));
}
const conceptOf = (tok) => { for (const [name, re] of CONCEPTS) if (re.test(tok)) return name; return null; };

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// Concept-aware bag-of-words vector: concept tokens weigh 3x so paraphrases ("flooded entrance" vs "water near gate") land close together.
export function conceptVector(text) {
  const tf = new Map();
  for (const tok of tokenize(text)) {
    const c = conceptOf(tok);
    const key = c ? 'C:' + c : 'W:' + tok.replace(/(ing|ed|s)$/, '');
    tf.set(key, (tf.get(key) || 0) + 1);
  }
  const vec = new Array(CONCEPT_NAMES.length + DIM).fill(0);
  for (const [key, n] of tf) {
    const w = Math.sqrt(n);
    if (key.startsWith('C:')) vec[CONCEPT_NAMES.indexOf(key.slice(2))] += 3 * w;
    else vec[CONCEPT_NAMES.length + (hash(key) % DIM)] += w;
  }
  return vec.map((v) => +v.toFixed(4));
}

// ---- Locations ----
const PLACES = [
  { re: /(gate|entranc)/i, name: 'Main College Gate', short: 'College Gate' },
  { re: /hostel\W*(block\W*)?([a-d])\b/i, name: (m) => `Hostel Block ${m[2].toUpperCase()}`, short: (m) => `Hostel Block ${m[2].toUpperCase()}` },
  { re: /hostel/i, name: 'Hostel Area', short: 'Hostel Area' },
  { re: /(canteen|mess|cafeteria)/i, name: 'Canteen', short: 'Canteen' },
  { re: /librar/i, name: 'Library', short: 'Library' },
  { re: /parking/i, name: 'Parking Area', short: 'Parking Area' },
  { re: /(sports|ground|playground)/i, name: 'Sports Ground', short: 'Sports Ground' },
  { re: /(academic|lecture|classroom)/i, name: 'Academic Block', short: 'Academic Block' },
];
export function detectPlace(...texts) {
  for (const t of texts) {
    if (!t) continue;
    for (const p of PLACES) {
      const m = String(t).match(p.re);
      if (m) return { name: typeof p.name === 'function' ? p.name(m) : p.name, short: typeof p.short === 'function' ? p.short(m) : p.short };
    }
  }
  return null;
}
export function locTokens(loc) {
  return [...new Set(tokenize(loc).map((t) => conceptOf(t) || t))];
}
export function locationSimilarity(a, b) {
  const ta = locTokens(a), tb = locTokens(b);
  if (!ta.length || !tb.length) return 0.5; // unknown location: neutral
  const inter = ta.filter((t) => tb.includes(t)).length;
  return inter / new Set([...ta, ...tb]).size;
}

// ---- Rule based analysis ----
const TOPICS = [
  { topic: 'Water supply leak', category: 'Water Supply', re: /(leak|pipe|tap\b|plumb|no water)/i, base: 1, area: 'Washrooms and adjoining corridors' },
  { topic: 'Garbage overflow', category: 'Sanitation', re: /(garbage|trash|waste|dustbin|\bbins?\b|litter|rubbish|stink|smell)/i, base: 1, area: 'Surrounding eating and walking area' },
  { topic: 'Waterlogging', category: 'Infrastructure', re: /(water|flood|rain|puddl|waterlog|drain|sewage|stagnan|standing)/i, base: 1, area: 'Access road and pedestrian path' },
  { topic: 'Street light failure', category: 'Electrical', re: /(light|lamp|bulb|dark)/i, base: 1, area: 'Pedestrian path after dark' },
  { topic: 'Road damage', category: 'Infrastructure', re: /(pothol|crater)/i, base: 1, area: 'Vehicle and pedestrian route' },
  { topic: 'Safety hazard', category: 'Safety', re: /(spark|exposed wire|shock|fire|accident|unsafe|stray|danger)/i, base: 2, area: 'Surrounding area' },
];
const ESCALATORS = /(struggl|difficult|unable|stuck|blocked|danger|unsafe|heavy|large|completely|slip|fall|accident|spark|since morning|again)/gi;
const ENTITY_WORDS = /\b(students?|vehicles?|traffic|rain|drain(age)?|road|gate|entrance|pipe|street ?light|garbage|bins?|washroom|hostel|canteen|pedestrians?)\b/gi;

export function ruleAnalysis(report, { hasImage = false, hasAudio = false } = {}) {
  const text = report.description || '';
  const t = TOPICS.find((x) => x.re.test(text)) || { topic: 'General local issue', category: 'Other', base: 0, area: 'Reported location' };
  const place = detectPlace(report.location, text);
  const locName = place?.name || (report.location || '').trim();
  const hits = new Set((text.match(ESCALATORS) || []).map((s) => s.toLowerCase())).size;
  const sevIdx = Math.min(3, t.base + (hits >= 1 ? 1 : 0));
  const sentence = text.split(/(?<=[.!?])\s/)[0].slice(0, 160);
  const category = CATEGORIES.includes(report.category) ? report.category : t.category;
  const confidence = Math.min(0.85, 0.5 + (place ? 0.12 : 0) + (t.category !== 'Other' ? 0.12 : 0) + (text.length > 40 ? 0.06 : 0));
  const evidence = [sentence];
  if (hasImage) evidence.push('Photo attached (not visually analyzed in Demo Mode)');
  if (hasAudio) evidence.push('Voice note attached (not transcribed in Demo Mode)');
  return {
    topic: t.topic,
    category,
    title: place ? `${t.topic} near ${place.short}` : t.topic,
    location: locName,
    summary: sentence,
    severity: SEVERITIES[sevIdx],
    affectedArea: t.area,
    keyEntities: [...new Set((text.match(ENTITY_WORDS) || []).map((s) => s.toLowerCase()))].slice(0, 6),
    evidence,
    confidence: +confidence.toFixed(2),
    transcript: '',
  };
}
export const TOPIC_PHRASES = {
  Waterlogging: { what: 'water accumulation', impact: 'Pedestrians and vehicles may have difficulty using the access road.' },
  'Street light failure': { what: 'non-working street lights', impact: 'Reduced visibility and safety after dark.' },
  'Garbage overflow': { what: 'overflowing garbage bins', impact: 'Hygiene concerns and odour for people nearby.' },
  'Water supply leak': { what: 'a water leak', impact: 'Water wastage and possible damage or slippery floors.' },
  'Road damage': { what: 'damaged road surface', impact: 'Risk to vehicles and pedestrians.' },
  'Safety hazard': { what: 'a possible safety hazard', impact: 'Potential risk to people nearby; needs prompt inspection.' },
};
