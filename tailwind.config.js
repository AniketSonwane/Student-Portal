/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        highlight: {
          purple: '#8048A8',
          'purple-light': '#9D5BD2',
          'purple-hover': '#713b97',
          'purple-subtle': 'rgba(128, 72, 168, 0.12)',
          gold: '#F8D299',
          'gold-subtle': 'rgba(248, 210, 153, 0.15)',
          orange: '#F59E51',
          'orange-hover': '#e28837',
        },
        surface: {
          light: '#FFFFFF',
          'light-subtle': '#F8F9FA',
          'light-border': '#E2E8F0',
          dark: '#000000',
          'dark-card': '#0E0E12',
          'dark-card-hover': '#15151A',
          'dark-border': '#222228',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.06)',
        'card-dark': '0 8px 30px -4px rgba(0, 0, 0, 0.85)',
        'glow-purple': '0 0 24px -4px rgba(128, 72, 168, 0.35)',
        'glow-gold': '0 0 20px -4px rgba(248, 210, 153, 0.25)',
      }
    },
  },
  plugins: [],
}
