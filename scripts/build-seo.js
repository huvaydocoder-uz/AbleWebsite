#!/usr/bin/env node
/*
 * SEO generator: har bir til uchun alohida, matni oldindan to'ldirilgan sahifa yasaydi.
 *   public/index.html     — o'zbekcha (asosiy shablon ham shu fayl)
 *   public/ru/index.html  — ruscha
 *   public/en/index.html  — inglizcha
 * Har biriga: title/description/keywords, canonical + hreflang, Open Graph, JSON-LD (Store, WebSite,
 * FAQPage, mahsulotlar ro'yxati) qo'shiladi.
 * Yana sitemap.xml va robots.txt yoziladi.
 *
 * Ishga tushirish:  node scripts/build-seo.js   (i18n.js, catalog.json yoki index.html o'zgarganda)
 * Domen:            SITE_URL=https://able.uz node scripts/build-seo.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const SITE = (process.env.SITE_URL || 'https://ableparfume.vercel.app').replace(/\/+$/, '');
const LANGS = ['uz', 'ru', 'en'];
const URLS = { uz: SITE + '/', ru: SITE + '/ru/', en: SITE + '/en/' };
const LOCALE = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US' };
const PHONE = '+998978520770';
const INSTAGRAM = 'https://www.instagram.com/able.parfumes/';
const TELEGRAM = 'https://t.me/ableparfume';
const FOUNDER_IG = 'https://www.instagram.com/shuxrat.gafurov1/';

// ------------------------------------------------------------------ ma'lumotlar
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(PUB, 'js/i18n.js'), 'utf8'), ctx);
const I18N = ctx.window.I18N;
const catalog = JSON.parse(fs.readFileSync(path.join(PUB, 'data/catalog.json'), 'utf8'));
const settings = catalog.settings;
const products = catalog.products.filter((p) => p.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))];
const sizes = settings.sizes;
const minPrice = Math.min(...sizes.map((s) => s.price));
const maxPrice = Math.max(...sizes.map((s) => s.price));

const money = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s|,/g, ' ');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const t = (lang, key, vars = {}) => {
  let v = I18N[lang][key] ?? I18N.uz[key] ?? '';
  for (const [k, x] of Object.entries(vars)) v = v.split(`{${k}}`).join(x);
  return v;
};
const pricesText = (lang) => sizes.map((s) => `${s.ml} ${t(lang, 'ml')} — ${money(s.price)} ${t(lang, 'som')}`).join(', ');
const topBrands = ['Dior', 'Chanel', 'Tom Ford', 'Creed', 'Kilian', 'Parfums de Marly', 'Maison Francis Kurkdjian'].filter((b) => brands.includes(b));

// ------------------------------------------------------------------ til bo'yicha SEO matnlar
const SEO = {
  uz: {
    title: 'Able Parfum — premium atirlar do‘koni | Original atirlar 10 ml dan, O‘zbekiston',
    description: `Able Parfum — O‘zbekistondagi premium parfyumeriya uyi. ${topBrands.slice(0, 5).join(', ')} va ${products.length} dan ortiq mashhur atirlar 10 ml dan, ${money(minPrice)} so‘mdan. Onlayn buyurtma va yetkazib berish.`,
    indexTitle: 'Katalogimizdagi brendlar va atirlar',
    base: [
      'Able Parfum', 'Able Parfume', 'Able Perfume', 'Able Parfums', 'Able atir', 'Able atirlar', 'ableparfume', 'able parfum uz',
      'Able Parfum O‘zbekiston', 'Able Parfum do‘koni', 'Able Parfum katalog', 'Shuxrat Gafurov', 'Shuxrat Gafurov atir', 'Shuxrat Gafurov Able',
      'atir', 'atirlar', 'parfyum', 'parfyumeriya', 'parfyumeriya do‘koni', 'atir do‘koni', 'atirlar do‘koni', 'atir magazin',
      'original atirlar', 'premium atirlar', 'brend atirlar', 'lyuks atirlar', 'nish atirlar', 'selektiv atirlar', 'mashhur atirlar',
      'erkaklar atiri', 'erkaklar uchun atir', 'ayollar atiri', 'ayollar uchun atir', 'uniseks atirlar', 'qizlar uchun atir', 'yigitlar uchun atir',
      'atir sotib olish', 'atir narxlari', 'atir narxi', 'arzon atirlar', 'atir onlayn', 'atir onlayn buyurtma', 'atir yetkazib berish',
      'atir sovg‘a', 'sovg‘a uchun atir', 'sovg‘abop atir', '10 ml atir', 'atir 10 ml', 'kichik hajmdagi atir', 'atir razliv', 'quyma atir',
      'O‘zbekistonda atir', 'O‘zbekiston atir do‘koni', 'Toshkentda atir', 'eng yaxshi atirlar', 'uzoq saqlanadigan atirlar', 'yozgi atirlar', 'qishki atirlar',
    ],
    brand: (b) => [`${b} atir`, `${b} atirlari`],
    product: (p) => [`${p.name} atir`, p.brand ? `${p.brand} ${p.name}` : p.name],
  },
  ru: {
    title: 'Able Parfum — магазин премиальной парфюмерии | Духи на разлив от 10 мл, Узбекистан',
    description: `Able Parfum — дом премиальной парфюмерии в Узбекистане. ${topBrands.slice(0, 5).join(', ')} и ${products.length}+ знаменитых ароматов от 10 мл, от ${money(minPrice)} сум. Онлайн-заказ и доставка.`,
    indexTitle: 'Бренды и ароматы в нашем каталоге',
    base: [
      'Able Parfum', 'Able Parfume', 'Able Perfume', 'Эйбл Парфюм', 'Эйбл парфюм Узбекистан', 'Able парфюм', 'Able духи', 'ableparfume',
      'Able Parfum Узбекистан', 'Able Parfum магазин', 'Able Parfum каталог', 'Шухрат Гафуров', 'Шухрат Гафуров парфюм', 'Шухрат Гафуров Able',
      'духи', 'парфюм', 'парфюмерия', 'ароматы', 'магазин парфюмерии', 'парфюмерный магазин', 'магазин духов', 'бутик парфюмерии',
      'оригинальные духи', 'премиальная парфюмерия', 'брендовые духи', 'люксовая парфюмерия', 'нишевая парфюмерия', 'селективная парфюмерия', 'известные ароматы',
      'мужские духи', 'духи для мужчин', 'женские духи', 'духи для женщин', 'унисекс ароматы', 'духи для девушек', 'парфюм для мужчин',
      'купить духи', 'цены на духи', 'духи цена', 'недорогие духи', 'духи онлайн', 'заказать духи онлайн', 'доставка духов',
      'духи в подарок', 'подарок духи', 'парфюм в подарок', 'духи 10 мл', '10 мл духи', 'отливант', 'духи на разлив', 'парфюм на разлив',
      'духи Узбекистан', 'купить духи в Узбекистане', 'духи Ташкент', 'лучшие ароматы', 'стойкие духи', 'летние ароматы', 'зимние ароматы',
    ],
    brand: (b) => [`${b} духи`, `купить ${b}`],
    product: (p) => [`${p.name} духи`, p.brand ? `${p.brand} ${p.name} купить` : `${p.name} купить`],
  },
  en: {
    title: 'Able Parfum — Premium Fragrance Store in Uzbekistan | Perfume Decants from 10 ml',
    description: `Able Parfum is a premium fragrance house in Uzbekistan. ${topBrands.slice(0, 5).join(', ')} and ${products.length}+ iconic perfumes from 10 ml, from ${money(minPrice)} UZS. Order online with pickup or delivery.`,
    indexTitle: 'Brands and fragrances in our catalog',
    base: [
      'Able Parfum', 'Able Parfume', 'Able Perfume', 'Able Parfums', 'Able fragrance', 'ableparfume', 'Able Parfum Uzbekistan', 'Able Parfum store',
      'Able Parfum catalog', 'Shuxrat Gafurov', 'Shuxrat Gafurov perfume', 'Shukhrat Gafurov', 'perfume', 'perfumes', 'fragrance', 'fragrances',
      'perfume store', 'perfume shop', 'fragrance store', 'perfumery', 'original perfume', 'premium perfume', 'designer perfume', 'luxury perfume',
      'niche perfume', 'niche fragrance', 'famous perfumes', 'men’s perfume', 'perfume for men', 'women’s perfume', 'perfume for women', 'unisex perfume',
      'buy perfume', 'perfume prices', 'affordable perfume', 'perfume online', 'order perfume online', 'perfume delivery', 'perfume gift', 'gift perfume',
      '10 ml perfume', 'perfume decants', 'perfume samples', 'travel size perfume', 'perfume Uzbekistan', 'buy perfume in Uzbekistan', 'perfume Tashkent',
      'best perfumes', 'long lasting perfume', 'summer fragrance', 'winter fragrance',
    ],
    brand: (b) => [`${b} perfume`, `buy ${b}`],
    product: (p) => [`${p.name} perfume`, p.brand ? `${p.brand} ${p.name}` : p.name],
  },
};

function keywords(lang) {
  const S = SEO[lang];
  const list = [...S.base, ...brands.flatMap(S.brand), ...products.flatMap(S.product)];
  const seen = new Set();
  return list.filter((k) => { const n = k.toLowerCase(); if (seen.has(n)) return false; seen.add(n); return true; });
}

// ------------------------------------------------------------------ JSON-LD
function jsonLd(lang) {
  const S = SEO[lang];
  const store = {
    '@type': ['Store', 'LocalBusiness'],
    '@id': SITE + '/#store',
    name: 'Able Parfum',
    alternateName: ['Able Parfume', 'Able Perfume', 'Эйбл Парфюм'],
    description: S.description,
    url: URLS[lang],
    logo: SITE + '/assets/logo-dark.png',
    image: [SITE + '/assets/shop/2.jpg', SITE + '/assets/shop/6.jpg', SITE + '/assets/shop/10-bags.jpg'],
    telephone: PHONE,
    priceRange: `${money(minPrice)} – ${money(maxPrice)} UZS`,
    currenciesAccepted: 'UZS',
    address: { '@type': 'PostalAddress', streetAddress: settings.address?.[lang] || settings.address?.uz, addressCountry: 'UZ' },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: (settings.hours || '10:00 – 22:00').split(/\s*[–-]\s*/)[0],
      closes: (settings.hours || '10:00 – 22:00').split(/\s*[–-]\s*/)[1],
    }],
    sameAs: [INSTAGRAM, TELEGRAM],
    founder: { '@type': 'Person', name: lang === 'ru' ? 'Шухрат Гафуров' : 'Shuxrat Gafurov', sameAs: [FOUNDER_IG] },
    brand: brands.map((b) => ({ '@type': 'Brand', name: b })),
  };
  const website = {
    '@type': 'WebSite', '@id': SITE + '/#website', url: URLS[lang], name: 'Able Parfum',
    inLanguage: lang, publisher: { '@id': SITE + '/#store' },
  };
  const faq = {
    '@type': 'FAQPage',
    mainEntity: [1, 2, 3, 4, 5, 6].map((i) => ({
      '@type': 'Question', name: t(lang, 'faq.q' + i),
      acceptedAnswer: { '@type': 'Answer', text: t(lang, 'faq.a' + i, { prices: pricesText(lang) }) },
    })),
  };
  const items = {
    '@type': 'ItemList', name: S.indexTitle, numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: {
        '@type': 'Product', name: p.brand ? `${p.brand} ${p.name}` : p.name,
        image: /^https?:/.test(p.image) ? p.image : SITE + '/' + String(p.image || '').replace(/^\/+/, ''),
        url: `${URLS[lang]}#p=${p.id}`,
        ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
        offers: { '@type': 'AggregateOffer', priceCurrency: 'UZS', lowPrice: minPrice, highPrice: maxPrice, offerCount: sizes.length, availability: 'https://schema.org/InStock', seller: { '@id': SITE + '/#store' } },
      },
    })),
  };
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [store, website, faq, items] }).replace(/</g, '\\u003c');
}

// ------------------------------------------------------------------ <head> bloki
function headBlock(lang) {
  const S = SEO[lang];
  const og = SITE + '/assets/shop/10-bags.jpg';
  return [
    '<!-- seo:start (scripts/build-seo.js yaratadi — qo\'lda tahrirlamang) -->',
    `<title>${esc(S.title)}</title>`,
    `<meta name="description" content="${esc(S.description)}" />`,
    `<meta name="keywords" content="${esc(keywords(lang).join(', '))}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    '<meta name="author" content="Able Parfum" />',
    `<link rel="canonical" href="${URLS[lang]}" />`,
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${URLS[l]}" />`),
    `<link rel="alternate" hreflang="x-default" href="${URLS.uz}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Able Parfum" />',
    `<meta property="og:url" content="${URLS[lang]}" />`,
    `<meta property="og:title" content="${esc(S.title)}" />`,
    `<meta property="og:description" content="${esc(S.description)}" />`,
    `<meta property="og:image" content="${og}" />`,
    `<meta property="og:locale" content="${LOCALE[lang]}" />`,
    ...LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${LOCALE[l]}" />`),
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(S.title)}" />`,
    `<meta name="twitter:description" content="${esc(S.description)}" />`,
    `<meta name="twitter:image" content="${og}" />`,
    `<script type="application/ld+json">${jsonLd(lang)}</script>`,
    '<!-- seo:end -->',
  ].map((l) => '    ' + l).join('\n');
}

// ------------------------------------------------------------------ data-i18n matnlarini to'ldirish
function fillI18n(html, lang) {
  // ichida boshqa teg bo'lmagan elementlar: <tag ... data-i18n="key" ...>matn</tag>
  html = html.replace(/(<([a-zA-Z0-9]+)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g, (m, open, tag, key, inner, close) => {
    if (!(key in I18N[lang]) && !(key in I18N.uz)) return m;
    const val = t(lang, key, { prices: pricesText(lang) });
    let o = open;
    const attr = /data-i18n-attr="([^"]+)"/.exec(open);
    if (attr) o = o.replace(new RegExp(`\\s${attr[1]}="[^"]*"`), '').replace(/>$/, ` ${attr[1]}="${esc(val)}">`);
    return o + esc(val) + close;
  });
  html = html.replace(/(<[a-zA-Z]+\b[^>]*?\sdata-i18n-placeholder="([^"]+)"[^>]*?)(\/?>)/g, (m, open, key, end) =>
    open.replace(/\splaceholder="[^"]*"/, '') + ` placeholder="${esc(t(lang, key))}"` + end);
  return html;
}

function faqHtml(lang) {
  return [1, 2, 3, 4, 5, 6].map((i) => `<div class="faq-item" data-i="${i}"><button type="button" class="faq-q" aria-expanded="false" aria-controls="faq-a-${i}"><span>${esc(t(lang, 'faq.q' + i))}</span><i class="faq-icon" aria-hidden="true"></i></button><div class="faq-a" id="faq-a-${i}" role="region"><div><p>${esc(t(lang, 'faq.a' + i, { prices: pricesText(lang) }))}</p></div></div></div>`).join('');
}

function build(template, lang) {
  let h = template;
  h = h.replace(/<html lang="[a-z]+"/, `<html lang="${lang}"`);
  // eski SEO bloklari va qo'lda yozilgan meta teglarni olib tashlaymiz, keyin yangisini qo'yamiz
  h = h.replace(/[ \t]*<!-- seo:start[\s\S]*?<!-- seo:end -->\r?\n?/, '');
  h = h.replace(/[ \t]*<!-- seo-index:start[\s\S]*?<!-- seo-index:end -->\r?\n?/, ''); // olib tashlangan brendlar bloki qoldig'i
  h = h.replace(/[ \t]*<title>[\s\S]*?<\/title>\r?\n?/, '');
  h = h.replace(/[ \t]*<meta\s+name="description"[\s\S]*?\/>\r?\n?/, '');
  h = h.replace(/[ \t]*<meta\s+property="og:[^"]+"[\s\S]*?\/>\r?\n?/g, '');
  h = h.replace(/(<meta name="theme-color"[^>]*>\r?\n)/, `$1${headBlock(lang)}\n`);
  h = h.replace(/(<div class="faq-list[^"]*" id="faqList">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/, (m, a, b) => a + faqHtml(lang) + b);
  h = fillI18n(h, lang);
  if (!h.includes('<!-- seo:start')) throw new Error('marker joyi topilmadi: ' + lang);
  return h;
}

// ------------------------------------------------------------------ yozish
const templatePath = path.join(PUB, 'index.html');
const template = fs.readFileSync(templatePath, 'utf8').split('\r\n').join('\n');
for (const lang of LANGS) {
  const out = lang === 'uz' ? templatePath : path.join(PUB, lang, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, build(template, lang));
  console.log(`✓ ${path.relative(ROOT, out)}  (${keywords(lang).length} ta kalit so'z)`);
}

const today = new Date().toISOString().slice(0, 10);
const alt = LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${URLS[l]}" />`).concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${URLS.uz}" />`).join('\n');
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map((l) => `  <url>\n    <loc>${URLS[l]}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${l === 'uz' ? '1.0' : '0.9'}</priority>\n${alt}\n  </url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(PUB, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`);
console.log('✓ public/sitemap.xml, public/robots.txt');
