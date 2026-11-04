/*
 * Able Parfum — backend server
 * Hech qanday tashqi kutubxona talab qilinmaydi: faqat Node.js 18+.
 *
 *   node server.js            → http://localhost:3000
 *   Admin panel               → http://localhost:3000/admin
 *
 * Ma'lumotlar:
 *   - lokal: server/data/ papkasidagi JSON fayllarda;
 *   - Vercel: Upstash Redis'da (UPSTASH_REDIS_REST_URL/TOKEN yoki KV_REST_API_URL/TOKEN),
 *     rasmlar Vercel Blob'da (BLOB_READ_WRITE_TOKEN). Vercel kirish nuqtasi: api/index.js
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------- config
loadDotEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(__dirname, '..', 'public');
const DATA = path.resolve(__dirname, 'data');
const UPLOADS = path.join(ROOT, 'uploads');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const ON_VERCEL = !!process.env.VERCEL;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const REDIS_PREFIX = 'able:';

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ---------------------------------------------------------------- storage
// Bir xil interfeys, ikki xil joy: lokal disk yoki Upstash Redis (Vercel'da disk saqlanmaydi).
const fileBackend = {
  file: (name) => path.join(DATA, name + '.json'),
  async read(name) {
    try { return JSON.parse(fs.readFileSync(this.file(name), 'utf8')); }
    catch { return undefined; }
  },
  async write(name, value) {
    fs.mkdirSync(DATA, { recursive: true });
    const f = this.file(name);
    const tmp = f + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, f); // atomik yozish: fayl hech qachon yarim holatda qolmaydi
  },
};
const redisBackend = {
  async cmd(args) {
    const r = await fetch(REDIS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    const j = await r.json();
    if (j.error) throw new Error('redis: ' + j.error);
    return j.result;
  },
  async read(name) {
    const v = await this.cmd(['GET', REDIS_PREFIX + name]);
    return v == null ? undefined : JSON.parse(v);
  },
  async write(name, value) { await this.cmd(['SET', REDIS_PREFIX + name, JSON.stringify(value)]); },
};
const backend = REDIS_URL && REDIS_TOKEN ? redisBackend : fileBackend;
const store = {
  kind: backend === redisBackend ? 'redis' : 'file',
  async read(name, fallback) {
    const v = await backend.read(name);
    return v === undefined ? (typeof fallback === 'function' ? fallback() : fallback) : v;
  },
  async write(name, value) {
    // Vercel'da bazasiz yozib bo'lmaydi — admin aniq xato ko'rsin
    if (backend === fileBackend && ON_VERCEL) throw Object.assign(new Error('storage_not_configured'), { status: 503 });
    await backend.write(name, value);
  },
};

const DEFAULT_SETTINGS = {
  sizes: [
    { ml: 10, price: 150000 },
    { ml: 20, price: 280000 },
    { ml: 30, price: 400000 },
    { ml: 50, price: 650000 },
  ],
  globalDiscount: 0,          // butun saytga chegirma, %
  discountLabel: { uz: '', ru: '', en: '' },
  address: {
    uz: 'O‘zbekiston, Xavzi Nav ko‘chasi, 251-uy',
    ru: 'Узбекистан, ул. Хавзи Нав, 251',
    en: '251 Khavzi Nav St., Uzbekistan',
  },
  landmark: { uz: '', ru: '', en: '' },
  hours: '10:00 – 22:00',
  telegram: { botToken: '', chatId: '' },
};

async function getSettings() {
  const s = await store.read('settings', null);
  if (s) return { ...DEFAULT_SETTINGS, ...s, telegram: { ...DEFAULT_SETTINGS.telegram, ...(s.telegram || {}) } };
  await store.write('settings', DEFAULT_SETTINGS).catch(() => {}); // baza ulanmagan bo'lsa ham sayt ochilsin
  return structuredClone(DEFAULT_SETTINGS);
}

async function getProducts() {
  let p = await store.read('products', null);
  if (!p) { p = structuredClone(require('./seed-products')); await store.write('products', p).catch(() => {}); }
  return p;
}

function publicSettings(s) {
  return {
    sizes: s.sizes, globalDiscount: s.globalDiscount, discountLabel: s.discountLabel,
    address: s.address, landmark: s.landmark, hours: s.hours,
  };
}

function telegramConfig(s) {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || s.telegram.botToken,
    chatId: process.env.TELEGRAM_CHAT_ID || s.telegram.chatId,
  };
}

// ---------------------------------------------------------------- pricing
function effectiveDiscount(product, settings) {
  return Math.max(Number(product.discount) || 0, Number(settings.globalDiscount) || 0);
}
function priceFor(product, ml, settings) {
  const mlNum = Number(ml);
  const size = settings.sizes.find((s) => s.ml === mlNum);
  const basePrice = (product.prices && product.prices[mlNum]) || (size ? size.price : null);
  if (!basePrice) return null;
  const d = effectiveDiscount(product, settings);
  return { base: basePrice, final: Math.round((basePrice * (100 - d)) / 100 / 1000) * 1000, discount: d };
}

// ---------------------------------------------------------------- auth
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, rec) {
  const { hash } = hashPassword(password, rec.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(rec.hash, 'hex'));
}
// Admin: ADMIN_EMAIL + ADMIN_PASSWORD muhit o'zgaruvchilari berilgan bo'lsa (Vercel), shular ishlatiladi —
// parolni almashtirish = Vercel'da o'zgaruvchini yangilab, qayta deploy qilish. Aks holda data/admin.json.
let envAdmin = null;
async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const email = ADMIN_EMAIL.trim().toLowerCase();
    if (!envAdmin || envAdmin.email !== email || envAdmin.src !== ADMIN_PASSWORD) {
      // tuz barqaror: hamma serverless nusxalarda bir xil xesh -> bir xil sessiya kaliti
      const salt = crypto.createHash('sha256').update('able-admin:' + email).digest('hex').slice(0, 32);
      envAdmin = { email, ...hashPassword(ADMIN_PASSWORD, salt), src: ADMIN_PASSWORD };
    }
    return { email: envAdmin.email, salt: envAdmin.salt, hash: envAdmin.hash };
  }
  return store.read('admin', null);
}

// Sessiya: server xotirasiga bog'liq bo'lmagan imzolangan token ("muddat.imzo").
// Serverless'da har so'rov boshqa nusxaga tushishi mumkin, shuning uchun xotiradagi ro'yxat ishlamaydi.
// Kalit parol xeshidan olinadi — parol almashsa, barcha eski tokenlar bekor bo'ladi.
async function sessionKey() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const a = await ensureAdmin();
  return a ? a.salt + ':' + a.hash : null;
}
const sign = (key, payload) => crypto.createHmac('sha256', key).update(payload).digest('base64url');
async function newSession() {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return exp + '.' + sign(await sessionKey(), exp);
}
async function isAuthed(req) {
  const m = (req.headers.authorization || '').match(/^Bearer (\d{12,16})\.([\w-]{43})$/);
  if (!m || Number(m[1]) < Date.now()) return false;
  const key = await sessionKey();
  if (!key) return false;
  const expect = Buffer.from(sign(key, m[1]));
  const got = Buffer.from(m[2]);
  return expect.length === got.length && crypto.timingSafeEqual(expect, got);
}

// Oddiy rate-limit: IP bo'yicha oyna ichida urinishlar soni.
// Serverless'da har nusxaning o'z hisobi bor — to'liq kafolat emas, lekin parol tanlashni sekinlashtiradi.
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n++;
  buckets.set(key, b);
  return b.n > max;
}

// ---------------------------------------------------------------- telegram
async function sendTelegram(text, settings) {
  const { botToken, chatId } = telegramConfig(settings);
  if (!botToken || !chatId) return { ok: false, reason: 'not_configured' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const j = await r.json();
    return j.ok ? { ok: true, messageId: j.result && j.result.message_id } : { ok: false, reason: j.description || 'telegram_error' };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// Mijoz yuborgan geolokatsiya — buyurtma xabariga javob sifatida xarita nuqtasi bo'lib boradi
async function sendTelegramLocation(loc, replyTo, settings) {
  const { botToken, chatId } = telegramConfig(settings);
  if (!botToken || !chatId) return { ok: false, reason: 'not_configured' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, latitude: loc.lat, longitude: loc.lng,
        ...(loc.acc ? { horizontal_accuracy: Math.min(1500, loc.acc) } : {}),
        ...(replyTo ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {}),
      }),
    });
    const j = await r.json();
    return j.ok ? { ok: true } : { ok: false, reason: j.description || 'telegram_error' };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

function cleanLocation(l) {
  if (!l || typeof l !== 'object') return null;
  const lat = Number(l.lat), lng = Number(l.lng), acc = Math.round(Number(l.acc) || 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return { lat: +lat.toFixed(6), lng: +lng.toFixed(6), acc: Math.max(0, Math.min(100000, acc)) };
}
const mapsLink = (l) => `https://maps.google.com/?q=${l.lat},${l.lng}`;

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const som = (n) => Number(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";

function orderMessage(o) {
  const lines = [
    `🛍 <b>Yangi buyurtma ${esc(o.id)}</b>`,
    '',
    `👤 <b>Mijoz:</b> ${esc(o.name)}`,
    `📞 <b>Telefon:</b> ${esc(o.phone)}`,
    `🚚 <b>Olish usuli:</b> ${o.delivery === 'delivery' ? 'Yetkazib berish' : "Do'kondan olib ketish"}`,
  ];
  if (o.address) lines.push(`📍 <b>Manzil:</b> ${esc(o.address)}`);
  if (o.location) lines.push(`🗺 <b>Lokatsiya:</b> ${mapsLink(o.location)}${o.location.acc ? ` (±${o.location.acc} m)` : ''}`);
  lines.push('', '<b>Buyurtma:</b>');
  for (const it of o.items) {
    lines.push(`• ${esc(it.name)}${it.brand ? ' (' + esc(it.brand) + ')' : ''} — ${it.ml} ml × ${it.qty} = ${som(it.unitPrice * it.qty)}`);
    if (it.discount) lines.push(`   chegirma: ${it.discount}%`);
  }
  lines.push('', `💰 <b>Jami: ${som(o.total)}</b>`);
  if (o.comment) lines.push('', `💬 ${esc(o.comment)}`);
  lines.push('', `🌐 Til: ${o.lang.toUpperCase()} · ${new Date(o.createdAt).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------- stats
async function bumpVisit() {
  const s = await store.read('stats', { visits: {} });
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
  s.visits[day] = (s.visits[day] || 0) + 1;
  await store.write('stats', s).catch(() => {}); // statistika yozilmasa ham sayt ishlayversin
}

async function buildStats() {
  const orders = await store.read('orders', []);
  const { visits } = await store.read('stats', { visits: {} });
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
  const dayOf = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
  const valid = orders.filter((o) => o.status !== 'cancelled');

  const byDay = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
    byDay[d] = { orders: 0, revenue: 0, visits: visits[d] || 0 };
  }
  const products = {}, sizes = {}, customers = {};
  for (const o of valid) {
    const d = dayOf(o.createdAt);
    if (byDay[d]) { byDay[d].orders++; byDay[d].revenue += o.total; }
    for (const it of o.items) {
      products[it.name] = (products[it.name] || 0) + it.qty;
      sizes[it.ml] = (sizes[it.ml] || 0) + it.qty;
    }
    customers[o.phone] = true;
  }
  const top = Object.entries(products).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const totalVisits = Object.values(visits).reduce((a, b) => a + b, 0);
  return {
    totalOrders: orders.length,
    activeOrders: valid.length,
    newOrders: orders.filter((o) => o.status === 'new').length,
    todayOrders: orders.filter((o) => dayOf(o.createdAt) === today).length,
    revenue: valid.filter((o) => o.status === 'done').reduce((a, o) => a + o.total, 0),
    pipeline: valid.reduce((a, o) => a + o.total, 0),
    customers: Object.keys(customers).length,
    visits: totalVisits,
    todayVisits: visits[today] || 0,
    conversion: totalVisits ? +((valid.length / totalVisits) * 100).toFixed(2) : 0,
    byDay, top, sizes,
  };
}

// ---------------------------------------------------------------- http helpers
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function send(res, status, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isObj ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(isObj ? JSON.stringify(body) : body);
}

function readBody(req, limit = 8 * 1024 * 1024) {
  // Vercel tanani oldindan o'qib req.body ga qo'yadi; lokal http serverda u yo'q — oqimdan o'qiymiz
  let pre;
  try { pre = req.body; } catch { return Promise.reject(Object.assign(new Error('bad_json'), { status: 400 })); }
  if (pre != null) {
    if (typeof pre === 'object' && !Buffer.isBuffer(pre)) return Promise.resolve(pre);
    const text = Buffer.isBuffer(pre) ? pre.toString('utf8') : String(pre);
    if (Buffer.byteLength(text) > limit) return Promise.reject(Object.assign(new Error('too_large'), { status: 413 }));
    try { return Promise.resolve(text ? JSON.parse(text) : {}); }
    catch { return Promise.reject(Object.assign(new Error('bad_json'), { status: 400 })); }
  }
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('too_large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(Object.assign(new Error('bad_json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '';
}

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin.html';
  const file = path.resolve(ROOT, '.' + decodeURIComponent(pathname));
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'Not found');
    const ext = path.extname(file).toLowerCase();
    const cache = ext === '.html' ? 'no-cache' : 'public, max-age=86400';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, 'Content-Length': st.size });
    fs.createReadStream(file).pipe(res);
  });
}

const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const slugify = (s) => clean(s, 80).toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'product';

// Rasm: Vercel'da — Vercel Blob (to'liq URL qaytadi), lokalda — public/uploads/
async function saveImage(dataUrl, id) {
  const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const name = `${id}-${Date.now().toString(36)}.${ext}`;
  const buf = Buffer.from(m[2], 'base64');
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = require('@vercel/blob');
    const blob = await put('products/' + name, buf, { access: 'public', contentType: 'image/' + (ext === 'jpg' ? 'jpeg' : ext) });
    return blob.url;
  }
  if (ON_VERCEL) throw Object.assign(new Error('image_storage_not_configured'), { status: 503 });
  fs.mkdirSync(UPLOADS, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  return 'uploads/' + name;
}

function sanitizeProductInput(b, existing = {}) {
  const out = { ...existing };
  if ('name' in b) out.name = clean(b.name, 80);
  if ('brand' in b) out.brand = clean(b.brand, 80);
  if ('gender' in b && ['men', 'women', 'unisex'].includes(b.gender)) out.gender = b.gender;
  if ('family' in b) out.family = clean(b.family, 30);
  if ('discount' in b) out.discount = Math.min(90, Math.max(0, Math.round(Number(b.discount) || 0)));
  if ('intensity' in b) out.intensity = Math.min(5, Math.max(1, Math.round(Number(b.intensity) || 3)));
  if ('active' in b) out.active = !!b.active;
  if ('bestseller' in b) out.bestseller = !!b.bestseller;
  if (b.notes) out.notes = { top: clean(b.notes.top, 60), heart: clean(b.notes.heart, 60), base: clean(b.notes.base, 60) };
  if ('description' in b) {
    const d = b.description || {};
    out.description = d.uz || d.ru || d.en ? { uz: clean(d.uz, 1500), ru: clean(d.ru, 1500), en: clean(d.en, 1500) } : null;
  }
  if (b.prices && typeof b.prices === 'object') {
    const prices = {};
    for (const [ml, price] of Object.entries(b.prices)) {
      const n = Math.round(Number(price));
      if (n > 0) prices[Number(ml)] = n;
    }
    out.prices = Object.keys(prices).length ? prices : (existing.prices || null);
  }
  return out;
}

// ---------------------------------------------------------------- API
async function api(req, res, pathname) {
  const method = req.method;
  const ip = clientIp(req);

  // ---- public
  if (method === 'GET' && pathname === '/api/catalog') {
    const s = await getSettings();
    const products = (await getProducts()).filter((p) => p.active).sort((a, b) => a.order - b.order)
      .map((p) => ({ ...p, effectiveDiscount: effectiveDiscount(p, s) }));
    return send(res, 200, { settings: publicSettings(s), products }, { 'Cache-Control': 'no-store' });
  }

  if (method === 'POST' && pathname === '/api/visit') {
    if (!limited('visit:' + ip, 3, 60 * 60 * 1000)) await bumpVisit();
    return send(res, 204, '');
  }

  if (method === 'POST' && pathname === '/api/orders') {
    if (limited('order:' + ip, 8, 10 * 60 * 1000)) return send(res, 429, { error: 'too_many' });
    const b = await readBody(req, 32 * 1024);
    const name = clean(b.name, 80);
    const phone = clean(b.phone, 30);
    if (name.length < 2 || phone.replace(/\D/g, '').length < 9) return send(res, 400, { error: 'invalid_contact' });

    const s = await getSettings();
    const products = await getProducts();
    const items = [];
    for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 20)) {
      const p = products.find((x) => x.id === it.productId && x.active);
      const pr = p && priceFor(p, it.ml, s);
      const qty = Math.min(20, Math.max(1, Math.round(Number(it.qty) || 1)));
      if (!pr) return send(res, 400, { error: 'invalid_item' });
      items.push({ productId: p.id, name: p.name, brand: p.brand, ml: Number(it.ml), qty, unitPrice: pr.final, basePrice: pr.base, discount: pr.discount });
    }
    if (!items.length) return send(res, 400, { error: 'empty' });

    const orders = await store.read('orders', []);
    const seq = (orders.reduce((m, o) => Math.max(m, Number(String(o.id).replace(/\D/g, '')) || 1000), 1000)) + 1;
    const order = {
      id: 'AP-' + seq,
      createdAt: new Date().toISOString(),
      name, phone,
      delivery: b.delivery === 'delivery' ? 'delivery' : 'pickup',
      address: clean(b.address, 300),
      location: b.delivery === 'delivery' ? cleanLocation(b.location) : null,
      comment: clean(b.comment, 500),
      lang: ['uz', 'ru', 'en'].includes(b.lang) ? b.lang : 'uz',
      items,
      total: items.reduce((a, i) => a + i.unitPrice * i.qty, 0),
      status: 'new',
      note: '',
    };
    const tg = await sendTelegram(orderMessage(order), s);
    order.telegramSent = tg.ok;
    if (tg.ok && order.location) await sendTelegramLocation(order.location, tg.messageId, s);
    orders.push(order);
    await store.write('orders', orders);
    return send(res, 201, { ok: true, id: order.id, total: order.total, telegramSent: tg.ok, message: tg.ok ? null : orderMessage(order).replace(/<[^>]+>/g, '') });
  }

  // ---- admin auth
  if (method === 'POST' && pathname === '/api/admin/login') {
    if (limited('login:' + ip, 6, 15 * 60 * 1000)) return send(res, 429, { error: 'too_many' });
    const b = await readBody(req, 4096);
    const admin = await ensureAdmin();
    if (!admin) return send(res, 503, { error: 'admin_not_configured' });
    const okEmail = clean(b.email, 120).toLowerCase() === admin.email;
    const okPass = verifyPassword(String(b.password || ''), admin);
    if (!okEmail || !okPass) return send(res, 401, { error: 'invalid_credentials' });
    buckets.delete('login:' + ip);
    return send(res, 200, { token: await newSession(), expiresIn: TOKEN_TTL_MS });
  }

  if (!pathname.startsWith('/api/admin/')) return send(res, 404, { error: 'not_found' });
  if (!(await isAuthed(req))) return send(res, 401, { error: 'unauthorized' });

  // ---- admin (himoyalangan)
  if (method === 'POST' && pathname === '/api/admin/logout') {
    // token imzolangan va muddati bor: brauzer uni o'chiradi, server tomonda saqlanadigan ro'yxat yo'q
    return send(res, 204, '');
  }

  if (method === 'GET' && pathname === '/api/admin/stats') return send(res, 200, await buildStats());

  if (method === 'GET' && pathname === '/api/admin/settings') {
    const s = await getSettings();
    const tg = telegramConfig(s);
    return send(res, 200, {
      ...publicSettings(s),
      telegram: { configured: !!(tg.botToken && tg.chatId), hasToken: !!tg.botToken, chatId: tg.chatId, fromEnv: !!process.env.TELEGRAM_BOT_TOKEN },
    });
  }

  if (method === 'PUT' && pathname === '/api/admin/settings') {
    const b = await readBody(req, 16 * 1024);
    const s = await getSettings();
    if (Array.isArray(b.sizes)) {
      const sizes = b.sizes.map((x) => ({ ml: Math.round(Number(x.ml)), price: Math.round(Number(x.price)) }))
        .filter((x) => x.ml > 0 && x.ml <= 500 && x.price > 0).sort((a, c) => a.ml - c.ml);
      if (sizes.length) s.sizes = sizes;
    }
    if ('globalDiscount' in b) s.globalDiscount = Math.min(90, Math.max(0, Math.round(Number(b.globalDiscount) || 0)));
    for (const k of ['discountLabel', 'address', 'landmark']) {
      if (b[k]) s[k] = { uz: clean(b[k].uz, 300), ru: clean(b[k].ru, 300), en: clean(b[k].en, 300) };
    }
    if ('hours' in b) s.hours = clean(b.hours, 60);
    if (b.telegram) {
      if ('botToken' in b.telegram && b.telegram.botToken !== '') s.telegram.botToken = clean(b.telegram.botToken, 100);
      if ('chatId' in b.telegram) s.telegram.chatId = clean(b.telegram.chatId, 40);
    }
    await store.write('settings', s);
    return send(res, 200, { ok: true });
  }

  // Bot tokeni kiritilgach: Shuxrat aka botga /start bosadi, bu yerda uning chat ID si topiladi
  if (method === 'POST' && pathname === '/api/admin/telegram/find-chats') {
    const { botToken } = telegramConfig(await getSettings());
    if (!botToken) return send(res, 400, { error: 'no_token' });
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
      const j = await r.json();
      if (!j.ok) return send(res, 400, { error: j.description });
      const chats = {};
      for (const u of j.result) {
        const c = (u.message || u.my_chat_member || {}).chat;
        if (c) chats[c.id] = { id: String(c.id), username: c.username || '', name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.title || '' };
      }
      return send(res, 200, { chats: Object.values(chats) });
    } catch (e) { return send(res, 502, { error: e.message }); }
  }

  if (method === 'POST' && pathname === '/api/admin/telegram/test') {
    const r = await sendTelegram('✅ Able Parfum sayti Telegram botga muvaffaqiyatli ulandi. Buyurtmalar shu yerga keladi.', await getSettings());
    return send(res, r.ok ? 200 : 400, r);
  }

  if (method === 'GET' && pathname === '/api/admin/products') {
    const s = await getSettings();
    return send(res, 200, (await getProducts()).sort((a, b) => a.order - b.order).map((p) => ({ ...p, effectiveDiscount: effectiveDiscount(p, s) })));
  }

  if (method === 'POST' && pathname === '/api/admin/products') {
    const b = await readBody(req);
    const products = await getProducts();
    let id = slugify(b.name);
    while (products.some((p) => p.id === id)) id += '-' + crypto.randomBytes(2).toString('hex');
    const p = sanitizeProductInput(b, {
      id, name: '', brand: '', gender: 'unisex', family: 'fresh', notes: { top: '', heart: '', base: '' },
      intensity: 3, discount: 0, bestseller: false, active: true, description: null,
      order: products.reduce((m, x) => Math.min(m, x.order), 0) - 1, // yangi mahsulot katalog boshida chiqadi
    });
    if (!p.name) return send(res, 400, { error: 'name_required' });
    p.image = await saveImage(b.imageData, id) || 'assets/logo-cream.png';
    products.push(p);
    await store.write('products', products);
    return send(res, 201, p);
  }

  const pm = pathname.match(/^\/api\/admin\/products\/([\w-]+)$/);
  if (pm && (method === 'PUT' || method === 'DELETE')) {
    const products = await getProducts();
    const i = products.findIndex((p) => p.id === pm[1]);
    if (i < 0) return send(res, 404, { error: 'not_found' });
    if (method === 'DELETE') {
      products.splice(i, 1);
      await store.write('products', products);
      return send(res, 204, '');
    }
    const b = await readBody(req);
    const p = sanitizeProductInput(b, products[i]);
    const img = await saveImage(b.imageData, p.id);
    if (img) p.image = img;
    products[i] = p;
    await store.write('products', products);
    return send(res, 200, p);
  }

  if (method === 'GET' && pathname === '/api/admin/orders') {
    return send(res, 200, (await store.read('orders', [])).slice().reverse());
  }

  const om = pathname.match(/^\/api\/admin\/orders\/(AP-\d+)$/);
  if (om && method === 'PATCH') {
    const b = await readBody(req, 4096);
    const orders = await store.read('orders', []);
    const o = orders.find((x) => x.id === om[1]);
    if (!o) return send(res, 404, { error: 'not_found' });
    if (['new', 'confirmed', 'done', 'cancelled'].includes(b.status)) o.status = b.status;
    if ('note' in b) o.note = clean(b.note, 500);
    await store.write('orders', orders);
    return send(res, 200, o);
  }

  return send(res, 404, { error: 'not_found' });
}

// ---------------------------------------------------------------- server
// Bitta ishlovchi: lokal http server ham, Vercel funksiyasi (api/index.js) ham shuni chaqiradi
async function handler(req, res) {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname.startsWith('/api/')) return await api(req, res, pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    return serveStatic(req, res, pathname);
  } catch (e) {
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'server_error' });
    if (!e.status) console.error(e);
  }
}
const server = http.createServer(handler);

if (require.main === module) {
  (async () => {
    await getSettings(); await getProducts();
    if (!(await ensureAdmin())) console.warn('⚠  Admin hali sozlanmagan: `node setup-admin.js EMAIL PAROL` buyrug\'ini bajaring.');
    console.log('Ma\'lumotlar ombori:', store.kind === 'redis' ? 'Upstash Redis' : 'server/data (lokal fayllar)');
    server.listen(PORT, () => console.log(`Able Parfum → http://localhost:${PORT}  ·  admin → http://localhost:${PORT}/admin`));
  })();
}

module.exports = { server, handler, hashPassword, priceFor };
