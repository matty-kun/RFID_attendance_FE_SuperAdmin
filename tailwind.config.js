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
          50: '#F6F2FA',
          100: '#E4D1F5',
          200: '#D8B4ED',
          300: '#B973DE',
          400: '#A046D0',
          500: '#8B2CCB',
          600: '#7C27BD',
          700: '#6D21A8',
          800: '#58158C',
          900: '#32105E',
          950: '#24133F',
        },
        slate: {
          50: '#FAFAFC',
          100: '#F6F2FA',
          200: '#E5E0EB',
          300: '#DED8E5',
          400: '#A59CAC',
          500: '#756883',
          600: '#665A72',
          700: '#4A3A5C',
          800: '#321F48',
          900: '#24133F',
          950: '#1A0B2E',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F6F2FA',
          border: '#E5E0EB',
        },
      },
      borderRadius: {
        'squircle': '16px',
        'squircle-lg': '24px',
      },
      boxShadow: {
        'tactile': '0 5px 0 0 #58158C',
        'tactile-pressed': '0 1px 0 0 #58158C',
      },
      fontFamily: {
        sans: ['Nunito Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
