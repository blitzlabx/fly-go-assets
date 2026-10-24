/**
 * Fly Go Asset Hub — client application
 * Loads character registry + per-character JSON, renders gallery & detail panel.
 * Uses real expected asset paths; gracefully handles missing images.
 */

(function () {
  'use strict';

  const state = {
    registry: null,
    characters: [],
    filter: 'all',
  };

  const els = {
    charGrid: document.getElementById('char-grid'),
    chips: document.querySelectorAll('[data-filter]'),
    overlay: document.getElementById('overlay'),
    panel: document.getElementById('detail-panel'),
    panelClose: document.getElementById('panel-close'),
    panelContent: document.getElementById('panel-content'),
    navToggle: document.getElementById('nav-toggle'),
    navDrawer: document.getElementById('nav-drawer'),
    heroLogo: document.getElementById('hero-logo'),
    assetList: document.getElementById('asset-list'),
  };

  // ——— Helpers ———

  function assetUrl(charId, filename) {
    if (!filename) return null;
    return `assets/characters/${charId}/${filename}`;
  }

  function brandingUrl(filename) {
    return `assets/branding/${filename}`;
  }

  function roleLabel(role) {
    const map = {
      protagonist: 'Protagonist',
      ally: 'Ally',
      rival: 'Rival',
      main_villain: 'Main Villain',
    };
    return map[role] || role || 'Character';
  }

  function probeImage(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve(false);
        return;
      }
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  // ——— Load data ———

  async function loadRegistry() {
    const res = await fetch('data/characters.json');
    if (!res.ok) throw new Error('Failed to load character registry');
    return res.json();
  }

  async function loadCharacter(entry) {
    const res = await fetch(entry.path);
    if (!res.ok) throw new Error(`Failed to load ${entry.path}`);
    const data = await res.json();
    return {
      ...data,
      category: entry.category || data.category || 'hero',
      role: entry.role || data.role || '',
      order: entry.order ?? data.storyOrder ?? 99,
      featured: entry.featured !== false,
    };
  }

  async function init() {
    try {
      state.registry = await loadRegistry();
      const list = state.registry.characters || [];
      state.characters = await Promise.all(list.map(loadCharacter));
      state.characters.sort((a, b) => a.order - b.order);

      await setupHeroLogo();
      renderCharacters();
      renderAssetBrowser();
      bindUI();
    } catch (err) {
      console.error(err);
      if (els.charGrid) {
        els.charGrid.innerHTML =
          '<p style="color:var(--text-muted);grid-column:1/-1">Unable to load character data. Check data/characters.json.</p>';
      }
    }
  }

  async function setupHeroLogo() {
    if (!els.heroLogo) return;
    const candidates = [
      brandingUrl('fly-go-logo.svg'),
      brandingUrl('fly-go-logo.png'),
      brandingUrl('fly-go-icon.png'),
    ];
    for (const src of candidates) {
      if (await probeImage(src)) {
        els.heroLogo.innerHTML = `<img src="${src}" alt="Fly Go logo" width="220" height="220" />`;
        return;
      }
    }
    // Keep CSS fallback already in HTML
  }

  // ——— Render characters ———

  function filteredCharacters() {
    if (state.filter === 'all') return state.characters;
    return state.characters.filter((c) => c.category === state.filter);
  }

  function renderCharacters() {
    if (!els.charGrid) return;
    const list = filteredCharacters();
    els.charGrid.innerHTML = '';

    list.forEach((char) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `char-card ${char.category === 'antagonist' ? 'antagonist' : ''}`;
      card.setAttribute('data-id', char.id);
      card.setAttribute('aria-label', `View ${char.displayName || char.name}`);

      const charSrc = assetUrl(char.id, char.assets?.char);
      const logoSrc = assetUrl(char.id, char.assets?.logo);

      card.innerHTML = `
        <div class="char-art" data-art>
          <div class="char-placeholder">Art</div>
        </div>
        <div class="char-meta">
          <h3>${escapeHtml(char.displayName || char.name)}</h3>
          <div class="role">${escapeHtml(roleLabel(char.role))}</div>
          <span class="badge ${char.category === 'antagonist' ? 'badge-antagonist' : 'badge-hero'}">
            ${char.category === 'antagonist' ? 'Antagonist' : 'Hero'}
          </span>
        </div>
      `;

      els.charGrid.appendChild(card);

      // Try char art, then logo
      const artEl = card.querySelector('[data-art]');
      tryLoadArt(artEl, [charSrc, logoSrc], char.displayName || char.name);

      card.addEventListener('click', () => openDetail(char));
    });
  }

  async function tryLoadArt(container, sources, alt) {
    for (const src of sources) {
      if (!src) continue;
      if (await probeImage(src)) {
        container.innerHTML = `<img src="${src}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />`;
        return;
      }
    }
  }

  // ——— Detail panel ———

  async function openDetail(char) {
    const charSrc = assetUrl(char.id, char.assets?.char);
    const logoSrc = assetUrl(char.id, char.assets?.logo);
    const hasChar = await probeImage(charSrc);
    const hasLogo = await probeImage(logoSrc);

    const artHtml = hasChar
      ? `<img src="${charSrc}" alt="${escapeHtml(char.displayName || char.name)}" />`
      : hasLogo
        ? `<img src="${logoSrc}" alt="${escapeHtml(char.displayName || char.name)} emblem" />`
        : `<div class="char-placeholder" style="width:40%;height:40%">Pending</div>`;

    els.panelContent.innerHTML = `
      <div class="panel-art">${artHtml}</div>
      <div class="panel-body">
        <h2>${escapeHtml(char.displayName || char.name)}</h2>
        <div class="tagline">${escapeHtml(char.tagline || roleLabel(char.role))}</div>
        <p>${escapeHtml(char.description || 'Character profile will expand as canon is documented.')}</p>
        <div class="panel-assets">
          <span class="asset-chip ${hasChar ? '' : 'missing'}">
            ${hasChar ? '✓' : '○'} ${escapeHtml(char.assets?.char || 'char.png')}
          </span>
          <span class="asset-chip ${hasLogo ? '' : 'missing'}">
            ${hasLogo ? '✓' : '○'} ${escapeHtml(char.assets?.logo || 'logo.png')}
          </span>
        </div>
      </div>
    `;

    els.overlay.classList.add('open');
    els.panel.classList.add('open');
    els.panelClose.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    els.overlay.classList.remove('open');
    els.panel.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ——— Asset browser (expected paths) ———

  function renderAssetBrowser() {
    if (!els.assetList) return;

    const branding = [
      'fly-go-logo.png',
      'fly-go-logo.svg',
      'fly-go-icon.png',
      'fly-go-wordmark.png',
      'fly-go-monochrome.png',
    ].map((f) => ({ path: `assets/branding/${f}`, label: f }));

    const characterAssets = state.characters.flatMap((c) => [
      {
        path: `assets/characters/${c.id}/${c.assets?.char || c.id + '-char.png'}`,
        label: `${c.name} character art`,
      },
      {
        path: `assets/characters/${c.id}/${c.assets?.logo || c.id + '-logo.png'}`,
        label: `${c.name} emblem`,
      },
    ]);

    const all = [...branding, ...characterAssets];
    els.assetList.innerHTML = '';

    all.forEach(async (item) => {
      const row = document.createElement('div');
      row.className = 'asset-row';
      row.innerHTML = `
        <span class="status-dot pending" data-dot></span>
        <span class="path">${escapeHtml(item.path)}</span>
        <a class="btn btn-ghost" style="padding:0.35rem 0.75rem;font-size:0.8rem" href="${item.path}" download hidden data-dl>Download</a>
      `;
      els.assetList.appendChild(row);

      const ok = await probeImage(item.path);
      const dot = row.querySelector('[data-dot]');
      const dl = row.querySelector('[data-dl]');
      if (ok) {
        dot.classList.remove('pending');
        dot.classList.add('ok');
        dl.hidden = false;
      }
    });
  }

  // ——— UI bindings ———

  function bindUI() {
    els.chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        els.chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.filter = chip.getAttribute('data-filter');
        renderCharacters();
      });
    });

    els.panelClose?.addEventListener('click', closeDetail);
    els.overlay?.addEventListener('click', closeDetail);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetail();
    });

    els.navToggle?.addEventListener('click', () => {
      const open = els.navDrawer.classList.toggle('open');
      els.navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    els.navDrawer?.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        els.navDrawer.classList.remove('open');
        els.navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Active nav on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a, .nav-drawer a');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((l) => {
              l.classList.toggle('active', l.getAttribute('href') === `#${entry.target.id}`);
            });
          }
        });
      },
      { rootMargin: '-40% 0px -50% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
