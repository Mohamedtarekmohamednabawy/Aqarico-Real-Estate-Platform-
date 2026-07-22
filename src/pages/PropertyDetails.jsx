import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    MapPin,
    Bed,
    Bath,
    Maximize,
    Heart,
    ArrowLeft,
    Check,
    Phone,
    Mail,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    GitCompare,
    Eye,
    Calendar,
    Layers,
    ShieldCheck,
    Star,
    Building2,
    Zap,
    Droplet,
    Shield,
    AlertTriangle,
    Trash2
} from "lucide-react";
import Swal from "sweetalert2";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import UserAvatar from "../components/UserAvatar";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { dataManager } from "../data/dataManager";
import { useCurrency } from "../context/CurrencyContext";
import PropertyMap from "../components/PropertyMap";
import { toggleFavorite, isFavorited as checkIsFavorited } from "../utils/favoritesManager";
import authService from "../services/authService";
import { useComparison } from "../context/ComparisonContext";
import LoadingScreen from "../components/LoadingScreen";
import { useLanguage } from "../i18n/LanguageContext";
import PropertyDetailSkeleton from "../components/skeletons/PropertyDetailSkeleton";
import { displayFormattedPhone } from "../data/countries";
import { optimizeImageUrl } from "../utils/imageUrl";

// ─── Finish key map (outside component — never recreated) ──────────────────
const finishKeyMap = {
    "without finish": "none",
    "semi finished": "semi",
    "lux": "lux",
    "super lux": "super",
    "extra super lux": "extra",
    "furnished": "furnished",
};
const getFinishKey = (finish) => finishKeyMap[finish?.toLowerCase()] ?? finish;

// ─── Boolean amenities ─────────────────────────────────────────────────────
const getBooleanAmenities = (t) => [
    { label: t("common.furnished"), field: "furnished", key: "Furnished" },
    { label: t("common.electricity"), field: "electricityMeter", key: "Electricity Meter" },
    { label: t("common.naturalGas"), field: "naturalGas", key: "Natural Gas" },
    { label: t("common.waterMeter"), field: "waterMeter", key: "Water Meter" },
    { label: t("common.elevator"), field: "elevator", key: "Elevator" },
    { label: t("common.security"), field: "security", key: "Security" },
];

const AMENITY_ICONS = {
    Furnished: Bed,
    "Electricity Meter": Zap,
    "Natural Gas": Zap,
    "Water Meter": Droplet,
    Elevator: Building2,
    Security: Shield,
    Pool: Droplet,
    Garden: MapPin,
    Parking: Building2,
    Gym: Maximize,
    Balcony: Layers,
    "Beach Access": Droplet,
    "Club House": Building2,
    Jacuzzi: Droplet,
};

const getAmenityItems = (property, t) => {
    const items = [];
    const seenKeys = new Set();

    if (Array.isArray(property.amenities)) {
        property.amenities.forEach((amenity) => {
            const trimmed = String(amenity || "").trim();
            if (trimmed && !seenKeys.has(trimmed)) {
                items.push({ label: trimmed, key: trimmed });
                seenKeys.add(trimmed);
            }
        });
    }

    getBooleanAmenities(t).forEach(({ key, field }) => {
        if ((property[field] === true || property[field] === 1) && !seenKeys.has(key)) {
            items.push({ key });
            seenKeys.add(key);
        }
    });

    return items;
};

// ──────────────────────────────────────────────────────────────────────────
const PropertyDetails = () => {
    const { t, language } = useLanguage();
    const isRTL = language === "ar";
    const { id } = useParams();
    const navigate = useNavigate();
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const { formatPrice } = useCurrency();
    const { toggleCompare, isSelected } = useComparison();

    const [property, setProperty] = useState(null);
    const [agent, setAgent] = useState(null);
    const [allProperties, setAllProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavoriteState, setIsFavoriteState] = useState(false);
    const [revealedContact, setRevealedContact] = useState({ phone: false, email: false });

    const loggedInUser = authService.getCurrentUser();
    const isLoggedIn = !!loggedInUser;
    const isAdmin = loggedInUser?.role === 'admin';

    useEffect(() => {
        const controller = new AbortController();
        setRevealedContact({ phone: false, email: false });

        const loadProperty = async () => {
            try {
                const foundProperty = await dataManager.fetchPropertyById(id, { signal: controller.signal });
                if (controller.signal.aborted) return;

                if (foundProperty) {
                    if (!foundProperty.images || !Array.isArray(foundProperty.images) || foundProperty.images.length === 0) {
                        foundProperty.images = foundProperty.imageUrl
                            ? [foundProperty.imageUrl]
                            : ["https://placehold.co/800x600?text=No+Image"];
                    }
                    setProperty(foundProperty);
                    setIsFavoriteState(checkIsFavorited(foundProperty._id || foundProperty.id));

                    if (foundProperty.owner && typeof foundProperty.owner === "object") {
                        setAgent({
                            name: `${foundProperty.owner.firstName || ""} ${foundProperty.owner.lastName || ""}`.trim() || "Unknown Agent",
                            email: foundProperty.owner.email || "agent@aqarico.com",
                            role: t("propertyDetails.ownerRole"),
                            profileImage: foundProperty.owner.avatar || "",
                            phone: foundProperty.phone,
                        });
                    }

                    const result = foundProperty.coordinates?.lat
                        ? await dataManager.fetchProperties(
                            {
                                lat: foundProperty.coordinates.lat,
                                lng: foundProperty.coordinates.lng,
                                type: foundProperty.type,
                                radiusKm: 1,
                                limit: 100,
                                sortBy: "nearby"
                            },
                            { force: true, signal: controller.signal }
                        )
                        : await dataManager.fetchProperties(
                            { type: foundProperty.type, limit: 100 },
                            { force: true, signal: controller.signal }
                        );

                    if (!controller.signal.aborted) setAllProperties(result.data || []);
                }
                if (!controller.signal.aborted) setLoading(false);
            } catch (error) {
                if (error?.code !== "ERR_CANCELED") {
                    console.error("Error loading property:", error);
                    setLoading(false);
                }
            }
        };

        loadProperty();
        return () => controller.abort();
    }, [id]);

    const revealContact = (type) => setRevealedContact((prev) => ({ ...prev, [type]: true }));

    const getPhoneHref = (phone, country = "EG") => {
        if (!phone) return "";
        const formatted = displayFormattedPhone(phone, country);
        return `tel:${formatted.replace(/[^\d+]/g, "")}`;
    };
    const getEmailHref = (email) => { const c = String(email || "").trim(); return c ? `mailto:${c}` : ""; };
    const getWhatsAppHref = (phone, message = "", country = "EG") => {
        if (!phone) return "";
        const formatted = displayFormattedPhone(phone, country);
        const digits = formatted.replace(/\D/g, "");
        return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
    };

    const handleFavoriteToggle = () => {
        if (!isLoggedIn) { navigate("/login"); return; }
        setIsFavoriteState(toggleFavorite(property._id || property.id));
    };

    const handleDelete = () => {
        Swal.fire({
            title: t("manage.deleteConfirm.title"),
            text: t("manage.deleteConfirm.text"),
            icon: "warning",
            background: tokens.colors.surface,
            color: tokens.colors.text,
            showCancelButton: true,
            confirmButtonColor: "#E24B4A",
            cancelButtonColor: tokens.colors.primary,
            confirmButtonText: t("manage.deleteConfirm.confirm"),
            cancelButtonText: t("common.cancel")
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await dataManager.deletePropertyAsync(property._id || property.id);
                    Swal.fire({
                        title: t("manage.deleteConfirm.successTitle"),
                        text: t("manage.deleteConfirm.successText"),
                        icon: "success",
                        background: tokens.colors.surface,
                        color: tokens.colors.text,
                        confirmButtonColor: tokens.colors.primary
                    }).then(() => {
                        navigate(-1);
                    });
                } catch (error) {
                    Swal.fire({
                        title: t("manage.deleteConfirm.errorTitle"),
                        text: error.response?.data?.message || t("manage.deleteConfirm.errorText"),
                        icon: "error",
                        background: tokens.colors.surface,
                        color: tokens.colors.text,
                        confirmButtonColor: tokens.colors.primary
                    });
                }
            }
        });
    };

    const getImageUrl = (url) => {
        return optimizeImageUrl(url, {
            width: 1600,
            height: 1000,
            quality: 74,
            fallback: "https://placehold.co/1600x1000?text=No+Image",
        });
    };

    if (loading) return (
        <div style={{ backgroundColor: tokens.colors.bg }} className="min-h-screen flex flex-col">
            <NavBar />
            <div className="mt-14">
                <PropertyDetailSkeleton />
            </div>
            <Footer />
        </div>
    );

    if (!property) return (
        <div style={{ backgroundColor: tokens.colors.bg }} className="min-h-screen flex flex-col">
            <NavBar />
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                <h2 style={{ color: tokens.colors.text }} className="text-2xl font-bold mb-4">{t("propertyDetails.notFound")}</h2>
                <button onClick={() => navigate(-1)} style={{ backgroundColor: tokens.colors.primary, color: "#fff" }} className="px-6 py-2 rounded-lg cursor-pointer">
                    {t("propertyDetails.goBack")}
                </button>
            </div>
            <Footer />
        </div>
    );

    // ─── Derived values ──────────────────────────────────────────────────
    const detailConfigs = [
        {
            label: t("propertyDetails.district"),
            value: property.district ? t("districts." + property.district, property.district) : null,
            icon: <MapPin size={14} style={{ color: tokens.colors.primary }} />,
        },
        {
            label: t("propertyDetails.year"),
            value: property.yearBuilt,
            icon: <Calendar size={14} style={{ color: tokens.colors.primary }} />,
        },
        {
            label: t("propertyDetails.finish"),
            value: property.finish
                ? t("listingForm.options.finish." + getFinishKey(property.finish), property.finish)
                : null,
            icon: <ShieldCheck size={14} style={{ color: tokens.colors.primary }} />,
        },
        {
            label: t("propertyDetails.floor"),
            value: property.floor,
            icon: <Layers size={14} style={{ color: tokens.colors.primary }} />,
        },
    ];

    const amenityItems = getAmenityItems(property, t);
    const agentPhone = String(agent?.phone || "").trim();
    const agentEmail = String(agent?.email || "").trim();
    const agentCountry = property.owner?.country || "EG";
    const phoneHref = getPhoneHref(agentPhone, agentCountry);
    const emailHref = getEmailHref(agentEmail);
    const agentName = String(agent?.name || "").trim();
    const propertyUrl = typeof window !== "undefined" ? window.location.href : "";
    const whatsappMessage = t("propertyDetails.whatsappMsg", {
        agentName: agentName && agentName !== "Unknown Agent" ? agentName : t("common.there"),
        propertyTitle: property.title,
        propertyUrl,
    });
    const whatsappHref = getWhatsAppHref(agentPhone, whatsappMessage, agentCountry);

    return (
        <div style={{ backgroundColor: tokens.colors.bg }} className="min-h-screen flex flex-col overflow-x-hidden">
            <NavBar />

            <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-grow pb-12">

                {/* ── HERO CAROUSEL ── */}
                <div className="relative h-[45vh] sm:h-[50vh] lg:h-[65vh] w-full mt-[64px] bg-gray-900 overflow-hidden">
                    <img
                        src={getImageUrl(property.images[currentImageIndex])}
                        className="w-full h-full object-cover"
                        alt="Property"
                        width={1600}
                        height={1000}
                        fetchPriority="high"
                        decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />

                    {/* Back button */}
                    <div className={`absolute top-4 ${isRTL ? "right-4" : "left-4"} z-30`}>
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-2 rounded-full bg-black/40 text-white backdrop-blur-md cursor-pointer hover:bg-black/60 transition-all ${isRTL ? "rotate-180" : ""}`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>

                    {/* Carousel arrows */}
                    {property.images.length > 1 && (
                        <div className={`absolute inset-x-4 top-1/3 -translate-y-1/2 flex justify-between z-20 pointer-events-none ${isRTL ? "flex-row-reverse" : ""}`}>
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length); }}
                                className="p-2.5 rounded-full bg-white/20 text-white backdrop-blur-md pointer-events-auto cursor-pointer hover:bg-white/40 active:scale-90 transition-all"
                            >
                                <ChevronLeft size={22} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % property.images.length); }}
                                className="p-2.5 rounded-full bg-white/20 text-white backdrop-blur-md pointer-events-auto cursor-pointer hover:bg-white/40 active:scale-90 transition-all"
                            >
                                <ChevronRight size={22} />
                            </button>
                        </div>
                    )}

                    {/* Hero overlay text */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 text-white z-10">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span
                                    className="px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider"
                                    style={{ backgroundColor: tokens.colors.primary, color: "#fff" }}
                                >
                                    {language !== "ar" && t("propertyDetails.for")}
                                    {t("listingForm.options." + property.type?.toLowerCase(), property.type)}
                                </span>
                                {property.isFeatured && (
                                    <div className="flex items-center gap-1.5 bg-amber-500 px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                                        <Star size={12} fill="currentColor" /> {t("propertyDetails.featured")}
                                    </div>
                                )}
                                {property.isVerified && (
                                    <div className="flex items-center gap-1.5 bg-[#10b981] px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                                        <ShieldCheck size={12} fill="currentColor" /> {t("propertyDetails.verified")}
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold">
                                    <Eye size={12} /> {property.views || 0} {t("propertyDetails.views")}
                                </div>
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-bold leading-tight mb-1">{property.title}</h1>
                            <p className="text-sm sm:text-base opacity-90 flex items-center gap-1.5">
                                <MapPin size={16} style={{ color: tokens.colors.primary }} />
                                {t("locations." + property.location, property.location)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── BODY ── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left column */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Key Stats */}
                            <div className="grid grid-cols-3 py-6 rounded-2xl border shadow-sm" style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface }}>
                                <div className="flex flex-col items-center border-r" style={{ borderColor: tokens.colors.border }}>
                                    <Bed size={22} className="mb-1" style={{ color: tokens.colors.primary }} />
                                    <span className="font-bold text-lg" style={{ color: tokens.colors.text }}>{property.bedrooms}</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-500">{t("propertyDetails.beds")}</span>
                                </div>
                                <div className="flex flex-col items-center border-r" style={{ borderColor: tokens.colors.border }}>
                                    <Bath size={22} className="mb-1" style={{ color: tokens.colors.primary }} />
                                    <span className="font-bold text-lg" style={{ color: tokens.colors.text }}>{property.bathrooms}</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-500">{t("propertyDetails.baths")}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Maximize size={22} className="mb-1" style={{ color: tokens.colors.primary }} />
                                    <span className="font-bold text-lg" style={{ color: tokens.colors.text }}>{property.area}</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-500">{t("propertyDetails.area")}</span>
                                </div>
                            </div>

                            {/* Detail chips */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {detailConfigs.map((item) =>
                                    item.value ? (
                                        <div
                                            key={item.label}
                                            className="p-4 rounded-xl border flex flex-col"
                                            style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface }}
                                        >
                                            <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">{item.label}</span>
                                            <span className="font-bold text-sm truncate flex items-center gap-1.5" style={{ color: tokens.colors.text }}>
                                                {item.icon} {item.value}
                                            </span>
                                        </div>
                                    ) : null
                                )}
                                <div className="p-4 rounded-xl border flex flex-col" style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface }}>
                                    <span className="text-[10px] uppercase font-bold text-gray-500 mb-1">{t("propertyDetails.totalViews")}</span>
                                    <span className="font-bold text-sm flex items-center gap-1.5" style={{ color: tokens.colors.text }}>
                                        <Eye size={14} style={{ color: tokens.colors.primary }} /> {property.views || 0}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="p-6 rounded-2xl border" style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface }}>
                                <h2 className="text-xl font-bold mb-4" style={{ color: tokens.colors.text }}>{t("propertyDetails.description")}</h2>
                                <p className="text-sm sm:text-base leading-relaxed" style={{ color: tokens.colors.textSub }}>{property.description}</p>
                            </div>

                            {/* Amenities */}
                            {amenityItems.length > 0 && (
                                <div className="p-6 rounded-2xl border" style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface }}>
                                    <div className="flex items-center justify-between gap-4 mb-5">
                                        <h2 className="text-xl font-bold" style={{ color: tokens.colors.text }}>{t("propertyDetails.amenities")}</h2>
                                        <span
                                            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0"
                                            style={{ backgroundColor: tokens.colors.primary + "12", color: tokens.colors.primary }}
                                        >
                                            {amenityItems.length} {amenityItems.length === 1 ? t("propertyDetails.feature") : t("propertyDetails.features")}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {amenityItems.map((item) => {
                                            const Icon = AMENITY_ICONS[item.key] || Check;
                                            return (
                                                <div
                                                    key={item.key}
                                                    className="min-h-[76px] rounded-xl border p-3 flex items-center gap-3"
                                                    style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.bg }}
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                        style={{ backgroundColor: tokens.colors.primary + "14", color: tokens.colors.primary }}
                                                    >
                                                        <Icon size={18} />
                                                    </div>
                                                    <span className="text-sm font-bold leading-tight break-words" style={{ color: tokens.colors.text }}>
                                                        {t("amenities." + item.key, item.key)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Map */}
                            <div className="p-4 rounded-2xl border mb-6" style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface }}>
                                <h2 className="text-lg font-bold mb-4 px-2" style={{ color: tokens.colors.text }}>{t("propertyDetails.propertyLocation")}</h2>
                                <div className="rounded-xl overflow-hidden border h-[480px] sm:h-[560px] relative" style={{ borderColor: tokens.colors.border }}>
                                    <PropertyMap currentProperty={property} allProperties={allProperties} radius={1} />
                                </div>
                            </div>
                        </div>

                        {/* ── Sidebar ── */}
                        <div className="space-y-6">

                            {/* Sticky Price + actions + Warning */}
                            <div className="sticky top-24 space-y-6 z-10">
                                {property.isFairPrice === false && (
                                    <div
                                        className="p-5 rounded-2xl border flex items-start gap-3.5 shadow-sm"
                                        style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
                                    >
                                        <div className="p-2 bg-red-100 rounded-full shrink-0">
                                            <AlertTriangle size={18} className="text-red-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-red-900 mb-1">{t("propertyDetails.unfairPriceTitle", "Pricing Alert")}</h4>
                                            <p className="text-xs text-red-800 leading-relaxed">
                                                {t("propertyDetails.unfairPriceDesc", "This property's asking price exceeds the market average for similar specifications in this area.")}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="p-6 rounded-2xl border shadow-sm" style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">{t("propertyDetails.price")}</p>
                                    <h2 className="text-3xl font-black mb-8" style={{ color: tokens.colors.primary }}>{formatPrice(property.price)}</h2>
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleFavoriteToggle}
                                            className="w-full py-3.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm cursor-pointer transition-all active:scale-95"
                                            style={{ borderColor: tokens.colors.border, color: isFavoriteState ? "#ef4444" : tokens.colors.text }}
                                        >
                                            <Heart size={20} fill={isFavoriteState ? "#ef4444" : "none"} />
                                            {isFavoriteState ? t("propertyDetails.saved") : t("propertyDetails.saveProperty")}
                                        </button>
                                        {isLoggedIn && (
                                            <button
                                                onClick={() => toggleCompare(property)}
                                                className="w-full py-3.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm cursor-pointer transition-all active:scale-95"
                                                style={{ borderColor: tokens.colors.border, color: isSelected(property._id || property.id) ? tokens.colors.primary : tokens.colors.text }}
                                            >
                                                <GitCompare size={20} /> {t("propertyDetails.compare")}
                                            </button>
                                        )}
                                        {isAdmin && (
                                            <button
                                                onClick={handleDelete}
                                                className="w-full py-3.5 rounded-xl bg-red-500 text-white flex items-center justify-center gap-2 font-bold text-sm cursor-pointer transition-all active:scale-95 shadow-md hover:bg-red-600"
                                            >
                                                <Trash2 size={20} /> {t("manage.actions.delete")}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Agent card */}
                            <div className="p-6 rounded-2xl border" style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}>
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-5">{t("propertyDetails.agent")}</h3>
                                <div className="flex items-center gap-4 mb-8">
                                    <UserAvatar user={agent} size="lg" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-base truncate" style={{ color: tokens.colors.text }}>{agent?.name}</p>
                                        <p className="text-xs text-gray-500">{agent?.role}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    {/* Phone */}
                                    <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.bg }}>
                                        <Phone size={16} style={{ color: tokens.colors.primary }} className="shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("propertyDetails.phone")}</p>
                                            {agentPhone ? (
                                                revealedContact.phone ? (
                                                    <div className="space-y-3">
                                                        <p className="text-sm font-bold truncate" style={{ color: tokens.colors.text }} dir="ltr">{displayFormattedPhone(agentPhone, property.owner?.country || "EG")}</p>
                                                        <p className="text-xs" style={{ color: tokens.colors.textSub }}>{t("propertyDetails.howToContact")}</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <a href={phoneHref} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: tokens.colors.primary }}>
                                                                <Phone size={14} /> {t("propertyDetails.call")}
                                                            </a>
                                                            <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: "#25D366" }}>
                                                                <MessageCircle size={14} /> {t("propertyDetails.whatsapp")}
                                                            </a>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => revealContact("phone")} className="text-sm font-bold cursor-pointer hover:underline" style={{ color: tokens.colors.primary }}>
                                                        {t("propertyDetails.showPhone")}
                                                    </button>
                                                )
                                            ) : (
                                                <p className="text-sm font-bold truncate" style={{ color: tokens.colors.text }}>{t("propertyDetails.phoneUnavailable")}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.bg }}>
                                        <Mail size={16} style={{ color: tokens.colors.primary }} className="shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t("propertyDetails.email")}</p>
                                            {agentEmail ? (
                                                revealedContact.email ? (
                                                    <a href={emailHref} className="text-sm font-bold truncate block cursor-pointer hover:underline" style={{ color: tokens.colors.text }}>
                                                        {agentEmail}
                                                    </a>
                                                ) : (
                                                    <button type="button" onClick={() => revealContact("email")} className="text-sm font-bold cursor-pointer hover:underline" style={{ color: tokens.colors.primary }}>
                                                        {t("propertyDetails.showEmail")}
                                                    </button>
                                                )
                                            ) : (
                                                <p className="text-sm font-bold truncate" style={{ color: tokens.colors.text }}>{t("propertyDetails.emailUnavailable")}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </motion.main>
            <Footer />
        </div>
    );
};

export default PropertyDetails;
