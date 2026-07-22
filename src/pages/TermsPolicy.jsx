import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { useLanguage } from "../i18n/LanguageContext";

const TermsPolicy = () => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const isRTL = language === "ar";
    const BackIcon = isRTL ? ArrowRight : ArrowLeft;

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

    const title = t("settings.terms");

    const [expandedSection, setExpandedSection] = useState(null);

    const sections = [
        {
            id: "terms",
            title: t("terms.termsTitle"),
            items: [
                { title: t("terms.t1Title"), body: t("terms.t1Body") },
                { title: t("terms.t2Title"), body: t("terms.t2Body") },
                { title: t("terms.t3Title"), body: t("terms.t3Body") },
                { title: t("terms.t4Title"), body: t("terms.t4Body") },
                { title: t("terms.t5Title"), body: t("terms.t5Body") },
                { title: t("terms.t6Title"), body: t("terms.t6Body") },
            ],
        },
        {
            id: "privacy",
            title: t("terms.privacyTitle"),
            items: [
                { title: t("terms.p1Title"), body: t("terms.p1Body") },
                { title: t("terms.p2Title"), body: t("terms.p2Body") },
                { title: t("terms.p3Title"), body: t("terms.p3Body") },
                { title: t("terms.p4Title"), body: t("terms.p4Body") },
                { title: t("terms.p5Title"), body: t("terms.p5Body") },
                { title: t("terms.p6Title"), body: t("terms.p6Body") },
            ],
        },
        {
            id: "agreement",
            title: t("terms.agreementTitle"),
            items: [
                { title: t("terms.a1Title"), body: t("terms.a1Body") },
                { title: t("terms.a2Title"), body: t("terms.a2Body") },
                { title: t("terms.a3Title"), body: t("terms.a3Body") },
                { title: t("terms.a4Title"), body: t("terms.a4Body") },
                { title: t("terms.a5Title"), body: t("terms.a5Body") },
            ],
        },
    ];

    return (
        <div
            className="flex flex-col"
            style={{ backgroundColor: tokens.colors.bg, minHeight: "100vh" }}
        >
            <NavBar />

            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-grow pt-24 px-4 md:px-6 lg:px-8 w-full max-w-4xl mx-auto pb-12"
            >
                <button
                    onClick={() => navigate("/settings")}
                    style={{ color: tokens.colors.text }}
                    className="flex items-center gap-2 mb-6 hover:opacity-70 transition cursor-pointer"
                >
                    <BackIcon size={20} />
                    {t("common.back")}
                </button>

                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div
                            style={{ backgroundColor: "#8b5cf620", color: "#8b5cf6" }}
                            className="p-4 rounded-xl"
                        >
                            <FileText size={32} />
                        </div>
                        <div>
                            <motion.h1
                                style={{ color: tokens.colors.text }}
                                className="text-4xl font-bold flex flex-wrap gap-x-2"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                {title.split(" ").map((word, i) => (
                                    <motion.span
                                        key={i}
                                        variants={letterVariants}
                                        transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                        className="inline-block"
                                    >
                                        {word}
                                    </motion.span>
                                ))}
                            </motion.h1>
                        </div>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="space-y-4"
                >
                    {sections.map((section) => (
                        <ExpandableSection
                            key={section.id}
                            title={section.title}
                            expanded={expandedSection === section.id}
                            onClick={() =>
                                setExpandedSection(expandedSection === section.id ? null : section.id)
                            }
                            tokens={tokens}
                            isRTL={isRTL}
                        >
                            <div
                                style={{ color: tokens.colors.textSub }}
                                className="space-y-5 text-sm leading-relaxed"
                            >
                                {section.items.map((item, i) => (
                                    <p key={i}>
                                        <strong
                                            className="block mb-1"
                                            style={{ color: tokens.colors.text }}
                                        >
                                            {i + 1}. {item.title}
                                        </strong>
                                        {item.body}
                                    </p>
                                ))}
                            </div>
                        </ExpandableSection>
                    ))}
                </motion.div>
            </motion.main>

            <Footer />
        </div>
    );
};

export default TermsPolicy;

const ExpandableSection = ({ title, expanded, onClick, children, tokens, isRTL }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
            backgroundColor: tokens.colors.surface,
            borderRadius: tokens.borderRadius.lg,
            borderColor: tokens.colors.border,
        }}
        className="border-2 overflow-hidden shadow-lg"
    >
        <button
            onClick={onClick}
            className="w-full px-6 py-4 flex items-center justify-between hover:opacity-80 transition cursor-pointer"
        >
            <span style={{ color: tokens.colors.text }} className="font-bold text-lg">
                {title}
            </span>
            {expanded ? (
                <ChevronUp size={24} style={{ color: tokens.colors.text }} className="flex-shrink-0" />
            ) : (
                <ChevronDown size={24} style={{ color: tokens.colors.text }} className="flex-shrink-0" />
            )}
        </button>
        <AnimatePresence>
            {expanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                >
                    <div className="px-6 pb-6">{children}</div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
);