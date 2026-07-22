import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Github, Mail, Linkedin } from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { useLanguage } from "../i18n/LanguageContext";

const teamMembers = [
    { name: "Omar Refai Refai", nameAr: "عمر رفاعى رفاعى", id: "22010165", role: "Frontend UI UX", email: "omarmenisy32@gmail.com", github: "https://github.com/NinjaSphinXO", linkedin: "https://linkedin.com/in/omar-refaey-2875b0316" },
    { name: "Samir Mohammed Samir", nameAr: "سمير محمد سمير", id: "22010113", role: "Data Engineer", email: "samir.mohammed@gmail.com", github: "https://github.com/samirmohammed", linkedin: "https://linkedin.com/in/#" },
    { name: "Hamdy Mohammed Abdelazim", nameAr: "حمدى محمد عبدالعظيم", id: "22010086", role: "ML Engineer", email: "hamdymohmed999@gmail.com ", github: "https://github.com/HamdyMohamed2004", linkedin: "https://www.linkedin.com/in/hamdy-mohamed999" },
    { name: "Youssef Maged Ali", nameAr: "يوسف ماجد على", id: "22010310", role: "Backend Developer", email: "youssefmaged681@gmail.com", github: "https://github.com/youssefmaged681-ai", linkedin: "https://www.linkedin.com/in/youssef-maged-b0342a384" },
    { name: "Mohammed Manar Gamal", nameAr: "محمد منار جمال", id: "22012045", role: "Backend Developer", email: "mezomanar.mm@gmail.com", github: "https://github.com/Slizty", linkedin: "https://linkedin.com/in/#" },
    { name: "Mohammed Tarek Mohammed", nameAr: "محمد طارق محمد", id: "22010222", role: "ML Engineer", email: "mohamedtarekmohamed76@gmail.com", github: "https://github.com/Mohamedtarekmohamednabawy", linkedin: "https://www.linkedin.com/in/mohamed-tarek-07b878389" },
    { name: "Abdelrahman Saeed Abdelrahman", nameAr: "عبدالرحمن سعيد عبد الرحمن", id: "22010129", role: "Data Analyst", email: "abdelrahmansaied227@gmail.com", github: "https://github.com/abdosaied22", linkedin: "https://www.linkedin.com/in/abdelrahman-saied-010b85194" },
];

const ModernCard = ({ member, index, tokens }) => {
    const { t, language } = useLanguage();
    const displayName = language === 'ar' ? (member.nameAr || member.name) : member.name;
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 50 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 50 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["2.5deg", "-2.5deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-2.5deg", "2.5deg"]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXFromCenter = e.clientX - rect.left - width / 2;
        const mouseYFromCenter = e.clientY - rect.top - height / 2;
        x.set(mouseXFromCenter / width);
        y.set(mouseYFromCenter / height);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="w-full max-w-sm perspective-1000"
        >
            <motion.div
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                    backgroundColor: tokens.colors.surface + "80",
                    borderColor: tokens.colors.border,
                    willChange: "transform",
                }}
                whileHover={{
                    scale: 1.02,
                    y: -10,
                    boxShadow: `0 20px 40px ${tokens.colors.shadow || "rgba(0,0,0,0.2)"}`
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative p-8 pt-12 rounded-3xl border border-opacity-40 shadow-xl overflow-visible group cursor-pointer h-full flex flex-col items-center text-center"
            >
                {/* Gradient Border Glow */}
                <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                        background: `linear-gradient(135deg, ${tokens.colors.primary}40, transparent 40%, transparent 60%, ${tokens.colors.secondary}40)`,
                        zIndex: -1,
                        margin: "-2px",
                    }}
                />

                {/* Floating Avatar */}
                <motion.div
                    style={{
                        transform: "translateZ(60px)",
                        background: `linear-gradient(135deg, ${tokens.colors.primary}, ${tokens.colors.secondary})`,
                        boxShadow: `0 10px 25px ${tokens.colors.primary}60`,
                    }}
                    className="w-24 h-24 rounded-2xl rotate-3 flex items-center justify-center text-white text-3xl font-bold mb-6 group-hover:rotate-6 transition-transform duration-300"
                >
                    {displayName.charAt(0)}
                </motion.div>

                {/* Content */}
                <motion.div style={{ transform: "translateZ(40px)" }}>
                    <h3 className="text-2xl font-bold mb-2 tracking-tight">
                        {displayName}
                    </h3>
                    <div
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 tracking-wide uppercase"
                        style={{
                            backgroundColor: tokens.colors.primary + "20",
                            color: tokens.colors.primary
                        }}
                    >
                        {t(`about.roles.${member.role.toLowerCase().replace(/\s+/g, '')}`) || member.role}
                    </div>
                    <p style={{ color: tokens.colors.textSub }} className="font-mono text-sm opacity-80 mb-4">
                        ID: {member.id}
                    </p>

                    {/* Social Links */}
                    <div className="flex justify-center gap-4 mt-4">
                        <motion.a
                            href={`mailto:${member.email}`}
                            whileHover={{
                                scale: 1.2,
                                rotate: 15,
                                y: -3,
                                backgroundColor: tokens.colors.primary,
                                color: "#ffffff",
                                boxShadow: `0 8px 16px ${tokens.colors.primary}40`
                            }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className="p-3 rounded-full flex items-center justify-center"
                            style={{
                                backgroundColor: tokens.colors.primary + "15",
                                color: tokens.colors.primary
                            }}
                            title={member.email}
                        >
                            <Mail size={20} />
                        </motion.a>
                        <motion.a
                            href={member.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{
                                scale: 1.2,
                                rotate: -15,
                                y: -3,
                                backgroundColor: tokens.colors.text,
                                color: tokens.colors.bg,
                                boxShadow: `0 8px 16px ${tokens.colors.text}40`
                            }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className="p-3 rounded-full flex items-center justify-center"
                            style={{
                                backgroundColor: tokens.colors.text + "15",
                                color: tokens.colors.text
                            }}
                            title={t("about.githubProfile")}
                        >
                            <Github size={20} />
                        </motion.a>
                        <motion.a
                            href={member.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{
                                scale: 1.2,
                                rotate: 15,
                                y: -3,
                                backgroundColor: "#0077b5",
                                color: "#ffffff",
                                boxShadow: "0 8px 20px rgba(0, 119, 181, 0.5)"
                            }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className="p-3 rounded-full flex items-center justify-center cursor-pointer border-none"
                            style={{
                                backgroundColor: "#0077b515",
                                color: "#0077b5"
                            }}
                            title="LinkedIn"
                        >
                            <Linkedin size={20} />
                        </motion.a>
                    </div>
                </motion.div>

                {/* Decorative Elements */}
                <div
                    className="absolute top-4 right-4 w-2 h-2 rounded-full opacity-50"
                    style={{ backgroundColor: tokens.colors.accent }}
                />
                <div
                    className="absolute bottom-4 left-4 w-2 h-2 rounded-full opacity-50"
                    style={{ backgroundColor: tokens.colors.secondary }}
                />
            </motion.div>
        </motion.div>
    );
};

const AboutUs = () => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];

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
        visible: {
            opacity: 1,
            y: 0,
        },
    };

    const titlePart1 = t("about.titlePart1");
    const titlePart2 = t("about.titlePart2");

    return (
        <div
            style={{
                backgroundColor: tokens.colors.bg,
                color: tokens.colors.text,
                minHeight: "100vh",
                backgroundImage: `radial-gradient(circle at 50% 0%, ${tokens.colors.primary}15 0%, transparent 50%)`,
            }}
            className="flex flex-col"
        >
            <NavBar />
            <main className="flex-grow pt-32 pb-20 px-6 max-w-7xl mx-auto w-full">
                {/* Hero Section */}
                <div className="text-center mb-20 relative overflow-visible">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45 }}
                        className={`premium-glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                        style={{ color: tokens.colors.textSub }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                        {t("about.badge")}
                    </motion.div>
                    <motion.h1
                        className="animated-page-title text-6xl md:text-8xl font-extrabold mb-6 flex justify-center flex-wrap gap-2 tracking-tighter"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {titlePart1.split(" ").map((word, index) => (
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
                        {titlePart2.split(" ").map((word, index) => (
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
                        {t("about.subtitle")}
                    </motion.p>
                </div>

                {/* Team Grid */}
                <div className="flex flex-wrap justify-center gap-8 perspective-1000">
                    {teamMembers.map((member, index) => (
                        <ModernCard
                            key={member.id}
                            member={member}
                            index={index}
                            tokens={tokens}
                        />
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default AboutUs;