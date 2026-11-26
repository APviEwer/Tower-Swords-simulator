// Standalone mathematical regression for PR #14's element/spell upper envelope.
// Run: node tests/optimizer-upper-envelope.test.cjs
// IMPORTANT: this does not execute the production optimizer or validate all its factors.
'use strict';
const assert = require('node:assert/strict');

function randomGenerator(initialSeed) {
  let seed = initialSeed >>> 0;
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function upperEnvelope(options, elementBase, spellBase) {
  const maxima = options.map(slot => [
    Math.max(...slot.map(v => v[0])),
    Math.max(...slot.map(v => v[1])),
  ]);
  let product = (
    elementBase + maxima.reduce((s, v) => s + v[0], 0) / 100
  ) * (
    spellBase + maxima.reduce((s, v) => s + v[1], 0) / 100
  );
  for (const weight of [1, spellBase / elementBase]) {
    const sum = weight * elementBase + spellBase
      + options.reduce((s, slot) =>
        s + Math.max(...slot.map(v => weight * v[0] + v[1])) / 100, 0);
    product = Math.min(product, sum * sum / (4 * weight));
  }
  return product;
}

function exhaustiveMaximum(options, elementBase, spellBase) {
  let best = -Infinity;
  function visit(i, element, spell) {
    if (i === options.length) {
      best = Math.max(best,
        (elementBase + element / 100) * (spellBase + spell / 100));
      return;
    }
    for (const [e, s] of options[i]) visit(i + 1, element + e, spell + s);
  }
  visit(0, 0, 0);
  return best;
}

const rand = randomGenerator(123456789);
const cases = 1500;
for (let trial = 0; trial < cases; trial++) {
  const count = 2 + Math.floor(rand() * 5);
  const elementBase = 1 + rand() * 8;
  const spellBase = 1 + rand() * 8;
  const options = Array.from({length: count}, () =>
    Array.from({length: 2 + Math.floor(rand() * 4)}, () => [
      Math.floor(rand() * 150),
      Math.floor(rand() * 150),
    ]));
  const upper = upperEnvelope(options, elementBase, spellBase);
  const exact = exhaustiveMaximum(options, elementBase, spellBase);
  assert.ok(upper + 1e-9 >= exact,
    `Upper bound underestimated exact optimum in case ${trial}: ${upper} < ${exact}`);
}
console.log(`PASS: ${cases} deterministic element/spell upper-bound cases`);
