/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Modern Indian Government portal design system
        gov: {
          green: {
            deep: '#166534',     // Primary deep green
            medium: '#15803D',   // Secondary green
            light: '#DCFCE7',    // Light green
          },
          text: {
            main: '#1E293B',     // Main text
            muted: '#64748B',    // Muted text
          },
          bg: '#F8FAFC',         // Background
          border: '#E2E8F0',     // Borders
          surface: '#FFFFFF',    // Surface/cards
        },
        status: {
          success: '#16A34A',    // Success / Accepted / Paid
          pending: '#D97706',    // Pending / Waiting
          info: '#2563EB',       // Processing / Information
          error: '#DC2626',      // Error / Rejected
        },
        // Legacy color compatibility mapping to avoid breaking existing pages immediately
        soil: {
          50: '#F8FAFC',
          100: '#E2E8F0',
          500: '#64748B',
          700: '#475569',
          900: '#1E293B',
        },
        leaf: {
          50: '#DCFCE7',
          400: '#86EFAC',
          500: '#166534',
          600: '#15803D',
        },
        wheat: {
          400: '#FBBF24',
          500: '#D97706',
        },
        alert: {
          500: '#DC2626',
        },
      },
      fontFamily: {
        display: ['"Inter"', 'sans-serif'], // Respectful, professional, clean sans font
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
