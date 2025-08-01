/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
        'mono': ['monospace'],
      },
      animation: {
        'bounce-in': 'bounceIn 0.6s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'scanlines': 'scanlines 0.1s linear infinite',
        'gradient-shift': 'gradient-shift 2s ease infinite',
        'pixel-bounce': 'pixelBounce 0.6s ease-out',
        'pixel-slide-up': 'pixelSlideUp 0.4s ease-out',
        'flicker': 'flicker 0.15s infinite linear alternate',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scanlines: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(4px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pixelBounce: {
          '0%': { transform: 'scale(0.3) translate(0, 0)' },
          '25%': { transform: 'scale(1.1) translate(-2px, -2px)' },
          '50%': { transform: 'scale(0.9) translate(1px, 1px)' },
          '100%': { transform: 'scale(1) translate(0, 0)' },
        },
        pixelSlideUp: {
          '0%': { 
            transform: 'translate(0, 20px)', 
            opacity: '0' 
          },
          '100%': { 
            transform: 'translate(0, 0)', 
            opacity: '1' 
          },
        },
        flicker: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0.98' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}