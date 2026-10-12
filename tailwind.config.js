/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fleet: {
          darkest: '#070B1A',
          dark: '#08111F',
          sidebar: '#0B1F3A',
          card: '#0F2742',
          surface: '#0A1024',
          cyan: '#00C2FF',
          blue: '#2563eb',
          orange: '#f97316',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
