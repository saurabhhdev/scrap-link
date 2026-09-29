/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { brand: { 500: '#16803c', 600: '#116332', 950: '#062c18' } } } },
  plugins: []
};
