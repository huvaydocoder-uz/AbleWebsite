# Able Parfum — sayt va admin panel

O‘zbekistondagi **Able Parfum** do'koni uchun premium sayt (uz / ru / en), onlayn buyurtma, Telegram bildirishnomalari va admin panel.

## Tuzilma

```
able-parfum/
├── public/                 ← sayt fayllari (brauzer ko'radigan qism)
│   ├── index.html          ← asosiy sahifa (intro, 8 ta bo'lim, katalog, modal)
│   ├── admin.html          ← admin panel ( /admin )
│   ├── css/style.css       ← dizayn va animatsiyalar
│   ├── css/tailwind.css    ← tayyor yig'ilgan Tailwind CSS
│   ├── js/i18n.js          ← uch tildagi barcha matnlar
│   ├── js/app.js           ← sayt logikasi
│   ├── js/admin.js         ← admin panel logikasi
│   ├── data/catalog.json   ← zaxira katalog (server ishlamasa)
│   └── assets/             ← logo, atirlar (products/), do'kon (shop/), asoschi (founder/)
├── api/index.js            ← Vercel funksiyasi (server.js ishlovchisini chaqiradi)
├── vercel.json             ← Vercel sozlamasi (public/ + /api/* yo'naltirish)
└── server/
    ├── server.js           ← backend (Node.js, qo'shimcha kutubxonasiz)
    ├── seed-products.js    ← boshlang'ich 62 ta atir
    ├── setup-admin.js      ← admin login/parolini o'rnatish
    ├── .env.example        ← sozlamalar namunasi
    └── data/               ← ma'lumotlar bazasi (JSON): mahsulotlar, buyurtmalar, sozlamalar, admin
```

## Ishga tushirish

Kerak bo'ladi: **Node.js 18 yoki undan yangi** (https://nodejs.org). Boshqa hech narsa o'rnatish shart emas.

```bash
cd able-parfum/server
node server.js
```

- Sayt: http://localhost:3000
- Admin panel: http://localhost:3000/admin
  - Login: `ableparfume@gmail.com`
  - Parol: sizga berilgan parol (kodda ochiq yozilmagan — `server/data/admin.json` da faqat shifrlangan xeshi saqlanadi)

Parolni almashtirish:

```bash
node setup-admin.js ableparfume@gmail.com "YangiParol123"
```

## Telegram buyurtmalarini ulash (bir marta, 3 daqiqa)

Sayt shaxsiy akkauntga (@shuxratgafurov1) to'g'ridan-to'g'ri yoza olmaydi — Telegram buni faqat bot orqali ruxsat beradi.

1. Telegramda **@BotFather** → `/newbot` → bot nomini kiriting → **token** beriladi.
2. Admin panel → **Sozlamalar** → tokenni joylang → «Saqlash».
3. **@shuxratgafurov1** akkauntidan yangi botni oching va **/start** bosing.
4. «Chat ID ni topish» → Shuhrat akani tanlang → «Saqlash» → «Sinov xabari».

Shundan keyin har bir buyurtma (mijoz ismi, telefoni, atir, hajm, narx, manzil) darhol Telegramga keladi.
Bot ulanmagan paytda ham buyurtma yo'qolmaydi: u admin paneldagi «Buyurtmalar» ro'yxatiga yoziladi, mijozga esa Telegram chatni tayyor matn bilan ochish taklif qilinadi.

## Admin panel imkoniyatlari

| Bo'lim | Nima qiladi |
|---|---|
| Statistika | Jami buyurtmalar, mijozlar, sotuv summasi, sayt tashriflari, konversiya, 14 kunlik grafik, eng ko'p sotilgan atirlar |
| Buyurtmalar | To'liq tarix, holat (Yangi → Tasdiqlangan → Bajarilgan / Bekor), izoh, qidiruv, Excel (CSV) eksport |
| Mijozlar | Telefon bo'yicha guruhlangan CRM ro'yxat: nechta buyurtma, jami summa, sevimli atir |
| Mahsulotlar | Yangi atir qo'shish (rasm bilan), tahrirlash, alohida chegirma, «Xit» belgisi, saytdan yashirish, o'chirish |
| Narx va chegirma | 10/20/30/50 ml narxlari (o'zgarishi bilan saytdagi hamma narxlar yangilanadi), butun sayt uchun chegirma va aksiya matni |
| Sozlamalar | Telegram bot, manzil matni (3 tilda), mo'ljal, ish vaqti |

## Vercel'ga joylash (sayt + admin panel)

Loyiha Vercel uchun tayyor: sayt `public/` dan, API esa `api/index.js` funksiyasidan ishlaydi (`vercel.json`).
Vercel'da disk saqlanmagani uchun ma'lumotlar **Upstash Redis**'da, admin yuklagan rasmlar **Vercel Blob**'da saqlanadi.

1. **vercel.com → Add New → Project** → GitHub'dan `AbleWebsite` repozitoriyini tanlang → **Import**.
   Framework: **Other** (qolgan sozlamalarni `vercel.json` o'zi beradi) → **Deploy**.
2. Loyiha ichida **Storage → Create Database → Upstash (Redis)** → yarating va shu loyihaga ulang.
   `KV_REST_API_URL` va `KV_REST_API_TOKEN` o'zgaruvchilari avtomatik qo'shiladi.
3. **Storage → Create → Blob** → yarating va loyihaga ulang (`BLOB_READ_WRITE_TOKEN` avtomatik qo'shiladi).
4. **Settings → Environment Variables** ga qo'shing:

   | O'zgaruvchi | Qiymat |
   |---|---|
   | `ADMIN_EMAIL` | `ableparfume@gmail.com` |
   | `ADMIN_PASSWORD` | kuchli parol (kamida 8 belgi) |
   | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | ixtiyoriy — admin → Sozlamalar'dan ham kiritsa bo'ladi |

5. **Deployments → ⋯ → Redeploy**. Tayyor: sayt `https://<loyiha>.vercel.app`, admin — `/admin`.

Birinchi ochilishda mahsulotlar va sozlamalar `server/seed-products.js` dan Redis'ga avtomatik yoziladi.
Admin parolini almashtirish: `ADMIN_PASSWORD` ni yangilab, Redeploy qiling (eski kirishlar bekor bo'ladi).
Baza ulanmagan bo'lsa ham sayt ochiladi, lekin admin panelda saqlash «storage_not_configured» xatosini beradi.

## O'z serveringizga joylash (VPS va h.k.)

Sayt Node.js serverda ham ishlaydi — u holda **VPS** yoki Node.js qo'llaydigan hosting kerak:

- **VPS (tavsiya etiladi)** — masalan, Ubuntu server: `node server/server.js` ni `pm2` bilan doimiy ishga tushiring, oldiga Nginx + bepul SSL (Let's Encrypt) qo'ying.
- **Render / Railway / Fly.io** — «Start command»: `node server/server.js`. `server/data` papkasi uchun doimiy disk (persistent volume) ulang, aks holda qayta ishga tushganda buyurtmalar o'chib ketadi.

`PORT` muhit o'zgaruvchisi qo'llab-quvvatlanadi. Telegram tokenini `.env` faylida ham berish mumkin (`server/.env.example` ga qarang).

> `public/` papkasini oddiy statik hostingga (GitHub Pages va h.k.) qo'ysangiz ham sayt ochiladi va katalog ko'rinadi, lekin admin panel va avtomatik Telegram yuborish ishlamaydi — buyurtma mijozning o'z Telegrami orqali yuboriladi.

## Tekshirib chiqing

- **Manzil matni** — hozir «O‘zbekiston». Admin → Sozlamalar'da to'liq manzil va mo'ljalni yozing.
- **Atir nomlari va notalari** — rasmlardagi nomlardan olingan; xato bo'lsa, admin → Mahsulotlar'dan tuzating. «Now» atirining brendi bo'sh qoldirilgan.
- **FAQ** — qaytarish/almashtirish va yetkazib berish shartlari umumiy yozilgan. Do'koningiz qoidalariga mos ekanini tekshiring (`public/js/i18n.js`, `faq.a2` va `faq.a4`).
- **Instagram** — brief bo'yicha `@able.parfumes` ishlatilgan; paket ustida `@able.parfume` yozilgan. Qaysi biri to'g'riligini tasdiqlang.

## CSS ni qayta yig'ish (faqat HTML klasslarini o'zgartirsangiz)

```bash
npx tailwindcss@3.4.16 -c tailwind.config.js -i tailwind.input.css -o public/css/tailwind.css --minify
```
