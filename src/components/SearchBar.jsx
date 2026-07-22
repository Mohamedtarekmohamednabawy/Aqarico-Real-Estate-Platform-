import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin, Home, Bed, Bath, Search, Maximize, X, CircleDollarSign, SlidersHorizontal } from "lucide-react";
import { useTheme } from "../theme/useTheme";
import { useCurrency } from "../context/CurrencyContext";
import { designTokens } from "../theme/tokens";
import { districts, locations, priceRanges, areaRanges, districtLocations, floorRanges, yearBuiltRanges } from "../data/propertyData";
import RangeFilterDropdown from "./RangeFilterDropdown";
import { useLanguage } from "../i18n/LanguageContext";
import SelectDropdown from "../components/SelectDropdown";

const DISTRICT_ALL_VALUE = districts[0];
const LOCATION_ALL_VALUE = locations[0];

// ─── SearchBar ────────────────────────────────────────────────────────────
const SearchBar = ({
    tempFilters,
    setTempFilters,
    onApplyFilters,
    onClearFilters,
    defaultMaxPrice = 50000000,
    ALL_LOCATIONS,
    ALL_DISTRICTS,
}) => {
    const { themeName } = useTheme();
    const { language, t } = useLanguage();
    const { currency } = useCurrency();
    const tokens = designTokens[themeName];

    const [filtersOpen, setFiltersOpen] = useState(false);

    const districtAllVal = ALL_DISTRICTS ?? DISTRICT_ALL_VALUE;
    const locationAllVal = ALL_LOCATIONS ?? LOCATION_ALL_VALUE;

    // Count how many filters are actively set (non-default)
    const activeFilterCount = [
        tempFilters.district && tempFilters.district !== districtAllVal,
        tempFilters.location && tempFilters.location !== locationAllVal,
        (tempFilters.minArea > 0) || (tempFilters.maxArea !== undefined && tempFilters.maxArea !== 1000),
        (tempFilters.minBedrooms > 0) || (tempFilters.maxBedrooms !== undefined && tempFilters.maxBedrooms !== 10),
        (tempFilters.minBathrooms > 0) || (tempFilters.maxBathrooms !== undefined && tempFilters.maxBathrooms !== 10),
        (tempFilters.minFloor > 0) || (tempFilters.maxFloor !== undefined && tempFilters.maxFloor !== 20),
        (tempFilters.minYearBuilt > 1900) || (tempFilters.maxYearBuilt !== undefined && tempFilters.maxYearBuilt !== 2036),
        (tempFilters.minPrice > 0) || (tempFilters.maxPrice !== undefined && tempFilters.maxPrice !== defaultMaxPrice),
    ].filter(Boolean).length;

    const rawDistrict = tempFilters.district;
    const selectedDistrict =
        rawDistrict === districtAllVal || rawDistrict === DISTRICT_ALL_VALUE
            ? DISTRICT_ALL_VALUE
            : rawDistrict;

    const hasDistrict =
        selectedDistrict &&
        selectedDistrict !== DISTRICT_ALL_VALUE &&
        !!districtLocations[selectedDistrict];

    const filteredLocations = hasDistrict
        ? [LOCATION_ALL_VALUE, ...(districtLocations[selectedDistrict] || [])]
        : locations;

    const displayLocation =
        tempFilters.location === locationAllVal ||
            tempFilters.location === LOCATION_ALL_VALUE ||
            !tempFilters.location
            ? LOCATION_ALL_VALUE
            : tempFilters.location;

    const districtOptions = districts.map((d) => ({
        value: d,
        label: d === DISTRICT_ALL_VALUE ? t("listing.all") : t("districts." + d, d),
    }));

    const locationOptions = filteredLocations.map((loc) => ({
        value: loc,
        label: loc === LOCATION_ALL_VALUE ? t("listing.allLocations") : t("locations." + loc, loc),
    }));

    return (
        <div
            style={{
                backgroundColor: tokens.colors.surfaceGlass || tokens.colors.surface,
                boxShadow: tokens.shadows.lg,
                borderRadius: "24px",
                border: `1px solid ${tokens.colors.border}`,
                backdropFilter: "blur(18px) saturate(140%)",
            }}
            className="relative z-40 p-4 sm:p-5 mb-5"
        >
            {/* ── Search input + mobile filter toggle ── */}
            <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                    <Search
                        size={18}
                        style={{ color: tokens.colors.textSub }}
                        className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2`}
                    />
                    <input
                        type="text"
                        placeholder={t("listing.searchPlaceholder")}
                        value={tempFilters.searchQuery || ""}
                        onChange={(e) => setTempFilters({ ...tempFilters, searchQuery: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") onApplyFilters(); }}
                        style={{
                            backgroundColor: tokens.colors.bg,
                            color: tokens.colors.text,
                            borderColor: tokens.colors.border,
                        }}
                        className={`premium-focus w-full min-h-12 ${language === "ar" ? "pr-10 pl-10" : "pl-10 pr-10"} py-2.5 rounded-xl border-2 focus:outline-none transition-all text-sm truncate`}
                    />
                    {tempFilters.searchQuery && (
                        <button
                            onClick={() => setTempFilters({ ...tempFilters, searchQuery: "" })}
                            style={{ color: tokens.colors.textSub }}
                            className={`premium-focus absolute ${language === "ar" ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 min-h-8 min-w-8 rounded-full hover:opacity-70 transition-opacity cursor-pointer`}
                            title={t("listing.clearSearch")}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Mobile-only: filter toggle pill */}
                <button
                    onClick={() => setFiltersOpen((o) => !o)}
                    style={{
                        backgroundColor: filtersOpen ? tokens.colors.primary : tokens.colors.bg,
                        color: filtersOpen ? tokens.colors.surface : tokens.colors.text,
                        borderColor: filtersOpen ? tokens.colors.primary : tokens.colors.border,
                    }}
                    className="sm:hidden relative flex-shrink-0 flex items-center gap-1.5 px-3 min-h-12 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all duration-200"
                >
                    <SlidersHorizontal size={16} />
                    <span className="text-xs">{t("listing.filters") ?? "Filters"}</span>
                    {activeFilterCount > 0 && (
                        <span
                            style={{ backgroundColor: filtersOpen ? tokens.colors.surface : tokens.colors.primary, color: filtersOpen ? tokens.colors.primary : tokens.colors.surface }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                        >
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Filters: always visible on sm+, collapsible on mobile ── */}
            <div className={`${filtersOpen ? "block" : "hidden"} sm:block`}>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">

                    {/* District */}
                    <div>
                        <label
                            style={{ color: tokens.colors.textSub }}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] mb-1.5"
                        >
                            <Home size={13} />
                            {t("listing.district")}
                        </label>
                        <SelectDropdown
                            value={selectedDistrict}
                            onChange={(val) => {
                                const districtVal = val === DISTRICT_ALL_VALUE ? districtAllVal : val;
                                setTempFilters({ ...tempFilters, district: districtVal, location: locationAllVal });
                            }}
                            options={districtOptions}
                            tokens={tokens}
                            placeholder={t("listing.all")}
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label
                            style={{ color: tokens.colors.textSub }}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] mb-1.5"
                        >
                            <MapPin size={13} />
                            {t("listing.location")}
                            {hasDistrict && (
                                <span style={{ color: tokens.colors.primary }} className="font-semibold">
                                    ({(districtLocations[selectedDistrict] || []).length})
                                </span>
                            )}
                        </label>
                        <SelectDropdown
                            value={displayLocation}
                            onChange={(val) => {
                                const locationVal = val === LOCATION_ALL_VALUE ? locationAllVal : val;
                                setTempFilters({ ...tempFilters, location: locationVal });
                            }}
                            options={locationOptions}
                            tokens={tokens}
                            placeholder={t("listing.allLocations")}
                        />
                    </div>

                    {/* Area */}
                    <div>
                        <label
                            style={{ color: tokens.colors.textSub }}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] mb-1.5"
                        >
                            <Maximize size={13} />
                            {t("listing.area")} ({t("propertyDetails.area")})
                        </label>
                        <RangeFilterDropdown
                            tempFilters={tempFilters}
                            setTempFilters={setTempFilters}
                            minKey="minArea"
                            maxKey="maxArea"
                            minValue={0}
                            maxValue={1000}
                            step={10}
                            label={t("listing.area")}
                            unit={t("propertyDetails.area")}
                            ranges={areaRanges}
                        />
                    </div>

                    {/* Bedrooms */}
                    <div>
                        <label
                            style={{ color: tokens.colors.textSub }}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] mb-1.5"
                        >
                            <Bed size={13} />
                            {t("listing.bedrooms")}
                        </label>
                        <RangeFilterDropdown
                            tempFilters={tempFilters}
                            setTempFilters={setTempFilters}
                            minKey="minBedrooms"
                            maxKey="maxBedrooms"
                            minValue={0}
                            maxValue={10}
                            step={1}
                            label={t("listing.bedrooms")}
                        />
                    </div>

                    {/* Bathrooms */}
                    <div>
                        <label
                            style={{ color: tokens.colors.textSub }}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] mb-1.5"
                        >
                            <Bath size={13} />
                            {t("listing.bathrooms")}
                        </label>
                        <RangeFilterDropdown
                            tempFilters={tempFilters}
                            setTempFilters={setTempFilters}
                            minKey="minBathrooms"
                            maxKey="maxBathrooms"
                            minValue={0}
                            maxValue={10}
                            step={1}
                            label={t("listing.bathrooms")}
                        />
                    </div>

                    {/* Floor */}
                    <div>
                        <label
                            style={{ color: tokens.colors.textSub }}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] mb-1.5"
                        >
                            <Home size={13} />
                            {t("listing.floor") || "Floor"}
                        </label>
                        <RangeFilterDropdown
                            tempFilters={tempFilters}
                            setTempFilters={setTempFilters}
                            minKey="minFloor"
                            maxKey="maxFloor"
                            minValue={0}
                            maxValue={20}
                            step={1}
                            label={t("listing.floor") || "Floor"}
                            ranges={floorRanges}
                        />
                    </div>

                    {/* Year Built */}
                    <div>
                        <label
                            style={{ color: tokens.colors.textSub }}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] mb-1.5"
                        >
                            <Maximize size={13} />
                            {t("listing.yearBuilt") || "Year Built"}
                        </label>
                        <RangeFilterDropdown
                            tempFilters={tempFilters}
                            setTempFilters={setTempFilters}
                            minKey="minYearBuilt"
                            maxKey="maxYearBuilt"
                            minValue={1900}
                            maxValue={2036}
                            step={1}
                            label={t("listing.yearBuilt") || "Year Built"}
                            ranges={yearBuiltRanges}
                        />
                    </div>

                    {/* Price */}
                    <div className="col-span-2 sm:col-span-1">
                        <label
                            style={{ color: tokens.colors.textSub }}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] mb-1.5"
                        >
                            <CircleDollarSign size={13} />
                            {t("listing.price")} ({currency})
                        </label>
                        <RangeFilterDropdown
                            tempFilters={tempFilters}
                            setTempFilters={setTempFilters}
                            minKey="minPrice"
                            maxKey="maxPrice"
                            minValue={0}
                            maxValue={defaultMaxPrice}
                            defaultMinValue={0}
                            defaultMaxValue={defaultMaxPrice}
                            label={t("listing.price")}
                            isPrice={true}
                            ranges={priceRanges}
                        />
                    </div>
                </div>

                {/* Apply / Clear — inside collapsible so they appear with filters on mobile */}
                <div className="flex gap-2 sm:hidden">
                    <button
                        onClick={() => { onApplyFilters(); setFiltersOpen(false); }}
                        style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                        className="premium-focus flex-1 min-h-11 py-2.5 rounded-xl font-black hover:opacity-90 transition-all duration-300 text-sm cursor-pointer"
                    >
                        {t("listing.applyFilters")}
                    </button>
                    <button
                        onClick={() => { onClearFilters(); setFiltersOpen(false); }}
                        style={{
                            backgroundColor: tokens.colors.bg,
                            color: tokens.colors.text,
                            borderColor: tokens.colors.border,
                        }}
                        className="premium-focus px-5 min-h-11 py-2.5 rounded-xl font-bold border-2 hover:opacity-80 transition-all duration-300 text-sm cursor-pointer"
                    >
                        {t("listing.clear")}
                    </button>
                </div>
            </div>

            {/* Apply / Clear — always visible on sm+ */}
            <div className="hidden sm:flex gap-2">
                <button
                    onClick={onApplyFilters}
                    style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                    className="premium-focus flex-1 min-h-11 py-2.5 rounded-xl font-black hover:opacity-90 transition-all duration-300 text-sm cursor-pointer"
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
                    className="premium-focus px-6 min-h-11 py-2.5 rounded-xl font-bold border-2 hover:opacity-80 transition-all duration-300 text-sm cursor-pointer"
                >
                    {t("listing.clear")}
                </button>
            </div>
        </div>
    );
};

export default SearchBar;