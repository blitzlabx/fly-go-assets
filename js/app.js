/**
 * Fly Go Asset Hub v2 — multi-page client script.
 * Pages: home, roster, character, emblems, lore (set on <body data-page="...">).
 * Shared chrome (nav, dock, footer, page curtain, background FX) is built here once.
 * Characters come from data/characters.json — add one there and every page updates.
 */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  const body = document.body;
  const PAGE = body.dataset.page || 'home';
  const REPO = 'https://github.com/blitzlabx/fly-go-assets';
  const state = { chars: [], filter: 'all' };

  /* ---------- helpers ---------- */

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const icon = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const pad = (n) => String(n).padStart(2, '0');
  const ROLES = { protagonist: 'Protagonist', ally: 'Ally', rival: 'Rival', main_villain: 'Main Villain' };
  const roleLabel = (r) => ROLES[r] || (r ? String(r).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : 'Character');
  const isVillain = (c) => c.category === 'antagonist';
  const assetUrl = (c, kind) => `assets/characters/${c.id}/${(c.assets && c.assets[kind]) || `${c.id}-${kind}.png`}`;
  const link = (c, v) => `character.html?c=${encodeURIComponent(c.id)}${v === 'logo' ? '&v=logo' : ''}`;
  const hx = (text, cls, extra) => `<span class="hx ${cls || ''}" data-t="${esc(text)}" ${extra || ''}>${esc(text)}</span>`;

  const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <symbol id="i-home" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></symbol>
    <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.3c2.2.7 3.5 2.6 3.5 5.7"/></symbol>
    <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/></symbol>
    <symbol id="i-emblem" viewBox="0 0 24 24"><path d="M12 2.5 20.5 7.2v9.6L12 21.5 3.5 16.8V7.2z"/><circle cx="12" cy="12" r="3"/></symbol>
    <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></symbol>
    <symbol id="i-code" viewBox="0 0 24 24"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></symbol>
    <symbol id="i-left" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></symbol>
    <symbol id="i-right" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></symbol>
    <symbol id="i-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
    <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></symbol>
    <symbol id="i-palette" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.4a4.6 4.6 0 0 0 4.6-4.6C22 6 17.5 2 12 2z"/></symbol>
    <symbol id="i-gamepad" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 13h.01"/><path d="M18 11h.01"/></symbol>
    <symbol id="i-package" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/></symbol>
    <symbol id="i-bookmark" viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></symbol>
    <symbol id="i-ext" viewBox="0 0 24 24"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></symbol>
    <symbol id="i-spark" viewBox="0 0 24 24"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></symbol>
  </svg>`;

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
  // Keeps the hue but guarantees a glow that reads on the dark background.
  function brighten(rgb) {
    const hsl = toHsl(rgb);
    return fromHsl([hsl[0], Math.max(hsl[1], 0.6), Math.max(hsl[2], 0.6)]);
  }
  function buildTheme(c, idx) {
    const pal = isVillain(c) ? VILLAIN_PAL : HERO_PAL;
    const base = hexToRgb(c.colors && c.colors.primary) || hexToRgb(pal[idx % pal.length]);
    const sec = hexToRgb(c.colors && c.colors.secondary) || mixRgb(base, [255, 255, 255], 0.35);
    const glow = brighten(lum(sec) > lum(base) ? sec : base);
    return { c1: toHex(base), c2: toHex(sec), glow: toHex(glow), rgb: glow.map((v) => Math.round(v)).join(', ') };
  }
  const themeStyle = (t) => `--c1:${t.c1};--c2:${t.c2};--g:${t.glow};--g-rgb:${t.rgb}`;

  /* ---------- images ---------- */

  function wireImg(img) {
    if (!img.getAttribute('src')) return;
    const ok = () => img.classList.add('ld');
    const bad = () => {
      if (img.classList.contains('layer')) { img.classList.add('bad'); return; }
      if (img.hasAttribute('data-nofb')) { img.remove(); return; }
      const m = document.createElement('span');
      m.className = 'mono ' + img.className.replace(/\b(art|ld)\b/g, '').trim();
      m.textContent = img.dataset.fallback || '';
      m.setAttribute('aria-hidden', 'true');
      img.replaceWith(m);
    };
    if (img.complete) { img.naturalWidth ? ok() : bad(); }
    else { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', bad, { once: true }); }
  }
  const wireImgs = (scope) => $$('img.art, img.layer', scope).forEach(wireImg);

  /* ---------- reveal ---------- */

  const revealIO = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
      }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' })
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

  /* ---------- shared chrome ---------- */

  let curtain, leaving = false;
  const NAV = [['home', 'index.html', 'Home', 'home'], ['roster', 'roster.html', 'Roster', 'users'], ['emblems', 'emblems.html', 'Emblems', 'emblem'], ['lore', 'lore.html', 'Lore', 'book']];

  function chrome() {
    const act = PAGE === 'character' ? 'roster' : PAGE;
    const links = NAV.map((i) => `<a href="${i[1]}" data-nav="${i[0]}" class="${i[0] === act ? 'active' : ''}">${i[2]}</a>`).join('');
    const dock = NAV.map((i) => `<a href="${i[1]}" data-nav="${i[0]}" class="${i[0] === act ? 'active' : ''}">${icon(i[3])}<span>${i[2]}</span></a>`).join('');
    body.insertAdjacentHTML('afterbegin', SPRITE + `
      <div class="loader" id="loader" aria-hidden="true"><div class="loader-mark">${icon('bolt')}</div><span>Loading the universe</span><i class="loader-bar"></i></div>
      <div class="progress" aria-hidden="true"><i id="progress-bar"></i></div>
      <div class="aurora" aria-hidden="true"></div>
      <canvas id="fx" aria-hidden="true"></canvas>
      <div class="cursor-glow" id="cursor-glow" aria-hidden="true"></div>
      <header class="topbar" id="topbar">
        <a class="brand" href="index.html" aria-label="Fly Go home"><span class="brand-mark"><img class="art" src="assets/branding/fly-go-icon.png" alt="" width="40" height="40" data-fallback="FG" /></span><span class="brand-name">Fly Go</span></a>
        <nav class="links" id="links" aria-label="Primary"><i class="ind" id="links-ind"></i>${links}</nav>
        <a class="icon-btn" href="${REPO}" target="_blank" rel="noopener" aria-label="Open the repository on GitHub">${icon('code')}</a>
      </header>
      <nav class="dock" aria-label="Pages">${dock}</nav>`);
    body.insertAdjacentHTML('beforeend', `
      <footer class="footer"><div class="container foot">
        <a class="brand" href="index.html" aria-label="Fly Go home"><span class="brand-mark"><img class="art" src="assets/branding/fly-go-icon.png" alt="" width="40" height="40" loading="lazy" data-fallback="FG" /></span><span class="brand-name">Fly Go</span></a>
        <p>Official asset hub for the upcoming 2D web game.</p>
        <a class="foot-link" href="${REPO}" target="_blank" rel="noopener">${icon('code')}blitzlabx/fly-go-assets</a>
      </div></footer>
      <div class="curtain nt" id="curtain" aria-hidden="true"><i></i><i></i><i></i><i></i><b>${icon('bolt')}</b></div>`);
    curtain = $('#curtain');
    // static <use> icons were parsed before the sprite existed: re-resolve them
    $$('use').forEach((u) => { const h = u.getAttribute('href'); if (h) { u.removeAttribute('href'); u.setAttribute('href', h); } });
  }

  const setCurtain = (cls) => { curtain.className = 'curtain ' + cls; void curtain.offsetWidth; };

  function arrive() {
    let came = false;
    try { came = !!sessionStorage.getItem('fg-nav'); sessionStorage.removeItem('fg-nav'); } catch (e) { /* ignore */ }
    if (!came || reduce) { root.classList.remove('arriving'); return false; }
    setCurtain('on in nt');
    root.classList.remove('arriving');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setCurtain('on out');
      setTimeout(() => setCurtain('nt'), 1100);
    }));
    return true;
  }

  function navigate(href) {
    if (leaving) return;
    leaving = true;
    try { sessionStorage.setItem('fg-nav', '1'); } catch (e) { /* ignore */ }
    if (reduce) { location.href = href; return; }
    setCurtain('on');
    requestAnimationFrame(() => { curtain.classList.add('in'); });
    setTimeout(() => { location.href = href; }, 700);
  }
  addEventListener('pageshow', (e) => { if (e.persisted && curtain) { leaving = false; setCurtain('nt'); } });

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

  function bindNav() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      const href = a.getAttribute('href');
      if (a.target === '_blank' || a.hasAttribute('download') || /^(mailto:|tel:)/.test(href)) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      const samePage = url.pathname === location.pathname && url.search === location.search;
      if (samePage && url.hash) {
        const t = document.getElementById(url.hash.slice(1));
        if (t) { e.preventDefault(); glideTo(t.getBoundingClientRect().top + scrollY); }
        return;
      }
      if (samePage) { e.preventDefault(); return; }
      e.preventDefault();
      navigate(url.href);
    });
    const moveInd = () => {
      const a = $('#links a.active'), ind = $('#links-ind');
      if (!a || !ind) return;
      ind.style.width = a.offsetWidth + 'px';
      ind.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    moveInd();
    addEventListener('resize', moveInd);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);
  }

  /* ---------- scroll + pointer ---------- */

  let fx = { kick() {} };
  function bindScroll() {
    const bar = $('#progress-bar'), top = $('#topbar'), hero = $('.hero');
    let lastY = scrollY, ticking = false;
    const update = () => {
      ticking = false;
      const y = scrollY, dy = y - lastY;
      lastY = y;
      const max = root.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max).toFixed(4) : 0})`;
      top.classList.toggle('solid', y > 20);
      if (y > 140 && dy > 6) top.classList.add('hide');
      else if (dy < -4 || y <= 140) top.classList.remove('hide');
      if (hero) hero.style.setProperty('--p', Math.min(1, Math.max(0, y / (innerHeight * 0.9))).toFixed(3));
      fx.kick(Math.abs(dy));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  function bindPointer() {
    if (!fine || reduce) return;
    const glow = $('#cursor-glow'), orb = $('#orb');
    let gx = innerWidth / 2, gy = innerHeight / 3, tx = gx, ty = gy, on = false;
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; glow.classList.add('on'); }
      if (orb) {
        orb.style.setProperty('--ox', ((e.clientX / innerWidth - 0.5) * 28).toFixed(1) + 'px');
        orb.style.setProperty('--oy', ((e.clientY / innerHeight - 0.5) * 22).toFixed(1) + 'px');
      }
    });
    const loop = () => {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  function startFx() {
    const cv = $('#fx');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const COLORS = ['96,165,250', '39,224,255', '147,197,253', '255,200,61'];
    const dx = Math.sin(0.32), dy = -Math.cos(0.32);
    let W = 0, H = 0, ps = [], boost = 0, running = true;
    const make = (init) => ({
      x: Math.random() * W * 1.3 - W * 0.2, y: init ? Math.random() * H : H + Math.random() * 120,
      l: 30 + Math.random() * 130, s: 0.6 + Math.random() * 2.2, a: 0.07 + Math.random() * 0.3,
      w: 0.6 + Math.random() * 1.3, c: COLORS[(Math.random() * COLORS.length) | 0],
    });
    const size = () => {
      const D = Math.min(devicePixelRatio || 1, 2);
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
    document.addEventListener('visibilitychange', () => { running = !document.hidden && !reduce; if (running) loop(); });
    if (reduce) { running = false; draw(); } else loop();
    fx = { kick(v) { boost = Math.min(5, boost + v * 0.02); } };
  }

  /* ---------- stage: character + emblem layered like a hero poster ---------- */

  function layerHtml(kind, c) {
    return `<div class="lw ${kind}-w"><div class="lf"><img class="layer ${kind}" src="${esc(assetUrl(c, kind))}" alt="${kind === 'char' ? esc(c.name) : esc(c.name) + ' emblem'}" decoding="async" /></div></div>`;
  }
  function stageHtml(c, view, enter, cls) {
    return `<div class="stage ${cls || ''} ${enter ? 'enter' : ''}" data-view="${view}" style="${themeStyle(c.theme)}">
      <div class="st-bg"></div>
      <span class="st-num ghost-num" aria-hidden="true">${c.n}</span>
      ${layerHtml('logo', c)}${layerHtml('char', c)}
      <div class="st-floor"></div>
    </div>`;
  }
  const setView = (stage, v) => { if (stage) stage.dataset.view = v; };
  function toggleHtml(view) {
    return `<div class="vtoggle" role="group" aria-label="Artwork view">
      <button type="button" data-v="char" class="${view === 'char' ? 'on' : ''}" aria-pressed="${view === 'char'}">${icon('user')}Character</button>
      <button type="button" data-v="logo" class="${view === 'logo' ? 'on' : ''}" aria-pressed="${view === 'logo'}">${icon('emblem')}Emblem</button>
    </div>`;
  }
  function bindToggle(scope, stage, onChange) {
    scope.addEventListener('click', (e) => {
      const b = e.target.closest('.vtoggle button');
      if (!b) return;
      $$('.vtoggle button', scope).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      setView(stage(), b.dataset.v);
      if (onChange) onChange(b.dataset.v);
    });
  }
  function swipe(el, fn) {
    let sx = 0, sy = 0;
    el.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dy) < 70) fn(dx < 0 ? 1 : -1);
    }, { passive: true });
  }
  function tint(c) {
    body.style.setProperty('--t1', c.theme.glow);
    body.style.setProperty('--t2', c.theme.c2 === c.theme.glow ? c.theme.c1 : c.theme.c2);
  }

  /* ---------- HOME ---------- */

  function pageHome() {
    const mq = $('#mq');
    if (mq && state.chars.length) {
      const row = state.chars.map((c) => `<span>${esc(c.name)}</span>${icon('bolt')}`).join('');
      mq.innerHTML = row + row;
    }
    $$('[data-count]').forEach((b) => {
      const key = b.dataset.count;
      const to = key === 'all' ? state.chars.length : state.chars.filter((c) => c.category === key).length;
      const set = (v) => { b.textContent = v; b.dataset.t = v; };
      if (reduce || !to) { set(to); return; }
      setTimeout(() => {
        const t0 = performance.now();
        const tick = (now) => {
          const k = Math.min(1, (now - t0) / 1400);
          set(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, 1300);
    });
    spotlight();
  }

  function spotlight() {
    const host = $('#spot');
    const list = state.chars;
    if (!host || !list.length) return;
    host.innerHTML = `
      <div class="spot-grid">
        <a class="spot-stage" id="spot-stage" href="#" aria-label="Open profile"></a>
        <div class="spot-info" id="spot-info"></div>
      </div>
      <div class="ticks" id="ticks">${list.map((c, i) => `<button type="button" data-i="${i}" aria-label="Show ${esc(c.name)}"></button>`).join('')}</div>`;
    const stageHost = $('#spot-stage'), info = $('#spot-info'), ticks = $$('#ticks button');
    let i = 0, timer = 0, visible = true;
    const set = (n) => {
      i = (n + list.length) % list.length;
      const c = list[i];
      host.style.cssText = themeStyle(c.theme);
      stageHost.href = link(c);
      stageHost.innerHTML = stageHtml(c, 'char', true, 'sq');
      wireImgs(stageHost);
      info.innerHTML = `
        <span class="rtag"><img class="art" src="${esc(assetUrl(c, 'logo'))}" alt="" data-nofb />${esc(roleLabel(c.role))}</span>
        ${hx(c.name, 't shine')}
        ${c.tagline ? `<p class="spot-line">${esc(c.tagline)}</p>` : ''}
        <a class="btn primary" href="${link(c)}"><span>Open profile</span>${icon('right')}</a>`;
      wireImgs(info);
      ticks.forEach((t, k) => { t.classList.remove('on'); if (k === i) { void t.offsetWidth; t.classList.add('on'); } });
    };
    const play = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => { if (visible) set(i + 1); }, 5200); };
    $('#ticks').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { set(+b.dataset.i); play(); } });
    swipe(host, (d) => { set(i + d); play(); });
    if (fine) { host.addEventListener('pointerenter', () => clearInterval(timer)); host.addEventListener('pointerleave', play); }
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(host);
    set(0);
    play();
  }

  /* ---------- ROSTER ---------- */

  const visibleList = () => (state.filter === 'all' ? state.chars : state.chars.filter((c) => c.category === state.filter));

  function cardHtml(c, i) {
    return `
      <div class="cell reveal" style="--d:${(i % 6) * 70}ms">
        <a class="card" href="${link(c)}" style="${themeStyle(c.theme)}" aria-label="Open ${esc(c.name)} profile">
          <span class="card-bg"></span>
          <span class="card-n hx t" data-t="${c.n}">${c.n}</span>
          <img class="card-emb art" src="${esc(assetUrl(c, 'logo'))}" alt="" loading="lazy" decoding="async" data-nofb />
          <img class="card-char art" src="${esc(assetUrl(c, 'char'))}" alt="${esc(c.name)}" loading="lazy" decoding="async" data-nofb />
          <span class="card-plate">
            <span class="card-row"><img class="card-logo art" src="${esc(assetUrl(c, 'logo'))}" alt="" loading="lazy" decoding="async" data-fallback="${esc(c.name.charAt(0))}" /><span class="card-role">${esc(roleLabel(c.role))}</span></span>
            ${hx(c.name, 't card-name')}
            ${c.tagline ? `<span class="card-tag">${esc(c.tagline)}</span>` : ''}
            <span class="card-go">${icon('right')}</span>
          </span>
        </a>
      </div>`;
  }

  function pageRoster() {
    const grid = $('#cards'), seg = $('#seg'), ind = $('#seg-ind');
    const paint = () => { grid.innerHTML = visibleList().map(cardHtml).join(''); wireImgs(grid); watch(grid); grid.classList.remove('out'); };
    const moveSeg = () => {
      const on = $('button.on', seg);
      if (!on) return;
      ind.style.width = on.offsetWidth + 'px';
      ind.style.transform = `translateX(${on.offsetLeft}px)`;
    };
    ['all', 'hero', 'antagonist'].forEach((k) => {
      const n = k === 'all' ? state.chars.length : state.chars.filter((c) => c.category === k).length;
      const b = $('#n-' + k);
      if (b) b.textContent = n;
    });
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-filter]');
      if (!b || b.classList.contains('on')) return;
      $$('button', seg).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      state.filter = b.dataset.filter;
      moveSeg();
      if (reduce) paint(); else { grid.classList.add('out'); setTimeout(paint, 230); }
    });
    if (fine && !reduce) {
      let last = null;
      const reset = (c) => { if (c) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } };
      grid.addEventListener('pointermove', (e) => {
        const card = e.target.closest('.card');
        if (last && last !== card) reset(last);
        last = card;
        if (!card) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      grid.addEventListener('pointerleave', () => { reset(last); last = null; });
    }
    paint();
    moveSeg();
    addEventListener('resize', moveSeg);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveSeg);
  }

  /* ---------- CHARACTER ---------- */

  function pageCharacter() {
    const host = $('#cp'), info = $('#cp-info'), navh = $('#cp-nav'), main = $('#main');
    const list = state.chars;
    if (!list.length) return;
    const params = new URLSearchParams(location.search);
    let idx = Math.max(0, list.findIndex((c) => c.id === params.get('c')));
    let view = params.get('v') === 'logo' ? 'logo' : 'char';
    let busy = false;

    function url(c) { return `character.html?c=${encodeURIComponent(c.id)}${view === 'logo' ? '&v=logo' : ''}`; }

    function render(dir) {
      const c = list[idx], n = list.length;
      const prev = list[(idx - 1 + n) % n], next = list[(idx + 1) % n];
      main.style.cssText = themeStyle(c.theme);
      tint(c);
      document.title = `${c.name} — Fly Go`;
      history.replaceState(null, '', url(c));

      host.innerHTML = `
        <div class="cp-wrap ${dir ? 'in-' + dir : ''}" id="cp-wrap">
          <div class="cp-bar">
            <a class="back" href="roster.html">${icon('left')}<span>Roster</span></a>
            ${hx(`${c.n} / ${pad(n)}`, 't cp-count')}
          </div>
          ${stageHtml(c, view, true)}
          <div class="cp-title">
            <span class="rtag"><img class="art" src="${esc(assetUrl(c, 'logo'))}" alt="" data-nofb />${esc(roleLabel(c.role))}</span>
            ${hx(c.name, 't xxl shine')}
            ${c.tagline ? `<p class="cp-line">${esc(c.tagline)}</p>` : ''}
            ${toggleHtml(view)}
          </div>
        </div>`;
      wireImgs(host);

      const abil = (c.abilities || []).filter(Boolean);
      const tags = (c.tags || []).filter(Boolean);
      info.innerHTML = `
        <div class="panel reveal wide">
          <h3>${icon('book')}Profile</h3>
          <p>${esc(c.description || 'The full profile will unlock as canon is documented.')}</p>
          <div class="facts">
            <div class="fact"><span>Side</span>${hx(isVillain(c) ? 'Villain' : 'Hero', 't')}</div>
            <div class="fact"><span>Role</span>${hx(roleLabel(c.role), 't')}</div>
            <div class="fact"><span>${c.faction ? 'Faction' : 'Entry'}</span>${hx(c.faction || c.n, 't')}</div>
          </div>
        </div>
        <div class="panel reveal crest-p" style="--d:80ms">
          <h3>${icon('emblem')}Signature emblem</h3>
          <div class="crest">
            <div class="crest-img"><img class="art" src="${esc(assetUrl(c, 'logo'))}" alt="${esc(c.name)} emblem" loading="lazy" data-fallback="${esc(c.name.charAt(0))}" /></div>
            <div class="crest-txt">${hx(c.name, 't')}<a class="btn ghost" href="emblems.html?c=${encodeURIComponent(c.id)}"><span>See in emblems</span>${icon('right')}</a></div>
          </div>
        </div>
        <div class="panel reveal" style="--d:140ms">
          <h3>${icon('palette')}Palette</h3>
          <div class="swatches">${[c.theme.c1, c.theme.c2].map((s) => `<span class="sw"><i style="background:${s}"></i>${s}</span>`).join('')}</div>
          ${abil.length ? `<h3>${icon('bolt')}Abilities</h3><div class="chips">${abil.map((a) => `<span class="chip">${esc(typeof a === 'string' ? a : a.name || '')}</span>`).join('')}</div>` : ''}
          ${tags.length ? `<div class="chips">${tags.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
        </div>`;
      wireImgs(info);
      watch(info);

      navh.innerHTML = `
        <div class="pn-cards reveal">
          <a class="pnc" href="${link(prev)}" data-step="-1" style="${themeStyle(prev.theme)}"><img class="art" src="${esc(assetUrl(prev, 'char'))}" alt="" loading="lazy" data-nofb /><small>${icon('left')}Previous</small>${hx(prev.name, 't')}</a>
          <a class="pnc next" href="${link(next)}" data-step="1" style="${themeStyle(next.theme)}"><img class="art" src="${esc(assetUrl(next, 'char'))}" alt="" loading="lazy" data-nofb /><small>Next${icon('right')}</small>${hx(next.name, 't')}</a>
        </div>`;
      wireImgs(navh);
      watch(navh);
      busy = false;
    }

    function go(step) {
      if (busy) return;
      busy = true;
      const dir = step > 0 ? 'next' : 'prev';
      const wrap = $('#cp-wrap');
      if (wrap && !reduce) wrap.classList.add('swap-' + dir);
      setTimeout(() => {
        idx = (idx + step + list.length) % list.length;
        render(dir);
        glideTo(0);
      }, reduce ? 0 : 280);
    }

    host.addEventListener('click', (e) => {
      const b = e.target.closest('.vtoggle button');
      if (!b) return;
      view = b.dataset.v;
      $$('.vtoggle button', host).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      setView($('.stage', host), view);
      history.replaceState(null, '', url(list[idx]));
    });
    navh.addEventListener('click', (e) => {
      const a = e.target.closest('.pnc');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      go(+a.dataset.step);
    }, true);
    swipe(host, (d) => go(d));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    });
    render('');
  }

  /* ---------- EMBLEMS ---------- */

  function pageEmblems() {
    const host = $('#ev'), list = state.chars;
    if (!list.length) return;
    const params = new URLSearchParams(location.search);
    let idx = Math.max(0, list.findIndex((c) => c.id === params.get('c')));
    let view = 'logo';

    host.innerHTML = `
      <div class="ev-main" id="ev-main"></div>
      <div class="thumbs" id="thumbs" role="tablist" aria-label="Choose an emblem">${list.map((c, i) => `
        <button type="button" class="thumb" role="tab" data-i="${i}" style="${themeStyle(c.theme)}" aria-label="${esc(c.name)} emblem"><img class="art" src="${esc(assetUrl(c, 'logo'))}" alt="" loading="lazy" data-fallback="${esc(c.name.charAt(0))}" /></button>`).join('')}
      </div>`;
    const main = $('#ev-main'), thumbs = $$('#thumbs .thumb');
    wireImgs($('#thumbs'));

    function render(dir) {
      const c = list[idx];
      tint(c);
      document.title = `${c.name} emblem — Fly Go`;
      history.replaceState(null, '', `emblems.html?c=${encodeURIComponent(c.id)}`);
      main.style.cssText = themeStyle(c.theme);
      main.innerHTML = `
        ${stageHtml(c, view, true, 'sq')}
        <div class="ev-arrows">
          <button type="button" class="icon-btn" data-step="-1" aria-label="Previous emblem">${icon('left')}</button>
          <button type="button" class="icon-btn" data-step="1" aria-label="Next emblem">${icon('right')}</button>
        </div>
        <div class="ev-info">
          <span class="rtag"><img class="art" src="${esc(assetUrl(c, 'logo'))}" alt="" data-nofb />${esc(roleLabel(c.role))}</span>
          ${hx(c.name, 't xl shine')}
          ${toggleHtml(view)}
          <a class="btn primary" href="${link(c)}"><span>Open profile</span>${icon('right')}</a>
        </div>`;
      wireImgs(main);
      thumbs.forEach((t, i) => t.classList.toggle('on', i === idx));
      const on = thumbs[idx];
      if (on && on.scrollIntoView) { const box = $('#thumbs'); box.scrollTo({ left: on.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' }); }
    }
    const step = (d) => { idx = (idx + d + list.length) % list.length; render(); };
    main.addEventListener('click', (e) => {
      const s = e.target.closest('[data-step]');
      if (s) { step(+s.dataset.step); return; }
      const b = e.target.closest('.vtoggle button');
      if (b) {
        view = b.dataset.v;
        $$('.vtoggle button', main).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        setView($('.stage', main), view);
      }
    });
    $('#thumbs').addEventListener('click', (e) => { const t = e.target.closest('.thumb'); if (t) { idx = +t.dataset.i; render(); } });
    swipe(main, (d) => step(d));
    render();
  }

  /* ---------- LORE ---------- */

  const DOCS = [
    { f: 'UNIVERSE.md', t: 'Universe', d: 'World rules, setting and core pillars.', i: 'globe' },
    { f: 'STORY.md', t: 'Story', d: 'Narrative arcs and key events.', i: 'bookmark' },
    { f: 'CHARACTERS.md', t: 'Characters', d: 'Roster notes and design references.', i: 'users' },
    { f: 'ART-DIRECTION.md', t: 'Art Direction', d: 'Visual language and colour system.', i: 'palette' },
    { f: 'GAMEPLAY.md', t: 'Gameplay', d: 'Systems and player experience.', i: 'gamepad' },
    { f: 'ASSET-GUIDELINES.md', t: 'Guidelines', d: 'Naming, structure and how to add characters.', i: 'package' },
  ];
  function pageLore() {
    const host = $('#ldocs');
    host.innerHTML = DOCS.map((d, i) => `
      <a class="ldoc reveal" style="--d:${(i % 3) * 80}ms" href="${REPO}/blob/main/docs/${d.f}" target="_blank" rel="noopener">
        <span class="ghost-num">${pad(i + 1)}</span>
        <span class="p-ic">${icon(d.i)}</span>
        ${hx(d.t, i % 2 ? 'gold' : '')}
        <p>${esc(d.d)}</p>
        <span class="go">${icon('ext')}</span>
      </a>`).join('');
    watch(host);
    if (fine) host.addEventListener('pointermove', (e) => {
      const d = e.target.closest('.ldoc');
      if (!d) return;
      const r = d.getBoundingClientRect();
      d.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      d.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  /* ---------- boot ---------- */

  async function boot() {
    const t0 = performance.now();
    chrome();
    const arrived = arrive();
    bindNav();
    bindScroll();
    bindPointer();
    startFx();
    wireImgs(document);

    let ok = true;
    if (PAGE !== 'lore') {
      try { state.chars = await loadCharacters(); } catch (err) { console.error(err); ok = false; }
    }
    if (!ok) {
      $('#main').insertAdjacentHTML('beforeend', '<div class="container" style="padding:40px 0;color:var(--mute)">Unable to load the roster. Check data/characters.json.</div>');
    } else {
      ({ home: pageHome, roster: pageRoster, character: pageCharacter, emblems: pageEmblems, lore: pageLore }[PAGE] || (() => {}))();
    }

    const loader = $('#loader');
    const finish = () => {
      root.classList.add('ready');
      loader.classList.add('done');
      setTimeout(() => loader.remove(), 900);
      watch(document);
    };
    if (arrived) { loader.remove(); root.classList.add('ready'); watch(document); }
    else setTimeout(finish, Math.max(0, 600 - (performance.now() - t0)));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
