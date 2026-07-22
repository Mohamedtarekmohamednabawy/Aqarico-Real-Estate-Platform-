import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X, MapPin, Ruler, Bed, Bath, DollarSign, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useComparison } from '../context/ComparisonContext';
import { useTheme } from '../theme/useTheme';
import { designTokens } from '../theme/tokens';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import { useCurrency } from '../context/CurrencyContext';
import propertyService from '../services/propertyService';
import { useLanguage } from '../i18n/LanguageContext';
import { optimizeImageUrl } from '../utils/imageUrl';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=72&w=640&h=480';

const ComparePage = () => {
    const { ids } = useParams();                                     // present only on /compare/:ids
    const { compareList, clearCompare, removeFromCompare, loadCompareList } = useComparison();
    const navigate = useNavigate();
    const { themeName } = useTheme();
    const { formatPrice } = useCurrency();
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
        visible: { opacity: 1, y: 0 },
    };



    const [hydrating, setHydrating] = useState(false);
    const [hydrateError, setHydrateError] = useState(null);

    const ROWS = [
        { labelKey: 'compare.price', icon: DollarSign, getValue: (p, fmt) => fmt(p.price), highlight: true },
        { labelKey: 'compare.pricePerM2', icon: TrendingUp, getValue: (p, fmt) => { const v = p.pricePerM2 || (p.price / p.area); return v ? fmt(Math.round(v)) + ' /m²' : 'N/A'; } },
        { labelKey: 'compare.area', icon: Ruler, getValue: (p) => `${p.area} m²` },
        { labelKey: 'compare.district', icon: MapPin, getValue: (p) => p.district || 'N/A' },
        { labelKey: 'compare.location', icon: MapPin, getValue: (p) => p.location || 'N/A' },
        { labelKey: 'compare.bedrooms', icon: Bed, getValue: (p) => p.bedrooms ?? 'N/A' },
        { labelKey: 'compare.bathrooms', icon: Bath, getValue: (p) => p.bathrooms ?? 'N/A' },
        { labelKey: 'compare.built', icon: Calendar, getValue: (p) => p.yearBuilt || 'N/A' },
    ];

    // ── When arriving via /compare/:ids (AI chatbot link) ─────────────────
    useEffect(() => {
        if (!ids) return;                                            // normal /compare route — skip

        const idList = ids.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
        if (idList.length < 2) return;

        const fetchAndLoad = async () => {
            setHydrating(true);
            setHydrateError(null);
            try {
                const results = await Promise.all(
                    idList.map(id => propertyService.getById(id))
                );
                // Unwrap { data: property } envelope if present, then filter nulls
                const valid = results
                    .map(r => r?.data ?? r)
                    .filter(Boolean);
                if (valid.length < 2) throw new Error('Could not load enough properties.');
                loadCompareList(valid);
            } catch (err) {
                console.error('[ComparePage] Failed to hydrate from URL ids:', err);
                setHydrateError(t('compare.hydrateError'));
            } finally {
                setHydrating(false);
            }
        };

        fetchAndLoad();
    }, [ids]);                                                       // only re-run if the ids segment changes

    const count = compareList.length;

    // ── Loading state (AI route is fetching properties) ───────────────────
    if (hydrating) {
        return <LoadingScreen isLoading={true} message={t('compare.loading')} />;
    }

    // ── Error state ────────────────────────────────────────────────────────
    if (hydrateError) {
        return (
            <div style={{ backgroundColor: tokens.colors.bg, minHeight: '100vh', color: tokens.colors.text }}>
                <NavBar />
                <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-6 gap-6">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
                        <X size={36} />
                    </div>
                    <p className="text-sm font-bold opacity-60 max-w-sm">{hydrateError}</p>
                    <button onClick={() => navigate('/buy')}
                        className="px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-white text-xs cursor-pointer"
                        style={{ backgroundColor: tokens.colors.primary }}>
                        {t('compare.browseListings')}
                    </button>
                </div>
                <Footer />
            </div>
        );
    }

    // ── Not enough to compare ──────────────────────────────────────────────
    if (count < 2) {
        return (
            <div style={{ backgroundColor: tokens.colors.bg, minHeight: '100vh', color: tokens.colors.text }}>
                <NavBar />
                <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-6">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                        style={{ backgroundColor: tokens.colors.primary + '15', color: tokens.colors.primary }}>
                        {count === 0 ? <X size={40} /> : <TrendingUp size={40} />}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter mb-4">
                        {count === 0 ? t('compare.nothingToCompare') : t('compare.addMoreProperties')}
                    </h1>
                    <p className="text-sm opacity-50 mb-10 max-w-md leading-relaxed">
                        {count === 0
                            ? t('compare.emptyHint')
                            : t('compare.remainingHint', {
                                count: count,
                                item: t('compare.property', { count: count }),
                                remaining: 4 - count,
                                remainingItem: t('compare.property', { count: 4 - count })
                            })}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={() => navigate('/buy')}
                            className="px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer text-xs"
                            style={{ backgroundColor: tokens.colors.primary }}>
                            {count === 0 ? t('compare.browseListings') : t('compare.addAnotherProperty')}
                        </button>
                        {count === 1 && (
                            <button onClick={clearCompare}
                                className="px-10 py-4 rounded-2xl font-black uppercase tracking-widest border-2 transition-all cursor-pointer text-xs"
                                style={{ borderColor: tokens.colors.border, color: tokens.colors.text }}>
                                {t('compare.resetSelection')}
                            </button>
                        )}
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    // ── Table geometry ─────────────────────────────────────────────────────
    const LABEL_W = 110;
    const COL_W = 175;
    const tableMinW = LABEL_W + count * COL_W;

    // ── Best-value helper ──────────────────────────────────────────────────
    const isBestValue = (labelKey, rawVal, allRaws) => {
        const nums = allRaws.map(v => parseFloat(String(v).replace(/[^0-9.]/g, '')));
        if (nums.some(isNaN) || nums.length < 2) return false;
        const myNum = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
        return labelKey === 'compare.price' || labelKey === 'compare.pricePerM2'
            ? myNum === Math.min(...nums)
            : myNum === Math.max(...nums);
    };

    return (
        <div style={{ backgroundColor: tokens.colors.bg, minHeight: '100vh', color: tokens.colors.text }} className="flex flex-col">
            <NavBar />

            <main className="flex-1 w-full max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-8 sm:mb-10">
                    <div>
                        <button onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-all cursor-pointer mb-6"
                            style={{ color: tokens.colors.text }}>
                            <ArrowLeft size={13} /> {t('common.back')}
                        </button>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.45 }}
                            className={`premium-glass mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                            style={{ color: tokens.colors.textSub }}
                        >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                            {t("compare.badge")}
                        </motion.div>
                        <motion.h1
                            className="text-2xl sm:text-4xl md:text-5xl font-black italic tracking-tighter leading-none mb-4 flex flex-wrap gap-x-2"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {t("compare.titlePart1").split(" ").map((word, index) => (
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
                            {t("compare.titlePart2").split(" ").map((word, index) => (
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
                            className="text-[10px] font-black uppercase tracking-widest opacity-30"
                        >
                            {t('compare.propertyCount', { count })} · {t('compare.upToFour')}
                        </motion.p>
                    </div>
                    <button onClick={clearCompare}
                        className="flex-shrink-0 px-4 py-2 rounded-xl border flex items-center gap-2 font-black uppercase tracking-widest text-[9px] opacity-40 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer mt-1"
                        style={{ borderColor: tokens.colors.border }}>
                        <X size={12} /> {t('compare.clearAll')}
                    </button>
                </div>

                {/* Scrollable table */}
                <div className="w-full overflow-x-auto rounded-2xl border shadow-xl"
                    style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface }}>
                    <div style={{ minWidth: tableMinW }}>

                        {/* ── Property header row ── */}
                        <div className="flex border-b" style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.bg + '60' }}>
                            <div className="flex-shrink-0 border-r p-3 flex items-end"
                                style={{ width: LABEL_W, borderColor: tokens.colors.border }}>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-25">{t('compare.propertyLabel')}</span>
                            </div>
                            {/* divide-x renders borders only between columns — no missing lines */}
                            <div className="flex flex-1 divide-x" style={{ borderColor: tokens.colors.border }}>
                                {compareList.map((p, idx) => (
                                    <div key={p._id || idx} className="flex-1 p-4 relative group"
                                        style={{ borderColor: tokens.colors.border, minWidth: COL_W }}>
                                        <div className="w-full rounded-2xl overflow-hidden mb-3 border relative shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:translate-y-[-2px]"
                                            style={{ aspectRatio: '4/3', borderColor: tokens.colors.border }}>
                                            <img
                                                src={optimizeImageUrl(p.images?.[0], {
                                                    width: 640,
                                                    height: 480,
                                                    quality: 72,
                                                    fallback: PLACEHOLDER,
                                                })}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                alt={p.title}
                                                width={640}
                                                height={480}
                                                loading="lazy"
                                                decoding="async"
                                            />
                                            <button onClick={() => removeFromCompare(p._id)}
                                                className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white transition-all shadow-lg cursor-pointer hover:bg-red-500 hover:scale-110 active:scale-95 backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100"
                                                style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                        </div>
                                        <p className="text-[12px] font-black italic tracking-tight line-clamp-2 leading-tight mb-2 min-h-[2.4em]"
                                            style={{ color: tokens.colors.text }}>
                                            {p.title}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="inline-block text-[10px] font-black px-2.5 py-1 rounded-lg"
                                                style={{ backgroundColor: tokens.colors.primary + '18', color: tokens.colors.primary }}>
                                                {formatPrice(p.price)}
                                            </span>
                                            {p.isVerified && (
                                                <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: tokens.colors.primary }} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>{/* /divide-x wrapper */}
                        </div>

                        {/* ── Data rows ── */}
                        {ROWS.map(({ labelKey, icon: Icon, getValue, highlight }, rowIdx) => {
                            const allRaws = compareList.map(p => getValue(p, formatPrice));
                            return (
                                <div key={labelKey} className="flex border-b last:border-b-0"
                                    style={{
                                        borderColor: tokens.colors.border,
                                        backgroundColor: highlight
                                            ? tokens.colors.primary + '07'
                                            : rowIdx % 2 !== 0
                                                ? tokens.colors.bg + '50'
                                                : 'transparent',
                                    }}>
                                    <div className="flex-shrink-0 border-r p-3 flex items-center gap-2"
                                        style={{ width: LABEL_W, borderColor: tokens.colors.border }}>
                                        <Icon size={12} style={{ color: tokens.colors.primary, flexShrink: 0 }} />
                                        <span className="text-[10px] font-black uppercase tracking-wide leading-tight"
                                            style={{ color: tokens.colors.textSub }}>
                                            {t(labelKey)}
                                        </span>
                                    </div>
                                    <div className="flex flex-1 divide-x" style={{ borderColor: tokens.colors.border }}>
                                        {compareList.map((p) => {
                                            const raw = getValue(p, formatPrice);
                                            const best = isBestValue(labelKey, raw, allRaws);
                                            return (
                                                <div key={p._id + labelKey}
                                                    className="flex-1 p-3 flex items-center justify-center"
                                                    style={{ borderColor: tokens.colors.border, minWidth: COL_W }}>
                                                    <span className="text-xs font-black text-center leading-snug px-2 py-1 rounded-lg"
                                                        style={{
                                                            color: best ? tokens.colors.primary : tokens.colors.text,
                                                            backgroundColor: best ? tokens.colors.primary + '14' : 'transparent',
                                                            outline: best ? `1.5px solid ${tokens.colors.primary}30` : 'none',
                                                        }}>
                                                        {raw ?? '—'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>{/* /divide-x wrapper */}
                                </div>
                            );
                        })}

                        {/* ── CTA row ── */}
                        <div className="flex" style={{ backgroundColor: tokens.colors.bg + '40', borderTop: `1px solid ${tokens.colors.border}` }}>
                            <div className="flex-shrink-0 border-r p-3" style={{ width: LABEL_W, borderColor: tokens.colors.border }} />
                            <div className="flex flex-1 divide-x" style={{ borderColor: tokens.colors.border }}>
                                {compareList.map((p) => (
                                    <div key={p._id + 'cta'} className="flex-1 p-3 flex items-center justify-center"
                                        style={{ borderColor: tokens.colors.border, minWidth: COL_W }}>
                                        <button onClick={() => navigate(`/property/${p._id}`)}
                                            className="w-full py-2.5 px-4 rounded-xl font-black uppercase tracking-widest text-white shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all text-[10px] cursor-pointer"
                                            style={{ backgroundColor: tokens.colors.primary }}>
                                            {t('compare.viewDetails')}
                                        </button>
                                    </div>
                                ))}
                            </div>{/* /divide-x wrapper */}
                        </div>

                    </div>
                </div>

                {/* Add more hint */}
                {count < 4 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="mt-4 text-center text-[10px] font-black uppercase tracking-widest"
                        style={{ color: tokens.colors.textSub }}>
                        {t('compare.canAdd')}{' '}
                        <button onClick={() => navigate('/buy')}
                            className="underline cursor-pointer hover:opacity-70 transition-opacity"
                            style={{ color: tokens.colors.primary }}>
                            {t('compare.moreProperties', { count: 4 - count })}
                        </button>
                    </motion.p>
                )}

            </main>
            <Footer />
        </div>
    );
};

export default ComparePage;
