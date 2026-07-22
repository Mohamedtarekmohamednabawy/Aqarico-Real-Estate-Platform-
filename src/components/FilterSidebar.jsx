import { useEffect } from "react";
import { SlidersHorizontal, X, Star, CheckCircle, RefreshCcw, ShieldCheck, ShieldOff } from "lucide-react";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { amenitiesList } from "../data/propertyData";
import { useLanguage } from "../i18n/LanguageContext";

const FilterSidebar = ({ tempFilters, setTempFilters, onApplyFilters, onClearFilters, isOpen, setIsOpen }) => {
    const { themeName } = useTheme();
    const { language, t } = useLanguage();
    const tokens = designTokens[themeName];

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) setIsOpen(false);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [setIsOpen]);

    const handleAmenityToggle = (amenity) => {
        const current = tempFilters.amenities || [];
        const next = current.includes(amenity)
            ? current.filter((a) => a !== amenity)
            : [...current, amenity];
        setTempFilters({ ...tempFilters, amenities: next });
    };

    const clearAmenities = () => setTempFilters({ ...tempFilters, amenities: [] });

    // ── Status toggle button (shared style) ────────────────────────────
    const StatusToggle = ({ id, icon: Icon, label, active, onClick, danger = false, disabled = false }) => {
        const activeColor = danger ? "#ef4444" : tokens.colors.primary;
        const iconBg = disabled
            ? tokens.colors.border + "30"
            : active ? activeColor + "20" : tokens.colors.border + "40";
        const iconColor = disabled ? tokens.colors.textSub : active ? activeColor : tokens.colors.textSub;
        const labelColor = disabled ? tokens.colors.textSub : active ? activeColor : tokens.colors.text;

        return (
            <button
                onClick={onClick}
                disabled={disabled}
                style={{
                    backgroundColor: disabled
                        ? tokens.colors.border + "15"
                        : active ? activeColor + "12" : tokens.colors.bg,
                    borderColor: disabled
                        ? tokens.colors.border
                        : active ? activeColor : tokens.colors.border,
                    opacity: disabled ? 0.45 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                }}
                className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl border-2 transition-all group hover:opacity-90"
            >
                <div
                    style={{ backgroundColor: iconBg, color: iconColor }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                >
                    <Icon size={16} />
                </div>
                <span
                    style={{ color: labelColor }}
                    className="text-xs font-bold uppercase tracking-wider flex-1 text-left"
                >
                    {label}
                </span>
                {active && !disabled && (
                    <CheckCircle size={14} style={{ color: activeColor, flexShrink: 0 }} />
                )}
            </button>
        );
    };

    const SidebarContent = ({ isMobile }) => (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={20} style={{ color: tokens.colors.primary }} />
                    <h3 style={{ color: tokens.colors.text }} className="text-lg font-bold">
                        {t("listing.statusAndAmenities")}
                    </h3>
                </div>
                {isMobile && (
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg hover:opacity-70 transition-colors cursor-pointer"
                    >
                        <X size={20} style={{ color: tokens.colors.text }} />
                    </button>
                )}
            </div>

            {/* Property Status */}
            <div className="mb-8">
                <span
                    style={{ color: tokens.colors.textSub }}
                    className="text-[10px] font-black uppercase tracking-[0.15em] block mb-3 opacity-70"
                >
                    {t("listing.propertyStatus")}
                </span>

                <div className="space-y-2">
                    {/* Verified */}
                    <StatusToggle
                        id="verified"
                        icon={ShieldCheck}
                        label={t("listing.verified")}
                        active={tempFilters.verification === "verified"}
                        onClick={() =>
                            setTempFilters({
                                ...tempFilters,
                                verification: tempFilters.verification === "verified" ? "all" : "verified",
                            })
                        }
                    />

                    {/* Not Verified — disabled when featured is active */}
                    <StatusToggle
                        id="unverified"
                        icon={ShieldOff}
                        label={t("listing.notVerified")}
                        active={tempFilters.verification === "unverified"}
                        danger
                        disabled={tempFilters.isFeatured}
                        onClick={() => {
                            if (tempFilters.isFeatured) return;
                            const goingUnverified = tempFilters.verification !== "unverified";
                            setTempFilters({
                                ...tempFilters,
                                verification: goingUnverified ? "unverified" : "all",
                                isFeatured: goingUnverified ? false : tempFilters.isFeatured,
                            });
                        }}
                    />

                    {/* Featured — clears unverified when selected, disabled while unverified */}
                    <StatusToggle
                        id="featured"
                        icon={Star}
                        label={t("listing.featuredOnly")}
                        active={tempFilters.isFeatured}
                        disabled={tempFilters.verification === "unverified"}
                        onClick={() => {
                            if (tempFilters.verification === "unverified") return;
                            setTempFilters({ ...tempFilters, isFeatured: !tempFilters.isFeatured });
                        }}
                    />
                </div>
            </div>

            {/* Amenities */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3 mt-10 lg:mt-0">
                    <span
                        style={{ color: tokens.colors.textSub }}
                        className="text-[10px] font-black uppercase tracking-[0.15em] opacity-70"
                    >
                        {t("listing.amenities")}
                    </span>
                    {tempFilters.amenities?.length > 0 && (
                        <button
                            onClick={clearAmenities}
                            style={{ color: tokens.colors.primary }}
                            className="text-xs font-bold hover:opacity-70 transition-all cursor-pointer flex items-center gap-1"
                        >
                            <RefreshCcw size={12} className={language === "ar" ? "ms-1" : ""} />
                            {t("listing.reset")} ({tempFilters.amenities.length})
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {amenitiesList.map((amenity) => {
                        const isSelected = tempFilters.amenities?.includes(amenity) || false;
                        return (
                            <button
                                key={amenity}
                                onClick={() => handleAmenityToggle(amenity)}
                                style={
                                    isSelected
                                        ? { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary, color: "#fff" }
                                        : { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border, color: tokens.colors.text }
                                }
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border-2 hover:opacity-80 transition-all cursor-pointer"
                            >
                                {t("amenities." + amenity, amenity)}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Actions */}
            <div
                className="sticky bottom-0 mt-8 pt-6 pb-2 space-y-3"
                style={{ backgroundColor: tokens.colors.surface }}
            >
                <button
                    onClick={() => {
                        onApplyFilters();
                        if (isMobile) setIsOpen(false);
                    }}
                    style={{
                        backgroundColor: tokens.colors.primary,
                        color: tokens.colors.surface,
                        boxShadow: `0 10px 20px -8px ${tokens.colors.primary}60`,
                    }}
                    className="w-full min-h-12 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                    {t("listing.applyFilters")}
                </button>
                <button
                    onClick={onClearFilters}
                    style={{
                        backgroundColor: tokens.colors.bg,
                        color: tokens.colors.text,
                        borderColor: tokens.colors.border,
                    }}
                    className="w-full min-h-12 rounded-2xl font-bold uppercase tracking-widest text-xs border-2 hover:opacity-80 transition-all cursor-pointer"
                >
                    {t("listing.clearAll")}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
                    className="fixed inset-0 z-[10001] lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div
                style={{
                    backgroundColor: tokens.colors.surface,
                    boxShadow: tokens.shadows.md,
                }}
                className={`
                    fixed ${language === "ar" ? "right-0" : "left-0"} top-0 h-full w-80 z-[10002] lg:hidden
                    transition-transform duration-300 overflow-y-auto pt-24
                    ${isOpen ? "translate-x-0" : language === "ar" ? "translate-x-full" : "-translate-x-full"}
                `}
            >
                <SidebarContent isMobile={true} />
            </div>

            {/* Desktop Sidebar */}
            <div
                style={{
                    backgroundColor: tokens.colors.surface,
                    boxShadow: tokens.shadows.md,
                    borderRadius: tokens.borderRadius.lg,
                }}
                className="hidden lg:block sticky top-24 w-full h-auto overflow-y-auto"
            >
                <SidebarContent isMobile={false} />
            </div>
        </>
    );
};

export default FilterSidebar;