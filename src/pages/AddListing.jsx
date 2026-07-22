import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { useState } from "react";
import { designTokens } from "../theme/tokens";
import { dataManager } from "../data/dataManager";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import ListingForm from "../components/ListingForm";
import authService from "../services/authService";
import Swal from "sweetalert2";
import LoadingScreen from "../components/LoadingScreen";
import { useLanguage } from "../i18n/LanguageContext";

const AddListing = () => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const [submitting, setSubmitting] = useState(false);

    // Redirect if not logged in
    if (!currentUser) {
        navigate("/login");
        return null;
    }

    // Parse pre-filled data from URL parameters (passed by AI)
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);

    const prefilledData = {
        area: queryParams.get('area') || "",
        price: queryParams.get('price') || "",
        district: queryParams.get('district') || "",
        location: queryParams.get('location') || "",
        bedrooms: queryParams.get('bedrooms') || "",
        bathrooms: queryParams.get('bathrooms') || "",
        type: queryParams.get('type') || "",
        floor: queryParams.get('floor') || "",
        finish: queryParams.get('finish') || "",
        title: queryParams.get('title') || "",
        description: queryParams.get('description') || "",
        year_built: queryParams.get('year_built') || queryParams.get('year') || "",
        yearBuilt: queryParams.get('year_built') || queryParams.get('year') ? Number(queryParams.get('year_built') || queryParams.get('year')) : "",
        totalFloors: queryParams.get('totalFloors') ? Number(queryParams.get('totalFloors')) : "",
        coordinates: (queryParams.get('lat') && queryParams.get('lng')) ? {
            lat: Number(queryParams.get('lat')),
            lng: Number(queryParams.get('lng'))
        } : null,
    };

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        try {
            await dataManager.createProperty({
                ...formData,
                price: Number(formData.price),
                bedrooms: Number(formData.bedrooms),
                bathrooms: Number(formData.bathrooms),
                area: Number(formData.area),
                images: formData.images,
            });
            navigate("/manage-listings");
        } catch (error) {
            console.error('Error creating listing:', error);
            Swal.fire({
                icon: 'error',
                title: t("addListing.errorTitle"),
                text: error.response?.data?.message || t("listingForm.errors.failedCreate"), // reusing if exists or add one
                confirmButtonColor: tokens.colors.primary,
                background: tokens.colors.bg,
                color: tokens.colors.text
            });
        } finally {
            setSubmitting(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                // CHANGE HERE: Speed of the letter staggering (Lower = Faster)
                staggerChildren: 0.03,
                // CHANGE HERE: Delay before animation starts
                delayChildren: 0.1,
            },
        },
    };

    const letterVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
        },
    };

    const titlePart1 = t("addListing.titlePart1");
    const titlePart2 = t("addListing.titlePart2");

    return (
        <div style={{ backgroundColor: tokens.colors.bg, minHeight: "100vh", color: tokens.colors.text }}>
            <LoadingScreen isLoading={submitting} message={t("addListing.loading")} />
            <NavBar />
            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="pt-24 pb-12 px-4 md:px-8 max-w-4xl mx-auto"
            >
                <div className="text-center py-8 overflow-hidden pb-2">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45 }}
                        className={`premium-glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                        style={{ color: tokens.colors.textSub }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                        {t("addListing.badge")}
                    </motion.div>
                    <motion.h1
                        style={{
                            fontFamily: tokens.typography.fontFamily,
                            lineHeight: 1.2
                        }}
                        className="text-4xl md:text-5xl font-bold mb-6 flex justify-center flex-wrap gap-x-3 gap-y-1 tracking-tight"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {titlePart1.split(" ").map((word, wordIndex) => (
                            <motion.span
                                key={`p1-${wordIndex}`}
                                variants={letterVariants}
                                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                className="inline-block"
                                style={{ color: tokens.colors.text }}
                            >
                                {word}
                            </motion.span>
                        ))}
                        {titlePart2.split(" ").map((word, wordIndex) => (
                            <motion.span
                                key={`p2-${wordIndex}`}
                                variants={letterVariants}
                                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                className="inline-block"
                                style={{ color: tokens.colors.primary }}
                            >
                                {word}
                            </motion.span>
                        ))}
                    </motion.h1>
                </div>

                <ListingForm initialData={prefilledData} onSubmit={handleSubmit} />
            </motion.main>
            <Footer />
        </div>
    );
};

export default AddListing;