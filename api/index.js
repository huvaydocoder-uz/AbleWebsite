// Vercel funksiyasi: barcha /api/* so'rovlari shu yerga keladi (vercel.json → rewrites)
// va lokal serverdagi bilan bir xil ishlovchiga uzatiladi.
const { handler } = require('../server/server');

module.exports = (req, res) => {
  // Rewrite asl yo'lni ?__p= orqali beradi: /api/admin/orders → /api/index?__p=admin/orders
  const u = new URL(req.url, 'http://x');
  const p = u.searchParams.get('__p');
  if (p !== null) {
    u.searchParams.delete('__p');
    req.url = '/api/' + p + (u.search || '');
  }
  return handler(req, res);
};
