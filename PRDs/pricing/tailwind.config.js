
export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: 'var(--color-navy)',
          light: 'var(--color-navy-light)',
          dark: 'var(--color-navy-dark)',
        },
        blue: {
          DEFAULT: 'var(--color-blue)',
          light: 'var(--color-blue-light)',
        },
        emerald: {
          DEFAULT: 'var(--color-emerald)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
}
