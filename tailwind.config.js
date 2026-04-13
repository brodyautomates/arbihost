/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: { DEFAULT: '#00d4b8', dark: '#00a896', light: '#33ddc6' },
        surface: { DEFAULT: '#0d1117', card: '#161b22', elevated: '#1c2333', border: '#21262d' },
      },
    },
  },
  plugins: [],
}
