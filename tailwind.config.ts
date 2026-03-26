import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b1020',
        foreground: '#e6ebff',
        surface: '#111831',
        accent: '#7c92ff',
      },
    },
  },
  plugins: [],
};

export default config;
