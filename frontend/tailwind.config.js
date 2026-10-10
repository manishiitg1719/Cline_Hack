/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "brand" = deep field green (used across all pages for buttons, links, active states)
        brand: {
          50: '#eef4ef',
          100: '#d9e7dc',
          500: '#3d7a5a',
          600: '#21503f',
          700: '#1b3a2f',
          800: '#132a22',
        },
        forest: { 700: '#2a5243', 800: '#1f3d32', 900: '#1b3a2f', 950: '#12261f' },
        cream: { 50: '#fffaf1', 100: '#fbf4e6', 200: '#efe5d2', 300: '#e3d5bb' },
        sage: { 100: '#dde6d3', 200: '#c9d6bd', 300: '#b2c4a4' },
        accent: { 50: '#fdf3e7', 100: '#f6e2c8', 300: '#f2c46d', 500: '#c47f3a', 600: '#a86a2c', 700: '#8a5521' },
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        serif: ['Georgia', '"Noto Serif Devanagari"', '"Nirmala UI"', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
}
