import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b0d10',
        surface: '#13161b',
        primary: '#4ade80',
        warning: '#facc15',
        danger: '#f87171'
      }
    }
  },
  plugins: []
};

export default config;
