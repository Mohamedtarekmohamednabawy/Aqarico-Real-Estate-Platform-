import { useEffect, useState } from "react";
import { ThemeContext } from "./ThemeContext";
import { designTokens } from "./tokens";
import authService from "../services/authService";

export const ThemeProvider = ({ children }) => {
    const [themeName, setThemeName] = useState(() => {
        const user = authService.getCurrentUser();
        if (user && user.theme) return user.theme;
        return localStorage.getItem("theme") || "dark";
    });

    useEffect(() => {
        const handleUserChange = () => {
            const user = authService.getCurrentUser();
            if (user && user.theme) {
                setThemeName(user.theme);
            }
        };

        window.addEventListener('userChanged', handleUserChange);
        return () => window.removeEventListener('userChanged', handleUserChange);
    }, []);

    useEffect(() => {
        const colors = designTokens[themeName]?.colors || designTokens.light.colors;
        // ... set properties ...
        document.documentElement.style.setProperty("--bg-color", colors.bg);
        document.documentElement.style.setProperty("--primary-color", colors.primary);
        document.documentElement.style.setProperty("--secondary-color", colors.secondary);
        document.documentElement.style.setProperty("--surface-color", colors.surface);
        document.documentElement.style.setProperty(
            "--surface-glass",
            colors.surfaceGlass || colors.surface
        );
        document.documentElement.style.setProperty("--text-color", colors.text);
        document.documentElement.style.setProperty("--text-sub-color", colors.textSub);
        document.documentElement.style.setProperty("--border-color", colors.border);
        document.documentElement.style.setProperty(
            "--gold-color",
            colors.gold || colors.primary
        );
        document.documentElement.style.setProperty("--accent-color", colors.accent);

        document.documentElement.style.setProperty(
            "--scrollbar-handle",
            colors.textSub
        );
        document.documentElement.style.setProperty(
            "--scrollbar-track",
            colors.surface
        );

        document.documentElement.style.setProperty(
            "--title-gradient-from",
            colors.gradientFrom
        );
        document.documentElement.style.setProperty(
            "--title-gradient-to",
            colors.gradientTo
        );

        document.documentElement.classList.toggle(
            "dark",
            themeName === "dark"
        );

        localStorage.setItem("theme", themeName);
    }, [themeName]);

    const toggleTheme = () => {
        const newTheme = themeName === "light" ? "dark" : "light";
        setThemeName(newTheme);

        if (authService.isLoggedIn()) {
            authService.updateSettings({ theme: newTheme }).catch(err => {
                console.error("Failed to sync theme to backend:", err);
            });
        }
    };

    // Set a specific theme
    const setTheme = (name) => {
        if (
            (name === "light" || name === "dark") &&
            name !== themeName
        ) {
            setThemeName(name);
        }
    };

    return (
        <ThemeContext.Provider
            value={{
                themeName,
                toggleTheme,
                setTheme,
                tokens: designTokens[themeName] || designTokens.light,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};