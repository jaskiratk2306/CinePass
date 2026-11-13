/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf7ee',
          100: '#f5ebd4',
          500: '#e5a93c',
          600: '#d99222',
          700: '#b47019',
        },
      },
    },
  },
  plugins: [],
};
