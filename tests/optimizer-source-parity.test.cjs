// Source parity and optimizer smoke guards for Tower & Swords V2.3.
// Usage (from repository root):
//   node tests/optimizer-source-parity.test.cjs
// These are static checks. They do NOT substitute for real-browser performance tests.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const names = [
  'TowerSwords_V2.3_Desktop_Release.html',
  'TowerSwords_V2.3_Mobile_Release.html',
];
const files = names.map(name => fs.readFileSync(path.join(root, name), 'utf8'));
function segment(source, begin, end) {
  const start = source.indexOf(begin);
  assert.notEqual(start, -1, 'Missing source marker: ' + begin);
  const stop = source.indexOf(end, start);
  assert.ok(stop > start, 'Missing ending marker: ' + end);
  return source.slice(start, stop);
}
function scriptIds(source) {
  return [...source.matchAll(/<script\b[^>]*\bid=["']([^"']+)/gi)]
    .map(match => match[1]);
}
files.forEach((source, index) => {
  const platform = index === 0 ? 'desktop' : 'mobile';
  assert.match(source, /Tower &amp; Swords/);
  const starts = [...source.matchAll(/<script\b/gi)].length;
  const ends = [...source.matchAll(/<\/script>/gi)].length;
  assert.equal(starts, ends, platform + ' script tag balance');
  const ids = scriptIds(source);
  assert.equal(ids.length, new Set(ids).size, platform + ' duplicate script IDs');
  assert.ok(source.includes('auto-affix-table'), platform + ' full equipment affix table');
  assert.ok(source.includes('async function certifyEquipment('), platform + ' certification code');
  assert.ok(source.includes('betaAutoAssignmentToEq('), platform + ' equipment evaluation');
  assert.ok(source.includes('performance.now()-start<budget'), platform + ' time-bound guard');
});
const optimizer = files.map(source => segment(
  source, '<script id="r06-owned-artifact-auto-optimizer"',
  '<script id="p10-r03-character-adapter"'
));
const certificate = files.map(source => segment(
  source, 'async function certifyEquipment(',
  'function addUpperEnvelopeControl('
));
assert.equal(optimizer[0], optimizer[1],
  'Desktop/mobile optimizer logic must remain identical');
assert.equal(certificate[0], certificate[1],
  'Desktop/mobile certification logic must remain identical');

// A certificate ratio is a lower bound on achieved / global-optimum damage,
// NOT a percentage of explored equipment combinations.
const boundPercent = (best, upper) =>
  upper === best ? 100 : Math.floor((best / upper - 1e-12) * 100000) / 1000;
assert.equal(boundPercent(100, 100), 100);
assert.equal(boundPercent(37, 100), 37);
assert.ok(boundPercent(99.9, 100) >= 99.899 && boundPercent(99.9, 100) <= 99.9);
console.log('PASS: desktop/mobile script structure and optimizer parity');
console.log('NOTE: launch, input, language and damage accuracy still require browser tests');
