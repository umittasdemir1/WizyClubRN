/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink: "#15213A",
                mist: "#F7FAFC",
                line: "#D9E4F4",
                panel: "#FFFFFF",
                brand: "#246BFD",
                brandSoft: "#E9F0FF",
                success: "#1FA971",
                warning: "#F2B13F",
                danger: "#E45858"
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
                display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"]
            },
            borderRadius: {
                panel: "24px",
                pill: "999px"
            },
            boxShadow: {
                panel: "0 20px 60px rgba(36, 62, 128, 0.08)",
                soft: "0 10px 30px rgba(36, 62, 128, 0.06)"
            },
            backgroundImage: {
                "hero-glow": "radial-gradient(circle at top left, rgba(36, 107, 253, 0.16), transparent 45%), radial-gradient(circle at bottom right, rgba(31, 169, 113, 0.12), transparent 35%)"
            }
        }
    },
    plugins: []
};
