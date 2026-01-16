/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF0066',
          50: '#FFE6F0',
          100: '#FFCCE0',
          200: '#FF99C2',
          300: '#FF66A3',
          400: '#FF3385',
          500: '#FF0066',
          600: '#CC0052',
          700: '#99003D',
          800: '#660029',
          900: '#330014',
        },
        secondary: {
          DEFAULT: '#000000',
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#CCCCCC',
          300: '#999999',
          400: '#666666',
          500: '#333333',
          600: '#000000',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
