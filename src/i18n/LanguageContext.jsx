import React, { createContext, useContext, useState, useEffect } from "react";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import jp from "./locales/jp.json";
import authService from "../services/authService";

const translations = { en, ar, fr, de, jp };

const SUPPORTED_LANGUAGES = ["en", "ar"];

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // 1. Check logged in user
        const user = authService.getCurrentUser();
        if (user && user.language && SUPPORTED_LANGUAGES.includes(user.language))
            return user.language;

        // 2. Check local storage
        const savedLang = localStorage.getItem("app_lang");
        if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) return savedLang;

        // 3. Fall back to navigator
        const langs = navigator.languages?.length
            ? navigator.languages
            : [navigator.language || navigator.userLanguage || "en"];

        if (langs.some(l => l.startsWith("ar"))) return "ar";
        return "en";
    });

    useEffect(() => {
        const handleUserChange = () => {
            const user = authService.getCurrentUser();
            if (
                user &&
                user.language &&
                SUPPORTED_LANGUAGES.includes(user.language) &&
                user.language !== language
            ) {
                setLanguage(user.language);
            }
        };

        window.addEventListener("userChanged", handleUserChange);
        return () => window.removeEventListener("userChanged", handleUserChange);
    }, [language]);

    useEffect(() => {
        localStorage.setItem("app_lang", language);
        const isRTL = language === "ar";
        document.documentElement.dir = isRTL ? "rtl" : "ltr";
        document.documentElement.lang = language;
    }, [language]);

    const changeLanguage = (newLang) => {
        if (!SUPPORTED_LANGUAGES.includes(newLang)) {
            console.warn(`Language "${newLang}" is not supported.`);
            return;
        }
        setLanguage(newLang);
        if (authService.isLoggedIn()) {
            authService.updateSettings({ language: newLang }).catch(err => {
                console.error("Failed to sync language to backend:", err);
            });
        }
    };

    // Translate function: key format "group.key"
    const t = (key, replacements = {}) => {
        const keys = key.split(".");
        let value = translations[language];

        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                // Fallback to English if key is missing in current language
                let fallback = translations["en"];
                for (const fk of keys) {
                    if (fallback && fallback[fk] !== undefined) {
                        fallback = fallback[fk];
                    } else {
                        return key;
                    }
                }
                value = fallback;
                break;
            }
        }

        if (typeof value === "string") {
            // 1. Handle ICU-lite plurals: {count, plural, one {..} other {..}}
            if (value.includes("plural") && replacements.count !== undefined) {
                const pluralRegex = /\{(\w+),\s*plural,\s*one\s*\{(.*?)\}\s*other\s*\{(.*?)\}\}/g;
                value = value.replace(pluralRegex, (match, prop, one, other) => {
                    const count = Number(replacements[prop] ?? replacements.count);
                    return count === 1 ? one : other;
                });
            }

            // 2. Replace {{variable}} or {variable}
            Object.entries(replacements).forEach(([replaceKey, replaceValue]) => {
                const regex = new RegExp(`\\{\\{${replaceKey}\\}\\}|\\{${replaceKey}\\}`, "g");
                value = value.replace(regex, replaceValue);
            });
        }

        return value;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);