/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				kertas: '#F7F5EF',
				kertasdim: '#EDE8D8',
				tinta: '#101828',
				dlh: {
					DEFAULT: '#0E7A3D',
					dark: '#0A5C2E',
					light: '#32D583',
					bg: '#DFF5E6',
				},
				safety: {
					DEFAULT: '#E85D04',
					dark: '#C24E03',
					light: '#FF7A2F',
					bg: '#FDEBD9',
				},
				bata: '#C1272D',
				primary: {
					50: '#ecfdf5',
					100: '#d1fae5',
					500: '#0E7A3D',
					600: '#0A5C2E',
					700: '#084A26',
				},
			},
			fontFamily: {
				display: ['Archivo', '"Plus Jakarta Sans"', 'sans-serif'],
				sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
			},
			boxShadow: {
				hard: '3px 3px 0 0 #101828',
				'hard-sm': '2px 2px 0 0 #101828',
				'hard-dark': '3px 3px 0 0 #000000',
			},
			keyframes: {
				rise: {
					'0%': { opacity: '0', transform: 'translateY(14px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				stamp: {
					'0%': { opacity: '0', transform: 'scale(1.15) rotate(-2deg)' },
					'100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
				},
			},
			animation: {
				rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
				stamp: 'stamp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
			},
		},
	},
	plugins: [],
};
