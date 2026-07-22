import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { ChevronDown, Languages } from "lucide-react";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";

const LanguageSelector = ({ isMobile = false }) => {
    const { language, setLanguage, t } = useLanguage();
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const languages = [
        { code: "en", name: "English", nativeName: "English", flag: "flag-icon flag-icon-us" },
        { code: "ar", name: "Arabic", nativeName: "العربية", flag: "flag-icon flag-icon-eg" },
    ];

    const handleLanguageChange = (newLanguage) => {
        setLanguage(newLanguage);
        setIsOpen(false);
    };

    const currentLang = languages.find((l) => l.code === language) || languages[0];

    return (
        <div className={`relative ${isMobile ? "w-full" : ""}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={isMobile ? { color: tokens.colors.text, backgroundColor: "transparent" } : {
                    backgroundColor: tokens.colors.surface,
                    color: tokens.colors.text,
                    borderColor: tokens.colors.border,
                }}
                className={`flex items-center transition-all cursor-pointer ${isMobile
                    ? "w-full justify-between px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold active:scale-[0.98]"
                    : "gap-1.5 px-2 py-1.5 rounded-lg border-2 hover:opacity-80"
                    }`}
            >
                <div className="flex items-center gap-2">
                    <Languages size={isMobile ? 22 : 18} />
                    <span className={!isMobile ? "font-medium text-sm" : ""}>{currentLang.nativeName}</span>
                </div>
                <ChevronDown
                    size={isMobile ? 20 : 16}
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <div
                    style={{
                        backgroundColor: tokens.colors.surface,
                        borderColor: tokens.colors.border,
                        boxShadow: tokens.shadows.lg,
                    }}
                    className={`absolute mt-2 rounded-xl border-2 overflow-hidden z-50 ${isMobile ? "left-0 w-full" : "right-0 w-60"}`}
                >
                    <div
                        style={{
                            backgroundColor: tokens.colors.primary + "10",
                            borderBottomColor: tokens.colors.border,
                        }}
                        className="px-4 py-2 border-b"
                    >
                        <p style={{ color: tokens.colors.text }} className="text-xs font-semibold">
                            {t("nav.selectLanguage") || "Select Language"}
                        </p>
                    </div>

                    <div className="max-h-64" style={{ overflowY: "auto" }}>
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                style={{
                                    backgroundColor: language === lang.code
                                        ? tokens.colors.primary + "15"
                                        : "transparent",
                                    color: tokens.colors.text,
                                }}
                                className="w-full px-4 py-2.5 hover:opacity-80 transition-all cursor-pointer flex items-center justify-between gap-2"
                            >
                                <div className={`min-w-0 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                    <p className="font-semibold text-sm leading-tight">{lang.nativeName}</p>
                                    <p
                                        style={{ color: tokens.colors.textSub }}
                                        className="text-xs leading-tight"
                                    >
                                        {lang.name}
                                    </p>
                                </div>
                                <span className={`${lang.flag} rounded-sm shadow-sm`}></span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageSelector;
