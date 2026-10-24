# Fly Go — Asset Hub

Official static Asset Hub and asset repository for **Fly Go**.

Live structure supports a premium landing page, character gallery (heroes / antagonists), asset browser, and universe documentation — driven by JSON, with no backend.

**Repo:** https://github.com/blitzlabx/fly-go-assets

---

## Current status

| Layer | Status |
|-------|--------|
| Website (HTML / CSS / JS) | Implemented |
| Character registry & metadata | Implemented (9 characters) |
| Folder architecture | Implemented |
| **Image assets (logo, char art, emblems)** | **Not yet in repository** |

Upload artwork to the paths below. The site probes for files at runtime and shows them when present.

---

## Structure

```
fly-go-assets/
├── index.html              # Asset Hub entry
├── css/styles.css
├── js/app.js
├── assets/
│   ├── branding/           # fly-go-logo.png|svg, icon, wordmark, mono
│   ├── characters/<id>/    # <id>-char.png, <id>-logo.png, <id>.json
│   ├── backgrounds/
│   ├── environments/
│   ├── animations/
│   ├── effects/
│   ├── audio/
│   ├── ui/
│   ├── card.json
│   ├── settings.json
│   └── manifest.json
├── data/
│   ├── characters.json     # Registry (order, category, path)
│   ├── factions.json
│   ├── abilities.json
│   ├── timeline.json
│   └── world.json
├── docs/                   # Canon & guidelines
├── scripts/validate-assets.js
└── .github/workflows/
```

---

## Character roster

| ID | Name | Role | Category |
|----|------|------|----------|
| speedy | Speedy | Protagonist | Hero |
| timy | Timy | Ally | Hero |
| rokey | Rokey | Ally | Hero |
| blast | Blast | Ally | Hero |
| drift | Drift | Ally (newly featured) | Hero |
| sky | Sky | Ally (newly featured) | Hero |
| frosty | Frosty | Ally (newly featured) | Hero |
| vex | Vex | Rival villain | Antagonist |
| darkz | Darkz | Main villain | Antagonist |

Website visibility does **not** define canonical story introduction order.

---

## Expected image paths

**Branding**

- `assets/branding/fly-go-logo.png`
- `assets/branding/fly-go-logo.svg`
- `assets/branding/fly-go-icon.png`
- `assets/branding/fly-go-wordmark.png`
- `assets/branding/fly-go-monochrome.png`

**Per character** (`assets/characters/<id>/`)

- `<id>-char.png` — transparent character artwork
- `<id>-logo.png` — emblem / logo

---

## Adding a character

1. Create folder `assets/characters/<id>/`.
2. Add `<id>.json` (copy an existing character file and edit).
3. Add entry to `data/characters.json` with `id`, `path`, `order`, `category` (`hero` | `antagonist`), `role`.
4. Drop art files using the naming above.
5. Run validation: `node scripts/validate-assets.js`
6. No website code changes required — the gallery is JSON-driven.

---

## Local preview

Serve the repo root with any static server, for example:

```bash
npx serve .
# or
python -m http.server 8080
```

Open the printed URL. Fetch of JSON requires HTTP (not `file://`).

---

## Deploy

Compatible with GitHub Pages, Cloudflare Pages, Netlify, Vercel static, or any static host.

**GitHub Pages example**

1. Settings → Pages → Source: Deploy from branch `main` / root.
2. Site will be available at `https://blitzlabx.github.io/fly-go-assets/`.

Ensure relative paths stay as-is (they already are).

---

## Validation

```bash
node scripts/validate-assets.js
```

CI runs the same script on push/PR to `main` (see `.github/workflows/validate-assets.yml`).

JSON syntax and required paths are errors. Missing image files are reported as warnings so the structure can ship before art is uploaded.

---

## Design system

- Midnight navy `#0A0E17` / `#060912`
- Electric blue `#3B82F6` · bright `#60A5FA`
- Cyan accent `#22D3EE`
- Restrained gold `#F0C14B` (status / notice only)
- Mobile-first, reduced-motion aware, no framework dependencies

---

## License

MIT — see [LICENSE](LICENSE).
