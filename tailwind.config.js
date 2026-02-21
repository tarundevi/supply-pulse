/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        dark: '#0a0f1e',
        'electric-blue': '#00c8ff',
      },
    },
  },
  plugins: [],
};
