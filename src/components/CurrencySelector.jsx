import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { ChevronDown, DollarSign } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";

const CurrencySelector = ({ isMobile = false }) => {
    const { currency, setCurrency, currencies } = useCurrency();
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCurrencyChange = (newCurrency) => {
        setCurrency(newCurrency);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${isMobile ? "w-full" : ""}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={isMobile ? { color: tokens.colors.text, backgroundColor: "transparent" } : {
                    backgroundColor: tokens.colors.surface,
                    color: tokens.colors.text,
                    borderColor: tokens.colors.border,
                }}
                onMouseEnter={isMobile ? (e) => {
                    e.currentTarget.style.backgroundColor = tokens.colors.primary + "15";
                    e.currentTarget.style.color = tokens.colors.primary;
                    e.currentTarget.style.transform = "translateX(4px)";
                } : undefined}
                onMouseLeave={isMobile ? (e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = tokens.colors.text;
                    e.currentTarget.style.transform = "translateX(0)";
                } : undefined}
                className={`flex items-center transition-all cursor-pointer ${isMobile
                    ? "w-full justify-between px-5 py-3.5 rounded-xl text-[1.05rem] font-semibold active:scale-[0.98]"
                    : "gap-1.5 px-2 py-1.5 rounded-lg border-2 hover:opacity-80"
                    }`}
            >
                <div className="flex items-center gap-2">
                    <DollarSign size={isMobile ? 22 : 18} />
                    <span className={!isMobile ? "font-medium text-sm" : ""}>{currency}</span>
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
                            {t("currency.select")}
                        </p>
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className="max-h-64"
                        style={{ overflowY: "auto" }}
                    >
                        {Object.entries(currencies).map(([code, data]) => (
                            <button
                                key={code}
                                onClick={() => handleCurrencyChange(code)}
                                style={{
                                    backgroundColor: currency === code
                                        ? tokens.colors.primary + "15"
                                        : "transparent",
                                    color: tokens.colors.text,
                                }}
                                className="w-full px-4 py-2.5 hover:opacity-80 transition-all cursor-pointer flex items-center justify-between gap-2"
                            >
                                {/* LEFT — code on top, translated name below */}
                                <div className={`min-w-0 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                    <p className="font-semibold text-sm leading-tight">{code}</p>
                                    <p
                                        style={{ color: tokens.colors.textSub }}
                                        className="text-xs leading-tight truncate"
                                        dir="auto"
                                    >
                                        {t(`currency.${code}`)}
                                    </p>
                                </div>

                                {/* RIGHT — symbol pinned */}
                                <span
                                    style={{
                                        color: currency === code
                                            ? tokens.colors.primary
                                            : tokens.colors.textSub,
                                    }}
                                    className="font-bold text-sm shrink-0"
                                >
                                    {data.symbol}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurrencySelector;