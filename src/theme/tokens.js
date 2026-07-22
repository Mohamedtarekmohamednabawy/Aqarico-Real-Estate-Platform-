export const designTokens = {
    light: {
        name: "light",
        colors: {
            primary: "#b45309", // premium amber action
            secondary: "#d97706", // brighter amber
            accent: "#14532d", // deep Egyptian green accent
            bg: "#faf7ef", // warm limestone background
            surface: "#fffaf0", // polished ivory cards
            surfaceElevated: "#ffffff",
            surfaceGlass: "rgba(255, 250, 240, 0.78)",
            text: "#261409", // espresso text
            textSub: "#76533a", // muted bronze-brown
            border: "#eadcc5", // limestone border
            borderStrong: "#d7b98c",
            gold: "#c89b3c",
            emerald: "#0f766e",
            shadow: "rgba(69, 42, 16, 0.12)",
            gradientFrom: "#b45309",
            gradientTo: "#14532d",
        },
        typography: {
            fontFamily: "'Cairo', sans-serif",
            headings: {
                h1: "2.5rem",
                h2: "2rem",
                h3: "1.75rem",
                h4: "1.5rem",
                h5: "1.25rem",
                h6: "1rem",
            },
            body: "1rem",
            small: "0.875rem",
            weight: { regular: 400, medium: 500, bold: 700 },
        },
        spacing: {
            xs: "0.25rem",
            sm: "0.5rem",
            md: "1rem",
            lg: "1.5rem",
            xl: "2rem",
            xxl: "4rem",
        },
        borderRadius: {
            sm: "0.25rem",
            md: "0.5rem",
            lg: "1rem",
            xl: "2rem",
            full: "9999px",
        },
        shadows: {
            sm: "0 2px 8px rgba(69,42,16,0.06)",
            md: "0 14px 34px rgba(69,42,16,0.10)",
            lg: "0 26px 70px rgba(69,42,16,0.16)",
            glow: "0 18px 44px rgba(180,83,9,0.22)",
        },
        breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    },

    dark: {
        name: "dark",
        colors: {
            primary: "#f59e0b", // bright premium amber
            secondary: "#d97706", // deeper amber
            accent: "#5eead4", // luminous teal accent
            bg: "#14100c", // deep espresso background
            surface: "#211914", // warm dark surface
            surfaceElevated: "#2b211a",
            surfaceGlass: "rgba(33, 25, 20, 0.76)",
            text: "#fff8ec", // ivory text
            textSub: "#d6b895", // muted sand text
            border: "#4a3524", // warm dark border
            borderStrong: "#7c5a36",
            gold: "#eab75b",
            emerald: "#5eead4",
            shadow: "rgba(0, 0, 0, 0.55)", // deeper shadow for dark mode
            gradientFrom: "#f59e0b",
            gradientTo: "#5eead4",
        },
        typography: {
            fontFamily: "'Cairo', sans-serif",
            headings: {
                h1: "2.5rem",
                h2: "2rem",
                h3: "1.75rem",
                h4: "1.5rem",
                h5: "1.25rem",
                h6: "1rem",
            },
            body: "1rem",
            small: "0.875rem",
            weight: { regular: 400, medium: 500, bold: 700 },
        },
        spacing: {
            xs: "0.25rem",
            sm: "0.5rem",
            md: "1rem",
            lg: "1.5rem",
            xl: "2rem",
            xxl: "4rem",
        },
        borderRadius: {
            sm: "0.25rem",
            md: "0.5rem",
            lg: "1rem",
            xl: "2rem",
            full: "9999px",
        },
        shadows: {
            sm: "0 2px 8px rgba(0,0,0,0.22)",
            md: "0 16px 38px rgba(0,0,0,0.32)",
            lg: "0 28px 80px rgba(0,0,0,0.48)",
            glow: "0 18px 44px rgba(245,158,11,0.20)",
        },
        breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    },
};
