import type { Config } from 'tailwindcss';

const rgb = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: rgb('--paper'),
        surface: rgb('--surface'),
        raised: rgb('--raised'),
        ink: rgb('--ink'),
        muted: rgb('--muted'),
        faint: rgb('--faint'),
        rule: rgb('--rule'),
        clay: rgb('--clay'),
        'clay-deep': rgb('--clay-deep'),
        'clay-soft': rgb('--clay-soft'),
        good: rgb('--good'),
        critical: rgb('--critical'),
        // Sequential ramp. Magnitude only — never used for identity.
        land: {
          50: rgb('--land-50'),
          100: rgb('--land-100'),
          200: rgb('--land-200'),
          300: rgb('--land-300'),
          400: rgb('--land-400'),
          500: rgb('--land-500'),
          600: rgb('--land-600'),
          700: rgb('--land-700'),
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.1rem', letterSpacing: '0.06em' }],
        display: ['clamp(2.6rem, 6.2vw, 5.2rem)', { lineHeight: '0.94', letterSpacing: '-0.025em' }],
        opener: ['clamp(1.9rem, 3.4vw, 3rem)', { lineHeight: '1.04', letterSpacing: '-0.02em' }],
        figure: ['clamp(1.9rem, 3vw, 2.75rem)', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      maxWidth: { measure: '62ch', reading: '72ch' },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        halo: { '0%': { transform: 'scale(0.7)', opacity: '0.75' }, '100%': { transform: 'scale(2.6)', opacity: '0' } },
        draw: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: {
        rise: 'rise 380ms cubic-bezier(0.16, 1, 0.3, 1) both',
        halo: 'halo 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        draw: 'draw 640ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
