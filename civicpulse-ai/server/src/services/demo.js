import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { store, uid } from './store.js';

function scene(v) {
  const water = [[250, 285, 190, 30], [300, 300, 230, 38], [220, 295, 160, 26]][v];
  const rain = Array.from({ length: 26 }, (_, i) => `<line x1="${(i * 37 + v * 13) % 600}" y1="${(i * 53) % 150}" x2="${((i * 37 + v * 13) % 600) - 10}" y2="${((i * 53) % 150) + 22}" stroke="#9fb8c4" stroke-width="1.5" opacity=".55"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><rect width="600" height="400" fill="#c9d6d6"/><rect y="230" width="600" height="170" fill="#4b5457"/><rect x="40" y="90" width="48" height="170" fill="#8c8173"/><rect x="512" y="90" width="48" height="170" fill="#8c8173"/><rect x="40" y="70" width="520" height="26" fill="#6e655a"/><rect x="215" y="76" width="170" height="14" fill="#e8e1d2"/>${rain}<ellipse cx="${water[0] + 50}" cy="${water[1]}" rx="${water[2]}" ry="${water[3]}" fill="#6f8f9c" opacity=".85"/><ellipse cx="${water[0] + 20}" cy="${water[1] - 4}" rx="${water[2] * 0.5}" ry="${water[3] * 0.4}" fill="#9ab5c0" opacity=".6"/><rect x="0" y="372" width="600" height="28" fill="#000" opacity=".55"/><text x="12" y="391" font-family="sans-serif" font-size="13" fill="#fff">Demo illustration, not a real photo</text></svg>`;
}

const H = 3600000;
const SEED = [
  ['Water has accumulated near the main college gate after heavy rain.', 'Main College Gate', 50, 0],
  ['The entrance road is flooded and students are struggling to cross.', '', 44, 1],
  ['Drainage is blocked near the college entrance.', 'College entrance', 38, null],
  ['Large amount of water is collected near the gate.', '', 31, 2],
  ['Vehicles are having difficulty entering because of standing water.', 'Gate', 26, null],
  ['Street light near Hostel Block B has stopped working. The path is completely dark at night.', 'Hostel Block B', 24, null],
  ['Rainwater has been standing at the college gate since morning and the drain seems clogged.', 'Main Gate', 20, null],
  ['Garbage bins near the canteen are overflowing and there is a strong smell.', 'Canteen', 16, null],
  ['Students are slipping near the college gate because of water on the road.', '', 12, null],
  ['A water pipe is leaking inside the Hostel Block A washroom.', 'Hostel Block A', 9, null],
  ['Water logging at the front gate again, traffic is moving very slowly.', 'Front gate', 5, null],
  ['Second street light on the Hostel Block B path is flickering and the area is dark.', 'Hostel Block B', 3, null],
];

export function loadDemo() {
  store.reset();
  fs.mkdirSync(config.uploadDir, { recursive: true });
  [0, 1, 2].forEach((v) => fs.writeFileSync(path.join(config.uploadDir, `demo-gate-${v + 1}.svg`), scene(v)));
  const now = Date.now();
  SEED.forEach(([description, location, hoursAgo, img]) => {
    store.insert('reports', {
      id: uid('rep'), description, location, category: '', timestamp: new Date(now - hoursAgo * H).toISOString(),
      imageUrl: img !== null ? `/uploads/demo-gate-${img + 1}.svg` : null, imageFile: null, imageMime: null,
      audioUrl: null, audioFile: null, audioMime: null, aiAnalysis: null, embedding: null, embeddingSource: null,
      issueId: null, status: 'received', clusterScore: null, isDemo: true,
    });
  });
  return SEED.length;
}
