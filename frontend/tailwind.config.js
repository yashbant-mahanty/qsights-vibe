/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // QSights Official Brand Colors (from logo)
        'qsights-cyan': '#29ABE2',      // Primary - Q magnifying glass (exact logo color)
        'qsights-navy': '#2E3192',      // Secondary - Sights text (exact logo color)
        'qsights-dark': '#1E2A5E',      // Dark Navy variant
        'qsights-light': '#E3F4F8',     // Light cyan background
        // Aliases for backward compatibility
        'qsights-blue': '#29ABE2',      // Maps to cyan
        'qsights-primary': '#2D3E7C',   // Maps to navy
        'qsights-secondary': '#1BB5D3', // Maps to cyan
      },
    },
  },
  plugins: [],
};
