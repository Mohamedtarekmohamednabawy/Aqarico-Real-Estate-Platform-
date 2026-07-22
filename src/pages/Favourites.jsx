import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import PropertyCard from "../components/PropertyCard";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { getFavoriteProperties, loadFavorites } from "../utils/favoritesManager";
import Skeleton from "../components/Skeleton";
import { PropertyGridSkeleton } from "../components/skeletons/PropertyCardSkeleton";
import { useLanguage } from "../i18n/LanguageContext";

const Favourites = () => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const [favoriteProperties, setFavoriteProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load user's favorited properties from API
    useEffect(() => {
        const loadFavoriteProperties = async () => {
            setIsLoading(true);
            try {
                await loadFavorites();
                setFavoriteProperties(getFavoriteProperties());
            } catch (error) {
                console.error('Error loading favorites:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadFavoriteProperties();
    }, []);

    // Listen for favorite removal events to update list immediately
    useEffect(() => {
        const handleFavoriteRemoved = (event) => {
            const { propertyId } = event.detail;
            setFavoriteProperties((prev) =>
                prev.filter((property) => (property._id || property.id) !== propertyId)
            );
        };

        window.addEventListener("favoriteRemoved", handleFavoriteRemoved);

        return () => {
            window.removeEventListener("favoriteRemoved", handleFavoriteRemoved);
        };
    }, []);

    return (
        <div
            style={{
                backgroundColor: tokens.colors.bg,
                minHeight: "100vh",
                backgroundImage: `radial-gradient(circle at 50% 0%, ${tokens.colors.primary}10 0%, transparent 50%)`,
            }}
            className="overflow-x-hidden"
        >
            <NavBar />

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-7xl mx-auto px-6 pt-32 pb-20 w-full flex-grow"
            >
                {/* Page Header with Animated Title */}
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45 }}
                        className={`premium-glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                        style={{ color: tokens.colors.textSub }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                        {t("favourites.badge")}
                    </motion.div>
                    <h1 className="animated-page-title text-5xl md:text-7xl font-black mb-6 flex justify-center flex-wrap gap-x-3 gap-y-1 tracking-tight">
                        {isLoading ? (
                            <Skeleton width="400px" height="60px" borderRadius="16px" className="mx-auto" />
                        ) : (
                            <div className="flex justify-center flex-wrap gap-x-3 gap-y-1">
                                <span style={{ color: tokens.colors.text }}>{t("favourites.titlePart1")}</span>
                                <span style={{ color: tokens.colors.primary }}>{t("favourites.titlePart2")}</span>
                            </div>
                        )}
                    </h1>
                    <motion.p
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ color: tokens.colors.textSub }}
                        className="text-xl max-w-2xl mx-auto leading-relaxed font-light"
                    >
                        {t("favourites.subtitle")}
                    </motion.p>
                </div>

                {/* Properties Section with Count and Grid */}
                <div className="pb-12">
                    {/* Properties Count */}
                    <div className="mb-4">
                        {isLoading ? (
                            <Skeleton width="150px" height="20px" />
                        ) : (
                            <p style={{ color: tokens.colors.textSub }} className="text-sm">
                                <span style={{ color: tokens.colors.text }} className="font-bold text-base">
                                    {t("favourites.count", { count: favoriteProperties.length })}
                                </span>
                            </p>
                        )}
                    </div>

                    {/* Properties Grid */}
                    {isLoading ? (
                        <PropertyGridSkeleton count={3} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" />
                    ) : favoriteProperties.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {favoriteProperties.map((property) => (
                                <PropertyCard key={property._id || property.id} property={property} />
                            ))}
                        </div>
                    ) : (
                        <motion.div
                            style={{
                                backgroundColor: tokens.colors.surface,
                                borderRadius: tokens.borderRadius.lg,
                            }}
                            className="text-center py-16"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div>
                                <Heart size={64} style={{ color: tokens.colors.textSub }} className="mx-auto mb-4 opacity-50" />
                            </div>

                            <p
                                style={{ color: tokens.colors.text }}
                                className="text-lg font-semibold mb-2"
                            >
                                {t("favourites.emptyTitle")}
                            </p>
                            <p
                                style={{ color: tokens.colors.textSub }}
                                className="text-sm"
                            >
                                {t("favourites.emptySubtitle")}
                            </p>
                        </motion.div>
                    )}
                </div>
            </motion.main >
            <Footer />
        </div >
    );
};

export default Favourites;
