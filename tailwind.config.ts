import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Phase 3 Redesign tokens (cool neutral palette, cobalt accent).
        // OKLCH values live in app/globals.css as CSS variables.
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        'line-soft': 'var(--line-soft)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'accent-ink': 'var(--accent-ink)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        page: 'var(--bg)',

        // @deprecated Legacy warm gold palette (pre Phase 3). Kept so existing
        // components keep rendering during the screen-by-screen migration.
        // Remove once every screen has moved to the new tokens.
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
        // Phase 3: display + body + mono — see app/layout.tsx for next/font
        // registrations. `sans` is kept on Geist for the not-yet-migrated
        // screens; new work should use `font-display` / `font-body`.
        display: ['var(--font-display)', 'Inter Tight', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        // @deprecated Remove once all screens use `font-body`.
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Phase 3 shadow tokens.
        lift: '0 8px 28px -10px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(0, 0, 0, 0.02)',
        pop: '0 30px 80px -30px rgba(0, 0, 0, 0.25)',
        // @deprecated legacy
        soft: '0 2px 8px rgba(0,0,0,0.06)',
        card: '0 4px 16px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        // Phase 3 radii (single tweakable token + pill).
        rad: 'var(--radius)',
        'rad-sm': 'var(--radius-sm)',
        'rad-pill': 'var(--radius-pill)',
        // @deprecated legacy overrides of Tailwind defaults
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      letterSpacing: {
        // Phase 3 display-tight tracking.
        tight: '-0.035em',
        tighter: '-0.045em',
        snug: '-0.025em',
      },
      keyframes: {
        'timer-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        // Phase 3: slow horizontal marquee for the letter-drift strip on landing.
        'letter-drift': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'timer-pulse': 'timer-pulse 1s ease-in-out infinite',
        progress: 'progress 3s linear forwards',
        'letter-drift': 'letter-drift 60s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
