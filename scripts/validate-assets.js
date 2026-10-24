#!/usr/bin/env node
/**
 * Asset structure + JSON validation for fly-go-assets
 * Errors fail CI. Missing optional images are warnings only.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const errors = [];
const warnings = [];

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

// Required structure / site files
[
  'index.html',
  'css/styles.css',
  'js/app.js',
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

// Character registry
const index = readJson('data/characters.json');
if (index && Array.isArray(index.characters)) {
  index.characters.forEach((c) => {
    if (!c.id || !c.path) {
      errors.push(`characters.json entry missing id/path: ${JSON.stringify(c)}`);
      return;
    }
    if (!exists(c.path)) {
      errors.push(`Character path missing: ${c.path}`);
      return;
    }
    const meta = readJson(c.path);
    if (!meta) return;
    if (meta.id !== c.id) {
      errors.push(`ID mismatch for ${c.id}: json has "${meta.id}"`);
    }
    // Optional image assets — warn only
    const charFile = meta.assets && meta.assets.char;
    const logoFile = meta.assets && meta.assets.logo;
    if (charFile) {
      const p = path.join('assets/characters', c.id, charFile);
      if (!exists(p)) warnings.push(`Missing character art: ${p}`);
    }
    if (logoFile) {
      const p = path.join('assets/characters', c.id, logoFile);
      if (!exists(p)) warnings.push(`Missing character emblem: ${p}`);
    }
  });
}

// Branding — warn only
[
  'assets/branding/fly-go-logo.png',
  'assets/branding/fly-go-logo.svg',
  'assets/branding/fly-go-icon.png'
].forEach((p) => {
  if (!exists(p)) warnings.push(`Missing branding asset: ${p}`);
});

if (warnings.length) {
  console.log('Warnings (non-blocking):\n');
  warnings.forEach((w) => console.log('  ○', w));
  console.log('');
}

if (errors.length) {
  console.error('Asset validation failed:\n');
  errors.forEach((e) => console.error('  •', e));
  process.exit(1);
}

console.log('Asset validation passed.');
