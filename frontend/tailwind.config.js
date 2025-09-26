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
          blue: '#1e40af',
          orange: '#f97316',
        },
        secondary: {
          light: '#f8fafc',
          dark: '#1f2937',
        },
      },
      fontFamily: {
        'heading': ['Inter', 'sans-serif'],
        'body': ['Open Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}