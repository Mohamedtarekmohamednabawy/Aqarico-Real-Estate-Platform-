import React from 'react';
import { motion } from 'framer-motion';
import { FileQuestion, Home } from 'lucide-react';
import { useTheme } from '../theme/useTheme';
import { designTokens } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import { AnimatedThemeToggler } from '../theme/animated-theme-toggler';
import { Link } from 'react-router-dom';

const NotFound = () => {
    const { themeName, toggleTheme } = useTheme();
    const { t } = useLanguage();
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
                {/* Icon */}
                <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary || c.primary}dd)` }}
                >
                    <FileQuestion size={36} color="white" />
                </div>

                {/* Badge */}
                <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5">
                    <span
                        className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: c.primary }}
                    >
                        {t('notfound.badge', '404 Error')}
                    </span>
                </div>

                {/* Content */}
                <h1
                    className="text-4xl md:text-5xl font-black mb-6 tracking-tight"
                    style={{ color: c.text }}
                >
                    {t('notfound.title', 'Page Not Found')}
                </h1>

                <p
                    className="text-base md:text-lg mb-12 font-medium opacity-60 leading-relaxed"
                    style={{ color: c.text }}
                >
                    {t('notfound.description', "The page you are looking for doesn't exist or has been moved. Let's get you back on track.")}
                </p>

                {/* Home Button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl transition-all hover:scale-[1.05] active:scale-[0.95] shadow-lg hover:shadow-xl"
                    style={{
                        backgroundColor: c.primary,
                        color: 'white',
                        boxShadow: `0 10px 20px -5px ${c.primary}40`
                    }}
                >
                    <Home size={20} />
                    <span className="font-bold text-sm uppercase tracking-widest">
                        {t('notfound.backHome', 'Back to Home')}
                    </span>
                </Link>
            </motion.div>

            {/* Theme Toggler at bottom */}
            <div className="absolute bottom-8 flex flex-col items-center gap-4">
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

export default NotFound;
