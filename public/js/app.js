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
    $$('.lang-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.lang === state.lang));
    moveLangIndicator();
    renderPain();
    renderFaq();
    renderPrices();
    renderContact();
    renderProducts();
    if (state.current && !$('#productModal').hidden) fillModal(state.current, true);
  }

  function moveLangIndicator() {
    const active = $('.lang-btn.is-active');
    const ind = $('.lang-indicator');
    if (!active || !ind) return;
    ind.style.width = active.offsetWidth + 'px';
    ind.style.transform = `translateX(${active.offsetLeft - 3}px)`;
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

  // ------------------------------------------------------------ intro
  function runIntro() {
    const intro = $('#intro');
    const force = /[?&]intro=1/.test(location.search);
    if ((store.get('able-intro-seen') && !force) || reduceMotion) { intro.classList.add('is-gone'); return Promise.resolve(); }
    document.body.classList.add('no-scroll');

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
        store.set('able-intro-seen', '1');
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
    const d = discountOf(p);
    return { base: s.price, final: Math.round((s.price * (100 - d)) / 100 / 1000) * 1000, discount: d };
  };
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
    $('#priceBand').innerHTML = sizes.map((s) => {
      const fin = Math.round((s.price * (100 - globalDiscount)) / 100 / 1000) * 1000;
      return `<div class="price-chip"><b>${s.ml} ${t('ml')}</b>${globalDiscount ? `<s>${priceText(s.price)}</s>` : ''}<span>${priceText(fin)}</span></div>`;
    }).join('');
    const rib = $('#discountRibbon');
    const label = state.settings.discountLabel && state.settings.discountLabel[state.lang];
    if (globalDiscount) { rib.textContent = label || `−${globalDiscount}%`; rib.classList.remove('hidden'); } else rib.classList.add('hidden');
    const min = Math.min(...sizes.map((s) => Math.round((s.price * (100 - globalDiscount)) / 100 / 1000) * 1000));
    $('#statFrom').textContent = money(min);
    $('#statSizes').textContent = sizes.length;
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
    const addr = (s.address && s.address[state.lang]) || 'Buxoro';
    $('#addrText').textContent = addr;
    $('#footerAddr').textContent = addr;
    const lm = s.landmark && s.landmark[state.lang];
    $('#landmarkRow').classList.toggle('hidden', !lm);
    $('#landmarkText').textContent = lm || '';
    if (s.hours) $('#hoursText').textContent = s.hours;
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    return state.products.filter((p) =>
      (state.filter === 'all' || p.gender === state.filter) &&
      (!q || (p.name + ' ' + p.brand).toLowerCase().includes(q)));
  }

  function renderProducts() {
    const grid = $('#productGrid');
    if (!state.products.length) return;
    const list = filtered();
    const shown = list.slice(0, state.visible);
    const minSize = state.settings.sizes[0].ml;
    grid.innerHTML = shown.map((p, i) => {
      const pr = finalPrice(p, minSize);
      return `
      <button type="button" class="p-card" data-id="${p.id}" style="--cd:${(i % PAGE_SIZE) * 0.04}s">
        <div class="p-media">
          <div class="p-badges">${p.bestseller ? `<span class="badge badge-hit">${t('cat.hit')}</span>` : ''}${pr.discount ? `<span class="badge badge-sale">−${pr.discount}%</span>` : ''}</div>
          <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
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
      const p = state.current, pr = finalPrice(p, state.size);
      $('#orderSummary').innerHTML = `<img src="${p.image}" alt="" /><div><b>${escapeHtml(p.name)}</b><span>${state.size} ${t('ml')} × ${state.qty}</span></div><strong>${priceText(pr.final * state.qty)}</strong>`;
      $('#formError').classList.add('hidden');
      setTimeout(() => $('#orderForm [name=name]').focus({ preventScroll: true }), 300);
    }
  }

  function buildOrderText(o) {
    const p = state.current, pr = finalPrice(p, state.size);
    return [
      '🛍 Yangi buyurtma (Able Parfum sayti)',
      '',
      `👤 Ism: ${o.name}`,
      `📞 Telefon: ${o.phone}`,
      `🚚 ${o.delivery === 'delivery' ? 'Yetkazib berish' : "Do'kondan olib ketish"}`,
      o.address ? `📍 Manzil: ${o.address}` : '',
      '',
      `• ${p.name}${p.brand ? ' (' + p.brand + ')' : ''} — ${state.size} ml × ${state.qty}`,
      `💰 Jami: ${money(pr.final * state.qty)} so'm`,
      o.comment ? `💬 ${o.comment}` : '',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  }

  async function submitOrder(e) {
    e.preventDefault();
    const f = e.target;
    const data = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      delivery: f.delivery.value,
      address: f.address.value.trim(),
      comment: f.comment.value.trim(),
    };
    const err = $('#formError');
    const phoneDigits = data.phone.replace(/\D/g, '');
    f.name.closest('.field').classList.toggle('has-error', data.name.length < 2);
    f.phone.closest('.field').classList.toggle('has-error', phoneDigits.length < 9);
    if (data.name.length < 2 || phoneDigits.length < 9) {
      err.textContent = t('modal.invalid'); err.classList.remove('hidden'); return;
    }
    err.classList.add('hidden');
    const btn = $('#submitOrder');
    btn.disabled = true; btn.textContent = t('modal.sending');

    let result = null;
    if (state.online) {
      try {
        const r = await fetch('api/orders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, lang: state.lang, items: [{ productId: state.current.id, ml: state.size, qty: state.qty }] }),
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
      // Bot hali ulanmagan yoki server ishlamayapti: xabarni nusxalab, Telegram chatini ochamiz
      const text = (result && result.message) || buildOrderText(data);
      $('#doneTitle').textContent = t('modal.fallbackTitle');
      $('#doneText').textContent = (result ? t('modal.okText', { id: result.id }) + ' ' : '') + t('modal.fallbackText');
      tgBtn.href = `https://t.me/${TG_USERNAME}`;
      tgBtn.classList.remove('hidden');
      tgBtn.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {}); };
    }
    f.reset();
    f.phone.value = '+998 ';
    $('#addrField').classList.add('hidden');
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
      menuBtn.setAttribute('aria-expanded', open);
      document.body.classList.toggle('no-scroll', open);
    };
    menuBtn.addEventListener('click', () => toggleMenu(!nav.classList.contains('is-open')));
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
    $('#toCheckout').addEventListener('click', () => showStep('form'));
    $('#orderForm').addEventListener('submit', submitOrder);
    $$('#orderForm [name=delivery]').forEach((r) => r.addEventListener('change', () => {
      $('#addrField').classList.toggle('hidden', $('#orderForm').delivery.value !== 'delivery');
    }));
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
      if (e.key === 'Escape') { closeModal(); closeLightbox(); }
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

    const lb = $('#lightbox');
    $('#gallery').addEventListener('click', (e) => {
      const g = e.target.closest('.g-item');
      if (!g) return;
      const img = $('img', g);
      $('#lightboxImg').src = img.src; $('#lightboxImg').alt = img.alt;
      lb.hidden = false; document.body.classList.add('no-scroll');
    });
    lb.addEventListener('click', closeLightbox);

    const stage = $('#heroStage');
    if (stage && !reduceMotion && matchMedia('(hover: hover)').matches) {
      $('.hero').addEventListener('pointermove', (e) => {
        const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
        $('#stage3d').style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 10}deg)`;
      });
    }
  }
  function closeLightbox() {
    const lb = $('#lightbox');
    if (lb.hidden) return;
    lb.hidden = true;
    if ($('#productModal').hidden) document.body.classList.remove('no-scroll');
  }

  // ------------------------------------------------------------ boot
  async function boot() {
    $('#year').textContent = new Date().getFullYear();
    applyI18n();
    bind();
    heroParticles();
    headerOnScroll();
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
