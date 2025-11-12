/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#127CA6',
        secondary: '#32A69A',
        accent: '#77F2E6',
        neutral: '#648C88',
      },
    },
  },
  plugins: [],
}