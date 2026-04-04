/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pokemon: {
          red: '#CC0000',
          'red-dark': '#990000',
          'red-light': '#FF3333',
          yellow: '#FFCC00',
          'yellow-dark': '#FFB300',
          blue: '#3B4CCA',
          'blue-dark': '#2A3A9E',
          white: '#FFFFFF',
          gray: '#f0f0f0',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.1)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};
