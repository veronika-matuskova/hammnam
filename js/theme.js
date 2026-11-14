// Playful theme shared by every page. Load it right after the Tailwind CDN script.
// Instead of rewriting every class, the palette Tailwind already uses is remapped:
// "slate" becomes deep teal on fresh mint, "red" is coral (600+ is dark enough for
// white button text), "emerald" is leaf green and "amber" is sunny yellow.
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'ui-rounded', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Baloo 2"', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif']
      },
      colors: {
        slate: {
          50: '#fffaf1',
          100: '#e1f3ec',
          200: '#c9e7dc',
          300: '#a6d3c3',
          400: '#7aa99c',
          500: '#55827a',
          600: '#3d6b65',
          700: '#2a5a55',
          800: '#1b524d',
          900: '#134e4a',
          950: '#0b3532'
        },
        red: {
          50: '#fff3ef',
          100: '#ffe3da',
          200: '#ffc6b5',
          300: '#ffa58a',
          400: '#ff8c6c',
          500: '#ff7a59',
          600: '#d0472a',
          700: '#b03a21',
          800: '#8f311e',
          900: '#762b1c'
        },
        emerald: {
          50: '#ecfaf2',
          100: '#d2f4e1',
          200: '#a8e8c5',
          300: '#6fd6a1',
          400: '#42c483',
          500: '#2bb673',
          600: '#1f965d',
          700: '#1a764b',
          800: '#185e3e',
          900: '#154d35'
        },
        amber: {
          50: '#fffbea',
          100: '#fff3c4',
          200: '#ffe794',
          300: '#ffd166',
          400: '#ffc23d',
          500: '#f5a623',
          600: '#d98a0b',
          700: '#b26a08',
          800: '#8f520c',
          900: '#75440f'
        }
      },
      borderRadius: {
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem'
      },
      boxShadow: {
        sm: '0 3px 0 0 rgb(19 78 74) / 0.07)',
        DEFAULT: '0 4px 0 0 rgb(19 78 74) / 0.08)',
        md: '0 6px 0 0 rgb(19 78 74) / 0.09), 0 10px 24px -12px rgb(19 78 74) / 0.25)',
        lg: '0 8px 0 0 rgb(19 78 74) / 0.1), 0 16px 32px -16px rgb(19 78 74) / 0.3)'
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out',
        bob: 'bob 3.2s ease-in-out infinite'
      }
    }
  }
};
