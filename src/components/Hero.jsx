import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BarChart3, Search } from "lucide-react";
import { designTokens } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import HeroMap from "./HeroMap";
import authService from "../services/authService";
import { useLanguage } from "../i18n/LanguageContext";

const easeOut = [0.22, 1, 0.36, 1];

const Hero = () => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const isLoggedIn = authService.isLoggedIn();

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
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0 },
    };

    const titlePart1 = t("hero.titlePart1");
    const titlePart2 = t("hero.titlePart2");

    return (
        <section
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
                fontFamily: tokens.typography.fontFamily,
                backgroundImage: `linear-gradient(180deg, ${tokens.colors.surfaceGlass || tokens.colors.surface} 0%, transparent 68%), radial-gradient(circle at 18% 12%, ${(tokens.colors.gold || tokens.colors.primary)}24 0%, transparent 34%), radial-gradient(circle at 84% 4%, ${tokens.colors.accent}16 0%, transparent 30%)`,
            }}
            className="relative flex flex-col items-center justify-center text-center pb-20 pt-32 transition-all duration-500 overflow-hidden"
        >
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${tokens.colors.borderStrong || tokens.colors.border}, transparent)` }}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: easeOut }}
                className="px-4"
            >
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.45, ease: easeOut }}
                    className={`premium-glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                    style={{ color: tokens.colors.textSub }}
                >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.gold || tokens.colors.primary }} />
                    {t("hero.badge")}
                </motion.div>

                <motion.h1
                    style={{ fontFamily: tokens.typography.fontFamily }}
                    className="text-4xl md:text-6xl font-black mb-6 flex justify-center flex-wrap gap-x-3 gap-y-1 leading-[1.1] pb-1"
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

                <motion.p
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ color: tokens.colors.textSub }}
                    className="text-base md:text-xl mb-10 max-w-3xl mx-auto leading-relaxed"
                >
                    {t("hero.subtitle")}
                </motion.p>

                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-14">
                    <Link
                        to="/buy"
                        style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                        className="premium-focus px-8 py-3.5 md:py-4 rounded-xl text-lg font-bold hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] cursor-pointer"
                    >
                        <Search size={22} className="group-hover:scale-110 transition-transform" />
                        {t("hero.btnSearch")}
                    </Link>

                    <Link
                        to="/market-dashboard"
                        style={{ backgroundColor: tokens.colors.surface, color: tokens.colors.text, border: `1px solid ${tokens.colors.border}` }}
                        className="premium-focus px-8 py-3.5 md:py-4 rounded-xl text-lg font-bold hover:bg-black/5 dark:hover:bg-white/5 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
                    >
                        <BarChart3 size={22} style={{ color: tokens.colors.gold || tokens.colors.primary }} />
                        {t("hero.btnMarket")}
                    </Link>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.62, ease: easeOut }}
                className="w-full max-w-7xl mx-auto px-4"
            >
                <HeroMap />
            </motion.div>
        </section>
    );
};

export default Hero;