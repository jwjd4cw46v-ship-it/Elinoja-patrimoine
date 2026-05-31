/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#FFFBF0',
          100: '#FFF3CC',
          200: '#FFE699',
          300: '#FFD966',
          400: '#FFCC33',
          500: '#D4AF37',
          600: '#B8960C',
          700: '#9A7D0A',
          800: '#7D6608',
          900: '#5C4A06',
        },
        noir: {
          50:  '#F5F5F5',
          100: '#E8E8E8',
          200: '#C8C8C8',
          300: '#A0A0A0',
          400: '#707070',
          500: '#4A4A4A',
          600: '#2D2D2D',
          700: '#1A1A1A',
          800: '#111111',
          900: '#080808',
          950: '#030303',
        },
        finance: {
          green: '#00C853',
          red:   '#FF1744',
          blue:  '#2196F3',
        },
      },
      fontFamily: {
        sans:  ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-geist-mono)', 'Courier New', 'monospace'],
        serif: ['Georgia', 'serif'],
      },
      backgroundImage: {
        'gold-gradient':    'linear-gradient(135deg, #D4AF37 0%, #F5D76E 50%, #B8960C 100%)',
        'noir-gradient':    'linear-gradient(180deg, #0A0A0A 0%, #111111 100%)',
        'panel-gradient':   'linear-gradient(135deg, #111111 0%, #1A1A1A 100%)',
        'card-gradient':    'linear-gradient(135deg, rgba(212,175,55,0.05) 0%, rgba(212,175,55,0) 100%)',
      },
      boxShadow: {
        'gold-sm':   '0 1px 3px rgba(212,175,55,0.15)',
        'gold-md':   '0 4px 12px rgba(212,175,55,0.2)',
        'gold-lg':   '0 8px 32px rgba(212,175,55,0.25)',
        'noir-card': '0 4px 24px rgba(0,0,0,0.4)',
        'noir-deep': '0 8px 48px rgba(0,0,0,0.6)',
      },
      animation: {
        'shimmer':      'shimmer 2s linear infinite',
        'pulse-gold':   'pulse-gold 2s ease-in-out infinite',
        'slide-up':     'slide-up 0.3s ease-out',
        'fade-in':      'fade-in 0.2s ease-out',
        'ticker':       'ticker 30s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-gold': {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.6 },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: 0 },
          to:   { transform: 'translateY(0)', opacity: 1 },
        },
        'fade-in': {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '10px',
        'xl': '14px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
}
