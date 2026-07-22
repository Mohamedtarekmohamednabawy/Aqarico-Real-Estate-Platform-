import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    User,
    Shield,
    FileText,
    Trash2,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { useLanguage } from "../i18n/LanguageContext";

const Settings = () => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const navigate = useNavigate();
    const { t, language } = useLanguage();

    const isRTL = language === "ar";

    const settingsSections = [
        {
            id: "profile",
            title: t("settings.editProfile"),
            description: t("settings.editProfileDesc"),
            icon: User,
            color: "#3b82f6",
            path: "/settings/profile",
        },
        {
            id: "security",
            title: t("settings.security"),
            description: t("settings.securityDesc"),
            icon: Shield,
            color: "#10b981",
            path: "/settings/security",
        },
        {
            id: "terms",
            title: t("settings.terms"),
            description: t("settings.termsDesc"),
            icon: FileText,
            color: "#8b5cf6",
            path: "/settings/terms",
        },
        {
            id: "danger",
            title: t("settings.deleteAccount"),
            description: t("settings.deleteAccountDesc"),
            icon: Trash2,
            color: "#ef4444",
            path: "/settings/delete-account",
        },
    ];

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
        hover: { scale: 1.03 },
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.03,
                delayChildren: 0.1,
            },
        },
    };

    const letterVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0 },
    };



    return (
        <div
            style={{
                backgroundColor: tokens.colors.bg,
                minHeight: "100vh",
            }}
            className="overflow-x-hidden"
        >
            <NavBar />

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="pt-24 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto pb-12"
            >
                {/* Header */}
                <div className="text-center mb-8 relative overflow-visible mt-10">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45 }}
                        className={`premium-glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                        style={{ color: tokens.colors.textSub }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                        {t("settings.badge")}
                    </motion.div>
                    <motion.h1
                        style={{ fontFamily: tokens.typography.fontFamily, lineHeight: 1.2 }}
                        className="animated-page-title text-5xl md:text-7xl font-extrabold mb-6 flex justify-center flex-wrap gap-x-3 gap-y-1 tracking-tight"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {t("settings.titlePart1").split(" ").map((word, index) => (
                            <motion.span
                                key={`p1-${index}`}
                                variants={letterVariants}
                                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                className="inline-block"
                                style={{ color: tokens.colors.text }}
                            >
                                {word}
                            </motion.span>
                        ))}
                        {t("settings.titlePart2").split(" ").map((word, index) => (
                            <motion.span
                                key={`p2-${index}`}
                                variants={letterVariants}
                                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                className="inline-block"
                                style={{ color: tokens.colors.primary }}
                            >
                                {word}
                            </motion.span>
                        ))}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{ color: tokens.colors.textSub }}
                        className="text-xl max-w-2xl mx-auto leading-relaxed font-light"
                    >
                        {t("settings.subtitle")}
                    </motion.p>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                    {settingsSections.map((section) => (
                        <SettingsCard
                            key={section.id}
                            section={section}
                            tokens={tokens}
                            variants={cardVariants}
                            isRTL={isRTL}
                            onClick={() => navigate(section.path)}
                        />
                    ))}
                </div>
            </motion.main>

            <Footer />
        </div>
    );
};

export default Settings;

// ====================================
//        Settings Card Component
// ====================================
const SettingsCard = ({ section, tokens, variants, isRTL, onClick }) => {
    const Icon = section.icon;
    const isDanger = section.id === "danger";
    const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

    return (
        <motion.button
            variants={variants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={onClick}
            style={{
                backgroundColor: tokens.colors.surface,
                borderRadius: tokens.borderRadius.lg,
                border: isDanger
                    ? "2px solid #ef4444"
                    : `1px solid ${tokens.colors.border}`,
                boxShadow: isDanger
                    ? "0 0 30px rgba(239, 68, 68, 0.3), 0 10px 20px rgba(0, 0, 0, 0.2)"
                    : undefined,
                willChange: "transform",
                textAlign: isRTL ? "right" : "left",
            }}
            className={`p-6 shadow-lg hover:shadow-2xl transition-shadow duration-150 ease-out cursor-pointer group relative overflow-hidden
                ${isDanger ? "animate-pulse-slow" : ""}`}
        >
            {/* Danger background animation */}
            {isDanger && (
                <>
                    <motion.div
                        className="absolute inset-0 opacity-5"
                        style={{
                            background:
                                "repeating-linear-gradient(45deg, #ef4444 0 30px, transparent 30px 80px)",
                            willChange: "background-position",
                            transform: "translateZ(0)",
                        }}
                        animate={{ backgroundPositionY: [0, 25000] }}
                        transition={{
                            duration: 200,
                            ease: "linear",
                            repeat: Infinity,
                            repeatType: "loop",
                        }}
                    />
                    <motion.div
                        className="absolute inset-0"
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            background:
                                "radial-gradient(circle at center, #ef444440 0%, transparent 70%)",
                        }}
                    />
                    <motion.div
                        className={`absolute top-2 ${isRTL ? "left-2" : "right-2"}`}
                        animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <span className="text-4xl opacity-20">☠️</span>
                    </motion.div>
                </>
            )}

            {/* Hover background tint */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-150"
                style={{
                    background: `linear-gradient(135deg, ${section.color}40 0%, transparent 100%)`,
                }}
            />

            <div className="relative flex items-start gap-4">
                {/* Icon */}
                <div
                    style={{
                        backgroundColor: isDanger ? "#fee2e2" : `${section.color}20`,
                        color: section.color,
                    }}
                    className={`p-4 rounded-xl group-hover:scale-110 transition-transform duration-150 ease-out flex-shrink-0 ${isDanger ? "shadow-lg shadow-red-500/50" : ""
                        }`}
                >
                    <Icon size={28} />
                </div>

                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                    <h3
                        style={{ color: isDanger ? "#dc2626" : tokens.colors.text }}
                        className="text-xl font-bold mb-1 transition-all duration-150"
                    >
                        {section.title}
                    </h3>
                    <p style={{ color: tokens.colors.textSub }} className="text-sm">
                        {section.description}
                    </p>
                </div>

                {/* Arrow — flips for RTL */}
                <ArrowIcon
                    size={24}
                    style={{ color: isDanger ? "#dc2626" : tokens.colors.textSub }}
                    className={`group-hover:${isRTL ? "-translate-x-1" : "translate-x-1"} transition-transform duration-150 ease-out flex-shrink-0`}
                />
            </div>
        </motion.button>
    );
};