import { useState, useEffect } from "react";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { dataManager } from "../data/dataManager";
import { useLanguage } from "../i18n/LanguageContext";
import PropertyCard from "./PropertyCard";
import MotionReveal from "./MotionReveal";
import Skeleton from "./Skeleton";
import { PropertyGridSkeleton } from "./skeletons/PropertyCardSkeleton";

const Listings = () => {
    const { themeName } = useTheme();
    const { t } = useLanguage();
    const tokens = designTokens[themeName];
    const [featuredProperties, setFeaturedProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFeatured = async () => {
            setIsLoading(true);
            try {
                // Fetch properties marked as featured by admin
                let result = await dataManager.fetchProperties({
                    isFeatured: true,
                    limit: 3
                });

                // Fallback: If no featured properties, show the oldest 3 properties as before
                if (!result.data || result.data.length === 0) {
                    result = await dataManager.fetchProperties({
                        limit: 3,
                        sortBy: 'createdAt',
                        sortOrder: 'asc'
                    });
                }

                setFeaturedProperties(result.data || []);
            } catch (error) {
                console.error("Error fetching featured properties:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFeatured();
    }, []);

    if (isLoading) {
        return (
            <section style={{ backgroundColor: tokens.colors.bg }} className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-10 text-center">
                        <Skeleton width="120px" height="24px" className="mx-auto mb-4" />
                        <Skeleton width="300px" height="40px" className="mx-auto mb-4" />
                        <Skeleton width="500px" height="20px" className="mx-auto" />
                    </div>
                    <PropertyGridSkeleton count={3} />
                </div>
            </section>
        );
    }

    if (featuredProperties.length === 0) return null;

    return (
        <section
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
                backgroundImage: `linear-gradient(180deg, transparent, ${tokens.colors.surfaceGlass || tokens.colors.surface} 100%)`,
            }}
            className="py-20 px-6 transition-colors duration-500"
        >
            <MotionReveal>
                <div className="mb-10 text-center">
                    <p className="mb-3 text-xs font-black uppercase tracking-[0.18em]" style={{ color: tokens.colors.primary }}>
                        {t("landing.featured.badge")}
                    </p>
                    <h2
                        style={{
                            color: tokens.colors.text,
                            fontSize: tokens.typography.headings.h2,
                            fontWeight: tokens.typography.weight.bold,
                        }}
                        className="mb-3"
                    >
                        {t("landing.featured.title")}
                    </h2>
                    <p className="mx-auto max-w-2xl text-sm md:text-base leading-relaxed" style={{ color: tokens.colors.textSub }}>
                        {t("landing.featured.subtitle")}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {featuredProperties.map((prop, index) => (
                        <MotionReveal key={prop.id || prop._id} delay={index * 0.06} distance={14}>
                            <PropertyCard property={prop} />
                        </MotionReveal>
                    ))}
                </div>
            </MotionReveal>
        </section>
    );
};

export default Listings;
