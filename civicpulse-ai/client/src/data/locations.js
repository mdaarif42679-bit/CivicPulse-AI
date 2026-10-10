// Schematic campus layout used by the map. Positions are illustrative, not GPS coordinates.
export const ZONES = [
  { key: 'gate', label: 'Main gate', x: 280, y: 262, re: /(gate|entranc)/i },
  { key: 'hostel-a', label: 'Hostel A', x: 90, y: 70, re: /hostel\W*(block\W*)?a\b/i },
  { key: 'hostel-b', label: 'Hostel B', x: 90, y: 160, re: /hostel/i },
  { key: 'canteen', label: 'Canteen', x: 270, y: 100, re: /(canteen|mess|cafeteria)/i },
  { key: 'library', label: 'Library', x: 450, y: 70, re: /librar/i },
  { key: 'academic', label: 'Academic block', x: 440, y: 160, re: /(academic|lecture|classroom)/i },
  { key: 'parking', label: 'Parking', x: 160, y: 240, re: /parking/i },
  { key: 'sports', label: 'Sports ground', x: 400, y: 245, re: /(sports|ground)/i },
];
export const matchZone = (loc) => ZONES.find((z) => z.re.test(loc || '')) || null;
export const SAMPLE_REPORTS = [
  { text: 'Water is accumulating near the main college gate.', location: 'Main College Gate' },
  { text: 'The entrance road is flooded after rain.', location: '' },
  { text: 'There is a drainage problem near the college gate.', location: 'College gate' },
];
export const CATEGORY_OPTIONS = ['Infrastructure', 'Sanitation', 'Electrical', 'Water Supply', 'Safety', 'Other'];
