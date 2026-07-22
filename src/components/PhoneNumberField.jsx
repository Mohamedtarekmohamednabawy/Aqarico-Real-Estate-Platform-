import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { countries, formatPhoneNumber } from "../data/countries";
import { useLanguage } from "../i18n/LanguageContext";

const PhoneNumberField = ({ country, phone, onCountryChange, onPhoneChange, error, label, tokens }) => {
    const { t, language } = useLanguage();
    const isRTL = language === "ar";

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef(null);

    const selectedCountry = countries.find((c) => c.code === country) || countries[0];

    // Fallback label to translated string if not provided
    const resolvedLabel = label ?? t("profile.phone");

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCountries = countries.filter(
        (c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.dial.includes(searchTerm)
    );

    const handlePhoneChange = (e) => {
        const formatted = formatPhoneNumber(e.target.value, selectedCountry.format);
        onPhoneChange({ target: { name: "phone", value: formatted } });
    };

    const useTokens = !!tokens;

    const labelStyle = useTokens ? { color: tokens.colors.text } : {};
    const buttonStyle = useTokens ? {
        backgroundColor: tokens.colors.bg,
        borderColor: error ? "#ef4444" : tokens.colors.border,
        color: tokens.colors.text,
    } : {};
    const inputStyle = useTokens ? {
        backgroundColor: tokens.colors.bg,
        color: tokens.colors.text,
        borderColor: error ? "#ef4444" : tokens.colors.border,
    } : {};

    // RTL-aware border radius classes
    const selectorRadius = isRTL ? "rounded-r-lg" : "rounded-l-lg";
    const inputRadius = isRTL ? "rounded-l-lg" : "rounded-r-lg";

    // Dropdown opens on the correct side in RTL
    const dropdownAlign = isRTL ? "right-0" : "left-0";

    return (
        <div className="w-full min-w-0">
            <label
                className={`block text-sm font-medium mb-2 ${!useTokens ? "text-gray-700" : ""}`}
                style={labelStyle}
            >
                {resolvedLabel}
            </label>

            <div className="relative flex gap-0 w-full min-w-0">
                {/* Country Selector */}
                <div className="relative shrink-0 max-w-[46%] sm:max-w-none" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className={`w-full h-12 px-2.5 sm:px-4 ${selectorRadius} border-2 border-r-0 flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition cursor-pointer ${!useTokens
                            ? `bg-white/70 ${error ? "border-red-600" : "border-black/40"}`
                            : ""
                            }`}
                        style={useTokens ? { ...buttonStyle, borderRight: "none" } : {}}
                    >
                        <span
                            className={`fi fi-${selectedCountry.code.toLowerCase()} shrink-0`}
                            style={{ fontSize: "16px" }}
                        />
                        <span
                            className={`text-xs sm:text-sm font-medium truncate ${!useTokens ? "text-gray-600" : ""}`}
                            style={useTokens ? { color: tokens.colors.textSub } : {}}
                        >
                            {selectedCountry.dial}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} ${!useTokens ? "text-gray-500" : ""}`}
                            style={useTokens ? { color: tokens.colors.textSub } : {}}
                        />
                    </button>

                    {/* Dropdown */}
                    {isOpen && (
                        <div
                            className={`absolute z-50 ${dropdownAlign} top-full mt-1 rounded-lg shadow-2xl max-h-64 overflow-hidden`}
                            style={
                                useTokens
                                    ? {
                                        backgroundColor: tokens.colors.surface,
                                        border: `1px solid ${tokens.colors.border}`,
                                        width: "280px",
                                        maxWidth: "90vw",
                                    }
                                    : {
                                        backgroundColor: "white",
                                        border: "1px solid #e5e7eb",
                                        width: "280px",
                                        maxWidth: "90vw",
                                    }
                            }
                        >
                            {/* Search */}
                            <div
                                className="p-2 sticky top-0"
                                style={
                                    useTokens
                                        ? {
                                            borderBottom: `1px solid ${tokens.colors.border}`,
                                            backgroundColor: tokens.colors.surface,
                                        }
                                        : {
                                            borderBottom: "1px solid #e5e7eb",
                                            backgroundColor: "white",
                                        }
                                }
                            >
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t("agents.verifyModalSubtitle") ? t("common.loading") : "Search country..."}
                                    className="w-full px-3 py-2 rounded-md border focus:outline-none focus:border-blue-500 text-sm"
                                    style={
                                        useTokens
                                            ? {
                                                backgroundColor: tokens.colors.bg,
                                                color: tokens.colors.text,
                                                borderColor: tokens.colors.border,
                                            }
                                            : { borderColor: "#d1d5db" }
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>

                            {/* Country List — always LTR since flags/dials are directionally neutral */}
                            <div className="overflow-y-auto max-h-52">
                                {filteredCountries.length > 0 ? (
                                    filteredCountries.map((c) => (
                                        <button
                                            key={c.code}
                                            type="button"
                                            onClick={() => {
                                                onCountryChange(c.code);
                                                setIsOpen(false);
                                                setSearchTerm("");
                                            }}
                                            className="w-full px-4 py-2.5 flex items-center gap-3 transition cursor-pointer text-left"
                                            style={
                                                useTokens
                                                    ? {
                                                        backgroundColor:
                                                            c.code === country
                                                                ? `${tokens.colors.primary}20`
                                                                : "transparent",
                                                        color: tokens.colors.text,
                                                    }
                                                    : {
                                                        backgroundColor:
                                                            c.code === country ? "#eff6ff" : "transparent",
                                                    }
                                            }
                                            onMouseEnter={(e) => {
                                                if (c.code !== country) {
                                                    e.currentTarget.style.backgroundColor = useTokens
                                                        ? `${tokens.colors.primary}10`
                                                        : "#f3f4f6";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (c.code !== country) {
                                                    e.currentTarget.style.backgroundColor = "transparent";
                                                }
                                            }}
                                        >
                                            <span className={`fi fi-${c.code.toLowerCase()} text-xl`} />
                                            <span
                                                className="flex-1 font-medium text-sm"
                                                style={
                                                    useTokens
                                                        ? { color: tokens.colors.text }
                                                        : { color: "#1f2937" }
                                                }
                                            >
                                                {c.name}
                                            </span>
                                            <span
                                                className="text-sm"
                                                style={
                                                    useTokens
                                                        ? { color: tokens.colors.textSub }
                                                        : { color: "#6b7280" }
                                                }
                                            >
                                                {c.dial}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <div
                                        className="px-4 py-3 text-center text-sm"
                                        style={
                                            useTokens
                                                ? { color: tokens.colors.textSub }
                                                : { color: "#6b7280" }
                                        }
                                    >
                                        {t("agents.notFoundRecord")}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Phone Input — always LTR so digits don't flip */}
                <input
                    id="phone"
                    name="phone"
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={handlePhoneChange}
                    maxLength={selectedCountry.format.length + 1}
                    placeholder={selectedCountry.format.replace(/#/g, "0")}
                    className={`min-w-0 flex-1 h-12 px-3 sm:px-4 ${inputRadius} border-2 focus:outline-none focus:border-orange-500 transition-all ${!useTokens
                        ? `bg-white/70 ${error ? "border-red-600" : "border-black/40"
                        } focus:border-black placeholder-gray-400`
                        : ""
                        }`}
                    style={inputStyle}
                />
            </div>

            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
    );
};

export default PhoneNumberField;