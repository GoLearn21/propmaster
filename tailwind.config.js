/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				// ============================================
				// TITANIUM PRECISION DESIGN SYSTEM
				// ============================================

				// Ceramic Surface Palette (not pure white)
				surface: {
					primary: '#FAFAFA',      // Main background
					secondary: '#F5F5F7',    // Cards, elevated surfaces
					tertiary: '#FFFFFF',     // Input fields, modals
				},

				// Text Colors (Never pure black - use Midnight Navy)
				text: {
					primary: '#1A1D2E',      // Midnight Navy - headings
					secondary: '#4A4D5E',    // Body text
					tertiary: '#6B7280',     // Captions, hints
					muted: '#9CA3AF',        // Disabled, placeholders
				},

				// MasterKey Brand Colors
				primary: {
					DEFAULT: '#20B2AA',      // MasterKey Teal
					dark: '#1A8D87',
					light: '#4DD4CC',
					foreground: '#FFFFFF',
				},

				// Accent Colors
				accent: {
					green: '#00CC66',        // Success, Primary CTAs
					'green-hover': '#00B359',
					pink: '#EF4A81',         // Alerts, warnings
					gold: '#FFC107',         // Attention
					DEFAULT: '#00CC66',
					foreground: '#FFFFFF',
				},

				// Status Jewel Colors (for pill badges with glowing dots)
				status: {
					success: '#10B981',
					'success-bg': '#ECFDF5',
					warning: '#F59E0B',
					'warning-bg': '#FFFBEB',
					error: '#EF4444',
					'error-bg': '#FEF2F2',
					info: '#3B82F6',
					'info-bg': '#EFF6FF',
				},

				// Neutral Palette (legacy support + new values)
				neutral: {
					50: '#FAFAFA',
					100: '#F5F5F7',
					200: '#E5E7EB',
					300: '#D1D5DB',
					400: '#9CA3AF',
					500: '#6B7280',
					600: '#4A4D5E',
					700: '#374151',
					800: '#1F2937',
					900: '#1A1D2E',
					black: '#1A1D2E',        // Midnight Navy (not pure black)
					dark: '#4A4D5E',
					medium: '#6B7280',
					light: '#E5E7EB',
					lighter: '#F5F5F7',
					lightest: '#FAFAFA',
					white: '#FFFFFF',
				},

				// Dark Mode Surface Colors
				dark: {
					'surface-primary': '#0F0F11',
					'surface-secondary': '#18181B',
					'surface-tertiary': '#27272A',
					'text-primary': '#FAFAFA',
					'text-secondary': '#A1A1AA',
				},

				// Tailwind-compatible aliases
				border: '#E5E7EB',
				input: '#E5E7EB',
				ring: '#20B2AA',
				background: '#FAFAFA',
				foreground: '#1A1D2E',
				secondary: {
					DEFAULT: '#20B2AA',
					foreground: '#FFFFFF',
				},
				destructive: {
					DEFAULT: '#EF4444',
					foreground: '#FFFFFF',
				},
				muted: {
					DEFAULT: '#F5F5F7',
					foreground: '#6B7280',
				},
				popover: {
					DEFAULT: '#FFFFFF',
					foreground: '#1A1D2E',
				},
				card: {
					DEFAULT: '#FFFFFF',
					foreground: '#1A1D2E',
				},
			},
			fontFamily: {
				sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
				display: ['Inter Display', 'Inter', '-apple-system', 'sans-serif'],
			},
			fontSize: {
				// Typography Scale
				'xs': ['0.75rem', { lineHeight: '1rem' }],         // 12px
				'sm': ['0.875rem', { lineHeight: '1.25rem' }],     // 14px
				'base': ['1rem', { lineHeight: '1.5rem' }],        // 16px
				'lg': ['1.125rem', { lineHeight: '1.75rem' }],     // 18px
				'xl': ['1.25rem', { lineHeight: '1.75rem' }],      // 20px
				'2xl': ['1.5rem', { lineHeight: '2rem' }],         // 24px
				'3xl': ['1.875rem', { lineHeight: '2.25rem' }],    // 30px
				'4xl': ['2.25rem', { lineHeight: '2.5rem' }],      // 36px
				'5xl': ['3rem', { lineHeight: '1' }],              // 48px
				// Legacy heading sizes
				'h1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
				'h2': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
				'h3': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],
				'h4': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
				'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
				'small': ['0.875rem', { fontWeight: '500' }],
				'tiny': ['0.75rem', { fontWeight: '400' }],
			},
			spacing: {
				'18': '4.5rem',    // 72px
				'22': '5.5rem',    // 88px
			},
			borderRadius: {
				'none': '0',
				'sm': '0.5rem',    // 8px - Inputs, badges
				'DEFAULT': '0.75rem', // 12px
				'md': '0.75rem',   // 12px - Small cards
				'lg': '1rem',      // 16px - Standard cards
				'xl': '1.25rem',   // 20px - Hero cards, modals
				'2xl': '1.5rem',   // 24px - Large modals
				'full': '9999px',  // Pills, avatars
			},
			boxShadow: {
				// Ambient Light Shadows (softer, colored base)
				'sm': '0 1px 2px rgba(26, 29, 46, 0.04)',
				'DEFAULT': '0 2px 8px rgba(26, 29, 46, 0.06)',
				'md': '0 4px 12px rgba(26, 29, 46, 0.08)',
				'lg': '0 12px 24px rgba(26, 29, 46, 0.12)',
				'xl': '0 24px 48px rgba(26, 29, 46, 0.16)',
				'2xl': '0 32px 64px rgba(26, 29, 46, 0.20)',
				// Colored shadows for CTAs (glow effect)
				'primary': '0 4px 12px rgba(32, 178, 170, 0.25)',
				'primary-lg': '0 8px 24px rgba(32, 178, 170, 0.30)',
				'success': '0 4px 12px rgba(0, 204, 102, 0.25)',
				'success-lg': '0 8px 24px rgba(0, 204, 102, 0.30)',
				'error': '0 4px 12px rgba(239, 68, 68, 0.25)',
				'error-lg': '0 8px 24px rgba(239, 68, 68, 0.30)',
				'warning': '0 4px 12px rgba(245, 158, 11, 0.25)',
				// Inner shadows for claymorphism
				'inner-sm': 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
				'inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
				// Glass shadows
				'glass': '0 8px 32px rgba(0, 0, 0, 0.08)',
				'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.12)',
				'none': 'none',
			},
			backdropBlur: {
				'xs': '2px',
				'sm': '4px',
				'DEFAULT': '8px',
				'md': '12px',
				'lg': '16px',
				'xl': '24px',
				'2xl': '40px',
				'3xl': '64px',
			},
			backdropSaturate: {
				'125': '1.25',
				'150': '1.50',
				'180': '1.80',
				'200': '2',
			},
			transitionTimingFunction: {
				// Spring physics easing
				'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
				'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
				'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
			},
			transitionDuration: {
				'fast': '150ms',
				'base': '200ms',
				'slow': '300ms',
				'slower': '500ms',
			},
			keyframes: {
				// Accordion animations
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				// Shimmer loading animation
				'shimmer': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' },
				},
				// Pulse for status dots
				'pulse-dot': {
					'0%, 100%': { opacity: '1', transform: 'scale(1)' },
					'50%': { opacity: '0.6', transform: 'scale(0.9)' },
				},
				// Fade in
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				// Fade in up
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				// Slide in from right (for panels)
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' },
				},
				// Slide out to right
				'slide-out-right': {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(100%)' },
				},
				// Scale in (for modals)
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
				// Button press
				'press': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(0.98)' },
					'100%': { transform: 'scale(1)' },
				},
				// Checkmark draw (for payment success)
				'checkmark': {
					'0%': { 'stroke-dashoffset': '100' },
					'100%': { 'stroke-dashoffset': '0' },
				},
				// Sparkline draw
				'sparkline-draw': {
					'0%': { 'stroke-dashoffset': '1000' },
					'100%': { 'stroke-dashoffset': '0' },
				},
				// Spin
				'spin': {
					'0%': { transform: 'rotate(0deg)' },
					'100%': { transform: 'rotate(360deg)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'shimmer': 'shimmer 2s infinite',
				'pulse-dot': 'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'fade-in': 'fade-in 0.2s ease-out',
				'fade-in-up': 'fade-in-up 0.3s ease-out',
				'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'slide-out-right': 'slide-out-right 0.2s ease-in',
				'scale-in': 'scale-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'press': 'press 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'checkmark': 'checkmark 0.6s ease-out forwards',
				'sparkline': 'sparkline-draw 1s ease-out forwards',
				'spin': 'spin 1s linear infinite',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}
