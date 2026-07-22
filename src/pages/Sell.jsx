import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { Home, PlusCircle, ArrowRight } from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useLanguage } from "../i18n/LanguageContext";

const Sell = () => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const location = useLocation();
    const navigate = useNavigate();

    // Safety redirect: If we have pre-filled data, go straight to add-listing
    useEffect(() => {
        if (location.search) {
            navigate(`/add-listing${location.search}`, { replace: true });
        }
    }, [location.search, navigate]);

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        hover: { scale: 1.03, transition: { duration: 0.2 } }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                // Speed of the letter staggering (Lower = Faster)
                staggerChildren: 0.03,
                // Delay before animation starts
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

    const titlePart1 = t("sell.titlePart1");
    const titlePart2 = t("sell.titlePart2");

    return (
        <div style={{ backgroundColor: tokens.colors.bg, minHeight: "100vh", color: tokens.colors.text }} className="flex flex-col">
            <NavBar />

            <main className="flex-grow flex flex-col items-center justify-center px-6 py-20 md:py-32">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16 max-w-2xl"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45 }}
                        className={`premium-glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                        style={{ color: tokens.colors.textSub }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                        {t("sell.badge")}
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
                    <p style={{ color: tokens.colors.textSub }} className="text-lg md:text-xl">
                        {t("sell.subtitle")}
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid md:grid-cols-2 gap-8 w-full max-w-4xl"
                >
                    {/* Manage Listing Card */}
                    <motion.div variants={cardVariants} whileHover="hover">
                        <Link
                            to="/manage-listings"
                            style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                            className="block p-8 rounded-2xl border shadow-lg h-full group relative overflow-hidden"
                        >
                            <div className={`absolute top-0 ${language === 'ar' ? 'left-0' : 'right-0'} p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <Home size={120} color={tokens.colors.primary} />
                            </div>

                            <div className="relative z-10">
                                <div style={{ backgroundColor: tokens.colors.primary + "20" }} className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                                    <Home size={32} color={tokens.colors.primary} />
                                </div>

                                <h2 className="text-2xl font-bold mb-4">{t("sell.manageTitle")}</h2>
                                <p style={{ color: tokens.colors.textSub }} className="mb-8">
                                    {t("sell.manageSubtitle")}
                                </p>

                                <span style={{ color: tokens.colors.primary }} className="flex items-center font-semibold group-hover:gap-2 transition-all">
                                    {t("sell.manageLink")} <ArrowRight size={20} className={language === 'ar' ? 'mr-2 rotate-180' : 'ml-2'} />
                                </span>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Add New Listing Card */}
                    <motion.div variants={cardVariants} whileHover="hover">
                        <Link
                            to="/add-listing"
                            style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                            className="block p-8 rounded-2xl border shadow-lg h-full group relative overflow-hidden"
                        >
                            <div className={`absolute top-0 ${language === 'ar' ? 'left-0' : 'right-0'} p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                                <PlusCircle size={120} color={tokens.colors.primary} />
                            </div>

                            <div className="relative z-10">
                                <div style={{ backgroundColor: tokens.colors.primary + "20" }} className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                                    <PlusCircle size={32} color={tokens.colors.primary} />
                                </div>

                                <h2 className="text-2xl font-bold mb-4">{t("sell.addTitle")}</h2>
                                <p style={{ color: tokens.colors.textSub }} className="mb-8">
                                    {t("sell.addSubtitle")}
                                </p>

                                <span style={{ color: tokens.colors.primary }} className="flex items-center font-semibold group-hover:gap-2 transition-all">
                                    {t("sell.addLink")} <ArrowRight size={20} className={language === 'ar' ? 'mr-2 rotate-180' : 'ml-2'} />
                                </span>
                            </div>
                        </Link>
                    </motion.div>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
};

export default Sell;