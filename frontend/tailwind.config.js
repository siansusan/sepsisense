/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        clinical: {
          dark: '#030712', // super dark premium slate
          card: 'rgba(17, 24, 39, 0.75)', // glassmorphism background
          accent: '#10B981', // green progression
          fever: '#EF4444', // red temperature
          sepsis: '#B91C1C', // deep red alert
          heart: '#EC4899', // pink heart rate
          bp: '#3B82F6', // blue blood pressure
          wbc: '#F59E0B', // amber white blood cells
          lactate: '#8B5CF6' // violet lactate
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 15px rgba(16, 185, 129, 0.25)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.25)',
      }
    },
  },
  plugins: [],
}
