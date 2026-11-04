/* Able Parfum — sayt logikasi */
(() => {
  'use strict';

  const TG_USERNAME = 'shuxratgafurov1';
  const PAGE_SIZE = 12;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    lang: ['uz', 'ru', 'en'].includes(store.get('able-lang')) ? store.get('able-lang') : 'uz',
    products: [],
    settings: { sizes: [{ ml: 10, price: 150000 }, { ml: 20, price: 280000 }, { ml: 30, price: 400000 }, { ml: 50, price: 650000 }], globalDiscount: 0 },
    filter: 'all',
    query: '',
    visible: PAGE_SIZE,
    current: null,
    size: 10,
    qty: 1,
    online: true,
  };

  // ------------------------------------------------------------ i18n
  const t = (key, vars) => {
    let s = (I18N[state.lang] && I18N[state.lang][key]) ?? I18N.uz[key] ?? key;
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  };
  const money = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ |,/g, ' ');
  const priceText = (n) => `${money(n)} ${t('som')}`;

  function applyI18n() {
    document.documentElement.lang = state.lang;
    document.title = t('meta.title');
    $$('[data-i18n]').forEach((el) => {
      const val = t(el.dataset.i18n);
      if (el.dataset.i18nAttr) el.setAttribute(el.dataset.i18nAttr, val);
      el.textContent = val;
    });
    $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $$('.lang-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.lang === state.lang));
    moveLangIndicator();
    renderPain();
    renderFaq();
    renderPrices();
    renderContact();
    renderProducts();
    renderDeals();
    renderLightboxCaption();
    if (state.current && !$('#productModal').hidden) fillModal(state.current, true);
  }

  function moveIndicator(active, ind) {
    if (!active || !ind) return;
    ind.style.width = active.offsetWidth + 'px';
    ind.style.transform = `translateX(${active.offsetLeft - 3}px)`;
  }
  function moveLangIndicator() {
    moveIndicator($('.lang-btn.is-active'), $('.lang-indicator'));
    moveIndicator($('.theme-btn.is-active'), $('.theme-indicator'));
  }

  // ------------------------------------------------------------ day / night theme
  // Avtomatik: 08:00–20:00 kunduzgi, 20:00–08:00 tungi. Qo'lda tanlov keyingi almashinuv vaqtigacha amal qiladi.
  const THEME_KEY = 'able-theme';
  const autoTheme = (d = new Date()) => (d.getHours() >= 8 && d.getHours() < 20 ? 'light' : 'dark');
  function nextSwitch(d = new Date()) {
    const n = new Date(d);
    n.setMinutes(0, 0, 0);
    if (d.getHours() < 8) n.setHours(8);
    else if (d.getHours() < 20) n.setHours(20);
    else { n.setDate(n.getDate() + 1); n.setHours(8); }
    return n.getTime();
  }
  function wantedTheme() {
    try {
      const o = JSON.parse(localStorage.getItem(THEME_KEY));
      if (o && o.until > Date.now()) return o.theme;
    } catch { /* ignore */ }
    return autoTheme();
  }
  function applyTheme(theme, animate) {
    const run = () => {
      document.documentElement.dataset.theme = theme;
      $('meta[name="theme-color"]').setAttribute('content', theme === 'light' ? '#fdfaf4' : '#3a0a14');
      $$('.theme-btn').forEach((b) => {
        const on = b.dataset.themeSet === theme;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on);
      });
      moveLangIndicator();
    };
    if (animate && !reduceMotion && document.startViewTransition) document.startViewTransition(run);
    else run();
  }
  function initTheme() {
    applyTheme(wantedTheme(), false);
    $$('.theme-btn').forEach((b) => b.addEventListener('click', () => {
      const theme = b.dataset.themeSet;
      try { localStorage.setItem(THEME_KEY, JSON.stringify({ theme, until: nextSwitch() })); } catch { /* private mode */ }
      if (theme !== document.documentElement.dataset.theme) applyTheme(theme, true);
    }));
    setInterval(() => {
      const t = wantedTheme();
      if (t !== document.documentElement.dataset.theme) applyTheme(t, true);
    }, 60 * 1000);
  }

  function setLang(lang, btn) {
    if (lang === state.lang) return;
    state.lang = lang;
    store.set('able-lang', lang);
    if (btn && !reduceMotion) puff(btn);
    document.body.classList.add('lang-out');
    $$('.lang-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.lang === lang));
    moveLangIndicator();
    setTimeout(() => { applyI18n(); requestAnimationFrame(() => document.body.classList.remove('lang-out')); }, reduceMotion ? 0 : 320);
  }

  // Til tugmasi bosilganda atir purkalgandek zarrachalar
  function puff(el) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('span');
      p.className = 'lang-puff';
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
      p.style.left = r.left + r.width / 2 + 'px';
      p.style.top = r.top + r.height / 2 + 'px';
      p.style.position = 'fixed';
      p.style.setProperty('--x', Math.cos(a) * d + 'px');
      p.style.setProperty('--y', Math.sin(a) * d + 18 + 'px');
      p.style.animationDelay = Math.random() * 0.12 + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  // Extrude a product shot into a solid: darker copies stacked behind it along Z
  function extrude(box, cls, count, step) {
    const front = $('img', box);
    for (let i = 1; i <= count; i++) {
      const layer = front.cloneNode();
      layer.className = cls;
      layer.style.transform = `translateZ(${-i * step}px)`;
      box.insertBefore(layer, box.firstChild);
    }
  }

  // ------------------------------------------------------------ about: 3D showcase
  function initShowcase() {
    const root = $('#aboutShowcase');
    if (!root) return;
    $$('.sc-solid', root).forEach((s) => extrude(s, 'sc-depth', 9, 1.6));
    $$('.sc-bottle', root).forEach((b) => b.addEventListener('click', () => {
      const p = state.products.find((x) => x.id === b.dataset.id);
      if (p) openModal(p);
    }));
    if (reduceMotion || !matchMedia('(hover: hover)').matches) return;
    // Sichqoncha tomonga yengil og'ish
    root.addEventListener('pointermove', (e) => {
      const r = root.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      $$('.showcase-stage', root).forEach((s) => {
        s.style.setProperty('--ty', x * 18 + 'deg');
        s.style.setProperty('--tx', -y * 12 + 'deg');
      });
    });
    root.addEventListener('pointerleave', () => $$('.showcase-stage', root).forEach((s) => {
      s.style.removeProperty('--ty');
      s.style.removeProperty('--tx');
    }));
  }

  // ------------------------------------------------------------ intro
  function runIntro() {
    const intro = $('#intro');
    const force = /[?&]intro=1/.test(location.search);
    // Shown once per visit (tab session), not once forever
    const seen = { get: () => { try { return sessionStorage.getItem('able-intro-seen'); } catch { return null; } },
                   set: () => { try { sessionStorage.setItem('able-intro-seen', '1'); } catch { /* private mode */ } } };
    if ((seen.get() && !force) || reduceMotion) { intro.classList.add('is-gone'); return Promise.resolve(); }
    document.body.classList.add('no-scroll');

    $$('.bottle-3d', intro).forEach((bottle) => extrude(bottle, 'bottle-depth', 14, 1.4));

    const spawnMist = (box, dir) => {
      for (let i = 0; i < 60; i++) {
        const p = document.createElement('i');
        const spread = (Math.random() - 0.5) * 0.9;
        const dist = 160 + Math.random() * (innerWidth < 768 ? 120 : 260);
        p.style.setProperty('--x', dir * dist + 'px');
        p.style.setProperty('--y', Math.sin(spread) * dist * 0.6 - 10 + 'px');
        p.style.setProperty('--s', 3 + Math.random() * 7 + 'px');
        p.style.setProperty('--sc', 1.5 + Math.random() * 3);
        p.style.setProperty('--d', 1 + Math.random() * 0.9 + 's');
        p.style.setProperty('--delay', Math.floor(i / 20) * 0.32 + Math.random() * 0.25 + 's');
        box.appendChild(p);
      }
    };

    return new Promise((resolve) => {
      let done = false;
      const timers = [];
      const finish = () => {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
        seen.set();
        intro.classList.add('is-leaving');
        document.body.classList.remove('no-scroll');
        setTimeout(() => intro.classList.add('is-gone'), 1100);
        resolve();
      };
      timers.push(setTimeout(() => {
        intro.classList.add('is-spraying');
        spawnMist($('.mist-right', intro), 1);
        spawnMist($('.mist-left', intro), -1);
      }, 2000));
      timers.push(setTimeout(finish, 5600));
      $('#introSkip').addEventListener('click', finish);
    });
  }

  // ------------------------------------------------------------ data
  async function loadCatalog() {
    try {
      const r = await fetch('api/catalog', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch {
      state.online = false; // backend yo'q (statik hosting) — zaxira katalog
      const r = await fetch('data/catalog.json');
      return r.json();
    }
  }

  const discountOf = (p) => Math.max(Number(p.discount) || 0, Number(state.settings.globalDiscount) || 0);
  const finalPrice = (p, ml) => {
    const s = state.settings.sizes.find((x) => x.ml === ml) || state.settings.sizes[0];
    const basePrice = (p.prices && p.prices[ml]) || s.price;
    const d = discountOf(p);
    return { base: basePrice, final: Math.round((basePrice * (100 - d)) / 100 / 1000) * 1000, discount: d };
  };

  // ------------------------------------------------------------ savat (cart)
  const cart = [];

  function cartCount() { return cart.reduce((n, x) => n + x.qty, 0); }
  function cartTotal() { return cart.reduce((n, x) => n + finalPrice(x.product, x.ml).final * x.qty, 0); }

  function updateCartBadge() {
    const n = cartCount();
    const badge = $('#cartBadge');
    badge.hidden = n === 0;
    badge.textContent = n;
    // Floating cart bar
    const bar = $('#cartBar');
    if (bar) {
      bar.hidden = false;
      $('#cartBarCount').textContent = n;
      $('#cartBarText').textContent = n > 0 ? `Savat (${n} ta)` : 'Savat';
      bar.classList.toggle('is-empty', n === 0);
    }
    // Modal ichidagi savat ko'rsatgich
    const hint = $('#modalCartHint');
    if (hint) {
      hint.classList.toggle('hidden', n === 0);
      if (n > 0) $('#modalCartHintText').textContent = `Savatda ${n} ta mahsulot → ko'rish`;
    }
  }

  function addToCart(product, ml, qty) {
    const ex = cart.find((x) => x.product.id === product.id && x.ml === ml);
    if (ex) ex.qty = Math.min(20, ex.qty + qty);
    else cart.push({ product, ml, qty });
    updateCartBadge();
    showCartToast(product);
  }

  function showCartToast(product) {
    const el = $('#cartToast');
    if (!el) return;
    el.textContent = `✓ ${product.name} — ${t('cart.added')}`;
    el.classList.add('show');
    clearTimeout(showCartToast._t);
    showCartToast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function renderCartItems() {
    const empty = $('#cartEmpty'), footer = $('#cartFooter'), items = $('#cartItems');
    if (!empty || !footer || !items) return;
    if (!cart.length) {
      items.innerHTML = ''; empty.hidden = false; footer.classList.add('hidden'); return;
    }
    empty.hidden = true; footer.classList.remove('hidden');
    items.innerHTML = cart.map(({ product, ml, qty }, idx) => {
      const pr = finalPrice(product, ml);
      return `<div class="cart-item">
        <img src="${escapeHtml(product.image)}" alt="" class="cart-item-img" />
        <div class="cart-item-info">
          <p class="cart-item-name">${escapeHtml(product.name)}</p>
          <p class="cart-item-meta">${ml} ${t('ml')} × ${qty} = ${priceText(pr.final * qty)}</p>
        </div>
        <button type="button" class="cart-item-remove" data-remove="${idx}" aria-label="${t('cart.remove')}">×</button>
      </div>`;
    }).join('');
    $('#cartTotal').textContent = priceText(cartTotal());
  }

  function openCartModal() {
    renderCartItems();
    const cm = $('#cartModal');
    cm.hidden = false; cm.classList.remove('is-closing');
    document.body.classList.add('no-scroll');
  }

  function closeCartModal() {
    const cm = $('#cartModal');
    if (cm.hidden) return;
    cm.classList.add('is-closing');
    setTimeout(() => { cm.hidden = true; cm.classList.remove('is-closing'); document.body.classList.remove('no-scroll'); }, 330);
  }
  const genderLabel = (g) => t('g.' + g);

  // ------------------------------------------------------------ renderers
  function renderPain() {
    const grid = $('#painGrid');
    grid.innerHTML = [1, 2, 3, 4].map((i) => `
      <article class="pain-card reveal is-in" style="--rd:${i * 0.06}s">
        <div class="pc-before"><small>✕ ${t('pain.before')}</small><p>${t('pain.p' + i)}</p></div>
        <div class="pc-after"><small>✦ ${t('pain.after')}</small><p>${t('pain.s' + i)}</p></div>
      </article>`).join('');
  }

  function renderPrices() {
    const { sizes, globalDiscount } = state.settings;
    const min = Math.min(...sizes.map((s) => Math.round((s.price * (100 - globalDiscount)) / 100 / 1000) * 1000));
    $('#statFrom').textContent = money(min);
    $('#statSizes').textContent = sizes.length;
  }

  // ------------------------------------------------------------ deals: 3D karusel
  // Alohida chegirmasi bor (discount > 0) atirlar; erkak/ayol navbatma-navbat.
  const deals = { pos: 0, items: [], gap: 200, timer: 0, paused: false, justDragged: false };
  function dealProducts() {
    const list = state.products.filter((p) => (Number(p.discount) || 0) > 0);
    const women = list.filter((p) => p.gender === 'women'), others = list.filter((p) => p.gender !== 'women');
    const out = [];
    for (let i = 0; i < Math.max(women.length, others.length); i++) {
      if (others[i]) out.push(others[i]);
      if (women[i]) out.push(women[i]);
    }
    return out;
  }
  function renderDeals() {
    const box = $('#deals');
    if (!box) return;
    const items = dealProducts();
    // Admin panelda chegirma qo'yilgan har bir atir shu yerga avtomatik tushadi (1 ta bo'lsa ham)
    box.hidden = items.length === 0;
    box.classList.toggle('is-single', items.length === 1);
    if (box.hidden) { deals.items = []; return; }
    const ml = Math.min(...state.settings.sizes.map((s) => s.ml));
    $('.deals-pct', box).textContent = `−${Math.max(...items.map(discountOf))}%`;
    $('#dealsStage').innerHTML = items.map((p) => {
      const pr = finalPrice(p, ml);
      return `<button type="button" class="deal-card" data-id="${p.id}" aria-label="${escapeHtml(p.brand || '')} ${escapeHtml(p.name)}">
        <span class="deal-badge">−${pr.discount}%</span>
        <span class="deal-media"><span class="deal-solid"><img src="${p.image}" alt="" loading="lazy" draggable="false" /></span></span>
        <span class="deal-brand">${escapeHtml(p.brand || '')}</span>
        <span class="deal-name">${escapeHtml(p.name)}</span>
        <span class="deal-meta">${t('g.' + p.gender)} · ${ml} ${t('ml')}</span>
        <span class="deal-price"><s>${money(pr.base)}</s><b>${priceText(pr.final)}</b></span>
        <span class="deal-cta">${t('deals.order')}</span>
      </button>`;
    }).join('');
    $$('.deal-solid', box).forEach((s) => extrude(s, 'deal-depth', 8, 1.6));
    $('#dealsDots').innerHTML = items.map(() => '<i></i>').join('');
    deals.items = $$('.deal-card', box);
    if (deals.pos >= items.length) deals.pos = 0;
    layoutDeals(true);
  }
  function layoutDeals(animate) {
    const n = deals.items.length;
    if (!n) return;
    const stage = $('#dealsStage');
    const w = stage.clientWidth;
    deals.gap = w < 640 ? w * 0.4 : Math.min(240, w * 0.2);
    stage.classList.toggle('is-dragging', !animate);
    deals.items.forEach((el, i) => {
      let off = (((i - deals.pos) % n) + n) % n;
      if (off > n / 2) off -= n;
      const a = Math.abs(off), rot = Math.max(-1.6, Math.min(1.6, off)) * -26;
      el.style.transform = `translateX(${off * deals.gap}px) translateZ(${-a * 150}px) rotateY(${rot}deg)`;
      el.style.opacity = a > 2.6 ? 0 : 1 - a * 0.16;
      el.style.zIndex = 100 - Math.round(a * 10);
      el.style.pointerEvents = a > 2.6 ? 'none' : '';
      el.classList.toggle('is-center', a < 0.5);
      el.tabIndex = a < 0.5 ? 0 : -1;
    });
    const cur = ((Math.round(deals.pos) % n) + n) % n;
    $$('#dealsDots i').forEach((d, i) => d.classList.toggle('is-on', i === cur));
  }
  function goDeals(step) {
    deals.pos = Math.round(deals.pos) + step;
    layoutDeals(true);
  }
  function initDeals() {
    const stage = $('#dealsStage');
    if (!stage) return;
    $('#dealsPrev').addEventListener('click', () => goDeals(-1));
    $('#dealsNext').addEventListener('click', () => goDeals(1));
    addEventListener('resize', () => layoutDeals(true));

    // Sichqoncha/barmoq bilan chapga-o'ngga surish
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !deals.items.length) return;
      drag = { x: e.clientX, pos: deals.pos, moved: false, id: e.pointerId };
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; stage.setPointerCapture(drag.id); }
      if (drag.moved) { deals.pos = drag.pos - dx / deals.gap; layoutDeals(false); }
    });
    const end = () => {
      if (!drag) return;
      if (drag.moved) {
        deals.justDragged = true;
        setTimeout(() => { deals.justDragged = false; }, 0);
        deals.pos = Math.round(deals.pos);
        layoutDeals(true);
      }
      drag = null;
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);

    // Yon kartani bossangiz markazga keladi, markazdagini bossangiz buyurtma oynasi ochiladi
    stage.addEventListener('click', (e) => {
      const card = e.target.closest('.deal-card');
      if (!card || deals.justDragged) return;
      const i = deals.items.indexOf(card), n = deals.items.length;
      let off = (((i - Math.round(deals.pos)) % n) + n) % n;
      if (off > n / 2) off -= n;
      if (off !== 0) return goDeals(off);
      const p = state.products.find((x) => x.id === card.dataset.id);
      if (p) openModal(p);
    });
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goDeals(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goDeals(1); }
    });

    // Avtomatik aylanish: kursor ustida bo'lsa yoki ekranda ko'rinmasa to'xtaydi
    if (reduceMotion) return;
    const box = $('#deals');
    let visible = false;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(box);
    box.addEventListener('pointerenter', () => { deals.paused = true; });
    box.addEventListener('pointerleave', () => { deals.paused = false; });
    box.addEventListener('focusin', () => { deals.paused = true; });
    box.addEventListener('focusout', () => { deals.paused = false; });
    deals.timer = setInterval(() => {
      if (deals.items.length > 1 && visible && !deals.paused && !drag && !document.hidden && $('#productModal').hidden) goDeals(1);
    }, 3200);
  }

  function renderFaq() {
    const prices = state.settings.sizes.map((s) => `${s.ml} ${t('ml')} — ${priceText(s.price)}`).join(', ');
    const open = $$('.faq-item.is-open').map((x) => x.dataset.i);
    $('#faqList').innerHTML = [1, 2, 3, 4, 5, 6].map((i) => `
      <div class="faq-item${open.includes(String(i)) ? ' is-open' : ''}" data-i="${i}">
        <button type="button" class="faq-q" aria-expanded="${open.includes(String(i))}" aria-controls="faq-a-${i}">
          <span>${t('faq.q' + i)}</span><i class="faq-icon" aria-hidden="true"></i>
        </button>
        <div class="faq-a" id="faq-a-${i}" role="region"><div><p>${t('faq.a' + i, { prices })}</p></div></div>
      </div>`).join('');
  }

  function renderContact() {
    const s = state.settings;
    const addr = (s.address && s.address[state.lang]) || 'O‘zbekiston';
    $('#addrText').textContent = addr;
    $('#footerAddr').textContent = addr;
    const lm = s.landmark && s.landmark[state.lang];
    $('#landmarkRow').classList.toggle('hidden', !lm);
    $('#landmarkText').textContent = lm || '';
    if (s.hours) $('#hoursText').textContent = s.hours;
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    const onSale = (p) => (Number(p.discount) || 0) > 0;
    return state.products.filter((p) =>
      (state.filter === 'all' || (state.filter === 'sale' ? onSale(p) : p.gender === state.filter)) &&
      (!q || (p.name + ' ' + p.brand).toLowerCase().includes(q)))
      // chegirmadagilar ro'yxat boshida — birinchi sahifada ko'rinib tursin
      .sort((a, b) => onSale(b) - onSale(a));
  }

  function renderProducts() {
    const grid = $('#productGrid');
    if (!state.products.length) return;
    const list = filtered();
    const shown = list.slice(0, state.visible);
    const minSize = state.settings.sizes[0].ml;
    grid.innerHTML = shown.map((p, i) => {
      const pr = finalPrice(p, minSize);
      const sale = (Number(p.discount) || 0) > 0;
      return `
      <button type="button" class="p-card${sale ? ' is-sale' : ''}" data-id="${p.id}" style="--cd:${(i % PAGE_SIZE) * 0.04}s">
        <div class="p-media">
          <div class="p-badges">${p.bestseller ? `<span class="badge badge-hit">${t('cat.hit')}</span>` : ''}${pr.discount ? `<span class="badge badge-sale">−${pr.discount}%</span>` : ''}</div>
          <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
          ${sale ? `<span class="p-ribbon">${t('cat.saleRibbon')} −${pr.discount}%</span>` : ''}
        </div>
        <div class="p-info">
          <span class="p-brand">${escapeHtml(p.brand || '')}</span>
          <span class="p-name">${escapeHtml(p.name)}</span>
          <span class="p-meta">${genderLabel(p.gender)} · ${t('family.' + p.family)}</span>
          <span class="p-foot">
            <span class="p-price"><small>${minSize} ${t('ml')} ${state.lang === 'uz' ? '' : ''}</small><b>${priceText(pr.final)}</b>${pr.discount ? `<s>${money(pr.base)}</s>` : ''}</span>
            <span class="p-go" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
          </span>
        </div>
      </button>`;
    }).join('');
    $('#catEmpty').classList.toggle('hidden', list.length > 0);
    $('#showMore').classList.toggle('hidden', list.length <= state.visible);
    $('#catCount').textContent = `${list.length} ${t('cat.count')}`;
    $('#statCount').textContent = Math.floor(state.products.length / 10) * 10 || state.products.length;
  }

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ------------------------------------------------------------ product modal
  const modal = $('#productModal');

  function openModal(p) {
    state.current = p;
    state.size = state.settings.sizes[0].ml;
    state.qty = 1;
    fillModal(p);
    showStep('product');
    modal.hidden = false;
    modal.classList.remove('is-closing');
    document.body.classList.add('no-scroll');
    $('.modal-close', modal).focus({ preventScroll: true });
    history.replaceState(null, '', '#p=' + p.id);
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.classList.add('is-closing');
    setTimeout(() => {
      modal.hidden = true;
      modal.classList.remove('is-closing');
      document.body.classList.remove('no-scroll');
    }, 330);
    history.replaceState(null, '', location.pathname + location.search + '#catalog');
  }

  function fillModal(p, keepState) {
    $('#pmImg').src = p.image;
    $('#pmImg').alt = p.name;
    $('#pmBrand').textContent = p.brand || 'Able Parfum';
    $('#pmName').textContent = p.name;
    $('#pmGender').textContent = genderLabel(p.gender);
    $('#pmFamily').textContent = t('family.' + p.family);
    const custom = p.description && p.description[state.lang];
    $('#pmDesc').textContent = custom || `${p.name} — ${t('familyDesc.' + p.family)}`;
    $('#pmTop').textContent = p.notes.top;
    $('#pmHeart').textContent = p.notes.heart;
    $('#pmBase').textContent = p.notes.base;
    $('#pmIntensity').innerHTML = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= p.intensity ? 'on' : ''}"></i>`).join('');
    const d = discountOf(p);
    const badge = $('#pmBadge');
    badge.className = 'modal-badge badge ' + (d ? 'badge-sale' : p.bestseller ? 'badge-hit' : 'hidden');
    badge.textContent = d ? `−${d}%` : p.bestseller ? t('cat.hit') : '';
    $('#pmSizes').innerHTML = state.settings.sizes.map((s) => {
      const pr = finalPrice(p, s.ml);
      return `<button type="button" class="size-opt${s.ml === state.size ? ' is-active' : ''}" data-ml="${s.ml}"><b>${s.ml}</b><span>${t('ml')} · ${money(pr.final)}</span></button>`;
    }).join('');
    if (!keepState) state.qty = 1;
    updateTotal();
  }

  function updateTotal() {
    const pr = finalPrice(state.current, state.size);
    $('#qtyVal').textContent = state.qty;
    $('#pmTotal').textContent = priceText(pr.final * state.qty);
    $('#pmOld').textContent = pr.discount ? money(pr.base * state.qty) : '';
    $$('.size-opt').forEach((b) => b.classList.toggle('is-active', Number(b.dataset.ml) === state.size));
  }

  function showStep(name) {
    $$('.modal-step', modal).forEach((s) => s.classList.toggle('is-active', s.dataset.step === name));
    $('.modal-body', modal).scrollTop = 0;
    if (name === 'form') {
      if (cartCheckoutItems) {
        $('#orderSummary').innerHTML = cartCheckoutItems.map(({ product, ml, qty }) => {
          const pr = finalPrice(product, ml);
          return `<div class="summary-row"><img src="${escapeHtml(product.image)}" alt="" /><div><b>${escapeHtml(product.name)}</b><span>${ml} ${t('ml')} × ${qty}</span></div><strong>${priceText(pr.final * qty)}</strong></div>`;
        }).join('');
      } else {
        const p = state.current, pr = finalPrice(p, state.size);
        $('#orderSummary').innerHTML = `<img src="${escapeHtml(p.image)}" alt="" /><div><b>${escapeHtml(p.name)}</b><span>${state.size} ${t('ml')} × ${state.qty}</span></div><strong>${priceText(pr.final * state.qty)}</strong>`;
      }
      $('#formError').classList.add('hidden');
      setTimeout(() => $('#orderForm [name=name]').focus({ preventScroll: true }), 300);
    }
  }

  function buildOrderText(o, items) {
    const total = items.reduce((s, x) => s + finalPrice(x.product, x.ml).final * x.qty, 0);
    return [
      '🛍 Yangi buyurtma (Able Parfum sayti)',
      '',
      `👤 Ism: ${o.name}`,
      `📞 Telefon: ${o.phone}`,
      `🚚 ${o.delivery === 'delivery' ? 'Yetkazib berish' : "Do'kondan olib ketish"}`,
      o.address ? `📍 Manzil: ${o.address}` : '',
      o.location ? `🗺 Lokatsiya: ${mapsLink(o.location)}` : '',
      '',
      ...items.map((x) => `• ${x.product.name}${x.product.brand ? ' (' + x.product.brand + ')' : ''} — ${x.ml} ml × ${x.qty}`),
      `💰 Jami: ${money(total)} so'm`,
      o.comment ? `💬 ${o.comment}` : '',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  }

  // ---- Yetkazib berish: mijozning geolokatsiyasi (Telegram'ga xarita nuqtasi bo'lib boradi)
  let geo = null; // { lat, lng, acc }
  const mapsLink = (g) => `https://maps.google.com/?q=${g.lat},${g.lng}`;
  function setGeoUi(mode, msg) {
    const btn = $('#geoBtn'), m = $('#geoMsg');
    btn.classList.toggle('is-loading', mode === 'loading');
    btn.classList.toggle('is-ok', mode === 'ok');
    btn.disabled = mode === 'loading';
    const lbl = $('#geoLabel');
    lbl.dataset.i18n = mode === 'loading' ? 'modal.geoLoading' : mode === 'ok' ? 'modal.geoOk' : 'modal.geo'; // til almashganda ham to'g'ri qolsin
    lbl.textContent = t(lbl.dataset.i18n);
    $('#geoRemove').classList.toggle('hidden', mode !== 'ok');
    m.textContent = msg || '';
    m.classList.toggle('hidden', !msg);
    m.classList.toggle('is-error', mode === 'error');
  }
  function resetGeo() { geo = null; setGeoUi('idle'); }
  function requestGeo() {
    if (!('geolocation' in navigator)) return setGeoUi('error', t('modal.geoUnsupported'));
    setGeoUi('loading');
    navigator.geolocation.getCurrentPosition((p) => {
      geo = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy || 0) };
      setGeoUi('ok', geo.acc ? t('modal.geoAcc', { m: geo.acc }) : '');
    }, (er) => {
      geo = null;
      setGeoUi('error', t(er.code === 1 ? 'modal.geoDenied' : 'modal.geoFail'));
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 });
  }

  let cartCheckoutItems = null; // null = single product mode, array = cart mode

  async function submitOrder(e) {
    e.preventDefault();
    const f = e.target;
    const od = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      delivery: f.delivery.value,
      address: f.address.value.trim(),
      comment: f.comment.value.trim(),
    };
    if (od.delivery === 'delivery' && geo) od.location = geo;
    const err = $('#formError');
    const phoneDigits = od.phone.replace(/\D/g, '');
    f.name.closest('.field').classList.toggle('has-error', od.name.length < 2);
    f.phone.closest('.field').classList.toggle('has-error', phoneDigits.length < 9);
    if (od.name.length < 2 || phoneDigits.length < 9) {
      err.textContent = t('modal.invalid'); err.classList.remove('hidden'); return;
    }
    err.classList.add('hidden');
    const btn = $('#submitOrder');
    btn.disabled = true; btn.textContent = t('modal.sending');

    const orderItems = cartCheckoutItems
      ? cartCheckoutItems.map((x) => ({ productId: x.product.id, ml: x.ml, qty: x.qty }))
      : [{ productId: state.current.id, ml: state.size, qty: state.qty }];
    const localItems = cartCheckoutItems
      ? cartCheckoutItems.slice()
      : [{ product: state.current, ml: state.size, qty: state.qty }];

    let result = null;
    if (state.online) {
      try {
        const r = await fetch('api/orders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...od, lang: state.lang, items: orderItems }),
        });
        result = await r.json();
        if (!r.ok) throw new Error(result.error || r.status);
      } catch (ex) {
        if (result && result.error === 'invalid_contact') {
          err.textContent = t('modal.invalid'); err.classList.remove('hidden');
          btn.disabled = false; btn.textContent = t('modal.send'); return;
        }
        result = null;
      }
    }
    btn.disabled = false; btn.textContent = t('modal.send');

    const tgBtn = $('#doneTg');
    if (result && result.telegramSent) {
      $('#doneTitle').textContent = t('modal.okTitle');
      $('#doneText').textContent = t('modal.okText', { id: result.id });
      tgBtn.classList.add('hidden');
    } else {
      const text = (result && result.message) || buildOrderText(od, localItems);
      $('#doneTitle').textContent = t('modal.fallbackTitle');
      $('#doneText').textContent = (result ? t('modal.okText', { id: result.id }) + ' ' : '') + t('modal.fallbackText');
      tgBtn.href = `https://t.me/${TG_USERNAME}?text=${encodeURIComponent(text)}`;
      tgBtn.classList.remove('hidden');
      tgBtn.onclick = null;
    }

    if (cartCheckoutItems) {
      cart.splice(0); updateCartBadge(); cartCheckoutItems = null;
    }
    f.reset();
    f.phone.value = '+998 ';
    $('#addrField').classList.add('hidden');
    $('#geoField').classList.add('hidden');
    resetGeo();
    showStep('done');
  }

  // ------------------------------------------------------------ effects
  function tilt(el, target, strength = 10) {
    if (reduceMotion || matchMedia('(hover: none)').matches) return;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      (target || el).style.transform = `perspective(900px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg)`;
    });
    el.addEventListener('pointerleave', () => { (target || el).style.transform = ''; });
  }

  function heroParticles() {
    if (reduceMotion) return;
    const box = $('#heroParticles');
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.setProperty('--s', 2 + Math.random() * 5 + 'px');
      p.style.setProperty('--d', 9 + Math.random() * 12 + 's');
      p.style.setProperty('--delay', -Math.random() * 20 + 's');
      p.style.setProperty('--x', (Math.random() - 0.5) * 120 + 'px');
      box.appendChild(p);
    }
  }

  function observeReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal:not(.is-in)').forEach((el, i) => { el.style.setProperty('--rd', (i % 4) * 0.08 + 's'); io.observe(el); });
  }

  function headerOnScroll() {
    const header = $('#header');
    const sticky = $('#stickyCta');
    const links = $$('.nav-link');
    const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = scrollY;
      header.classList.toggle('is-scrolled', y > 30);
      sticky.classList.toggle('is-visible', y > innerHeight * 0.8 && y < document.body.scrollHeight - innerHeight * 1.6);
      let current = null;
      for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.35) current = s.id;
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + current));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // ------------------------------------------------------------ events
  function bind() {
    $$('.lang-btn').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang, b)));
    addEventListener('resize', moveLangIndicator);

    const menuBtn = $('#menuBtn'), nav = $('#mobileNav');
    const toggleMenu = (open) => {
      nav.classList.toggle('is-open', open);
      $('#navBackdrop').classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', open);
      document.body.classList.toggle('no-scroll', open);
    };
    menuBtn.addEventListener('click', () => toggleMenu(!nav.classList.contains('is-open')));
    $('#menuClose').addEventListener('click', () => toggleMenu(false));
    $('#navBackdrop').addEventListener('click', () => toggleMenu(false));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) toggleMenu(false); });
    matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) toggleMenu(false); });
    $$('a', nav).forEach((a) => a.addEventListener('click', () => toggleMenu(false)));

    $$('.filter-tab').forEach((b) => b.addEventListener('click', () => {
      $$('.filter-tab').forEach((x) => x.classList.toggle('is-active', x === b));
      state.filter = b.dataset.filter; state.visible = PAGE_SIZE; renderProducts();
    }));
    let qTimer;
    $('#searchInput').addEventListener('input', (e) => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => { state.query = e.target.value; state.visible = PAGE_SIZE; renderProducts(); }, 150);
    });
    $('#showMore').addEventListener('click', () => { state.visible += PAGE_SIZE; renderProducts(); });

    $('#productGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.p-card');
      if (card) openModal(state.products.find((p) => p.id === card.dataset.id));
    });
    $('#productGrid').addEventListener('pointermove', (e) => {
      if (reduceMotion || matchMedia('(hover: none)').matches) return;
      const card = e.target.closest('.p-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
    });
    $('#productGrid').addEventListener('pointerout', (e) => {
      const card = e.target.closest('.p-card');
      if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
    });

    modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) closeModal();
      const size = e.target.closest('.size-opt');
      if (size) { state.size = Number(size.dataset.ml); updateTotal(); }
      const go = e.target.closest('[data-goto]');
      if (go) showStep(go.dataset.goto);
    });
    $('#qtyMinus').addEventListener('click', () => { state.qty = Math.max(1, state.qty - 1); updateTotal(); });
    $('#qtyPlus').addEventListener('click', () => { state.qty = Math.min(20, state.qty + 1); updateTotal(); });

    // "Savatga qo'shish"
    $('#addToCartBtn').addEventListener('click', () => {
      addToCart(state.current, state.size, state.qty);
      closeModal();
    });

    // To'g'ridan buyurtma (bitta mahsulot)
    $('#toCheckout').addEventListener('click', () => {
      cartCheckoutItems = null;
      showStep('form');
    });

    $('#orderForm').addEventListener('submit', submitOrder);

    // Cart modal
    $('#cartBtn').addEventListener('click', openCartModal);
    const cartBarBtn = $('#cartBarBtn');
    if (cartBarBtn) cartBarBtn.addEventListener('click', openCartModal);
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-cart-close]')) closeCartModal();
      if (e.target.closest('[data-remove]')) {
        const idx = Number(e.target.closest('[data-remove]').dataset.remove);
        cart.splice(idx, 1); updateCartBadge(); renderCartItems();
      }
    });
    $('#cartCheckout').addEventListener('click', () => {
      cartCheckoutItems = cart.slice();
      closeCartModal();
      modal.hidden = false; modal.classList.remove('is-closing');
      document.body.classList.add('no-scroll');
      showStep('form');
      setTimeout(() => $('#orderForm [name=name]').focus({ preventScroll: true }), 300);
    });
    $('#cartClear').addEventListener('click', () => { cart.splice(0); updateCartBadge(); renderCartItems(); });
    $$('#orderForm [name=delivery]').forEach((r) => r.addEventListener('change', () => {
      const del = $('#orderForm').delivery.value === 'delivery';
      $('#addrField').classList.toggle('hidden', !del);
      $('#geoField').classList.toggle('hidden', !del);
    }));
    $('#geoBtn').addEventListener('click', requestGeo);
    $('#geoRemove').addEventListener('click', resetGeo);
    $('#orderForm [name=phone]').addEventListener('input', (e) => {
      // +998 XX XXX XX XX formatlash
      let d = e.target.value.replace(/\D/g, '');
      if (!d.startsWith('998')) d = '998' + d.replace(/^998?/, '');
      d = d.slice(0, 12);
      const parts = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)].filter(Boolean);
      e.target.value = '+' + parts.join(' ');
    });
    tilt($('.modal-media'), $('#pmTilt'), 18);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModal(); closeLightbox(); closeCartModal(); }
      if (!$('#lightbox').hidden) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
        if (e.key === 'Home') { e.preventDefault(); showLightbox(0, -1); }
        if (e.key === 'End') { e.preventDefault(); showLightbox(lbState.items.length - 1, 1); }
      }
    });

    $('#faqList').addEventListener('click', (e) => {
      const q = e.target.closest('.faq-q');
      if (!q) return;
      const item = q.parentElement;
      const open = !item.classList.contains('is-open');
      $$('.faq-item').forEach((x) => { x.classList.remove('is-open'); $('.faq-q', x).setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', open);
    });

    initLightbox();

    const stage = $('#heroStage');
    if (stage && !reduceMotion && matchMedia('(hover: hover)').matches) {
      $('.hero').addEventListener('pointermove', (e) => {
        const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
        $('#stage3d').style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 10}deg)`;
      });
    }

    // 3D ko'tarish effekti: bosib ushlaganda flakon ko'tariladi
    $$('.float-bottle').forEach((b) => {
      const lift = () => b.classList.add('lifted');
      const drop = () => b.classList.remove('lifted');
      b.addEventListener('mousedown', lift);
      b.addEventListener('mouseup', drop);
      b.addEventListener('mouseleave', drop);
      b.addEventListener('touchstart', lift, { passive: true });
      b.addEventListener('touchend', drop);
      b.addEventListener('touchcancel', drop);
    });
  }
  // ------------------------------------------------------------ gallery lightbox
  // Chapga/o'ngga: o'q tugmalari, klaviatura (← →), barmoq bilan surish, rasmning chap/o'ng yarmini bosish.
  const lbState = { items: [], i: 0, opener: null };
  function initLightbox() {
    const lb = $('#lightbox');
    lbState.items = $$('#gallery .g-item');
    $('#gallery').addEventListener('click', (e) => {
      const g = e.target.closest('.g-item');
      if (!g) return;
      lbState.opener = g;
      lb.hidden = false;
      document.body.classList.add('no-scroll');
      showLightbox(lbState.items.indexOf(g), 0);
      $('#lbClose').focus({ preventScroll: true });
    });
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', () => stepLightbox(-1));
    $('#lbNext').addEventListener('click', () => stepLightbox(1));
    // Fonni bosish yopadi; rasm va izoh ustida emas
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

    const frame = $('#lbFrame'), img = $('#lightboxImg');
    let drag = null;
    frame.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    });
    frame.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 8) { drag.moved = true; frame.setPointerCapture(drag.id); }
      if (drag.moved) { img.style.transition = 'none'; img.style.transform = `translateX(${dx}px) rotate(${dx / 60}deg)`; img.style.opacity = 1 - Math.min(0.5, Math.abs(dx) / 600); }
    });
    const end = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, moved = drag.moved;
      drag = null;
      img.style.transition = ''; img.style.transform = ''; img.style.opacity = '';
      if (moved) { if (Math.abs(dx) > 60) stepLightbox(dx < 0 ? 1 : -1); return; }
      // oddiy bosish: rasmning chap yarmi — oldingi, o'ng yarmi — keyingi
      const r = frame.getBoundingClientRect();
      stepLightbox(e.clientX < r.left + r.width / 2 ? -1 : 1);
    };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', () => { drag = null; img.style.transition = ''; img.style.transform = ''; img.style.opacity = ''; });
    frame.addEventListener('pointermove', (e) => {
      if (drag) return;
      const r = frame.getBoundingClientRect();
      frame.classList.toggle('is-left', e.clientX < r.left + r.width / 2);
    });
  }
  function stepLightbox(dir) {
    const n = lbState.items.length;
    showLightbox((lbState.i + dir + n) % n, dir);
  }
  function showLightbox(i, dir) {
    const n = lbState.items.length;
    lbState.i = i;
    const g = lbState.items[i], src = $('img', g), img = $('#lightboxImg');
    img.src = src.src;
    img.alt = src.alt;
    img.classList.remove('lb-in-l', 'lb-in-r', 'lb-in');
    void img.offsetWidth; // animatsiyani qayta boshlash
    img.classList.add(dir > 0 ? 'lb-in-r' : dir < 0 ? 'lb-in-l' : 'lb-in');
    renderLightboxCaption();
    // qo'shni rasmlarni oldindan yuklab qo'yish
    [i - 1, i + 1].forEach((j) => { const im = $('img', lbState.items[(j + n) % n]); if (im) new Image().src = im.src; });
  }
  function renderLightboxCaption() {
    const g = lbState.items[lbState.i];
    if (!g || $('#lightbox').hidden) return;
    const key = g.dataset.cap;
    $('#lbCount').textContent = `${lbState.i + 1} / ${lbState.items.length}`;
    $('#lbTitle').textContent = key ? t(`gal.${key}.t`) : '';
    $('#lbDesc').textContent = key ? t(`gal.${key}.d`) : '';
  }
  function closeLightbox() {
    const lb = $('#lightbox');
    if (lb.hidden) return;
    lb.hidden = true;
    if ($('#productModal').hidden) document.body.classList.remove('no-scroll');
    if (lbState.opener) lbState.opener.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------ boot
  async function boot() {
    $('#year').textContent = new Date().getFullYear();
    applyI18n();
    bind();
    heroParticles();
    headerOnScroll();
    initTheme();
    initShowcase();
    initDeals();
    const intro = runIntro();

    try {
      const data = await loadCatalog();
      state.settings = { ...state.settings, ...data.settings };
      state.products = data.products.filter((p) => p.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      applyI18n();
      const m = location.hash.match(/^#p=([\w-]+)/);
      if (m) {
        const p = state.products.find((x) => x.id === m[1]);
        if (p) intro.then(() => openModal(p));
      }
    } catch (e) { console.error('Katalog yuklanmadi', e); }

    intro.then(() => { observeReveal(); moveLangIndicator(); });
    if (state.online) fetch('api/visit', { method: 'POST' }).catch(() => {});
  }

  boot();
})();
