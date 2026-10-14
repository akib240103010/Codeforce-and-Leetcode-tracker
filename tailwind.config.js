/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./backend/**/*.js",
    "./server.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cf: {
          blue: '#3b82f6',
          red: '#ef4444',
          yellow: '#f59e0b'
        },
        lc: {
          orange: '#ffa116',
          easy: '#00b8a3',
          medium: '#ffc01e',
          hard: '#ff375f'
        }
      }
    }
  },
  plugins: []
};
