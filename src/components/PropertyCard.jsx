import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MapPin,
  Bed,
  Bath,
  Maximize,
  Heart,
  Eye,
  GitCompare,
  Star,
  ShieldCheck,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { useTheme } from "../theme/useTheme";
import { useCurrency } from "../context/CurrencyContext";
import { designTokens } from "../theme/tokens";
import UserAvatar from "./UserAvatar";
import {
  toggleFavorite,
  isFavorited as checkIsFavorited,
} from "../utils/favoritesManager";
import authService from "../services/authService";
import { useComparison } from "../context/ComparisonContext";
import { useLanguage } from "../i18n/LanguageContext";
import { optimizeImageUrl } from "../utils/imageUrl";

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
  hover: {
    y: -6,
    scale: 1.015,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

const finishKeyMap = {
  "without finish": "none",
  "semi finished": "semi",
  lux: "lux",
  "super lux": "super",
  "extra super lux": "extra",
  furnished: "furnished",
};
const getFinishKey = (finish) => finishKeyMap[finish?.toLowerCase()] ?? finish;

const PropertyCard = ({ property, adminView = false, onDelete }) => {
  const navigate = useNavigate();
  const { themeName } = useTheme();
  const { formatPrice } = useCurrency();
  const { t, language } = useLanguage();
  const tokens = designTokens[themeName];
  const { toggleCompare, isSelected } = useComparison();
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const loggedInUser = authService.getCurrentUser();
  const isLoggedIn = !!loggedInUser;

  const ownerData =
    property.owner && typeof property.owner === "object"
      ? property.owner
      : null;

  const propertyId = property._id || property.id;
  const [isFavoriteState, setIsFavoriteState] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      setIsFavoriteState(checkIsFavorited(propertyId));
    }
  }, [propertyId, isLoggedIn]);

  const handleFavoriteToggle = () => {
    if (!isLoggedIn) return;
    const newState = toggleFavorite(propertyId);
    setIsFavoriteState(newState);
  };

  const formatViews = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v);

  const getImageUrl = () => {
    const url =
      property.images && property.images.length > 0
        ? property.images[0]
        : property.imageUrl;
    return optimizeImageUrl(url, {
      width: 640,
      height: 448,
      quality: 72,
      fallback: "https://placehold.co/640x448?text=No+Image",
    });
  };

  return (
    <motion.div
      onClick={() => navigate(`/property/${propertyId}`)}
      variants={cardVariants}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      style={{
        backgroundColor: tokens.colors.surfaceElevated || tokens.colors.surface,
        borderRadius: "24px",
        boxShadow: tokens.shadows.md,
        border: `1px solid ${tokens.colors.border}`,
        position: "relative",
        zIndex: 0,
        willChange: "transform",
      }}
      className="h-full overflow-hidden group cursor-pointer flex flex-col"
    >
      {/* Image */}
      <div className="relative overflow-hidden h-56">
        <img
          src={getImageUrl()}
          alt={property.title}
          loading="lazy"
          decoding="async"
          width={640}
          height={448}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          style={{
            imageRendering: 'auto',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)'
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://placehold.co/640x448?text=Image+Load+Error";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Price and Warning */}
        <div
          className={`absolute top-3 ${language === "ar" ? "right-3 items-start" : "left-3"} flex flex-col gap-2`}
        >
          <div
            style={{
              backgroundColor:
                tokens.colors.surfaceGlass || `${tokens.colors.surface}dd`,
              color: tokens.colors.text,
              border: `1px solid ${tokens.colors.border}`,
              backdropFilter: "blur(14px)",
            }}
            className="px-3 py-1.5 rounded-full font-black text-sm shadow-lg w-max"
          >
            {property.price
              ? formatPrice(property.price)
              : t("common.priceOnRequest")}
          </div>
          {property.isFairPrice === false && (
            <div
              style={{
                backgroundColor: "rgba(254, 226, 226, 0.9)",
                color: "#991B1B",
                border: "1px solid #FCA5A5",
                backdropFilter: "blur(14px)",
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 w-max"
            >
              <AlertTriangle size={12} strokeWidth={2.5} />{" "}
              {t("propertyCard.unfairPriceWarning", "Review Pricing")}
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFavoriteToggle();
          }}
          disabled={!isLoggedIn}
          style={{
            backgroundColor:
              tokens.colors.surfaceGlass || tokens.colors.surface + "cc",
            color: isFavoriteState ? "#ef4444" : tokens.colors.text,
            cursor: isLoggedIn ? "pointer" : "not-allowed",
            opacity: isLoggedIn ? 1 : 0.5,
            backdropFilter: "blur(12px)",
          }}
          className={`premium-focus absolute top-3 ${language === "ar" ? "left-3" : "right-3"} flex h-11 w-11 items-center justify-center rounded-full hover:scale-105 transition-transform duration-300`}
          title={
            isLoggedIn
              ? isFavoriteState
                ? t("propertyCard.favRemove")
                : t("propertyCard.favAdd")
              : t("propertyCard.favLogin")
          }
        >
          <Heart size={18} fill={isFavoriteState ? "#ef4444" : "none"} />
        </button>

        {/* Compare Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isLoggedIn) toggleCompare(property);
          }}
          disabled={!isLoggedIn}
          style={{
            backgroundColor:
              tokens.colors.surfaceGlass || tokens.colors.surface + "cc",
            color: isSelected(propertyId)
              ? tokens.colors.primary
              : tokens.colors.text,
            opacity: isLoggedIn ? 1 : 0.5,
            cursor: isLoggedIn ? "pointer" : "not-allowed",
            backdropFilter: "blur(12px)",
          }}
          className={`premium-focus absolute top-3 ${language === "ar" ? "left-16" : "right-16"} flex h-11 w-11 items-center justify-center rounded-full hover:scale-105 transition-transform duration-300`}
          title={
            isLoggedIn
              ? isSelected(propertyId)
                ? t("propertyCard.compRemove")
                : t("propertyCard.compAdd")
              : t("propertyCard.compLogin")
          }
        >
          <GitCompare
            size={18}
            fill={isSelected(propertyId) ? tokens.colors.primary : "none"}
          />
        </button>

        {/* Featured / Verified badges */}
        <div
          className={`absolute bottom-3 ${language === "ar" ? "left-3 items-start" : "right-3 items-end"} flex flex-col gap-2`}
        >
          {property.isFeatured && (
            <div
              style={{
                backgroundColor: tokens.colors.gold || tokens.colors.accent,
                color: tokens.colors.surface,
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1"
            >
              <Star size={10} fill="currentColor" />{" "}
              {t("propertyCard.featured")}
            </div>
          )}
          {property.isVerified && (
            <div
              style={{
                backgroundColor: tokens.colors.emerald || "#10b981",
                color: tokens.colors.surface,
              }}
              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1"
            >
              <ShieldCheck size={10} fill="currentColor" />{" "}
              {t("propertyCard.verified")}
            </div>
          )}
        </div>

        {/* Views */}
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.46)",
            color: "#fff8ec",
            backdropFilter: "blur(12px)",
          }}
          className={`absolute bottom-3 ${language === "ar" ? "right-3" : "left-3"} px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1`}
        >
          <Eye size={12} />
          {formatViews(property.viewCount)}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Type Badge */}
        <div className="mb-2 flex items-center justify-between">
          <span
            style={{
              backgroundColor: tokens.colors.primary + "20",
              color: tokens.colors.primary,
              border: `1px solid ${tokens.colors.primary}30`,
            }}
            className="px-2.5 py-1 rounded-full text-xs font-medium"
          >
            {t(
              "listingForm.options." + property.type?.toLowerCase(),
              property.type,
            )}
          </span>
          {property.isVerified && (
            <div
              className="flex items-center gap-1 text-[#10b981]"
              title={t("propertyCard.verified")}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">
                {t("propertyCard.verified")}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          title={property.title}
          style={{ color: tokens.colors.text }}
          className="font-black text-xl mb-2 line-clamp-1 group-hover:text-opacity-80 transition-colors"
        >
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin size={14} style={{ color: tokens.colors.textSub }} />
          <span style={{ color: tokens.colors.textSub }} className="text-xs">
            {t("locations." + property.location, property.location)}
          </span>
        </div>

        {/* Listed by */}
        {!adminView && ownerData && (
          <div className="flex items-center gap-2 mb-3">
            <UserAvatar user={ownerData} size="xs" showHoverEffect={false} />
            <span style={{ color: tokens.colors.textSub }} className="text-xs">
              {t("propertyCard.listedBy")}{" "}
              <span style={{ color: tokens.colors.primary, fontWeight: "600" }}>
                {ownerData.firstName} {ownerData.lastName}
              </span>
            </span>
          </div>
        )}

        {/* Beds / Baths / Area */}
        <div
          className="flex items-center justify-between gap-2 mb-4 pb-4 border-b"
          style={{ borderColor: tokens.colors.border }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Bed size={16} style={{ color: tokens.colors.textSub }} />
              <span
                style={{ color: tokens.colors.text }}
                className="text-xs font-medium"
              >
                {property.bedrooms}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Bath size={16} style={{ color: tokens.colors.textSub }} />
              <span
                style={{ color: tokens.colors.text }}
                className="text-xs font-medium"
              >
                {property.bathrooms}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Maximize size={16} style={{ color: tokens.colors.textSub }} />
              <span
                style={{ color: tokens.colors.text }}
                className="text-xs font-medium"
              >
                {property.area}m²
              </span>
            </div>
          </div>
        </div>

        {/* Secondary details */}
        <div
          className="grid grid-cols-2 gap-y-2 gap-x-2 text-[11px] mb-4"
          style={{ color: tokens.colors.textSub }}
        >
          {property.district && property.district !== "All" && (
            <div className="flex items-center gap-1 truncate">
              <span className="font-bold uppercase tracking-wider opacity-80">
                {t("propertyCard.districtLabel")}
              </span>
              <span className="truncate" style={{ color: tokens.colors.text }}>
                {t("districts." + property.district, property.district)}
              </span>
            </div>
          )}
          {property.yearBuilt && (
            <div className="flex items-center gap-1 truncate">
              <span className="font-bold uppercase tracking-wider opacity-80">
                {t("propertyCard.yearLabel")}
              </span>
              <span className="truncate" style={{ color: tokens.colors.text }}>
                {property.yearBuilt}
              </span>
            </div>
          )}
          {property.finish && (
            <div className="flex items-center gap-1 truncate">
              <span className="font-bold uppercase tracking-wider opacity-80">
                {t("propertyCard.finishLabel")}
              </span>
              <span className="truncate" style={{ color: tokens.colors.text }}>
                {property.finish
                  ? t(
                    "listingForm.options.finish." +
                    getFinishKey(property.finish),
                    property.finish,
                  )
                  : ""}
              </span>
            </div>
          )}
          {property.floor && (
            <div className="flex items-center gap-1 truncate">
              <span className="font-bold uppercase tracking-wider opacity-80">
                {t("propertyCard.floorLabel")}
              </span>
              <span className="truncate" style={{ color: tokens.colors.text }}>
                {property.floor}
              </span>
            </div>
          )}
        </div>

        {/* Amenities */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(showAllAmenities
            ? property.amenities || []
            : property.amenities?.slice(0, 4) || []
          ).map((amenity, index) => (
            <span
              key={index}
              style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.textSub,
                border: `1px solid ${tokens.colors.border}`,
              }}
              className="px-2.5 py-1 rounded-full text-xs"
            >
              {t("amenities." + amenity, amenity)}
            </span>
          ))}
          {!showAllAmenities && property.amenities?.length > 4 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAllAmenities(true);
              }}
              style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.primary,
                border: `1px solid ${tokens.colors.primary}30`,
              }}
              className="premium-focus px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer hover:opacity-80"
            >
              +{property.amenities.length - 4}
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className={`mt-auto flex flex-col ${adminView ? "sm:flex-row" : ""} gap-2`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/property/${propertyId}`);
            }}
            style={{
              background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})`,
              color: tokens.colors.surface,
              boxShadow: tokens.shadows.glow || tokens.shadows.md,
            }}
            className={`premium-focus ${adminView ? "flex-1" : "w-full"} min-h-11 py-3 rounded-xl font-black hover:opacity-95 transition-all duration-300 relative overflow-hidden group/btn text-sm cursor-pointer`}
          >
            <span className="relative z-10">
              {t("propertyCard.viewDetails")}
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />
          </button>

          {adminView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete && onDelete(propertyId, property.title);
              }}
              style={{
                backgroundColor: "#E24B4A",
                color: "#fff",
                boxShadow: "0 8px 15px -5px rgba(226, 75, 74, 0.4)",
              }}
              className="premium-focus flex-1 min-h-11 py-3 rounded-xl font-black hover:opacity-95 transition-all duration-300 relative overflow-hidden group/btn text-sm cursor-pointer"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Trash2 size={16} />
                {t("manage.actions.delete")}
              </span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyCard;
