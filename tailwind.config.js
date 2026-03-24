/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0A0A0A',
          red: '#CC0000',
          'red-hover': '#E60000',
          gold: '#C9A84C',
          'gold-hover': '#E0BC6A',
          text: '#F5F5F5',
          muted: '#A1A1AA',
          card: '#1A1A1A',
          border: '#2A2A2A',
          sidebar: '#111111',
        },
      },
      fontFamily: {
        heading: ['Rajdhani', 'sans-serif'],
        body: ['Sora', 'Inter', 'sans-serif'],
        sora: ['Sora', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
