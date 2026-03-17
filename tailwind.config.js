/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        display: ['var(--font-press-start)', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#a855f7',
          dark:    '#7c3aed',
          light:   '#c084fc',
        },
      },
      animation: {
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        bounceIn: {
          '0%':   { transform: 'scale(0.4)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
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
