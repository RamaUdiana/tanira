/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.ejs",
    "./src/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        tanira: {
            green: '#2F7D32',      /* Primary */
            greenLight: '#4CAF50',
            greenDark: '#1B5E20',
            brown: '#6D4C41',      /* Earth */
            cream: '#F9F7F2',      /* Background */
            dark: '#1F2937',       /* Text Main */
            gray: '#4B5563',       /* Text Secondary */
            accent: '#F59E0B',     /* CTA/Highlight */
        }
      },
    },
  },
  plugins: [],
}

