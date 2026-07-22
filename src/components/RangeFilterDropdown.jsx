import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { useLanguage } from "../i18n/LanguageContext";
import StyledNumberInput from "./StyledNumberInput";
import { useCurrency } from "../context/CurrencyContext";

const RangeFilterDropdown = ({
    tempFilters,
    setTempFilters,
    minKey,
    maxKey,
    minValue = 0,
    maxValue,
    defaultMinValue,
    defaultMaxValue,
    step = 1,
    formatValue = (v) => v,
    properties,
    propertyKey,
    ranges,
    label,
    unit = "",
    isPrice = false,
}) => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const isRTL = language === "ar";
    const tokens = designTokens[themeName];
    const { convertPrice, convertToEGP, formatPrice, getStep } = useCurrency();

    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    // ── Position dropdown using button's bounding rect ──────────────────
    const updatePosition = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const isMobile = viewportWidth < 640;

        // On mobile use most of the viewport width; on desktop at least 320px
        const dropdownWidth = isMobile
            ? Math.min(viewportWidth - 16, 360)   // 8px margin each side
            : Math.max(rect.width, 320);

        let leftValue;
        if (isMobile) {
            // Center under the button, clamped so it never overflows either edge
            const idealLeft = rect.left + window.scrollX + rect.width / 2 - dropdownWidth / 2;
            const minLeft = 8 + window.scrollX;
            const maxLeft = window.scrollX + viewportWidth - dropdownWidth - 8;
            leftValue = Math.max(minLeft, Math.min(idealLeft, maxLeft));
        } else if (isRTL) {
            // Align right edge of dropdown with right edge of button in RTL
            leftValue = rect.right + window.scrollX - dropdownWidth;
        } else {
            leftValue = rect.left + window.scrollX;
        }

        // Clamp left so it never goes off-screen on desktop either
        const maxLeft = window.scrollX + viewportWidth - dropdownWidth - 8;
        leftValue = Math.max(8 + window.scrollX, Math.min(leftValue, maxLeft));

        setDropdownPos({
            top: rect.bottom + window.scrollY + 6,
            left: leftValue,
            width: dropdownWidth,
        });
    };

    const handleToggle = () => {
        if (!isOpen) updatePosition();
        setIsOpen((prev) => !prev);
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reposition on scroll / resize while open
    useEffect(() => {
        if (!isOpen) return;
        const onScroll = () => updatePosition();
        const onResize = () => updatePosition();
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onResize);
        };
    }, [isOpen]);

    // ── Values ────────────────────────────────────────────────────────────
    const currentMin = tempFilters[minKey] || minValue;
    const currentMax = tempFilters[maxKey] === undefined ? maxValue : tempFilters[maxKey];

    const uiMin = isPrice ? convertPrice(currentMin) : currentMin;
    const uiMax = isPrice ? convertPrice(currentMax) : currentMax;
    const uiRangeMin = isPrice ? convertPrice(minValue) : minValue;
    const uiRangeMax = isPrice ? convertPrice(maxValue) : maxValue;
    const uiStep = isPrice ? getStep() : step;

    const histogramData = useMemo(() => {
        if (!properties || !propertyKey || !ranges) return null;
        const counts = ranges.map((range) =>
            properties.filter((p) => p[propertyKey] >= range.min && p[propertyKey] < range.max).length
        );
        const maxCount = Math.max(...counts, 1);
        return counts.map((count) => ({ count, height: Math.max((count / maxCount) * 100, 5) }));
    }, [properties, propertyKey, ranges]);

    const handleReset = () => {
        setTempFilters({
            ...tempFilters,
            [minKey]: defaultMinValue !== undefined ? defaultMinValue : minValue,
            [maxKey]: defaultMaxValue !== undefined ? defaultMaxValue : maxValue,
        });
    };

    const isModified =
        currentMin !== (defaultMinValue !== undefined ? defaultMinValue : minValue) ||
        currentMax !== (defaultMaxValue !== undefined ? defaultMaxValue : maxValue);

    const sliderStyle = (pct) => {
        const direction = isRTL ? "to left" : "to right";
        return {
            background: `linear-gradient(${direction}, ${tokens.colors.primary} ${pct}%, ${tokens.colors.border} ${pct}%)`,
        };
    };

    // ── Dropdown panel (rendered via portal) ─────────────────────────────
    const dropdownPanel = isOpen && createPortal(
        <>
            {/* Invisible scrim to catch outside clicks on mobile */}
            <style>{`
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 16px; width: 16px;
                    border-radius: 50%;
                    background: ${tokens.colors.primary};
                    cursor: pointer;
                    margin-top: -5px;
                    box-shadow: 0 0 2px rgba(0,0,0,0.3);
                }
                input[type=range]::-moz-range-thumb {
                    height: 16px; width: 16px;
                    border: none; border-radius: 50%;
                    background: ${tokens.colors.primary};
                    cursor: pointer;
                }
                input[type=range]::-webkit-slider-runnable-track {
                    height: 6px; background: transparent; border-radius: 9999px;
                }
                input[type=range]::-moz-range-track {
                    height: 6px; background: transparent; border-radius: 9999px;
                }
                input[type=range] {
                    -webkit-appearance: none;
                    width: 100%; height: 6px;
                    background: transparent; cursor: pointer;
                }
            `}</style>

            <div
                ref={dropdownRef}
                style={{
                    position: "absolute",
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 99999,
                    backgroundColor: tokens.colors.surface,
                    boxShadow: tokens.shadows.lg || "0 10px 40px rgba(0,0,0,0.25)",
                    borderColor: tokens.colors.border,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderRadius: 12,
                    padding: 16,
                }}
            >
                {/* Histogram */}
                {histogramData && (
                    <div className="mb-6">
                        <div className={`flex items-end justify-between h-16 gap-0.5 mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                            {histogramData.map((data, index) => (
                                <div
                                    key={index}
                                    style={{
                                        height: `${data.height}%`,
                                        backgroundColor: tokens.colors.primary + "50",
                                        borderTop: `2px solid ${tokens.colors.primary}`,
                                    }}
                                    className="flex-1 rounded-t transition-all hover:opacity-70 cursor-pointer relative group"
                                    title={`${ranges[index].label}: ${data.count}`}
                                >
                                    <span
                                        style={{
                                            backgroundColor: tokens.colors.surface,
                                            color: tokens.colors.text,
                                            borderColor: tokens.colors.border,
                                        }}
                                        className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border shadow-md z-10"
                                    >
                                        {data.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Min */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label style={{ color: tokens.colors.textSub }} className="text-xs font-medium uppercase tracking-wider">
                                {t("listing.min")} {label}
                            </label>
                            <span style={{ color: tokens.colors.primary }} className="text-xs font-bold">
                                {isPrice ? formatPrice(currentMin) : formatValue(currentMin)}{unit}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={uiRangeMin} max={uiRangeMax} step={uiStep} value={uiMin}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                const egpVal = isPrice ? convertToEGP(val) : val;
                                setTempFilters({ ...tempFilters, [minKey]: egpVal });
                            }}
                            style={sliderStyle(((uiMin - uiRangeMin) / (uiRangeMax - uiRangeMin)) * 100)}
                            className="w-full h-1.5 cursor-pointer mb-3 rounded-full appearance-none"
                        />
                        <StyledNumberInput
                            value={uiMin} min={uiRangeMin} max={uiMax} step={uiStep}
                            placeholder="0" tokens={tokens}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || uiRangeMin;
                                const clamped = Math.max(uiRangeMin, Math.min(val, uiMax));
                                setTempFilters({ ...tempFilters, [minKey]: isPrice ? convertToEGP(clamped) : clamped });
                            }}
                        />
                    </div>

                    {/* Max */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label style={{ color: tokens.colors.textSub }} className="text-xs font-medium uppercase tracking-wider">
                                {t("listing.max")} {label}
                            </label>
                            <span style={{ color: tokens.colors.primary }} className="text-xs font-bold">
                                {currentMax >= maxValue
                                    ? `${isPrice ? formatPrice(maxValue) : formatValue(maxValue)}+`
                                    : (isPrice ? formatPrice(currentMax) : formatValue(currentMax))}{unit}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={uiRangeMin} max={uiRangeMax} step={uiStep} value={uiMax}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setTempFilters({ ...tempFilters, [maxKey]: isPrice ? convertToEGP(val) : val });
                            }}
                            style={sliderStyle(((uiMax - uiRangeMin) / (uiRangeMax - uiRangeMin)) * 100)}
                            className="w-full h-1.5 cursor-pointer mb-3 rounded-full appearance-none"
                        />
                        <StyledNumberInput
                            value={uiMax} min={uiMin} max={uiRangeMax} step={uiStep}
                            placeholder={t("listing.max")} tokens={tokens}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || uiRangeMax;
                                const clamped = Math.max(uiMin, Math.min(val, uiRangeMax));
                                setTempFilters({ ...tempFilters, [maxKey]: isPrice ? convertToEGP(clamped) : clamped });
                            }}
                        />
                    </div>

                    {/* Reset */}
                    {isModified && (
                        <button
                            onClick={handleReset}
                            style={{ color: tokens.colors.primary }}
                            className="w-full py-2 text-xs font-bold uppercase tracking-wider hover:opacity-70 rounded transition-colors cursor-pointer"
                        >
                            {t("listing.resetToDefault")}
                        </button>
                    )}
                </div>
            </div>
        </>,
        document.body
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={handleToggle}
                style={{
                    backgroundColor: tokens.colors.surface,
                    color: tokens.colors.text,
                    borderColor: tokens.colors.border,
                }}
                className="w-full px-3 py-2.5 rounded-lg border-2 flex items-center justify-between hover:opacity-80 transition-all cursor-pointer text-sm"
            >
                <span className="font-medium truncate">
                    {currentMin === minValue && currentMax === maxValue
                        ? t("listing.any")
                        : `${isPrice ? formatPrice(currentMin) : formatValue(currentMin)} - ${currentMax >= maxValue
                            ? `${isPrice ? formatPrice(maxValue) : formatValue(maxValue)}+`
                            : (isPrice ? formatPrice(currentMax) : formatValue(currentMax))
                        }${unit}`}
                </span>
                {isOpen
                    ? <ChevronUp size={18} style={{ color: tokens.colors.textSub }} />
                    : <ChevronDown size={18} style={{ color: tokens.colors.textSub }} />}
            </button>

            {dropdownPanel}
        </div>
    );
};

export default RangeFilterDropdown;