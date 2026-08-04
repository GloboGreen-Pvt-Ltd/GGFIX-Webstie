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
        // Light admin theme (GG Shop India reference). Token NAMES are kept for
        // compatibility with existing usages: `dark` = page/input background,
        // `card` = raised surface (cards, modals, tables). `panel` stays the
        // dark sidebar chrome.
        admin: {
          dark: '#f1f5f9', // page + input background (light gray)
          card: '#ffffff', // cards / modals / table surfaces (white)
          panel: '#131426', // sidebar chrome (dark)
          border: '#e2e8f0', // hairline borders
          accent: '#2563eb', // primary blue — buttons, active nav, links
          muted: '#64748b', // secondary text
        },

        // Public marketing site palette (mirrors the GGFIX mobile apps).
        // Green is the primary brand + action colour.
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          DEFAULT: '#16A34A',
          light: '#22C55E',
          dark: '#15803D',
          soft: '#DCFCE7',
          // Neutral/surface tokens used across the marketing pages.
          ink: '#0F172A', // primary body + heading text
          // Secondary text. Must clear AA (4.5:1) on EVERY light surface it is
          // used on, not just white — the site's default section tone is
          // `page` and pills/labels sit on `soften`. #64748B passed on white
          // (4.83) but failed on soften (4.39) and page (4.48); this value
          // clears 5.3:1 on all four (white / page / soften / brand-50).
          muted: '#5A6678',
          subtle: '#94A3B8', // decorative text only — never body copy
          page: '#F6F7F9', // page background
          card: '#FFFFFF', // card surface
          line: '#E5E7EB', // hairline border
          strong: '#D1D5DB', // emphasised border
          soften: '#F1F3F5', // muted fill / alternating surface
        },

        // Orange accent — used sparingly: badges, highlight numbers, one CTA.
        accent: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF7A00',
          600: '#E56A00',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
          DEFAULT: '#FF7A00',
          light: '#FF9A3D',
          dark: '#E56A00',
          soft: '#FFEDD5',
        },

        // Status colours shared by both surfaces.
        status: {
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#0EA5E9',
        },
      },

      borderRadius: {
        xl: '16px',
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '28px',
      },

      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)',
        lift: '0 8px 24px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15, 23, 42, 0.05)',
        glow: '0 10px 30px rgba(22, 163, 74, 0.18)',
      },

      maxWidth: {
        prose: '65ch',
      },

      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },

      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};
