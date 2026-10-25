/**
 * Fly Go Asset Hub — client application
 * JSON-driven roster, character sheet, emblem rail, smooth glide scrolling,
 * scroll reveals, speed-streak canvas. Add a character by editing the JSON only.
 */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const REPO = 'https://github.com/blitzlabx/fly-go-assets';
  const root = document.documentElement;

  const state = { chars: [], filter: 'all', current: -1, view: 'char' };

  const el = {
    grid: $('#grid'), seg: $('#seg'), segInd: $('#seg-ind'),
    rail: $('#rail'), railBar: $('#rail-bar'), railPrev: $('#rail-prev'), railNext: $('#rail-next'),
    docs: $('#docs'), topbar: $('#topbar'), hero: $('#home'), orb: $('#orb'),
    bar: $('#progress-bar'), loader: $('#loader'), glow: $('#cursor-glow'),
    overlay: $('#overlay'), sheet: $('#sheet'), sheetContent: $('#sheet-content'), sheetScroll: $('#sheet-scroll'),
    sheetClose: $('#sheet-close'), sheetTop: $('#sheet-top'), sheetPrev: $('#sheet-prev'), sheetNext: $('#sheet-next'),
    prevName: $('#prev-name'), nextName: $('#next-name'), count: $('#sheet-count'),
    links: $('#links'), linksInd: $('#links-ind'),
  };

  /* ---------- helpers ---------- */

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const icon = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const pad = (n) => String(n).padStart(2, '0');
  const ROLES = { protagonist: 'Protagonist', ally: 'Ally', rival: 'Rival', main_villain: 'Main Villain' };
  const roleLabel = (r) => ROLES[r] || (r ? String(r).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'Character');
  const isVillain = (c) => c.category === 'antagonist';
  const assetUrl = (c, kind) => `assets/characters/${c.id}/${(c.assets && c.assets[kind]) || `${c.id}-${kind}.png`}`;

  /* ---------- colour system ---------- */

  const HERO_PAL = ['#3B82F6', '#22D3EE', '#F59E0B', '#34D399', '#60A5FA', '#F472B6', '#A3E635', '#818CF8'];
  const VILLAIN_PAL = ['#7C3AED', '#EF4444', '#C026D3'];

  function hexToRgb(h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mixRgb = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const lum = (rgb) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };
  function toHsl(rgb) {
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function fromHsl(hsl) {
    const h = hsl[0], s = hsl[1], l = hsl[2];
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  // Keeps the hue but guarantees a glow that is visible on the dark background.
  function brighten(rgb) {
    const hsl = toHsl(rgb);
    return fromHsl([hsl[0], Math.max(hsl[1], 0.55), Math.max(hsl[2], 0.58)]);
  }

  function buildTheme(c, idx) {
    const pal = isVillain(c) ? VILLAIN_PAL : HERO_PAL;
    const base = hexToRgb(c.colors && c.colors.primary) || hexToRgb(pal[idx % pal.length]);
    const sec = hexToRgb(c.colors && c.colors.secondary) || mixRgb(base, [255, 255, 255], 0.35);
    const glow = brighten(lum(sec) > lum(base) ? sec : base);
    return {
      c1: toHex(base), c2: toHex(sec), glow: toHex(glow),
      rgb: glow.map((v) => Math.round(v)).join(', '),
    };
  }
  const themeStyle = (t) => `--c1:${t.c1};--c2:${t.c2};--g:${t.glow};--g-rgb:${t.rgb}`;

  /* ---------- images (graceful fallback, fade-in) ---------- */

  function wireImg(img) {
    if (!img.getAttribute('src')) return;
    const ok = () => img.classList.add('ld');
    const bad = () => {
      const m = document.createElement('span');
      m.className = 'mono ' + img.className.replace(/\b(art|ld)\b/g, '').trim();
      m.textContent = img.dataset.fallback || '';
      m.setAttribute('aria-hidden', 'true');
      if (img.dataset.v) m.dataset.v = img.dataset.v;
      img.replaceWith(m);
    };
    if (img.complete) { img.naturalWidth ? ok() : bad(); }
    else { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', bad, { once: true }); }
  }
  const wireImgs = (scope) => $$('img.art', scope).forEach(wireImg);

  /* ---------- reveal on scroll ---------- */

  const revealIO = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    : null;
  const watch = (scope) => $$('.reveal:not(.in)', scope || document).forEach((n) => (revealIO ? revealIO.observe(n) : n.classList.add('in')));

  /* ---------- data ---------- */

  async function getJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed: ' + url);
    return res.json();
  }

  async function loadCharacters() {
    const registry = await getJSON('data/characters.json');
    const list = registry.characters || [];
    const loaded = await Promise.all(list.map(async (entry) => {
      try {
        const data = await getJSON(entry.path);
        return Object.assign({}, data, {
          id: data.id || entry.id,
          category: entry.category || data.category || 'hero',
          role: entry.role || data.role || '',
          order: entry.order != null ? entry.order : (data.storyOrder != null ? data.storyOrder : 99),
          featured: entry.featured !== false,
        });
      } catch (err) {
        console.warn(err);
        const name = entry.id.charAt(0).toUpperCase() + entry.id.slice(1);
        return { id: entry.id, name, displayName: name, category: entry.category || 'hero', role: entry.role || '', order: entry.order || 99, featured: true };
      }
    }));
    const seen = { hero: 0, antagonist: 0 };
    return loaded
      .filter((c) => c.visible !== false && c.featured !== false)
      .sort((a, b) => a.order - b.order)
      .map((c, i) => {
        const k = isVillain(c) ? 'antagonist' : 'hero';
        c.name = c.displayName || c.name || c.id;
        c.n = pad(i + 1);
        c.theme = buildTheme(c, seen[k]++);
        return c;
      });
  }

  /* ---------- roster ---------- */

  const visibleList = () => (state.filter === 'all' ? state.chars : state.chars.filter((c) => c.category === state.filter));

  function cardHtml(c, i) {
    const vil = isVillain(c);
    return `
      <div class="cell reveal" style="--d:${(i % 8) * 60}ms">
        <button type="button" class="card" data-id="${esc(c.id)}" style="${themeStyle(c.theme)}" aria-label="Open ${esc(c.name)} profile">
          <span class="card-num">${c.n}</span>
          <span class="card-go">${icon('right')}</span>
          <span class="card-art"><img class="art" src="${esc(assetUrl(c, 'char'))}" alt="${esc(c.name)}" loading="lazy" decoding="async" data-fallback="${esc(c.name.charAt(0))}" /></span>
          <span class="card-info">
            <span class="tag">${icon(vil ? 'flame' : 'shield')}${esc(roleLabel(c.role))}</span>
            <h3>${esc(c.name)}</h3>
            ${c.tagline ? `<p>${esc(c.tagline)}</p>` : ''}
          </span>
        </button>
      </div>`;
  }

  function renderGrid(animate) {
    const paint = () => {
      el.grid.innerHTML = visibleList().map(cardHtml).join('');
      wireImgs(el.grid);
      watch(el.grid);
      el.grid.classList.remove('out');
    };
    if (animate && !reduce) {
      el.grid.classList.add('out');
      setTimeout(paint, 230);
    } else paint();
  }

  function moveSeg() {
    const on = $('button.on', el.seg);
    if (!on) return;
    el.segInd.style.width = on.offsetWidth + 'px';
    el.segInd.style.transform = `translateX(${on.offsetLeft}px)`;
  }

  function bindRoster() {
    ['all', 'hero', 'antagonist'].forEach((k) => {
      const n = k === 'all' ? state.chars.length : state.chars.filter((c) => c.category === k).length;
      const b = $('#n-' + k);
      if (b) b.textContent = n;
    });
    el.seg.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-filter]');
      if (!b || b.classList.contains('on')) return;
      $$('button', el.seg).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      state.filter = b.dataset.filter;
      moveSeg();
      renderGrid(true);
    });
    el.grid.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (card) openSheet(card.dataset.id, card, 'char');
    });

    if (fine && !reduce) {
      let last = null;
      const reset = (c) => { if (c) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } };
      el.grid.addEventListener('pointermove', (e) => {
        const card = e.target.closest('.card');
        if (last && last !== card) reset(last);
        last = card;
        if (!card) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((x - 0.5) * 12).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - y) * 12).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      el.grid.addEventListener('pointerleave', () => { reset(last); last = null; });
    }
  }

  /* ---------- emblems rail ---------- */

  function renderRail() {
    const brand = `
      <div class="rail-item reveal">
        <div class="emb brand">
          <div class="emb-img"><img class="art" src="assets/branding/fly-go-logo.png" alt="Fly Go brand mark" loading="lazy" decoding="async" data-fallback="FG" /></div>
          <h3>Fly Go</h3><p>Brand mark</p>
        </div>
      </div>`;
    const items = state.chars.map((c, i) => `
      <div class="rail-item reveal" style="--d:${Math.min(i + 1, 6) * 70}ms">
        <button type="button" class="emb" data-id="${esc(c.id)}" style="${themeStyle(c.theme)}" aria-label="Open ${esc(c.name)} emblem">
          <div class="emb-img"><img class="art" src="${esc(assetUrl(c, 'logo'))}" alt="${esc(c.name)} emblem" loading="lazy" decoding="async" data-fallback="${esc(c.name.charAt(0))}" /></div>
          <h3>${esc(c.name)}</h3><p>${esc(roleLabel(c.role))}</p>
        </button>
      </div>`).join('');
    el.rail.innerHTML = brand + items;
    wireImgs(el.rail);
    watch(el.rail);
  }

  function bindRail() {
    const updateRail = () => {
      const max = el.rail.scrollWidth - el.rail.clientWidth;
      const p = max > 0 ? el.rail.scrollLeft / max : 1;
      const vis = el.rail.scrollWidth ? el.rail.clientWidth / el.rail.scrollWidth : 1;
      el.railBar.style.transform = `scaleX(${Math.max(0.08, vis + (1 - vis) * p).toFixed(3)})`;
      el.railPrev.disabled = el.rail.scrollLeft < 8;
      el.railNext.disabled = el.rail.scrollLeft > max - 8;
    };
    el.rail.addEventListener('scroll', () => requestAnimationFrame(updateRail), { passive: true });
    addEventListener('resize', updateRail);
    const step = (dir) => el.rail.scrollBy({ left: dir * el.rail.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
    el.railPrev.addEventListener('click', () => step(-1));
    el.railNext.addEventListener('click', () => step(1));
    el.rail.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
    });
    el.rail.addEventListener('click', (e) => {
      if (el.rail.dataset.moved === '1') return;
      const b = e.target.closest('button.emb');
      if (b) openSheet(b.dataset.id, b, 'logo');
    });

    // mouse drag to glide
    let down = false, sx = 0, sl = 0, moved = 0;
    el.rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; sx = e.clientX; sl = el.rail.scrollLeft; el.rail.dataset.moved = '0';
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 5) { el.rail.classList.add('drag'); el.rail.dataset.moved = '1'; }
      el.rail.scrollLeft = sl - dx;
    });
    const end = () => {
      if (!down) return;
      down = false; el.rail.classList.remove('drag');
      setTimeout(() => { el.rail.dataset.moved = '0'; }, 0);
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    updateRail();
  }

  /* ---------- lore ---------- */

  const DOCS = [
    { f: 'UNIVERSE.md', t: 'Universe', d: 'World rules, setting and core pillars.', i: 'globe' },
    { f: 'STORY.md', t: 'Story', d: 'Narrative arcs and key events.', i: 'bookmark' },
    { f: 'CHARACTERS.md', t: 'Characters', d: 'Roster notes and design references.', i: 'users' },
    { f: 'ART-DIRECTION.md', t: 'Art direction', d: 'Visual language and colour system.', i: 'palette' },
    { f: 'GAMEPLAY.md', t: 'Gameplay', d: 'Systems and player experience.', i: 'gamepad' },
    { f: 'ASSET-GUIDELINES.md', t: 'Asset guidelines', d: 'Naming, structure and how to add characters.', i: 'package' },
  ];

  function renderDocs() {
    el.docs.innerHTML = DOCS.map((d, i) => `
      <div class="reveal" style="--d:${(i % 3) * 80}ms">
        <a class="doc" href="${REPO}/blob/main/docs/${d.f}" target="_blank" rel="noopener">
          <span class="doc-ico">${icon(d.i)}</span>
          <span><h3>${esc(d.t)}</h3><p>${esc(d.d)}</p></span>
          <span class="doc-go">${icon('ext')}</span>
        </a>
      </div>`).join('');
    watch(el.docs);
    if (fine) {
      el.docs.addEventListener('pointermove', (e) => {
        const d = e.target.closest('.doc');
        if (!d) return;
        const r = d.getBoundingClientRect();
        d.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        d.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    }
  }

  /* ---------- character sheet ---------- */

  let lastFocus = null;
  let sheetDir = 'up';
  const INERT = ['.topbar', '.dock', 'main', '.footer'];
  const setInert = (on) => INERT.forEach((s) => { const n = $(s); if (n) n.inert = on; });

  function sheetHtml(c) {
    const t = c.theme, vil = isVillain(c);
    const abil = (c.abilities || []).filter(Boolean);
    const tags = (c.tags || []).filter(Boolean);
    const ini = esc(c.name.charAt(0));
    const showChar = state.view === 'char';
    let k = 0;
    const kk = () => `style="--k:${k++}"`;
    const swatches = [t.c1, t.c2]
      .map((s) => `<span class="sw"><i style="background:${s}"></i>${s}</span>`).join('');
    return `
      <div class="stage">
        <span class="stage-ring"></span><span class="stage-ring r2"></span>
        <span class="stage-num" aria-hidden="true">${c.n}</span>
        <div class="stage-imgs" id="stage-imgs">
          <img class="art st-img ${showChar ? 'show' : ''}" data-v="char" ${showChar ? 'src' : 'data-src'}="${esc(assetUrl(c, 'char'))}" alt="${esc(c.name)} character art" decoding="async" data-fallback="${ini}" />
          <img class="art st-img ${showChar ? '' : 'show'}" data-v="logo" ${showChar ? 'data-src' : 'src'}="${esc(assetUrl(c, 'logo'))}" alt="${esc(c.name)} emblem" decoding="async" data-fallback="${ini}" />
        </div>
        <div class="vswitch" role="group" aria-label="Artwork view">
          <button type="button" data-v="char" class="${showChar ? 'on' : ''}" aria-pressed="${showChar}">${icon('user')}Character</button>
          <button type="button" data-v="logo" class="${showChar ? '' : 'on'}" aria-pressed="${!showChar}">${icon('emblem')}Emblem</button>
        </div>
      </div>
      <div class="s-body" data-dir="${sheetDir}">
        <span class="tag" ${kk()}>${icon(vil ? 'flame' : 'shield')}${esc(roleLabel(c.role))}</span>
        <h2 id="sheet-title" ${kk()}>${esc(c.name)}</h2>
        ${c.tagline ? `<p class="s-line" ${kk()}>${esc(c.tagline)}</p>` : ''}
        <p class="s-desc" ${kk()}>${esc(c.description || 'The full profile will unlock as canon is documented.')}</p>
        <dl class="facts" ${kk()}>
          <div><dt>Side</dt><dd>${vil ? 'Villain' : 'Hero'}</dd></div>
          <div><dt>Role</dt><dd>${esc(roleLabel(c.role))}</dd></div>
          <div><dt>${c.faction ? 'Faction' : 'Entry'}</dt><dd>${c.faction ? esc(c.faction) : c.n}</dd></div>
        </dl>
        ${abil.length ? `<h4 ${kk()}>${icon('bolt')}Abilities</h4><div class="chips" ${kk()}>${abil.map((a) => `<span class="chip">${esc(typeof a === 'string' ? a : a.name || '')}</span>`).join('')}</div>` : ''}
        <h4 ${kk()}>${icon('palette')}Palette</h4>
        <div class="swatches" ${kk()}>${swatches}</div>
        ${tags.length ? `<div class="chips" ${kk()}>${tags.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
      </div>`;
  }

  function renderSheet() {
    const c = state.chars[state.current];
    if (!c) return;
    const n = state.chars.length;
    const prev = state.chars[(state.current - 1 + n) % n];
    const next = state.chars[(state.current + 1) % n];
    el.sheet.style.cssText = themeStyle(c.theme);
    el.sheetContent.innerHTML = sheetHtml(c);
    wireImgs(el.sheetContent);
    el.sheetScroll.scrollTop = 0;
    el.prevName.textContent = prev.name;
    el.nextName.textContent = next.name;
    el.count.textContent = `${c.n} / ${pad(n)}`;
  }

  function openSheet(id, opener, view) {
    const i = state.chars.findIndex((c) => c.id === id);
    if (i < 0) return;
    state.current = i;
    state.view = view || 'char';
    sheetDir = 'up';
    lastFocus = opener || document.activeElement;
    renderSheet();
    el.overlay.classList.add('open');
    el.sheet.classList.add('open');
    el.sheet.setAttribute('aria-hidden', 'false');
    root.classList.add('lock');
    setInert(true);
    setTimeout(() => el.sheetClose.focus({ preventScroll: true }), 60);
  }

  function closeSheet() {
    if (!el.sheet.classList.contains('open')) return;
    el.overlay.classList.remove('open');
    el.sheet.classList.remove('open');
    el.sheet.setAttribute('aria-hidden', 'true');
    el.sheet.style.transform = '';
    el.sheet.style.transition = '';
    root.classList.remove('lock');
    setInert(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function stepSheet(dir) {
    const n = state.chars.length;
    state.current = (state.current + dir + n) % n;
    sheetDir = dir > 0 ? 'next' : 'prev';
    renderSheet();
  }

  function switchView(v) {
    state.view = v;
    $$('.vswitch button', el.sheetContent).forEach((b) => {
      const on = b.dataset.v === v;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $$('.st-img', el.sheetContent).forEach((im) => {
      const on = im.dataset.v === v;
      if (on && im.tagName === 'IMG' && im.dataset.src) { im.src = im.dataset.src; im.removeAttribute('data-src'); wireImg(im); }
      im.classList.toggle('show', on);
    });
  }

  function bindSheet() {
    el.sheetClose.addEventListener('click', closeSheet);
    el.overlay.addEventListener('click', closeSheet);
    el.sheetPrev.addEventListener('click', () => stepSheet(-1));
    el.sheetNext.addEventListener('click', () => stepSheet(1));
    el.sheetContent.addEventListener('click', (e) => {
      const b = e.target.closest('.vswitch button');
      if (b) switchView(b.dataset.v);
    });

    document.addEventListener('keydown', (e) => {
      if (!el.sheet.classList.contains('open')) return;
      if (e.key === 'Escape') closeSheet();
      else if (e.key === 'ArrowRight') stepSheet(1);
      else if (e.key === 'ArrowLeft') stepSheet(-1);
      else if (e.key === 'Tab') {
        const f = $$('button:not([disabled])', el.sheet).filter((b) => b.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    });

    // swipe the artwork left / right to browse characters
    let tx = 0, ty = 0;
    el.sheetContent.addEventListener('touchstart', (e) => {
      if (!e.target.closest('.stage')) return;
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    }, { passive: true });
    el.sheetContent.addEventListener('touchend', (e) => {
      if (!tx) return;
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      tx = 0;
      if (Math.abs(dx) > 55 && Math.abs(dy) < 60) stepSheet(dx < 0 ? 1 : -1);
    }, { passive: true });

    // drag the grip down to dismiss (mobile bottom sheet)
    let dragging = false, sy = 0, dy = 0;
    el.sheetTop.addEventListener('pointerdown', (e) => {
      dragging = true; sy = e.clientY; dy = 0;
      el.sheet.style.transition = 'none';
      el.sheetTop.setPointerCapture(e.pointerId);
    });
    el.sheetTop.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - sy);
      el.sheet.style.transform = `translateY(${dy}px)`;
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      el.sheet.style.transition = '';
      if (dy > 110) closeSheet(); else el.sheet.style.transform = '';
    };
    el.sheetTop.addEventListener('pointerup', release);
    el.sheetTop.addEventListener('pointercancel', release);
  }

  /* ---------- glide scrolling ---------- */

  let glideRaf = 0;
  function glideTo(target) {
    cancelAnimationFrame(glideRaf);
    const start = scrollY, dist = target - start;
    if (reduce || Math.abs(dist) < 2) { scrollTo(0, target); return; }
    const dur = Math.min(1500, Math.max(700, Math.abs(dist) * 0.5));
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let t0;
    const frame = (ts) => {
      if (t0 === undefined) t0 = ts;
      const k = Math.min(1, (ts - t0) / dur);
      scrollTo(0, start + dist * ease(k));
      if (k < 1) glideRaf = requestAnimationFrame(frame);
    };
    glideRaf = requestAnimationFrame(frame);
  }
  ['wheel', 'touchstart', 'keydown'].forEach((ev) => addEventListener(ev, () => cancelAnimationFrame(glideRaf), { passive: true }));

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (id && !target) return;
    e.preventDefault();
    glideTo(target && id !== 'home' ? target.getBoundingClientRect().top + scrollY : 0);
    history.replaceState(null, '', id ? '#' + id : location.pathname);
  });

  /* ---------- active section + nav indicators ---------- */

  function moveLinksInd() {
    const a = $('a.active', el.links);
    if (!a || !el.linksInd) return;
    el.linksInd.style.width = a.offsetWidth + 'px';
    el.linksInd.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  function setActive(id) {
    document.body.dataset.section = id;
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === id));
    moveLinksInd();
  }
  function bindSections() {
    const secs = $$('main section[id]');
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach((s) => io.observe(s));
    setActive('home');
  }

  /* ---------- scroll effects ---------- */

  let fx = { kick() {} };
  function bindScroll() {
    let lastY = scrollY, ticking = false;
    const update = () => {
      ticking = false;
      const y = scrollY, dy = y - lastY;
      lastY = y;
      const max = root.scrollHeight - innerHeight;
      el.bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max).toFixed(4) : 0})`;
      el.topbar.classList.toggle('solid', y > 20);
      if (y > 140 && dy > 6) el.topbar.classList.add('hide');
      else if (dy < -4 || y <= 140) el.topbar.classList.remove('hide');
      const p = Math.min(1, Math.max(0, y / (innerHeight * 0.9)));
      el.hero.style.setProperty('--p', p.toFixed(3));
      fx.kick(Math.abs(dy));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  function bindPointerFx() {
    if (!fine || reduce) return;
    let gx = innerWidth / 2, gy = innerHeight / 3, tx = gx, ty = gy, on = false;
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; el.glow.classList.add('on'); }
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      el.orb.style.setProperty('--ox', (nx * 26).toFixed(1) + 'px');
      el.orb.style.setProperty('--oy', (ny * 20).toFixed(1) + 'px');
    });
    const loop = () => {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      el.glow.style.transform = `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- speed-streak canvas ---------- */

  function startFx() {
    const cv = $('#fx');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const COLORS = ['96,165,250', '34,211,238', '147,197,253', '251,191,36'];
    const dx = Math.sin(0.32), dy = -Math.cos(0.32);
    let W = 0, H = 0, D = 1, ps = [], boost = 0, running = true;

    const make = (init) => ({
      x: Math.random() * W * 1.3 - W * 0.2,
      y: init ? Math.random() * H : H + Math.random() * 120,
      l: 30 + Math.random() * 130,
      s: 0.6 + Math.random() * 2.2,
      a: 0.07 + Math.random() * 0.3,
      w: 0.6 + Math.random() * 1.3,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    });
    const size = () => {
      D = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * D; cv.height = H * D;
      ctx.setTransform(D, 0, 0, D, 0, 0);
      const n = Math.round(Math.min(90, Math.max(26, (W * H) / 22000)));
      ps = Array.from({ length: n }, () => make(true));
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      const k = 1 + boost;
      boost *= 0.92;
      for (const p of ps) {
        if (!reduce) { p.x += dx * p.s * k; p.y += dy * p.s * k; }
        const len = p.l * (1 + boost * 0.25);
        ctx.strokeStyle = `rgba(${p.c},${p.a})`;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - dx * len, p.y - dy * len);
        ctx.stroke();
        if (p.y < -p.l || p.x > W + p.l) Object.assign(p, make(false));
      }
    };
    const loop = () => { if (!running) return; draw(); requestAnimationFrame(loop); };
    size();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); if (reduce) draw(); }, 150); });
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden && !reduce;
      if (running) loop();
    });
    if (reduce) { running = false; draw(); } else loop();
    fx = { kick(v) { boost = Math.min(5, boost + v * 0.02); } };
  }

  /* ---------- counters ---------- */

  function runCounters() {
    $$('[data-count]').forEach((b) => {
      const key = b.dataset.count;
      const to = key === 'all' ? state.chars.length : state.chars.filter((c) => c.category === key).length;
      if (reduce || !to) { b.textContent = to; return; }
      const t0 = performance.now(), dur = 1400;
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- boot ---------- */

  function finishLoading(startedAt) {
    const wait = Math.max(0, 650 - (performance.now() - startedAt));
    setTimeout(() => {
      root.classList.add('ready');
      el.loader.classList.add('done');
      setTimeout(() => el.loader.remove(), 900);
      watch(document);
      setTimeout(runCounters, 900);
    }, wait);
  }

  async function init() {
    const startedAt = performance.now();
    wireImgs(document);
    bindScroll();
    bindSections();
    bindPointerFx();
    startFx();
    renderDocs();
    try {
      state.chars = await loadCharacters();
      renderGrid(false);
      renderRail();
      bindRoster();
      bindRail();
      bindSheet();
      moveSeg();
    } catch (err) {
      console.error(err);
      el.grid.innerHTML = '<p style="grid-column:1/-1;color:var(--mute)">Unable to load the roster. Check data/characters.json.</p>';
    }
    addEventListener('resize', () => { moveSeg(); moveLinksInd(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { moveSeg(); moveLinksInd(); });
    finishLoading(startedAt);
    setTimeout(() => { if (el.loader && !el.loader.classList.contains('done')) finishLoading(0); }, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
