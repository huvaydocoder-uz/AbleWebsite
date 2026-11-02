/* Able Parfum — admin panel logikasi */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ss = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* */ } },
    del: (k) => { try { sessionStorage.removeItem(k); } catch { /* */ } },
  };
  const money = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/ |,/g, ' ');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (iso) => new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const GENDER = { men: 'Erkaklar', women: 'Ayollar', unisex: 'Uniseks' };
  const STATUS = { new: 'Yangi', confirmed: 'Tasdiqlangan', done: 'Bajarilgan', cancelled: 'Bekor qilingan' };

  let token = ss.get('able-admin-token');
  const data = { stats: null, orders: [], products: [], settings: null };

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  async function api(path, opts = {}) {
    const r = await fetch('api/' + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (r.status === 401 && path !== 'admin/login') { logout(true); throw new Error('unauthorized'); }
    if (r.status === 204) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || r.status), { status: r.status, body: j });
    return j;
  }

  // ------------------------------------------------------------ auth
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, err = $('#loginError');
    err.classList.add('hidden');
    try {
      const r = await api('admin/login', { method: 'POST', body: { email: f.email.value, password: f.password.value } });
      token = r.token; ss.set('able-admin-token', token);
      f.reset();
      start();
    } catch (ex) {
      err.textContent = ex.status === 429 ? "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring."
        : ex.status === 401 ? "Login yoki parol noto'g'ri."
        : ex.status === 503 ? 'Admin hali sozlanmagan (server/setup-admin.js).'
        : "Server bilan aloqa yo'q. Sayt server orqali ishga tushirilganini tekshiring.";
      err.classList.remove('hidden');
    }
  });

  function logout(expired) {
    if (token && !expired) api('admin/logout', { method: 'POST' }).catch(() => {});
    token = null; ss.del('able-admin-token');
    $('#appView').classList.add('hidden');
    $('#loginView').classList.remove('hidden');
    if (expired) toast('Sessiya tugadi, qayta kiring.');
  }
  $('#logoutBtn').addEventListener('click', () => logout(false));

  // ------------------------------------------------------------ tabs
  function showTab(name) {
    $$('#tabs .tab-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === name));
    $$('[data-view]').forEach((v) => v.classList.toggle('hidden', v.dataset.view !== name));
    location.hash = name;
  }
  $$('#tabs .tab-btn').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $$('[data-refresh]').forEach((b) => b.addEventListener('click', () => loadAll().then(() => toast('Yangilandi'))));

  async function start() {
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    showTab((location.hash || '#stats').slice(1).replace(/[^a-z]/g, '') || 'stats');
    await loadAll();
  }

  async function loadAll() {
    const [stats, orders, products, settings] = await Promise.all([
      api('admin/stats'), api('admin/orders'), api('admin/products'), api('admin/settings'),
    ]);
    Object.assign(data, { stats, orders, products, settings });
    renderStats(); renderOrders(); renderCustomers(); renderProducts(); renderPrices(); renderSettings();
  }

  // ------------------------------------------------------------ stats
  function renderStats() {
    const s = data.stats;
    const kpi = (label, value, sub) => `<div class="card p-5"><p class="text-xs uppercase tracking-[.14em] text-wine-800/80 font-bold">${label}</p><p class="font-display text-4xl mt-2">${value}</p><p class="text-xs text-wine-800/80 mt-1">${sub || ''}</p></div>`;
    $('#kpis').innerHTML = [
      kpi('Jami buyurtmalar', s.totalOrders, `Bugun: ${s.todayOrders} · Yangi: ${s.newOrders}`),
      kpi('Mijozlar', s.customers, 'Turli telefon raqamlar'),
      kpi("Sotuv (bajarilgan)", money(s.revenue) + " <small class='text-base'>so'm</small>", `Jarayonda jami: ${money(s.pipeline)} so'm`),
      kpi('Sayt tashriflari', s.visits, `Bugun: ${s.todayVisits} · Konversiya: ${s.conversion}%`),
    ].join('');
    const nb = $('#newBadge');
    nb.textContent = s.newOrders; nb.classList.toggle('hidden', !s.newOrders);

    const days = Object.entries(s.byDay);
    const max = Math.max(1, ...days.map(([, d]) => d.orders));
    $('#chart').innerHTML = days.map(([day, d]) => `
      <div class="flex-1 h-full flex flex-col justify-end items-center gap-1 group" title="${day}: ${d.orders} ta buyurtma, ${money(d.revenue)} so'm, ${d.visits} tashrif">
        <span class="text-[10px] font-bold text-wine-700 opacity-0 group-hover:opacity-100">${d.orders}</span>
        <div class="bar w-full rounded-t-lg bg-gradient-to-t from-wine-700 to-wine-500" style="height:${Math.max(3, (d.orders / max) * 100)}%"></div>
      </div>`).join('');
    $('#chartLabels').innerHTML = days.map(([day]) => `<span class="flex-1 text-center">${day.slice(8)}.${day.slice(5, 7)}</span>`).join('');
    $('#chartLegend').textContent = `Eng ko'p: ${max} ta`;

    $('#topList').innerHTML = s.top.length ? s.top.map(([name, n], i) => `
      <li class="flex items-center gap-3"><b class="w-6 text-wine-800/80">${i + 1}</b><span class="flex-1 truncate">${esc(name)}</span><span class="pill st-new">${n} dona</span></li>`).join('')
      : '<li class="text-sm text-wine-800/80">Hali maʼlumot yoʻq</li>';
    const sizeTotal = Object.values(s.sizes).reduce((a, b) => a + b, 0) || 1;
    $('#sizeList').innerHTML = Object.keys(s.sizes).length ? Object.entries(s.sizes).map(([ml, n]) => `
      <div><div class="flex justify-between text-sm"><span>${ml} ml</span><span>${n} dona</span></div>
      <div class="h-2 rounded-full bg-cream-200 mt-1"><div class="h-2 rounded-full bg-wine-600" style="width:${(n / sizeTotal) * 100}%"></div></div></div>`).join('')
      : '<p class="text-sm text-wine-800/80">Hali maʼlumot yoʻq</p>';
  }

  // ------------------------------------------------------------ orders
  function filteredOrders() {
    const q = $('#orderSearch').value.trim().toLowerCase();
    const st = $('#orderStatus').value;
    return data.orders.filter((o) => (!st || o.status === st) &&
      (!q || [o.id, o.name, o.phone].join(' ').toLowerCase().includes(q)));
  }

  function renderOrders() {
    const list = filteredOrders();
    $('#ordersEmpty').classList.toggle('hidden', list.length > 0);
    $('#ordersBody').innerHTML = list.map((o) => `
      <tr data-id="${o.id}">
        <td class="font-bold whitespace-nowrap">${o.id} ${o.telegramSent ? '<span title="Telegramga yuborildi">✈️</span>' : '<span title="Telegramga yuborilmadi (bot sozlanmagan)" class="opacity-40">✈️</span>'}</td>
        <td class="whitespace-nowrap text-wine-800/80">${fmtDate(o.createdAt)}</td>
        <td><b>${esc(o.name)}</b><br /><a class="text-wine-600" href="tel:${esc(o.phone.replace(/\s/g, ''))}">${esc(o.phone)}</a></td>
        <td>${o.items.map((i) => `${esc(i.name)} · ${i.ml} ml × ${i.qty}${i.discount ? ` <span class="pill st-new">−${i.discount}%</span>` : ''}`).join('<br />')}${o.comment ? `<br /><i class="text-wine-800/80">“${esc(o.comment)}”</i>` : ''}</td>
        <td class="whitespace-nowrap font-bold">${money(o.total)} so'm</td>
        <td>${o.delivery === 'delivery' ? `Yetkazish${o.address ? `<br /><small class="text-wine-800/80">${esc(o.address)}</small>` : ''}` : "Do'kondan"}</td>
        <td><select class="inp !py-1.5 !text-xs st-${o.status}" data-status>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === o.status ? ' selected' : ''}>${v}</option>`).join('')}</select></td>
        <td><input class="inp !py-1.5 !text-xs min-w-[140px]" data-note value="${esc(o.note || '')}" placeholder="Izoh…" /></td>
      </tr>`).join('');
  }
  $('#orderSearch').addEventListener('input', renderOrders);
  $('#orderStatus').addEventListener('change', renderOrders);
  $('#ordersBody').addEventListener('change', async (e) => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const body = e.target.matches('[data-status]') ? { status: e.target.value } : e.target.matches('[data-note]') ? { note: e.target.value } : null;
    if (!body) return;
    try {
      const o = await api('admin/orders/' + tr.dataset.id, { method: 'PATCH', body });
      Object.assign(data.orders.find((x) => x.id === o.id), o);
      if (body.status) { e.target.className = `inp !py-1.5 !text-xs st-${o.status}`; data.stats = await api('admin/stats'); renderStats(); renderCustomers(); }
      toast('Saqlandi');
    } catch { toast('Xatolik: saqlanmadi'); }
  });

  $('#exportCsv').addEventListener('click', () => {
    const rows = [['Buyurtma', 'Sana', 'Mijoz', 'Telefon', 'Mahsulotlar', 'Summa', 'Olish usuli', 'Manzil', 'Izoh', 'Holat', 'Admin izohi']];
    for (const o of filteredOrders()) {
      rows.push([o.id, fmtDate(o.createdAt), o.name, o.phone, o.items.map((i) => `${i.name} ${i.ml}ml x${i.qty}`).join('; '), o.total,
        o.delivery === 'delivery' ? 'Yetkazish' : "Do'kondan", o.address, o.comment, STATUS[o.status], o.note || '']);
    }
    const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `able-buyurtmalar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // ------------------------------------------------------------ customers (CRM)
  function renderCustomers() {
    const map = new Map();
    for (const o of data.orders) {
      const key = o.phone.replace(/\D/g, '');
      const c = map.get(key) || { name: o.name, phone: o.phone, count: 0, total: 0, last: o.createdAt, fav: {} };
      c.count++;
      if (o.status !== 'cancelled') c.total += o.total;
      if (o.createdAt > c.last) { c.last = o.createdAt; c.name = o.name; }
      for (const i of o.items) c.fav[i.name] = (c.fav[i.name] || 0) + i.qty;
      map.set(key, c);
    }
    const list = [...map.values()].sort((a, b) => b.total - a.total);
    $('#customersEmpty').classList.toggle('hidden', list.length > 0);
    $('#customersBody').innerHTML = list.map((c) => {
      const fav = Object.entries(c.fav).sort((a, b) => b[1] - a[1])[0];
      return `<tr><td><b>${esc(c.name)}</b></td><td><a class="text-wine-600" href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></td>
        <td>${c.count}</td><td class="font-bold">${money(c.total)} so'm</td><td class="text-wine-800/80">${fmtDate(c.last)}</td><td>${fav ? esc(fav[0]) : '—'}</td></tr>`;
    }).join('');
  }

  // ------------------------------------------------------------ products
  function renderProducts() {
    const q = $('#prodSearch').value.trim().toLowerCase();
    const g = $('#prodGender').value;
    const base = data.settings.sizes[0];
    const list = data.products.filter((p) => (!g || p.gender === g) && (!q || (p.name + ' ' + p.brand).toLowerCase().includes(q)));
    $('#prodCount').textContent = data.products.length;
    $('#productsBody').innerHTML = list.map((p) => {
      const d = p.effectiveDiscount;
      const price = Math.round((base.price * (100 - d)) / 100 / 1000) * 1000;
      return `<tr data-id="${p.id}" class="${p.active ? '' : 'opacity-50'}">
        <td><img class="p-thumb" src="${esc(p.image)}" alt="" loading="lazy" /></td>
        <td><b>${esc(p.name)}</b><br /><small class="text-wine-800/80">${esc(p.brand || '—')}</small></td>
        <td>${GENDER[p.gender]}</td>
        <td><input class="inp !w-20 !py-1.5" type="number" min="0" max="90" value="${p.discount || 0}" data-discount /></td>
        <td class="whitespace-nowrap">${d ? `<s class="text-wine-800/80 text-xs">${money(base.price)}</s><br />` : ''}<b>${money(price)}</b></td>
        <td><label class="switch"><input type="checkbox" data-best ${p.bestseller ? 'checked' : ''} /><span></span></label></td>
        <td><label class="switch"><input type="checkbox" data-active ${p.active ? 'checked' : ''} /><span></span></label></td>
        <td class="text-right"><button class="btn btn-line !py-1.5 !px-4" data-edit>Tahrirlash</button></td>
      </tr>`;
    }).join('');
  }
  $('#prodSearch').addEventListener('input', renderProducts);
  $('#prodGender').addEventListener('change', renderProducts);

  async function updateProduct(id, body, msg = 'Saqlandi') {
    const p = await api('admin/products/' + id, { method: 'PUT', body });
    data.products = await api('admin/products');
    renderProducts();
    toast(msg);
    return p;
  }

  $('#productsBody').addEventListener('change', async (e) => {
    const id = e.target.closest('tr')?.dataset.id; if (!id) return;
    try {
      if (e.target.matches('[data-discount]')) await updateProduct(id, { discount: e.target.value }, 'Chegirma saqlandi');
      if (e.target.matches('[data-best]')) await updateProduct(id, { bestseller: e.target.checked });
      if (e.target.matches('[data-active]')) await updateProduct(id, { active: e.target.checked }, e.target.checked ? "Saytda ko'rinadi" : 'Saytdan yashirildi');
    } catch { toast('Xatolik: saqlanmadi'); }
  });
  $('#productsBody').addEventListener('click', (e) => {
    if (e.target.closest('[data-edit]')) openEditor(data.products.find((p) => p.id === e.target.closest('tr').dataset.id));
  });

  // editor
  const dlg = $('#prodDialog'), pf = $('#prodForm');
  let editing = null, imageData = null;
  function openEditor(p) {
    editing = p || null; imageData = null;
    pf.reset();
    $('#prodDialogTitle').textContent = p ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot';
    $('#pfDelete').classList.toggle('invisible', !p);
    const v = p || { name: '', brand: '', gender: 'men', family: 'fresh', intensity: 3, discount: 0, notes: { top: '', heart: '', base: '' }, bestseller: false, active: true };
    pf.name.value = v.name; pf.brand.value = v.brand || ''; pf.gender.value = v.gender; pf.family.value = v.family;
    pf.intensity.value = v.intensity; pf.discount.value = v.discount || 0;
    pf.top.value = v.notes.top; pf.heart.value = v.notes.heart; pf.base.value = v.notes.base;
    pf.bestseller.checked = !!v.bestseller; pf.active.checked = v.active !== false;
    pf.descUz.value = v.description?.uz || ''; pf.descRu.value = v.description?.ru || ''; pf.descEn.value = v.description?.en || '';
    $('#pfPreview').classList.toggle('hidden', !p);
    $('#pfPlaceholder').classList.toggle('hidden', !!p);
    $('#pfPreview').src = p ? p.image : 'assets/logo-dark.png';
    dlg.showModal();
  }
  $('#addProduct').addEventListener('click', () => openEditor(null));
  $$('[data-dclose]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  $('#pfImage').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Rasm 5 MB dan katta'); return; }
    // Katta rasmlarni 1000px gacha kichraytirib, JPEG ga o'giramiz
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      imageData = c.toDataURL('image/jpeg', 0.88);
      $('#pfPreview').src = imageData; $('#pfPreview').classList.remove('hidden'); $('#pfPlaceholder').classList.add('hidden');
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
  pf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      name: pf.name.value, brand: pf.brand.value, gender: pf.gender.value, family: pf.family.value,
      intensity: pf.intensity.value, discount: pf.discount.value,
      notes: { top: pf.top.value, heart: pf.heart.value, base: pf.base.value },
      bestseller: pf.bestseller.checked, active: pf.active.checked,
      description: { uz: pf.descUz.value, ru: pf.descRu.value, en: pf.descEn.value },
    };
    if (imageData) body.imageData = imageData;
    try {
      if (editing) await updateProduct(editing.id, body);
      else {
        if (!imageData) { toast('Iltimos, mahsulot rasmini yuklang'); return; }
        await api('admin/products', { method: 'POST', body });
        data.products = await api('admin/products'); renderProducts(); toast("Yangi mahsulot qo'shildi");
      }
      dlg.close();
    } catch { toast('Xatolik: saqlanmadi'); }
  });
  $('#pfDelete').addEventListener('click', async () => {
    if (!editing || !confirm(`«${editing.name}» o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.\nFaqat yashirish uchun «Saytda ko'rinadi» tugmasini o'chiring.`)) return;
    try {
      await api('admin/products/' + editing.id, { method: 'DELETE' });
      data.products = data.products.filter((p) => p.id !== editing.id);
      renderProducts(); dlg.close(); toast("O'chirildi");
    } catch { toast("Xatolik: o'chirilmadi"); }
  });

  // ------------------------------------------------------------ prices
  let sizesDraft = [];
  function renderPrices() {
    const s = data.settings;
    sizesDraft = s.sizes.map((x) => ({ ...x }));
    $('#globalDiscount').value = s.globalDiscount;
    $('#dlUz').value = s.discountLabel?.uz || ''; $('#dlRu').value = s.discountLabel?.ru || ''; $('#dlEn').value = s.discountLabel?.en || '';
    renderSizes();
  }
  function renderSizes() {
    $('#sizesEditor').innerHTML = sizesDraft.map((s, i) => `
      <div class="grid grid-cols-[110px_1fr_auto] gap-3 items-end" data-i="${i}">
        <label><span class="lbl">Hajm, ml</span><input class="inp" type="number" min="1" value="${s.ml}" data-k="ml" /></label>
        <label><span class="lbl">Narx, so'm</span><input class="inp" type="number" min="1000" step="1000" value="${s.price}" data-k="price" /></label>
        <button class="btn btn-danger !px-3" data-remove title="O'chirish">✕</button>
      </div>`).join('');
    renderPreview();
  }
  function renderPreview() {
    const d = Math.min(90, Math.max(0, Number($('#globalDiscount').value) || 0));
    $('#pricePreview').innerHTML = sizesDraft.filter((s) => s.ml && s.price).sort((a, b) => a.ml - b.ml).map((s) => {
      const f = Math.round((s.price * (100 - d)) / 100 / 1000) * 1000;
      return `<div class="rounded-2xl bg-wine-800 text-cream-100 px-5 py-4"><b class="font-display text-3xl text-gold-300">${s.ml} ml</b>${d ? `<s class="block text-xs opacity-60">${money(s.price)}</s>` : ''}<div class="font-semibold">${money(f)} so'm</div></div>`;
    }).join('');
  }
  $('#sizesEditor').addEventListener('input', (e) => {
    const row = e.target.closest('[data-i]'); if (!row) return;
    sizesDraft[row.dataset.i][e.target.dataset.k] = Number(e.target.value);
    renderPreview();
  });
  $('#sizesEditor').addEventListener('click', (e) => {
    if (!e.target.closest('[data-remove]')) return;
    if (sizesDraft.length <= 1) { toast("Kamida bitta hajm bo'lishi kerak"); return; }
    sizesDraft.splice(e.target.closest('[data-i]').dataset.i, 1); renderSizes();
  });
  $('#addSize').addEventListener('click', () => { sizesDraft.push({ ml: 100, price: 1200000 }); renderSizes(); });
  $('#globalDiscount').addEventListener('input', renderPreview);
  $('#savePrices').addEventListener('click', async () => {
    try {
      await api('admin/settings', { method: 'PUT', body: {
        sizes: sizesDraft, globalDiscount: $('#globalDiscount').value,
        discountLabel: { uz: $('#dlUz').value, ru: $('#dlRu').value, en: $('#dlEn').value },
      } });
      await loadAll();
      toast('Narxlar saqlandi — saytda yangilandi');
    } catch { toast('Xatolik: saqlanmadi'); }
  });

  // ------------------------------------------------------------ settings
  function renderSettings() {
    const s = data.settings;
    $('#adUz').value = s.address?.uz || ''; $('#adRu').value = s.address?.ru || ''; $('#adEn').value = s.address?.en || '';
    $('#lmUz').value = s.landmark?.uz || ''; $('#lmRu').value = s.landmark?.ru || ''; $('#lmEn').value = s.landmark?.en || '';
    $('#hours').value = s.hours || '';
    $('#tgChat').value = s.telegram.chatId || '';
    $('#tgToken').placeholder = s.telegram.hasToken ? '•••••••• (saqlangan — almashtirish uchun yangisini kiriting)' : '123456789:AA...';
    const st = $('#tgStatus');
    st.className = 'pill ' + (s.telegram.configured ? 'st-done' : 'st-new');
    st.textContent = s.telegram.configured ? 'Ulangan' : 'Ulanmagan';
  }
  $('#saveAddress').addEventListener('click', async () => {
    try {
      await api('admin/settings', { method: 'PUT', body: {
        address: { uz: $('#adUz').value, ru: $('#adRu').value, en: $('#adEn').value },
        landmark: { uz: $('#lmUz').value, ru: $('#lmRu').value, en: $('#lmEn').value },
        hours: $('#hours').value,
      } });
      toast('Manzil saqlandi');
    } catch { toast('Xatolik: saqlanmadi'); }
  });
  $('#tgSave').addEventListener('click', async () => {
    try {
      await api('admin/settings', { method: 'PUT', body: { telegram: { botToken: $('#tgToken').value.trim(), chatId: $('#tgChat').value.trim() } } });
      $('#tgToken').value = '';
      data.settings = await api('admin/settings'); renderSettings();
      toast('Telegram sozlamalari saqlandi');
    } catch { toast('Xatolik: saqlanmadi'); }
  });
  $('#tgFind').addEventListener('click', async () => {
    try {
      const { chats } = await api('admin/telegram/find-chats', { method: 'POST' });
      $('#tgChats').innerHTML = chats.length
        ? chats.map((c) => `<button class="btn btn-line !py-1.5 !text-xs" data-chat="${esc(c.id)}">${esc(c.name || c.id)}${c.username ? ' (@' + esc(c.username) + ')' : ''}</button>`).join('')
        : `<p class="text-sm text-wine-800/80">Hech kim topilmadi. @shuxratgafurov1 botga /start bosganini tekshiring va qayta urinib ko'ring.</p>`;
    } catch (ex) { toast(ex.message === 'no_token' ? 'Avval bot tokenini saqlang' : 'Telegram xatosi: ' + ex.message); }
  });
  $('#tgChats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-chat]'); if (!b) return;
    $('#tgChat').value = b.dataset.chat; toast("Tanlandi — endi «Saqlash»ni bosing");
  });
  $('#tgTest').addEventListener('click', async () => {
    try { await api('admin/telegram/test', { method: 'POST' }); toast('Sinov xabari yuborildi ✓'); }
    catch (ex) { toast(ex.body?.reason === 'not_configured' ? "Avval token va Chat ID ni saqlang" : 'Yuborilmadi: ' + (ex.body?.reason || ex.message)); }
  });

  // ------------------------------------------------------------ boot
  if (token) start().catch(() => logout(true));
  setInterval(() => { if (token && !document.hidden) api('admin/stats').then((s) => { data.stats = s; renderStats(); }).catch(() => {}); }, 60000);
})();
