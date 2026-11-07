/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        dark: {
          950: '#09090b',
          900: '#121214',
          850: '#18181b',
          800: '#27272a',
          700: '#3f3f46'
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        }
      },
      backgroundImage: {
        'warm-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249, 115, 22, 0.15), rgba(251, 146, 60, 0.05) 60%, transparent 100%)',
        'subtle-radial': 'radial-gradient(circle at center, rgba(255, 255, 255, 0.03) 0%, transparent 70%)',
      }
    },
  },
  plugins: [],
}
