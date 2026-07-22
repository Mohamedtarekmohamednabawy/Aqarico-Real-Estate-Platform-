import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, GitCompare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useComparison } from '../context/ComparisonContext';
import { designTokens } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { useLanguage } from '../i18n/LanguageContext';
import { optimizeImageUrl } from '../utils/imageUrl';

const easeOut = [0.22, 1, 0.36, 1];
const ComparisonBar = () => {
    const { compareList, removeFromCompare, clearCompare } = useComparison();
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const isRTL = language === 'ar';

    if (compareList.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ duration: 0.26, ease: easeOut }}
                className="fixed bottom-4 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[10900]"
                style={{ maxWidth: 560 }}
            >
                <div
                    style={{
                        backgroundColor: tokens.colors.surfaceGlass || tokens.colors.surface + 'e8',
                        borderColor: tokens.colors.border,
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 20px 50px -10px rgba(0,0,0,0.35)',
                        color: tokens.colors.text,
                    }}
                    className="rounded-2xl sm:rounded-[28px] border px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3"
                >
                    {/* Icon + label */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow"
                            style={{ backgroundColor: tokens.colors.primary, color: '#fff' }}>
                            <GitCompare size={15} strokeWidth={2.5} />
                        </div>
                        {/* Label: hidden on xs */}
                        <div className="hidden xs:block sm:block">
                            <p className="text-[9px] font-black uppercase tracking-widest leading-none opacity-40">
                                {t('compare.barComparing')}
                            </p>
                            <p className="text-[11px] font-black leading-none mt-0.5">
                                {compareList.length} / 4
                            </p>
                        </div>
                    </div>

                    {/* Thumbnails */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {compareList.map((p) => (
                            <motion.div key={p._id} layout className="relative flex-shrink-0">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border"
                                    style={{ borderColor: tokens.colors.border }}>
                                    <img
                                        src={optimizeImageUrl(p.images?.[0], {
                                            width: 96,
                                            height: 96,
                                            quality: 68,
                                            fallback: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=68&w=96&h=96',
                                        })}
                                        className="w-full h-full object-cover"
                                        alt={p.title}
                                        width={48}
                                        height={48}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                                <button
                                    onClick={() => removeFromCompare(p._id)}
                                    className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow border cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-150"
                                    style={{ borderColor: tokens.colors.surface }}
                                >
                                    <X size={9} strokeWidth={4} />
                                </button>
                            </motion.div>
                        ))}

                        {/* Add slot */}
                        {compareList.length < 4 && (
                            <Link to="/buy" title={t('compare.barAddTitle')}
                                className="premium-focus w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center opacity-40 hover:opacity-80 hover:scale-105 transition-all duration-200 cursor-pointer flex-shrink-0"
                                style={{ borderStyle: 'dashed', borderColor: tokens.colors.primary }}>
                                <span className="text-lg font-bold leading-none" style={{ color: tokens.colors.primary }}>+</span>
                            </Link>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Reset — icon-only on mobile, text label on sm+ */}
                        <button onClick={clearCompare}
                            className="premium-focus flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg opacity-30 hover:opacity-70 transition-opacity duration-200 cursor-pointer"
                            style={{ color: tokens.colors.text }}
                            title={t('compare.barReset')}>
                            <X size={14} strokeWidth={3} className="sm:hidden" />
                            <span className="hidden sm:block text-[9px] font-black uppercase tracking-widest">
                                {t('compare.barReset')}
                            </span>
                        </button>

                        <Link to="/compare"
                            className="premium-focus flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black uppercase tracking-widest text-white text-[10px] shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer"
                            style={{
                                background: tokens.colors.primary,
                                boxShadow: `0 8px 20px ${tokens.colors.primary}35`,
                            }}>
                            <span>{t('compare.barCompare')}</span>
                            {isRTL ? <ArrowLeft size={12} strokeWidth={3} /> : <ArrowRight size={12} strokeWidth={3} />}
                        </Link>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ComparisonBar;
