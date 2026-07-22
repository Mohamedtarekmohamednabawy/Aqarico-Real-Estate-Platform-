import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { useLanguage } from "../i18n/LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import { designTokens } from "../theme/tokens";
import { districts, amenitiesList, locationCoordinates, districtLocations } from "../data/propertyData";
import StyledNumberInput from "./StyledNumberInput";
import { Trash, Upload, AlertTriangle } from "lucide-react";
import LocationPicker from "./LocationPicker";
import { dataManager } from "../data/dataManager";
import Swal from "sweetalert2";

// ── Shared price/m² warning banner (used under both price and area fields) ─
const LEVEL_KEYS = { 1: "level1", 2: "level2", 3: "level3", 4: "level4" };

const PriceWarningBanner = ({ warning, styles, t, formData }) => {
    const s = styles[warning.level];
    const locName = t(`locations.${formData.location}`, formData.location);
    const dirKey = warning.direction === "high" ? "directionHigh" : "directionLow";
    return (
        <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 mt-2 px-3 py-2.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
        >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
                {t(`listingForm.warnings.${LEVEL_KEYS[warning.level]}`, {
                    direction: t(`listingForm.warnings.${dirKey}`),
                    diff: warning.diff ?? 0,
                    location: locName,
                    avg: (warning.avg ?? 0).toLocaleString(),
                    ppm2: (warning.ppm2 ?? 0).toLocaleString(),
                })}
            </span>
        </motion.div>
    );
};

const ListingForm = ({ initialData, onSubmit, isEditMode = false }) => {
    const { themeName } = useTheme();
    const { t } = useLanguage();
    const { getStep, currency, convertToEGP, convertPrice } = useCurrency();
    const tokens = designTokens[themeName];

    const MAX_TITLE_LENGTH = 50;
    const MAX_DESCRIPTION_LENGTH = 500;

    const defaultFormData = {
        title: "",
        price: "",
        location: "",
        district: "",
        type: "",
        bedrooms: "",
        bathrooms: "",
        area: "",
        description: "",
        amenities: [],
        images: [],
        coordinates: null,
        yearBuilt: "",
        floor: "",
        finish: "",
    };

    // ── Draft persistence: survives theme toggles / accidental remounts ──
    const DRAFT_KEY = "listingFormDraft";

    const [formData, setFormData] = useState(() => {
        if (initialData) return defaultFormData; // edit mode — don't restore draft
        try {
            const saved = sessionStorage.getItem(DRAFT_KEY);
            return saved ? JSON.parse(saved) : defaultFormData;
        } catch {
            return defaultFormData;
        }
    });
    const [errors, setErrors] = useState({});
    const [imageError, setImageError] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // ── Market stats: same source as MarketDashboard ───────────────────
    const [marketStats, setMarketStats] = useState(null);
    useEffect(() => {
        dataManager.getMarketStats({ type: "sale" })
            .then(data => setMarketStats(data))
            .catch(() => { });
    }, []);

    // Auto-save draft to sessionStorage (new listing only, not edit mode)
    useEffect(() => {
        if (!initialData) {
            try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData)); } catch { }
        }
    }, [formData]);

    // ── Price/m² warning system ────────────────────────────────────────
    // Levels (applied symmetrically for both above and below market):
    //   1 = low      : 10–25%  off → soft info banner
    //   2 = medium   : 25–50%  off → yellow caution banner
    //   3 = high     : 50–80%  off → orange warning banner + Swal on submit
    //   4 = extreme  : >80%    off → red danger banner  + blocking Swal on submit

    const locationBenchmark = (() => {
        if (!marketStats || !formData.location) return null;
        for (const district of marketStats.districts) {
            const loc = district.locations.find(l => l.name === formData.location);
            if (loc && loc.avg_price_per_m2) {
                return { avg: loc.avg_price_per_m2 };
            }
        }
        return null;
    })();

    const getPpm2Level = (diff) => {
        if (diff < 10) return 0; // within normal range — no warning
        if (diff < 25) return 1;
        if (diff < 50) return 2;
        if (diff < 80) return 3;
        return 4;
    };

    const pricePerM2Warning = (() => {
        if (!locationBenchmark) return null;
        const area = Number(formData.area);
        const priceInEGP = formData.price ? convertToEGP(Number(formData.price)) : 0;
        if (!area || area <= 0 || !priceInEGP || priceInEGP <= 0) return null;
        const ppm2 = priceInEGP / area;
        const avg = locationBenchmark.avg;
        const rawDiff = Math.abs(ppm2 - avg) / avg * 100;
        const diff = Math.round(rawDiff);
        const level = getPpm2Level(diff);
        if (level === 0) return null;
        return {
            direction: ppm2 > avg ? "high" : "low",
            diff,
            level,
            avg,
            ppm2: Math.round(ppm2),
        };
    })();

    // Styling map per level
    const WARNING_STYLES = {
        1: { bg: "#EFF6FF", color: "#1E40AF", border: "#93C5FD", icon: "info" },
        2: { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D", icon: "warning" },
        3: { bg: "#FFF7ED", color: "#9A3412", border: "#FB923C", icon: "warning" },
        4: { bg: "#FEE2E2", color: "#991B1B", border: "#FCA5A5", icon: "error" },
    };

    useEffect(() => {
        if (initialData) {
            const rawPrice = initialData.price === undefined || initialData.price === null
                ? ""
                : String(initialData.price).replace(/,/g, "").trim();

            // Auto-sync coordinates if location is provided but coordinates aren't
            let finalCoordinates = initialData.coordinates || null;
            if (initialData.location && !finalCoordinates && locationCoordinates[initialData.location]) {
                finalCoordinates = locationCoordinates[initialData.location];
            }

            setFormData({
                ...defaultFormData,
                ...initialData,
                price: rawPrice ? String(convertPrice(Number(rawPrice))) : "",
                yearBuilt: initialData.yearBuilt || initialData.year_built || initialData.year || "",
                amenities: initialData.amenities || [],
                images: initialData.images || (initialData.imageUrl ? [initialData.imageUrl] : []),
                coordinates: finalCoordinates,
            });
        }
    }, [initialData]);

    // Locations available for the currently selected district.
    // Empty string district means no district chosen yet → location locked.
    const availableLocations = formData.district
        ? (districtLocations[formData.district] || [])
        : [];

    const handleKeyDown = (e) => {
        if (e.key === "Enter") e.preventDefault();
    };

    const handleChange = (e) => {
        const { name, value, type, max } = e.target;
        let val = value;

        if (type === "number" && max && Number(val) > Number(max)) val = max;
        if (name === "title" && val.length > MAX_TITLE_LENGTH) val = val.slice(0, MAX_TITLE_LENGTH);
        if (name === "description" && val.length > MAX_DESCRIPTION_LENGTH) val = val.slice(0, MAX_DESCRIPTION_LENGTH);

        // When district changes → reset location and coordinates
        if (name === "district") {
            setFormData({
                ...formData,
                district: val,
                location: "",
                coordinates: null,
            });
            if (errors.district) setErrors({ ...errors, district: null, location: null });
            return;
        }

        // When location changes → auto-set coordinates from map
        if (name === "location" && val && locationCoordinates[val]) {
            setFormData({
                ...formData,
                location: val,
                coordinates: locationCoordinates[val],
            });
            if (errors.location) setErrors({ ...errors, location: null, coordinates: null });
            return;
        }

        setFormData({ ...formData, [name]: val });
        if (errors[name]) setErrors({ ...errors, [name]: null });
    };

    const MAX_IMAGES = 10;

    const processFiles = (files) => {
        const fileList = Array.from(files);
        if (fileList.length > 0) {
            const newImages = [];
            let processedCount = 0;

            fileList.forEach(file => {
                if (!file.type.startsWith("image/")) {
                    processedCount++;
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                    const imageData = reader.result;
                    const isDuplicate = formData.images.some(img => img === imageData);
                    if (!isDuplicate) newImages.push(imageData);
                    processedCount++;
                    if (processedCount === fileList.length) {
                        setFormData(prev => {
                            const merged = [...prev.images, ...newImages].slice(0, MAX_IMAGES);
                            const wouldExceed = prev.images.length + newImages.length > MAX_IMAGES;
                            if (wouldExceed) setImageError(true);
                            return { ...prev, images: merged };
                        });
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleImageFileChange = (e) => {
        processFiles(e.target.files);
        e.target.value = "";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    };

    const handleDeleteImage = (index) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        setFormData({ ...formData, images: newImages });
        if (newImages.length < MAX_IMAGES) setImageError(false);
    };

    const handleAmenityToggle = (amenity) => {
        const currentAmenities = formData.amenities;
        const newAmenities = currentAmenities.includes(amenity)
            ? currentAmenities.filter((a) => a !== amenity)
            : [...currentAmenities, amenity];
        setFormData({ ...formData, amenities: newAmenities });
    };

    const handleClearAmenities = () => {
        setFormData({ ...formData, amenities: [] });
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title || formData.title.length < 10)
            newErrors.title = t("listingForm.errors.titleLength");
        else if (formData.title.length > MAX_TITLE_LENGTH)
            newErrors.title = t("listingForm.errors.titleMax", { max: MAX_TITLE_LENGTH });

        if (!formData.price || Number(formData.price) <= 0)
            newErrors.price = t("listingForm.errors.priceRequired");

        if (!formData.area || Number(formData.area) <= 0)
            newErrors.area = t("listingForm.errors.areaRequired");

        if (!formData.description || formData.description.length < 25)
            newErrors.description = t("listingForm.errors.descLength");
        else if (formData.description.length > MAX_DESCRIPTION_LENGTH)
            newErrors.description = t("listingForm.errors.descMax", { max: MAX_DESCRIPTION_LENGTH });

        if (!formData.images || formData.images.length === 0)
            newErrors.images = t("listingForm.errors.imagesRequired");

        if (!formData.bedrooms || Number(formData.bedrooms) < 1)
            newErrors.bedrooms = t("listingForm.errors.bedroomsRequired");

        if (!formData.bathrooms || Number(formData.bathrooms) < 1)
            newErrors.bathrooms = t("listingForm.errors.bathroomsRequired");

        if (!formData.district)
            newErrors.district = t("listingForm.errors.districtRequired");

        if (!formData.location)
            newErrors.location = t("listingForm.errors.locationRequired");

        if (!formData.coordinates)
            newErrors.coordinates = t("listingForm.errors.coordinatesRequired");

        if (!formData.yearBuilt || Number(formData.yearBuilt) < 1800 || Number(formData.yearBuilt) > new Date().getFullYear() + 10)
            newErrors.yearBuilt = t("listingForm.errors.yearBuiltInvalid");

        if (formData.floor === "" || formData.floor === null || Number(formData.floor) < 0)
            newErrors.floor = t("listingForm.errors.floorInvalid");

        if (!formData.finish)
            newErrors.finish = t("listingForm.errors.finishRequired");

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        const doSubmit = () => {
            const payload = {
                ...formData,
                price: formData.price === "" ? "" : convertToEGP(Number(formData.price)),
                levelWarning: pricePerM2Warning ? pricePerM2Warning.level : 0,
            };
            try { sessionStorage.removeItem(DRAFT_KEY); } catch { }
            onSubmit(payload);
        };

        // Level 3 & 4: require explicit Swal confirmation before submitting
        if (pricePerM2Warning && pricePerM2Warning.level >= 3) {
            const isExtreme = pricePerM2Warning.level === 4;
            const locName = t(`locations.${formData.location}`, formData.location);
            Swal.fire({
                icon: isExtreme ? "error" : "warning",
                title: isExtreme
                    ? t("listingForm.warnings.swalTitleExtreme")
                    : t("listingForm.warnings.swalTitleHigh"),
                html: `
                    <p style="margin-bottom:12px">${t("listingForm.warnings.swalBody", {
                    direction: pricePerM2Warning.direction === "high"
                        ? t("listingForm.warnings.directionHigh")
                        : t("listingForm.warnings.directionLow"),
                    diff: pricePerM2Warning.diff,
                    location: locName,
                    avg: pricePerM2Warning.avg.toLocaleString(),
                    ppm2: pricePerM2Warning.ppm2.toLocaleString(),
                })}</p>
                    ${isExtreme ? `<p style="font-weight:bold;color:#991B1B">${t("listingForm.warnings.swalExtremeNote")}</p>` : ""}
                `,
                showCancelButton: true,
                confirmButtonText: t("listingForm.warnings.swalConfirm"),
                cancelButtonText: t("listingForm.warnings.swalCancel"),
                confirmButtonColor: isExtreme ? "#DC2626" : "#D97706",
                cancelButtonColor: "#6B7280",
                background: tokens.colors.surface,
                color: tokens.colors.primary,
                reverseButtons: true,
            }).then((result) => {
                if (result.isConfirmed) doSubmit();
            });
            return;
        }

        doSubmit();
    };

    const inputStyle = {
        backgroundColor: tokens.colors.bg,
        color: tokens.colors.text,
        borderColor: tokens.colors.border,
    };

    const disabledStyle = {
        backgroundColor: tokens.colors.bg,
        color: tokens.colors.textSub,
        borderColor: tokens.colors.border,
        opacity: 0.5,
        cursor: "not-allowed",
    };

    return (
        <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onSubmit={handleSubmit}
            noValidate
            style={{ backgroundColor: tokens.colors.surface }}
            className="p-6 md:p-8 rounded-2xl shadow-lg space-y-6"
        >
            {/* Title and Price */}
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.title")}</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        style={{
                            ...inputStyle,
                            borderColor: errors.title ? "red" : tokens.colors.border,
                        }}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
                        placeholder={t("listingForm.placeholders.title")}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {t("listingForm.hints.characters", { count: formData.title.length, max: MAX_TITLE_LENGTH })}
                    </p>
                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.price")} ({t(`currency.${currency}`)})</label>
                    <StyledNumberInput
                        name="price"
                        min={0}
                        max={100000000}
                        step={getStep()}
                        value={formData.price}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        tokens={tokens}
                    />
                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                    {!errors.price && pricePerM2Warning && formData.area && (
                        <PriceWarningBanner warning={pricePerM2Warning} styles={WARNING_STYLES} t={t} formData={formData} />
                    )}
                </div>
            </div>

            {/* District → Location (linked, district first) */}
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.district")}</label>
                    <select
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        style={{
                            ...inputStyle,
                            borderColor: errors.district ? "red" : tokens.colors.border,
                        }}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    >
                        <option value="" disabled>{t("listingForm.placeholders.selectDistrict")}</option>
                        {districts.filter((d) => d !== "All").map((d) => (
                            <option key={d} value={d}>{t("districts." + d, d)}</option>
                        ))}
                    </select>
                    {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        {t("listingForm.labels.location")}
                        {!formData.district && (
                            <span className="ml-2 text-xs font-normal" style={{ color: tokens.colors.textSub }}>
                                {t("listingForm.hints.districtFirst")}
                            </span>
                        )}
                    </label>
                    <select
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        disabled={!formData.district}
                        style={
                            !formData.district
                                ? disabledStyle
                                : {
                                    ...inputStyle,
                                    borderColor: errors.location ? "red" : tokens.colors.border,
                                }
                        }
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    >
                        <option value="" disabled>
                            {formData.district
                                ? t("listingForm.placeholders.selectLocation", { district: t(`districts.${formData.district}`, formData.district) })
                                : t("listingForm.placeholders.selectDistrictFirst")}
                        </option>
                        {availableLocations.map((loc) => (
                            <option key={loc} value={loc}>{t("locations." + loc, loc)}</option>
                        ))}
                    </select>
                    {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                </div>
            </div>

            {/* Map Picker */}
            <div>
                <label className="block text-sm font-medium mb-2">{t("listingForm.labels.mapPin")}</label>
                <LocationPicker
                    onLocationSelect={(coords) => setFormData({ ...formData, coordinates: coords })}
                    initialCoordinates={formData.coordinates}
                />
                {errors.coordinates && <p className="text-red-500 text-xs mt-1">{errors.coordinates}</p>}
            </div>

            {/* Listing Type and Area */}
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.type")}</label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        style={inputStyle}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    >
                        <option value="" disabled>{t("listingForm.placeholders.selectType")}</option>
                        <option value="sale">{t("listingForm.options.sale")}</option>
                        <option value="rent">{t("listingForm.options.rent")}</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.area")}</label>
                    <StyledNumberInput
                        name="area"
                        min={0}
                        step={10}
                        max={1000}
                        value={formData.area}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        tokens={tokens}
                    />
                    {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area}</p>}

                    {!errors.area && pricePerM2Warning && formData.price && (
                        <PriceWarningBanner warning={pricePerM2Warning} styles={WARNING_STYLES} t={t} formData={formData} />
                    )}
                </div>
            </div>

            {/* Bedrooms and Bathrooms */}
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.bedrooms")}</label>
                    <StyledNumberInput
                        name="bedrooms"
                        min={1}
                        max={10}
                        value={formData.bedrooms}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        tokens={tokens}
                    />
                    {errors.bedrooms && <p className="text-red-500 text-xs mt-1">{errors.bedrooms}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.bathrooms")}</label>
                    <StyledNumberInput
                        name="bathrooms"
                        min={1}
                        max={10}
                        value={formData.bathrooms}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        tokens={tokens}
                    />
                    {errors.bathrooms && <p className="text-red-500 text-xs mt-1">{errors.bathrooms}</p>}
                </div>
            </div>

            {/* Additional Details */}
            <div className="grid md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.yearBuilt")}</label>
                    <StyledNumberInput
                        name="yearBuilt"
                        min={1900}
                        max={new Date().getFullYear() + 10}
                        value={formData.yearBuilt}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        tokens={tokens}
                    />
                    {errors.yearBuilt && <p className="text-red-500 text-xs mt-1">{errors.yearBuilt}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.floor")}</label>
                    <StyledNumberInput
                        name="floor"
                        min={0}
                        max={100}
                        value={formData.floor}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        tokens={tokens}
                    />
                    {errors.floor && <p className="text-red-500 text-xs mt-1">{errors.floor}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">{t("listingForm.labels.finish")}</label>
                    <select
                        name="finish"
                        value={formData.finish}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        style={{ ...inputStyle, borderColor: errors.finish ? "red" : tokens.colors.border }}
                        className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
                    >
                        <option value="" disabled>{t("listingForm.placeholders.selectFinish")}</option>
                        <option value="Without Finish">{t("listingForm.options.finish.none")}</option>
                        <option value="Semi Finished">{t("listingForm.options.finish.semi")}</option>
                        <option value="Lux">{t("listingForm.options.finish.lux")}</option>
                        <option value="Super Lux">{t("listingForm.options.finish.super")}</option>
                        <option value="Extra Super Lux">{t("listingForm.options.finish.extra")}</option>
                    </select>
                    {errors.finish && <p className="text-red-500 text-xs mt-1">{errors.finish}</p>}
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium mb-2">{t("listingForm.labels.description")}</label>
                <textarea
                    name="description"
                    rows="4"
                    value={formData.description}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    style={{ ...inputStyle, borderColor: errors.description ? "red" : tokens.colors.border }}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                    {t("listingForm.hints.characters", { count: formData.description.length, max: MAX_DESCRIPTION_LENGTH })}
                </p>
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* Image Section */}
            <div>
                <label className="block text-sm font-medium mb-2">{t("listingForm.labels.images")}</label>

                {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {formData.images.map((img, index) => (
                            <div key={index} className="relative group aspect-video">
                                <img
                                    src={img}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-full object-cover rounded-lg border-2"
                                    style={{ borderColor: tokens.colors.border }}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleDeleteImage(index)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100 cursor-pointer"
                                    title={t("listingForm.actions.deleteImage")}
                                >
                                    <Trash size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageFileChange}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{
                            backgroundColor: isDragging ? tokens.colors.primary + "10" : tokens.colors.bg,
                            borderColor: isDragging ? tokens.colors.primary : (errors.images ? "red" : tokens.colors.border),
                            color: tokens.colors.textSub
                        }}
                        className={`w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition cursor-pointer ${isDragging ? 'scale-[1.02]' : 'hover:opacity-80'}`}
                    >
                        <Upload size={32} className={isDragging ? "animate-bounce" : ""} />
                        <span className="font-medium">{isDragging ? t("listingForm.hints.dragging") : t("listingForm.hints.dragDrop")}</span>
                        <span className="text-xs opacity-70">{t("listingForm.hints.imageSupport")}</span>
                    </button>
                    <p className="text-xs text-gray-500">
                        {t("listingForm.hints.imageMulti")}
                    </p>
                    {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
                    {!errors.images && imageError && (
                        <p className="text-red-500 text-xs mt-1">{t("listingForm.errors.imagesMax", { max: MAX_IMAGES })}</p>
                    )}
                </div>
            </div>

            {/* Amenities Section */}
            <div className="relative">
                <div className="flex items-center mb-4">
                    <label className="block text-sm font-medium">{t("listingForm.labels.amenities")}</label>
                    {formData.amenities.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClearAmenities}
                            style={{
                                backgroundColor: tokens.colors.bg,
                                color: tokens.colors.primary,
                                borderColor: tokens.colors.primary,
                            }}
                            className="absolute right-0 px-3 py-1 text-sm rounded-full border cursor-pointer hover:opacity-80 transition"
                        >
                            {t("listingForm.actions.clearAmenities", { count: formData.amenities.length })}
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {amenitiesList.map((amenity) => (
                        <button
                            key={amenity}
                            type="button"
                            onClick={() => handleAmenityToggle(amenity)}
                            style={{
                                backgroundColor: formData.amenities.includes(amenity)
                                    ? tokens.colors.primary
                                    : tokens.colors.bg,
                                color: formData.amenities.includes(amenity)
                                    ? tokens.colors.surface
                                    : tokens.colors.text,
                                borderColor: formData.amenities.includes(amenity)
                                    ? tokens.colors.primary
                                    : tokens.colors.border,
                            }}
                            className="px-3 py-1.5 rounded-full text-sm border transition-all cursor-pointer hover:opacity-90"
                        >
                            {t("amenities." + amenity, amenity)}
                        </button>
                    ))}
                </div>
                {errors.amenities && <p className="text-red-500 text-xs mt-1">{errors.amenities}</p>}
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                style={{
                    backgroundColor: tokens.colors.primary,
                    color: tokens.colors.surface,
                }}
                className="w-full py-3 rounded-xl font-semibold text-lg hover:opacity-90 transition cursor-pointer"
            >
                {isEditMode ? t("listingForm.actions.update") : t("listingForm.actions.create")}
            </button>
        </motion.form>
    );
};

export default ListingForm;