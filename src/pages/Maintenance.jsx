import React from 'react';
import { motion } from 'framer-motion';
import { Hammer, Mail, ShieldCheck } from 'lucide-react';
import { useTheme } from '../theme/useTheme';
import { designTokens } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { AnimatedThemeToggler } from '../theme/animated-theme-toggler';

const Maintenance = () => {
    const { themeName, toggleTheme } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
            style={{ backgroundColor: c.bg }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl w-full"
            >
                {/* Simplified Icon */}
                <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary || c.primary}dd)` }}
                >
                    <Hammer size={36} color="white" />
                </div>

                {/* Badge */}
                <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5">
                    <ShieldCheck size={12} style={{ color: c.primary }} />
                    <span
                        className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: c.primary }}
                    >
                        {t('maintenance.badge')}
                    </span>
                </div>

                {/* Content */}
                <h1
                    className="text-4xl md:text-5xl font-black mb-6 tracking-tight"
                    style={{ color: c.text }}
                >
                    {t('maintenance.title')}
                </h1>

                <p
                    className="text-base md:text-lg mb-12 font-medium opacity-60 leading-relaxed"
                    style={{ color: c.text }}
                >
                    {t('maintenance.description')}
                </p>

                {/* Contact */}
                <a
                    href="mailto:aqarico8@gmail.com"
                    className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: c.surfaceElevated + '30', borderColor: c.border }}
                >
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Mail size={18} />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-0.5" style={{ color: c.text }}>
                            {t('maintenance.support')}
                        </p>
                        <p className="font-bold text-sm" style={{ color: c.text }}>aqarico8@gmail.com</p>
                    </div>
                </a>
            </motion.div>

            <div
                className="absolute bottom-8 flex flex-col items-center gap-4"
            >
                <div className="flex items-center justify-center min-h-11 min-w-11">
                    <AnimatedThemeToggler
                        fromCenter={true}
                        checked={themeName === "dark"}
                        onCheckedChange={toggleTheme}
                        className="cursor-pointer hover:scale-110 transition-transform"
                    />
                </div>
                <div
                    className="text-[10px] font-bold uppercase tracking-widest opacity-20"
                    style={{ color: c.text }}
                >
                    {t('footer.copyright')}
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
