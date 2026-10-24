# Asset Guidelines

How to name, organize, and contribute assets to this repository.

## Naming

- Character folders: lowercase id (`speedy`, `darkz`)
- Character art: `<id>-char.png`, `<id>-logo.png`
- Branding: `fly-go-*.png` / `.svg`

## Formats

- Prefer PNG for raster character art
- SVG for logos/icons when possible
- Keep files under size limits defined in `assets/settings.json`

## Structure

Do not invent new top-level folders without updating this doc and the validation script.

## Validation

Run `node scripts/validate-assets.js` before opening a PR. CI runs the same check on every push.
