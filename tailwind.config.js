/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Custom Gradients
        'custom-red-start': '#FF6B6B',
        'custom-red-end': '#FF4757',

        // Brand Gradients (Deals)
        'trendyol-start': '#F97316', 'trendyol-end': '#EF4444',
        'starbucks-start': '#16A34A', 'starbucks-end': '#065F46',
        'nike-start': '#1F2937', 'nike-end': '#000000',
        'getir-start': '#9333EA', 'getir-end': '#4338CA',

        // Story Ring Gradient
        'story-yellow': '#FACC15',
        'story-red': '#EF4444',
        'story-purple': '#9333EA',

        // Profile
        'profile-purple': '#6B21A8',
        'profile-indigo': '#312E81',

        // Sheets
        'sheet-dark': '#18181B',
        'sheet-dark-lighter': '#121212',
        
        // Theme Colors
        'theme-dark': '#262730',
        'theme-light': '#fefefe',

        primary: '#FF3B30',
        accent: '#7C3AED',
        muted: '#94A3B8',
        bg: '#0B0B0F',
        card: '#111827'
      }
    }
  },
  plugins: [],
}
