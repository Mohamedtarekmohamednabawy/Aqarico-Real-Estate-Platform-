import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { dataManager } from "../data/dataManager";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import ListingForm from "../components/ListingForm";
import authService from "../services/authService";
import Swal from "sweetalert2";
import LoadingScreen from "../components/LoadingScreen";
import { FormSkeleton } from "../components/Skeleton";
import { useLanguage } from "../i18n/LanguageContext";

const EditListing = () => {
    const { id } = useParams();
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const navigate = useNavigate();

    // FIX 1 — Make currentUser stable
    const [currentUser] = useState(() => {
        return authService.getCurrentUser();
    });

    // Redirect if not logged in
    useEffect(() => {
        if (!currentUser) navigate("/login");
    }, [navigate, currentUser]);

    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Load property data
    useEffect(() => {
        if (!currentUser) return;

        const loadProperty = async () => {
            const property = await dataManager.fetchPropertyById(id);

            if (!property) {
                navigate("/manage-listings");
                return;
            }

            // Check ownership — compare owner._id or owner with current user's _id
            const ownerId = typeof property.owner === 'object' ? property.owner._id : property.owner;
            if (ownerId !== currentUser._id) {
                navigate("/manage-listings");
                return;
            }

            setInitialData(property);
            setLoading(false);
        };

        loadProperty();
    }, [id, navigate, currentUser]);

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        try {
            await dataManager.updatePropertyAsync(id, {
                ...formData,
                price: Number(formData.price),
                bedrooms: Number(formData.bedrooms),
                bathrooms: Number(formData.bathrooms),
                area: Number(formData.area),
                images: formData.images,
            });
            navigate("/manage-listings");
        } catch (error) {
            console.error('Error updating listing:', error);
            Swal.fire({
                icon: 'error',
                title: t("addListing.errorTitle"),
                text: error.response?.data?.message || t("listingForm.errors.failedUpdate"),
                confirmButtonColor: tokens.colors.primary,
                background: tokens.colors.bg
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (!currentUser) return null;

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

    const titlePart1 = t("editListing.titlePart1");
    const titlePart2 = t("editListing.titlePart2");

    return (
        <div
            style={{
                backgroundColor: tokens.colors.bg,
                minHeight: "100vh",
                color: tokens.colors.text,
            }}
        >
            <LoadingScreen isLoading={submitting} message={t("listingForm.actions.update") + "..."} />
            <NavBar />

            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="pt-24 pb-12 px-4 md:px-8 max-w-4xl mx-auto"
            >
                <div className="text-center py-8 overflow-visible">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45 }}
                        className={`premium-glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                        style={{ color: tokens.colors.textSub }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                        {t("editListing.badge")}
                    </motion.div>
                    <motion.h1
                        style={{ fontFamily: tokens.typography.fontFamily, lineHeight: 1.2 }}
                        className="animated-page-title text-4xl md:text-5xl font-bold mb-6 flex justify-center flex-wrap gap-x-3 gap-y-1 tracking-tight"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {titlePart1.split(" ").map((word, wordIndex) => (
                            <motion.span
                                key={`p1-${wordIndex}`}
                                variants={letterVariants}
                                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
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
                                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                                className="inline-block"
                                style={{ color: tokens.colors.primary }}
                            >
                                {word}
                            </motion.span>
                        ))}
                    </motion.h1>
                </div>

                {loading ? (
                    <FormSkeleton />
                ) : (
                    <ListingForm
                        initialData={initialData}
                        onSubmit={handleSubmit}
                        isEditMode={true}
                    />
                )}
            </motion.main>

            <Footer />
        </div >
    );
};

export default EditListing;