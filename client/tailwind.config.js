/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          deep: '#101735',
          slate: '#1C2948',
        },
        cyan: {
          electric: '#00C8FF',
          ice: '#8CEBFF',
        },
        softWhite: '#F5F8FC',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(0, 200, 255, 0.4)',
        'glow-cyan-sm': '0 0 10px -2px rgba(0, 200, 255, 0.3)',
      },
    },
  },
  plugins: [],
};
