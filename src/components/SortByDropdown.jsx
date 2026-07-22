import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { useLanguage } from "../i18n/LanguageContext";

const SortByDropdown = ({ sortBy, setSortBy }) => {
    const { themeName } = useTheme();
    const { t } = useLanguage();
    const tokens = designTokens[themeName];
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const sortOptions = [
        { value: "default", label: t("sort.default") },
        { value: "newest", label: t("sort.newest") },
        { value: "price-low", label: t("sort.price-low") },
        { value: "price-high", label: t("sort.price-high") },
        { value: "area-small", label: t("sort.area-small") },
        { value: "area-large", label: t("sort.area-large") },
        { value: "most-viewed", label: t("sort.most-viewed") },
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentLabel = sortOptions.find((opt) => opt.value === sortBy)?.label || t("sort.default");

    return (
        <div className="relative" ref={dropdownRef} style={{ zIndex: isOpen ? 50 : 0 }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    backgroundColor: tokens.colors.surface,
                    color: tokens.colors.text,
                    borderColor: tokens.colors.border,
                }}
                className="px-3 py-2.5 rounded-lg border-2 flex items-center gap-2 hover:opacity-80 transition-all cursor-pointer text-sm"
            >
                <ArrowUpDown size={16} style={{ color: tokens.colors.textSub }} />
                <span className="font-medium">
                    {currentLabel}
                </span>
                {isOpen ? (
                    <ChevronUp size={18} style={{ color: tokens.colors.textSub }} />
                ) : (
                    <ChevronDown size={18} style={{ color: tokens.colors.textSub }} />
                )}
            </button>

            {isOpen && (
                <div
                    style={{
                        backgroundColor: tokens.colors.surface,
                        boxShadow: tokens.shadows.lg,
                        borderColor: tokens.colors.border,
                    }}
                    className="absolute top-full right-0 mt-2 rounded-lg border z-50 overflow-hidden min-w-[160px]"
                >
                    {sortOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                setSortBy(option.value);
                                setIsOpen(false);
                            }}
                            style={{
                                backgroundColor:
                                    sortBy === option.value
                                        ? tokens.colors.primary + "20"
                                        : tokens.colors.surface,
                                color: tokens.colors.text,
                            }}
                            className="w-full px-3 py-2.5 text-left text-sm hover:opacity-80 transition-all border-b last:border-b-0 cursor-pointer font-medium"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SortByDropdown;
