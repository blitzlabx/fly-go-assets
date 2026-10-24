# Fly Go — Asset Hub

Official static Asset Hub and asset repository for **Fly Go**.

**Repo:** https://github.com/blitzlabx/fly-go-assets

---

## Character roster (initial — 10)

| ID | Name | Role | Category |
|----|------|------|----------|
| speedy | Speedy | Protagonist | Hero |
| timy | Timy | Ally | Hero |
| drift | Drift | Ally | Hero |
| blast | Blast | Ally | Hero |
| frosty | Frosty | Ally | Hero |
| sky | Sky | Ally | Hero |
| starz | Starz | Ally | Hero |
| paky | Paky | Ally | Hero |
| darkz | Darkz | Main villain | Antagonist |
| vex | Vex | Rival villain | Antagonist |

Rokey is **not** part of the initial lineup.

---

## Structure

```
fly-go-assets/
├── index.html
├── css/styles.css
├── js/app.js
├── assets/
│   ├── branding/           # fly-go-logo.png, fly-go-icon.png, …
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
├── data/characters.json    # Registry
├── docs/
├── scripts/validate-assets.js
└── .github/workflows/
```

---

## Image paths

**Branding**

- `assets/branding/fly-go-logo.png`
- `assets/branding/fly-go-icon.png`

**Per character** (`assets/characters/<id>/`)

- `<id>-char.png`
- `<id>-logo.png`

Filenames match the official asset package (1024×1024 RGBA PNG).

---

## Adding a character

1. Create `assets/characters/<id>/`.
2. Add `<id>.json` and art files.
3. Register in `data/characters.json`.
4. Run `node scripts/validate-assets.js`.

No website code changes required — the gallery is JSON-driven.

---

## Local preview

```bash
npx serve .
# or: python -m http.server 8080
```

---

## Deploy

GitHub Pages: Settings → Pages → Deploy from `main` / root  
→ `https://blitzlabx.github.io/fly-go-assets/`

---

## License

MIT — see [LICENSE](LICENSE).
