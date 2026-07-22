import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, Home, Ruler, Activity, MapPin, Download } from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from "chart.js";

import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { dataManager } from "../data/dataManager";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useCurrency } from "../context/CurrencyContext";
import { MarketDashboardSkeleton } from "../components/skeletons/MarketDashboardSkeleton";
import { useLanguage } from "../i18n/LanguageContext";

const easeOut = [0.22, 1, 0.36, 1];

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, Filler
);

const MarketDashboard = () => {
    const chartRef = useRef(null);
    const { themeName } = useTheme();
    const { formatPrice, convertPrice, currency, currencies } = useCurrency();
    const { t, language } = useLanguage();
    const isRTL = language === "ar";
    const tokens = designTokens[themeName];
    const navigate = useNavigate();
    const currencyData = currencies[currency];

    const [marketData, setMarketData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState("districts");
    const [selectedDistrict, setSelectedDistrict] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await dataManager.getMarketStats({ type: "sale" });
                setMarketData(data);
            } catch (error) {
                console.error("Dashboard data error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [dataManager]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
    };
    const letterVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0 },
    };

    const fmt = (n) => formatPrice(n);

    // ── M / K suffixes conditioned on language ─────────────────────────
    const fmtShort = (n) => {
        if (!n) return "0";
        const converted = convertPrice(n);
        const sym = t(`currency.${currency}`);
        const space = language === "ar" ? " " : "";
        const M = t("market.million");
        const K = t("market.thousand");
        if (converted >= 1000000) return `${(converted / 1000000).toFixed(1)}${space}${M} ${sym}`;
        if (converted >= 1000) return `${Math.round(converted / 1000)}${space}${K} ${sym}`;
        return `${converted} ${sym}`;
    };

    // ── m² label ───────────────────────────────────────────────────────
    const areaUnit = t("market.areaM2");   // "م²" in AR, "m²" in EN

    const getBadge = (score) => {
        if (score >= 70) return { label: t("market.premium"), color: "#065F46", bg: "#FFFFFF" };
        if (score >= 40) return { label: t("market.midRange"), color: "#854F0B", bg: "#FFFFFF" };
        return { label: t("market.affordable"), color: "#5F5E5A", bg: "#FFFFFF" };
    };

    const handleDistrictClick = (name) => {
        if (!marketData) return;
        setSelectedDistrict(marketData.districts.find((d) => d.name === name));
        setView("locations");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const downloadChart = () => {
        const chart = chartRef.current;
        if (!chart) return;
        const link = document.createElement("a");
        link.download = `market-trend-${new Date().getFullYear()}.png`;
        link.href = chart.toBase64Image();
        link.click();
    };

    const handleBack = () => {
        setView("districts");
        setSelectedDistrict(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (isLoading || !marketData) {
        return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: tokens.colors.bg }}>
                <NavBar />
                <MarketDashboardSkeleton />
                <Footer />
            </div>
        );
    }

    const sortedDistricts = [...marketData.districts].sort(
        (a, b) => b.avg_price_per_m2 - a.avg_price_per_m2
    );

    const filteredLocations = selectedDistrict
        ? [...selectedDistrict.locations].sort((a, b) => b.avg_price_per_m2 - a.avg_price_per_m2)
        : [];

    const trendData = marketData.market_trend;

    // ── Line chart ─────────────────────────────────────────────────────
    const lineChartData = {
        labels: trendData.map((d) => d.year),
        datasets: [
            {
                label: t("market.salePerM2"),
                data: trendData.map((d) => d.avg_ppm2),
                borderColor: tokens.colors.primary,
                backgroundColor: tokens.colors.primary + "10",
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointHoverRadius: 8,
                showLine: true,
                spanGaps: true,
                yAxisID: "y",
            },
            {
                label: t("market.totalPrice"),
                data: trendData.map((d) => d.avg_price),
                borderColor: "#378ADD",
                borderDash: [5, 5],
                tension: 0.4,
                fill: false,
                pointRadius: 6,
                showLine: true,
                spanGaps: true,
                yAxisID: "y2",
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                rtl: isRTL,
                backgroundColor: tokens.colors.surface,
                titleColor: tokens.colors.text,
                bodyColor: tokens.colors.textSub,
                borderColor: tokens.colors.border,
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: (context) => {
                        const label = context.dataset.label;
                        const value = fmt(context.raw);
                        const suffix = context.datasetIndex === 0 ? ` / ${areaUnit}` : "";
                        return ` ${label}: ${value}${suffix}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: tokens.colors.textSub, font: { size: 11 } },
            },
            y: {
                position: isRTL ? "right" : "left",
                beginAtZero: false,
                grid: { color: tokens.colors.border + "30" },
                ticks: { color: tokens.colors.textSub, font: { size: 10 } },
                title: {
                    display: true,
                    text: `${t(`currency.${currency}`)} / ${areaUnit}`,
                    color: tokens.colors.textSub,
                    font: { size: 10 },
                },
            },
            y2: {
                position: isRTL ? "left" : "right",
                beginAtZero: false,
                grid: { display: false },
                ticks: {
                    color: tokens.colors.textSub,
                    font: { size: 10 },
                    callback: (v) => fmtShort(v),
                },
                title: {
                    display: true,
                    text: t("market.totalPrice"),
                    color: tokens.colors.textSub,
                    font: { size: 10 },
                },
            },
        },
    };

    // ── Bar chart ──────────────────────────────────────────────────────
    // Sort once so labels and data are guaranteed to be in the same order
    const sortedBarLocations = selectedDistrict
        ? [...selectedDistrict.locations].sort((a, b) => b.avg_price_per_m2 - a.avg_price_per_m2)
        : [];

    const barChartData = selectedDistrict
        ? {
            labels: sortedBarLocations.map((l) => t(`locations.${l.name}`, l.name)),
            datasets: [
                {
                    label: t("market.avgSalePerM2"),
                    data: sortedBarLocations.map((l) => l.avg_price_per_m2),
                    backgroundColor: tokens.colors.primary + "80",
                    hoverBackgroundColor: tokens.colors.primary,
                    borderRadius: 6,
                    // No fixed barThickness — let Chart.js size bars to fit all locations
                    barPercentage: 0.7,
                    categoryPercentage: 0.85,
                },
            ],
        }
        : null;

    const barChartOptions = {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                rtl: isRTL,
                backgroundColor: tokens.colors.surface,
                titleColor: tokens.colors.text,
                bodyColor: tokens.colors.textSub,
                padding: 10,
                callbacks: {
                    label: (c) => {
                        const val = fmt(c.raw);
                        return ` ${c.dataset.label}: ${val} / ${areaUnit}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: tokens.colors.textSub,
                    callback: (v) => fmtShort(v), // ← M/K translated
                },
            },
            y: {
                position: isRTL ? "right" : "left",
                grid: { display: false },
                ticks: {
                    color: tokens.colors.text,
                    font: { weight: "bold" },
                    padding: 10
                },
                // Reverse axis for RTL so highest value stays at top
                reverse: false,
            },
        },
    };

    return (
        <div style={{ backgroundColor: tokens.colors.bg, minHeight: "100vh", color: tokens.colors.text }}>
            <NavBar />

            <main className="pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {view === "districts" ? (
                        <motion.div
                            key="districts-view"
                            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
                            transition={{ duration: 0.28, ease: easeOut }}
                        >
                            {/* Header */}
                            <div className="mb-10 text-center py-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1, duration: 0.45 }}
                                    className={`premium-glass mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                                    style={{ color: tokens.colors.textSub }}
                                >
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                                    {t("market.badge")}
                                </motion.div>
                                <motion.h1
                                    style={{ fontFamily: tokens.typography.fontFamily, lineHeight: 1.2 }}
                                    className="animated-page-title text-4xl md:text-6xl font-black mb-5 flex justify-center flex-wrap gap-x-3 gap-y-1"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {t("market.titlePart1").split(" ").map((word, i) => (
                                        <motion.span
                                            key={`p1-${i}`}
                                            variants={letterVariants}
                                            transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                            className="inline-block"
                                            style={{ color: tokens.colors.text }}
                                        >
                                            {word}
                                        </motion.span>
                                    ))}
                                    {t("market.titlePart2").split(" ").map((word, i) => (
                                        <motion.span
                                            key={`p2-${i}`}
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
                                    className="text-base md:text-xl max-w-3xl mx-auto leading-relaxed"
                                >
                                    {t("market.subtitle")}
                                </motion.p>
                            </div>

                            {/* KPI cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                                {[
                                    { label: t("market.totalForSale"), val: marketData.total_listings.toLocaleString(), sub: t("market.activeListings"), icon: Home },
                                    { label: t("market.avgSalePerM2"), val: `${fmt(marketData.overall_avg_ppm2)} / ${areaUnit}`, sub: currencyData.symbol, icon: Ruler },
                                    { label: t("market.avgSaleValue"), val: fmtShort(marketData.overall_avg_price), sub: t("market.propertyAverage"), icon: TrendingUp },
                                    { label: t("market.districts"), val: marketData.districts.length, sub: t("market.managedAreas"), icon: Activity },
                                ].map((m, i) => (
                                    <div
                                        key={i}
                                        style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                                        className="p-5 rounded-2xl border shadow-sm"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">{m.label}</p>
                                            <m.icon size={16} className="opacity-40" />
                                        </div>
                                        <div className="text-2xl font-bold mb-1">{m.val}</div>
                                        <div className="text-xs opacity-50">{m.sub}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Line chart */}
                            <div
                                style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                                className="p-8 rounded-3xl border mb-12 shadow-sm"
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h2 className="text-xl font-bold">{t("market.salesAppreciation")}</h2>
                                        <div className="flex gap-4 text-xs font-medium mt-2">
                                            <span className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                                                {t("market.salePerM2")}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                {t("market.totalPrice")}
                                            </span>
                                        </div>
                                    </div>
                                    <motion.div
                                        onClick={downloadChart}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="cursor-pointer p-1 opacity-60 hover:opacity-100 transition-opacity"
                                        style={{ color: tokens.colors.text }}
                                        title={t("market.saveAsImage")}
                                    >
                                        <Download size={20} />
                                    </motion.div>
                                </div>
                                <div className="h-64">
                                    <Line ref={chartRef} data={lineChartData} options={chartOptions} />
                                </div>
                            </div>

                            {/* District cards */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold">{t("market.salesByDistrict")}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {sortedDistricts.map((d, i) => {
                                    const badge = getBadge(d.score);
                                    return (
                                        <motion.div
                                            key={d.name}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.035, duration: 0.36, ease: easeOut }}
                                            onClick={() => handleDistrictClick(d.name)}
                                            style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                                            className="group rounded-3xl border overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                                        >
                                            <div className="relative h-40 overflow-hidden">
                                                <img src={d.image} alt={d.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                <div className="absolute top-4 left-4">
                                                    <span style={{ backgroundColor: badge.bg, color: badge.color }} className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="text-lg font-bold">{t(`districts.${d.name}`, d.name)}</h3>
                                                    <div className="text-[10px] uppercase font-bold opacity-40">{d.count} {t("market.salesTitle")}</div>
                                                </div>
                                                <div className="flex items-baseline gap-1 mb-4 whitespace-nowrap">
                                                    <span className="text-xl font-black" style={{ color: tokens.colors.primary }}>{fmt(d.avg_price_per_m2)}</span>
                                                    <span className="text-[10px] opacity-40 font-bold uppercase">/ {areaUnit}</span>
                                                </div>
                                                <div className="space-y-2 mb-4">
                                                    <div className="flex justify-between text-xs font-medium opacity-60">
                                                        <span>{t("market.avgSale")}</span>
                                                        <span>{fmtShort(d.avg_price)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="locations-view"
                            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                            transition={{ duration: 0.28, ease: easeOut }}
                        >
                            {/* Location header */}
                            <div className="flex items-center gap-4 mb-8">
                                <button
                                    onClick={handleBack}
                                    style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                                    className="p-3 rounded-2xl border hover:scale-110 transition-all cursor-pointer"
                                >
                                    <ArrowLeft size={20} className={isRTL ? "rotate-180" : ""} />
                                </button>
                                <div>
                                    <h1 className="text-3xl font-bold">
                                        {t("market.salesTitle")} {t(`districts.${selectedDistrict.name}`, selectedDistrict.name)}
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm opacity-50 font-medium">
                                        <MapPin size={14} />
                                        {t("market.alexandria")} / {t(`districts.${selectedDistrict.name}`, selectedDistrict.name)}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                                {/* Bar chart */}
                                <div
                                    style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                                    className="lg:col-span-2 p-8 rounded-3xl border shadow-sm"
                                >
                                    <h3 className="text-lg font-bold mb-6">{t("market.salesPriceDistribution")}</h3>
                                    {/* Height scales with number of locations so all bars are always visible */}
                                    <div style={{ height: `${Math.max(320, sortedBarLocations.length * 44)}px` }}>
                                        {barChartData && <Bar data={barChartData} options={barChartOptions} />}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="space-y-6">
                                    {[
                                        { label: t("market.avgYearBuilt"), val: selectedDistrict.avg_year_built, sub: t("market.structureAge") },
                                        { label: t("market.avgArea"), val: `${selectedDistrict.avg_area} ${areaUnit}`, sub: t("market.livingSpace") },
                                        { label: t("market.marketRank"), val: "#" + (sortedDistricts.findIndex(d => d.name === selectedDistrict.name) + 1), sub: t("market.inAlexandria") },
                                    ].map((s, i) => (
                                        <div
                                            key={i}
                                            style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                                            className="p-6 rounded-3xl border shadow-sm"
                                        >
                                            <p className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-2">{s.label}</p>
                                            <div className="text-3xl font-black mb-1">{s.val}</div>
                                            <p className="text-xs opacity-50">{s.sub}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Location cards */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold">
                                    {t("market.neighborhoodSales")}{" "}
                                    {t(`districts.${selectedDistrict.name}`, selectedDistrict.name)}
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredLocations.map((l, i) => (
                                    <motion.div
                                        key={l.name}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.035, duration: 0.32, ease: easeOut }}
                                        style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                                        className="p-1 rounded-3xl border group shadow-sm hover:shadow-lg transition-all"
                                    >
                                        <div className="flex items-center gap-5 p-5">
                                            <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                                                <img src={l.image} alt={l.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-bold truncate mb-1">
                                                    {t(`locations.${l.name}`, l.name)}
                                                </h3>
                                                <div className="flex items-baseline gap-1 mb-2 whitespace-nowrap">
                                                    <span className="text-xl font-black" style={{ color: tokens.colors.primary }}>{fmt(l.avg_price_per_m2)}</span>
                                                    <span className="text-[10px] opacity-40 font-bold uppercase">/ {areaUnit}</span>
                                                </div>
                                                <div className="flex gap-4 opacity-50 text-[10px] font-bold uppercase tracking-wider">
                                                    <span>{l.count} {t("market.salesTitle")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <Footer />
        </div>
    );
};

export default MarketDashboard;