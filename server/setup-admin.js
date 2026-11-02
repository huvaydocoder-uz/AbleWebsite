/*
 * Admin login/parolini o'rnatish yoki almashtirish:
 *   node setup-admin.js ableparfume@gmail.com "YangiParol"
 * Parol ochiq holda saqlanmaydi — faqat scrypt xeshi data/admin.json ga yoziladi.
 */
const fs = require('fs');
const path = require('path');
const { hashPassword } = require('./server');

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error('Foydalanish: node setup-admin.js EMAIL PAROL   (parol kamida 8 belgi)');
  process.exit(1);
}
const dir = path.join(__dirname, 'data');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'admin.json'), JSON.stringify({ email: email.toLowerCase(), ...hashPassword(password) }, null, 2));
console.log('✓ Admin saqlandi:', email.toLowerCase());
