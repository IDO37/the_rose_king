/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,vue}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e11d48', // rose-600
          light: '#fb7185',  // rose-400
          dark: '#be123c',   // rose-700
        },
        secondary: {
          DEFAULT: '#4f46e5', // indigo-600
          light: '#818cf8',   // indigo-400
          dark: '#4338ca'     // indigo-700
        },
        success: {
          DEFAULT: '#10b981', // emerald-500
          light: '#34d399',   // emerald-400
          dark: '#059669'     // emerald-600
        },
        warning: {
          DEFAULT: '#f59e0b', // amber-500
          light: '#fbbf24',   // amber-400
          dark: '#d97706'     // amber-600
        },
        danger: {
          DEFAULT: '#ef4444', // red-500
          light: '#f87171',   // red-400
          dark: '#dc2626'     // red-600
        }
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
