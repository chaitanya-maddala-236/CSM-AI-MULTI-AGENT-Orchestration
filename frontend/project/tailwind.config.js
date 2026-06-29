/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#2563EB", 50: "#EFF6FF", 100: "#DBEAFE", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8" },
        success: { DEFAULT: "#16A34A", light: "#F0FDF4" },
        warning: { DEFAULT: "#D97706", light: "#FFFBEB" },
        danger:  { DEFAULT: "#DC2626", light: "#FEF2F2" },
        surface: "#F8FAFC",
      },
      fontFamily: { sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "sans-serif"] },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-md": "0 4px 16px rgba(0,0,0,0.08)",
        "card-lg": "0 12px 40px rgba(0,0,0,0.12)",
        "inset-sm": "inset 0 1px 2px rgba(0,0,0,0.06)",
      },
      borderRadius: { "2xl": "16px", "3xl": "24px" },
      animation: {
        "slide-up": "slideUp 0.3s ease",
        "fade-in": "fadeIn 0.2s ease",
        "scale-in": "scaleIn 0.2s ease",
      },
      keyframes: {
        slideUp:  { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn:  { from: { opacity: 0, transform: "scale(0.95)" }, to: { opacity: 1, transform: "scale(1)" } },
      },
    }
  },
  plugins: []
}
