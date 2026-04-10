import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#FAFAF7',
          surface: '#F2EFE8',
          border: '#E0DDD6',
          text: '#1A1A1A',
          muted: '#6B6560',
          gold: '#C8A84B',
          'gold-dark': '#9E7E2C',
          red: '#8B1A1A',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.06)',
        card: '0 4px 16px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
