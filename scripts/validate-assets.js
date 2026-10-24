#!/usr/bin/env node
/**
 * Simple asset structure + JSON validation for fly-go-assets
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const errors = [];

function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

function readJson(p) {
  const full = path.join(ROOT, p);
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    errors.push(`Invalid JSON: ${p} — ${e.message}`);
    return null;
  }
}

// Required top-level paths
[
  'assets/card.json',
  'assets/settings.json',
  'assets/manifest.json',
  'data/characters.json',
  'data/factions.json',
  'data/abilities.json',
  'data/timeline.json',
  'data/world.json',
  'docs/UNIVERSE.md',
  'docs/CHARACTERS.md',
  'docs/ASSET-GUIDELINES.md'
].forEach((p) => {
  if (!exists(p)) errors.push(`Missing required path: ${p}`);
});

// Character roster must match folders
const index = readJson('data/characters.json');
if (index && Array.isArray(index.characters)) {
  index.characters.forEach((c) => {
    if (!c.id || !c.path) {
      errors.push(`characters.json entry missing id/path: ${JSON.stringify(c)}`);
      return;
    }
    if (!exists(c.path)) {
      errors.push(`Character path missing: ${c.path}`);
    } else {
      const meta = readJson(c.path);
      if (meta && meta.id !== c.id) {
        errors.push(`ID mismatch for ${c.id}: json has "${meta.id}"`);
      }
    }
  });
}

if (errors.length) {
  console.error('Asset validation failed:\n');
  errors.forEach((e) => console.error('  •', e));
  process.exit(1);
}

console.log('Asset validation passed.');
