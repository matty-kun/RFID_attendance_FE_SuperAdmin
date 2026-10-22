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
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
          950: '#24133F',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          border: '#E2E8F0',
        },
      },
      borderRadius: {
        'squircle': '18px',
        'squircle-lg': '24px',
      },
      boxShadow: {
        'tactile': '0 3px 0 0 rgba(107, 33, 168, 0.25)',
        'tactile-pressed': '0 1px 0 0 rgba(107, 33, 168, 0.25)',
      },
    },
  },
  plugins: [],
}
