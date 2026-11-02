// Boshlang'ich mahsulotlar ro'yxati. Server birinchi marta ishga tushganda
// data/products.json fayli shu ro'yxatdan yaratiladi. Keyin hamma o'zgarishlar
// admin panel orqali qilinadi.
//
// [id, nomi, brend, jins (men|women|unisex), rasm, oila, [yuqori, yurak, baza], intensivlik 1-5]

const RAW = [
  // ---------- Erkaklar ----------
  ['acqua-di-gio', 'Acqua di Giò', 'Giorgio Armani', 'men', 'products/acqua-di-gio.webp', 'aquatic', ['Bergamot', 'Sea notes', 'White musk'], 3],
  ['baccarat-540', 'Baccarat Rouge 540', 'Maison Francis Kurkdjian', 'men', 'products/baccarat-540.webp', 'amber', ['Saffron', 'Jasmine', 'Ambergris'], 5],
  ['beast-loge-montal', 'Beast Loge', 'Montale', 'men', 'products/beast-loge-montal.webp', 'gourmand', ['Vanilla', 'Incense', 'Musk'], 4],
  ['blonde-amber', 'Blonde Amber XXI', 'Clive Christian', 'men', 'products/blonde-amber.webp', 'amber', ['Ginger', 'Amber', 'Sandalwood'], 4],
  ['blue-de-chanel', 'Bleu de Chanel', 'Chanel', 'men', 'products/blue-de-chanel.webp', 'woody', ['Grapefruit', 'Ginger', 'Cedar'], 4],
  ['blue-sapphire', 'Blue Sapphire', 'Boadicea the Victorious', 'men', 'products/blue-sapphire.webp', 'oriental', ['Saffron', 'Oud', 'Leather'], 5],
  ['bois-imperial', 'Bois Impérial', 'Essential Parfums', 'men', 'products/bois-imperial.webp', 'woody', ['Basil', 'Vetiver', 'Akigalawood'], 3],
  ['bylgary-tygar', 'Tygar Extrait', 'Bvlgari', 'men', 'products/bylgary-tygar.webp', 'citrus', ['Grapefruit', 'Ambrox', 'Woods'], 4],
  ['creed-aventus', 'Aventus', 'Creed', 'men', 'products/creed-aventus.webp', 'fruity', ['Pineapple', 'Birch', 'Oakmoss'], 5],
  ['dior-souvage', 'Sauvage', 'Dior', 'men', 'products/dior-souvage.webp', 'spicy', ['Bergamot', 'Pepper', 'Ambroxan'], 5],
  ['dolce-gabana-light-blue', 'Light Blue', 'Dolce & Gabbana', 'men', 'products/dolce-gabana-light-blue.webp', 'citrus', ['Lemon', 'Apple', 'Cedar'], 2],
  ['fleur-narcotique', 'Fleur Narcotique', 'Ex Nihilo', 'men', 'products/fleur-narcotique.webp', 'floral', ['Lychee', 'Peony', 'Musk'], 3],
  ['gaba-harmone-paris', 'This is not GABA', 'Hormone Paris', 'men', 'products/gaba-harmone-paris.webp', 'fresh', ['Aldehydes', 'Iris', 'Musk'], 3],
  ['greenlay-de-marly', 'Greenley', 'Parfums de Marly', 'men', 'products/greenlay-de-marly.webp', 'fresh', ['Green apple', 'Cashmeran', 'Cedar'], 3],
  ['hibiscus-mahajad', 'Hibiscus Mahajád', 'Maison Crivelli', 'men', 'products/hibiscus-mahajad.webp', 'spicy', ['Hibiscus', 'Pink pepper', 'Leather'], 4],
  ['hormone-paris-testosterone', 'Testosterone', 'Hormone Paris', 'men', 'products/hormone-paris-testosterone.webp', 'woody', ['Spices', 'Tobacco', 'Woods'], 5],
  ['l-lmensite-lv', "L'Immensité", 'Louis Vuitton', 'men', 'products/l-lmensite-lv.webp', 'citrus', ['Grapefruit', 'Ginger', 'Ambergris'], 3],
  ['lacoste-white', "L.12.12 Blanc", 'Lacoste', 'men', 'products/lacoste-white.webp', 'fresh', ['Grapefruit', 'Rosemary', 'Cedar'], 2],
  ['leorde-george', 'The Tragedy of Lord George', 'Penhaligon’s', 'men', 'products/leorde-george.webp', 'gourmand', ['Brandy', 'Tonka bean', 'Sandalwood'], 4],
  ['mango', 'Mango Skin', 'Vilhelm Parfumerie', 'men', 'products/mango.webp', 'fruity', ['Mango', 'Citrus', 'Musk'], 3],
  ['megamare-orto', 'Megamare', 'Orto Parisi', 'men', 'products/megamare-orto.webp', 'aquatic', ['Sea salt', 'Seaweed', 'Ambergris'], 5],
  ['men-212', '212 VIP Men', 'Carolina Herrera', 'men', 'products/men-212.webp', 'spicy', ['Lime', 'Ginger', 'Leather'], 4],
  ['molecula-020', 'Molecule 02', 'Escentric Molecules', 'men', 'products/molecula-020.webp', 'woody', ['Ambroxan', 'Ambroxan', 'Ambroxan'], 3],
  ['now-parfume', 'Now', '', 'men', 'products/now-parfume.webp', 'fresh', ['Bergamot', 'Lavender', 'Musk'], 3],
  ['pura-sospiro', 'Erba Pura', 'Sospiro', 'men', 'products/pura-sospiro.webp', 'fruity', ['Bergamot', 'Mediterranean fruits', 'White musk'], 4],
  ['roja-elysium', 'Elysium', 'Roja Parfums', 'men', 'products/roja-elysium.webp', 'citrus', ['Lemon', 'Vetiver', 'Ambergris'], 4],
  ['santal-33', 'Santal 33', 'Le Labo', 'men', 'products/santal-33.webp', 'woody', ['Cardamom', 'Sandalwood', 'Leather'], 4],
  ['stefano-rici-royale-eagle-sport', 'Royal Eagle Sport', 'Stefano Ricci', 'men', 'products/stefano-rici-royale-eagle-sport.webp', 'fresh', ['Citrus', 'Lavender', 'Woods'], 3],
  ['stellar-times-lv', 'Stellar Times', 'Louis Vuitton', 'men', 'products/stellar-times-lv.webp', 'amber', ['Rose', 'Benzoin', 'Amber'], 5],
  ['stronger-with-you-intensely', 'Stronger With You Intensely', 'Emporio Armani', 'men', 'products/stronger-with-you-intensely.webp', 'gourmand', ['Pink pepper', 'Toffee', 'Vanilla'], 4],
  ['tom-ford-tobacco-vanille', 'Tobacco Vanille', 'Tom Ford', 'men', 'products/tom-ford-tobacco-vanille.webp', 'gourmand', ['Tobacco', 'Vanilla', 'Cocoa'], 5],
  ['tomford-ombre-leather', 'Ombré Leather', 'Tom Ford', 'men', 'products/tomford-ombre-leather.webp', 'leather', ['Cardamom', 'Leather', 'Patchouli'], 5],
  ['versage-eros', 'Eros', 'Versace', 'men', 'products/versage-eros.webp', 'gourmand', ['Mint', 'Tonka bean', 'Vanilla'], 4],
  ['versage-men', 'Man Eau Fraîche', 'Versace', 'men', 'products/versage-men.webp', 'fresh', ['Lemon', 'Neroli', 'Cedar'], 3],

  // ---------- Uniseks (ikkala ro'yxatda ham bor) ----------
  ['afternoon-swim-lv', 'Afternoon Swim', 'Louis Vuitton', 'unisex', 'products/afternoon-swim-lv.webp', 'citrus', ['Mandarin', 'Bergamot', 'Ambergris'], 3],
  ['blue-talisman', 'Blue Talisman', 'Ex Nihilo', 'unisex', 'products/blue-talisman.webp', 'fruity', ['Pear', 'Orange blossom', 'Musk'], 4],
  ['ganymade', 'Ganymede', 'Marc-Antoine Barrois', 'unisex', 'products/ganymade.webp', 'leather', ['Mandarin', 'Violet', 'Suede'], 5],
  ['imagination-lv', 'Imagination', 'Louis Vuitton', 'unisex', 'products/imagination-lv.webp', 'citrus', ['Citron', 'Black tea', 'Ambroxan'], 3],
  ['kirke', 'Kirkè', 'Tiziana Terenzi', 'unisex', 'products/kirke.webp', 'fruity', ['Passion fruit', 'Peach', 'Musk'], 5],
  ['pacific-chill-lv', 'Pacific Chill', 'Louis Vuitton', 'unisex', 'products/pacific-chill-lv.webp', 'fresh', ['Mint', 'Blackcurrant', 'Apricot'], 3],
  ['sun-song-lv', 'Sun Song', 'Louis Vuitton', 'unisex', 'products/sun-song-lv.webp', 'citrus', ['Orange', 'Neroli', 'Musk'], 3],
  ['symphony-lv', 'Symphony', 'Louis Vuitton', 'unisex', 'products/symphony-lv.webp', 'citrus', ['Grapefruit', 'Ginger', 'Bergamot'], 3],

  // ---------- Ayollar ----------
  ['amouage-existence', 'Existence', 'Amouage', 'women', 'products/amouage-existence.webp', 'floral', ['Bergamot', 'Lily of the valley', 'Musk'], 3],
  ['amouage-guidance', 'Guidance', 'Amouage', 'women', 'products/amouage-guidance.webp', 'amber', ['Pear', 'Hazelnut', 'Sandalwood'], 5],
  ['aurica', 'Aurica', 'Boadicea the Victorious', 'women', 'products/aurica.webp', 'gourmand', ['Pineapple', 'Caramel', 'Vanilla'], 5],
  ['byredo-blanche', 'Blanche', 'Byredo', 'women', 'products/byredo-blanche.webp', 'fresh', ['Aldehydes', 'Rose', 'Musk'], 2],
  ['chanel-chance', 'Chance Eau Tendre', 'Chanel', 'women', 'products/chanel-chance.webp', 'floral', ['Grapefruit', 'Jasmine', 'Musk'], 3],
  ['delina-de-marly', 'Delina', 'Parfums de Marly', 'women', 'products/delina-de-marly.webp', 'floral', ['Lychee', 'Turkish rose', 'Vanilla'], 4],
  ['dg-l-imperatrice', "3 L'Impératrice", 'Dolce & Gabbana', 'women', 'products/dg-l-imperatrice.webp', 'fruity', ['Watermelon', 'Kiwi', 'Musk'], 2],
  ['good-girl-by-kilian', 'Good Girl Gone Bad', 'Kilian', 'women', 'products/good-girl-by-kilian.webp', 'floral', ['Jasmine', 'Tuberose', 'Amber'], 4],
  ['gucci-flora', 'Flora', 'Gucci', 'women', 'products/gucci-flora.webp', 'floral', ['Mandarin', 'Peony', 'Sandalwood'], 3],
  ['gucci-gardenia-flora', 'Flora Gorgeous Gardenia', 'Gucci', 'women', 'products/gucci-gardenia-flora.webp', 'floral', ['Pear', 'Gardenia', 'Brown sugar'], 3],
  ['hfc-intrigue', 'Devil’s Intrigue', 'Haute Fragrance Company', 'women', 'products/hfc-intrigue.webp', 'floral', ['Peach', 'Rose', 'Patchouli'], 4],
  ['lady-million', 'Lady Million', 'Paco Rabanne', 'women', 'products/lady-million.webp', 'floral', ['Raspberry', 'Orange blossom', 'Honey'], 4],
  ['libre-ysl', 'Libre', 'Yves Saint Laurent', 'women', 'products/libre-ysl.webp', 'floral', ['Lavender', 'Orange blossom', 'Vanilla'], 4],
  ['mango-skin', 'Mango Skin', 'Vilhelm Parfumerie', 'women', 'products/mango-skin.webp', 'fruity', ['Mango', 'Blackcurrant', 'Musk'], 3],
  ['miss-dior', 'Miss Dior', 'Dior', 'women', 'products/miss-dior.webp', 'floral', ['Iris', 'Rose', 'Musk'], 3],
  ['montale', 'Roses Musk', 'Montale', 'women', 'products/montale.webp', 'floral', ['Rose', 'Jasmine', 'Musk'], 4],
  ['my-way', 'My Way', 'Giorgio Armani', 'women', 'products/my-way.webp', 'floral', ['Bergamot', 'Tuberose', 'Vanilla'], 3],
  ['tilia', 'Tilia', 'Marc-Antoine Barrois', 'women', 'products/tilia.webp', 'floral', ['Linden blossom', 'Jasmine', 'Musk'], 3],
  ['valentino', 'Born in Roma', 'Valentino', 'women', 'products/valentino.webp', 'woody', ['Violet leaf', 'Vanilla', 'Vetiver'], 4],
  ['victoria-secret', 'Bombshell', "Victoria's Secret", 'women', 'products/victoria-secret.webp', 'fruity', ['Passion fruit', 'Peony', 'Vanilla orchid'], 3],
];

// Mijozlar eng ko'p so'raydigan hidlar — katalogda "Xit" belgisi bilan chiqadi.
const BESTSELLERS = new Set(['creed-aventus', 'baccarat-540', 'dior-souvage', 'tom-ford-tobacco-vanille', 'delina-de-marly', 'kirke', 'libre-ysl', 'blue-de-chanel']);

// Boshlang'ich aksiya: 5 ta erkaklar + 5 ta ayollar atiriga 10% chegirma (saytdagi "chegirmalar" karuselida ko'rinadi)
const DEALS = new Set([
  'versage-eros', 'stronger-with-you-intensely', 'acqua-di-gio', 'men-212', 'tomford-ombre-leather',
  'lady-million', 'gucci-flora', 'dg-l-imperatrice', 'valentino', 'my-way',
]);

module.exports = RAW.map(([id, name, brand, gender, image, family, notes, intensity], i) => ({
  id, name, brand, gender, image: 'assets/' + image, family,
  notes: { top: notes[0], heart: notes[1], base: notes[2] },
  intensity,
  discount: DEALS.has(id) ? 10 : 0, // shu mahsulot uchun alohida chegirma (%)
  bestseller: BESTSELLERS.has(id),
  active: true,
  order: i,
  description: null,    // { uz, ru, en } — admin paneldan qo'shilsa, avtomatik tavsif o'rniga chiqadi
}));
