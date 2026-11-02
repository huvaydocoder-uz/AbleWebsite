/** Tailwind sozlamasi — CSS ni qayta yig'ish:  npx tailwindcss@3.4.16 -i tailwind.input.css -o public/css/tailwind.css --minify */
module.exports = {
  content: ['./public/*.html', './public/js/*.js'],
  theme: {
    extend: {
      colors: {
        wine: { 950: '#1c040a', 900: '#2a0710', 800: '#3a0a14', 700: '#4d0f1d', 600: '#641628', 500: '#7d2236' },
        cream: { 50: '#fdfaf4', 100: '#f8f0e3', 200: '#f1e4cf', 300: '#e6d2b3' },
        gold: { 300: '#e6c891', 400: '#d4ad6a', 500: '#b98f4c' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
    },
  },
};
