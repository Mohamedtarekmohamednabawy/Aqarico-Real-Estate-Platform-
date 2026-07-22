import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { useTheme } from '../theme/useTheme';
import { useCurrency } from '../context/CurrencyContext';
import { dataManager } from '../data/dataManager';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import { useLanguage } from '../i18n/LanguageContext';
import {
    TrendingUp,
    Home,
    MapPin,
    ArrowLeft,
    Calendar,
    Maximize,
    Shield,
    Zap,
    Droplet,
    ChevronRight,
    Building2,
    DollarSign,
    Info,
    CheckCircle2
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const LocationDashboard = () => {
    const { locationName } = useParams();
    const navigate = useNavigate();
    const { tokens } = useTheme();
    const { t, language } = useLanguage();
    const { formatPrice, convertPrice, currency, currencies } = useCurrency();
    const currencyData = currencies[currency];
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await dataManager.getLocationStats(locationName);
                if (data) {
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch location stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
        window.scrollTo(0, 0);
    }, [locationName]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: tokens.colors.background }}>
                <div
                    className="premium-loader-ring"
                    style={{
                        "--loader-primary": tokens.colors.primary,
                        "--loader-accent": tokens.colors.gold || tokens.colors.secondary,
                        "--loader-muted": tokens.colors.border,
                    }}
                />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ backgroundColor: tokens.colors.background }}>
                <h1 className="text-2xl font-bold">Location data not found</h1>
                <button
                    onClick={() => navigate('/market-dashboard')}
                    className="px-6 py-3 rounded-full font-bold text-white transition-all hover:scale-105 active:scale-95"
                    style={{ backgroundColor: tokens.colors.primary }}
                >
                    Back to Market Dashboard
                </button>
            </div>
        );
    }

    const fmt = n => formatPrice(n || 0);
    const fmtShort = n => {
        if (!n) return '0';
        const converted = convertPrice(n);
        const sym = currencyData.symbol;
        if (converted >= 1000000) return (converted / 1000000).toFixed(1) + 'M ' + sym;
        if (converted >= 1000) return Math.round(converted / 1000) + 'K ' + sym;
        return converted + ' ' + sym;
    };

    const chartData = {
        labels: stats.trend?.map(t => t.year) || [],
        datasets: [
            {
                label: `Avg Price / m² (${currencyData.symbol})`,
                data: stats.trend?.map(t => t.avg_ppm2) || [],
                borderColor: tokens.colors.primary,
                backgroundColor: tokens.colors.primary + '20',
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 10,
                pointBackgroundColor: tokens.colors.primary,
                borderWidth: 3
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: tokens.colors.surface,
                titleColor: tokens.colors.text,
                bodyColor: tokens.colors.text,
                borderColor: tokens.colors.border,
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                displayColors: false,
                callbacks: {
                    label: (context) => `Avg Price: ${fmt(context.parsed.y)} / m²`
                }
            }
        },
        scales: {
            y: {
                grid: { color: tokens.colors.border + '40', drawBorder: false },
                ticks: { color: tokens.colors.text + '80', font: { size: 10, weight: 'bold' } }
            },
            x: {
                grid: { display: false },
                ticks: { color: tokens.colors.text + '80', font: { size: 10, weight: 'bold' } }
            }
        }
    };

    const getScoreBadge = (ppm2, districtAvg) => {
        const ratio = ppm2 / (districtAvg || ppm2 || 1);
        if (ratio >= 1.2) return { label: t("market.premium"), color: '#065F46', bg: '#FFFFFF' };
        if (ratio >= 0.8) return { label: t("market.midRange"), color: '#854F0B', bg: '#FFFFFF' };
        return { label: t("market.affordable"), color: '#5F5E5A', bg: '#FFFFFF' };
    };

    const metrics = stats.metrics || {};
    const badge = getScoreBadge(metrics.avg_ppm2, metrics.district_avg_ppm2);

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: tokens.colors.background }}>
            <NavBar />

            <main className="flex-grow pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="mb-12">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 mb-8 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
                        >
                            <ArrowLeft size={16} className={language === 'ar' ? 'rotate-180' : ''} /> {t("common.back")}
                        </button>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <span style={{ color: tokens.colors.primary }} className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-white/50 rounded-full border border-black/5">
                                        {t("market.locationAnalysis")}
                                    </span>
                                    <span style={{ color: badge.color }} className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-white rounded-full border border-black/5 shadow-sm">
                                        {badge.label}
                                    </span>
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-2 italic">
                                    {stats.name}
                                </h1>
                                <p className="text-xl opacity-40 font-bold uppercase tracking-tight flex items-center gap-2">
                                    <MapPin size={20} /> {stats.district || 'Alexandria'}, Alexandria
                                </p>
                            </div>

                            <button
                                onClick={() => navigate(`/buy?location=${stats.name}&district=${stats.district}`)}
                                className="group px-8 py-5 rounded-3xl font-black uppercase tracking-widest text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                                style={{ backgroundColor: tokens.colors.primary }}
                            >
                                View Listings <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {[
                            { label: 'Avg Price/m²', value: fmt(metrics.avg_ppm2), unit: `${currencyData.symbol} / m²`, icon: TrendingUp },
                            { label: 'Avg Property Price', value: fmtShort(metrics.avg_price), unit: 'Avg', icon: DollarSign },
                            { label: 'Total Listings', value: metrics.total_listings || 0, unit: 'Active', icon: Building2 },
                            { label: 'Avg Area', value: metrics.avg_area || 0, unit: 'm²', icon: Maximize },
                        ].map((m, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}
                                className="p-8 rounded-3xl border shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: tokens.colors.primary + '10', color: tokens.colors.primary }}>
                                    <m.icon size={24} />
                                </div>
                                <div className="text-xs font-black uppercase tracking-widest opacity-40 mb-1">{m.label}</div>
                                <div className="text-4xl font-black tracking-tighter italic">
                                    {m.value} <span className="text-sm not-italic opacity-40">{m.unit}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Main Analysis Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        {/* Area Chart - Trend */}
                        <div className="lg:col-span-2 p-8 rounded-[40px] border shadow-sm" style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}>
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-2xl font-black italic tracking-tight">Appreciation History</h2>
                                    <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Pricing Trend 2000–2026</p>
                                </div>
                                <div className="px-4 py-2 rounded-2xl bg-black/5 text-[10px] font-black uppercase tracking-widest">
                                    Last Updated Today
                                </div>
                            </div>
                            <div className="h-[350px]">
                                {stats.trend?.length > 1 ? (
                                    <Line data={chartData} options={chartOptions} />
                                ) : (
                                    <div className="h-full flex items-center justify-center border-2 border-dashed rounded-3xl opacity-20">
                                        <p className="font-bold">Not enough historical data for trend analysis</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Comparison Card */}
                        <div className="p-8 rounded-[40px] border shadow-sm bg-gradient-to-br from-black to-neutral-800 text-white border-none flex flex-col justify-between h-full">
                            <div>
                                <h3 className="text-xl font-black italic mb-6">Market Standing</h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Price vs District Avg</div>
                                        <div className="flex items-end gap-3 font-black">
                                            <span className="text-5xl italic">{metrics.district_avg_ppm2 ? Math.round((metrics.avg_ppm2 / metrics.district_avg_ppm2) * 100) : 100}%</span>
                                            <span className="text-xs mb-2 opacity-60 uppercase">{metrics.avg_ppm2 > metrics.district_avg_ppm2 ? 'Above' : 'Below'} Avgerage</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${metrics.district_avg_ppm2 ? Math.min(100, (metrics.avg_ppm2 / metrics.district_avg_ppm2) * 80) : 50}%` }}
                                            className="h-full bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
                                    <Info size={14} className="text-white/40" /> Insight
                                </div>
                                <p className="mt-2 text-sm opacity-60 leading-relaxed font-medium">
                                    {stats.name} is one of the {badge.label.toLowerCase()} zones in {stats.district || 'this area'}, offering {metrics.avg_ppm2 > metrics.district_avg_ppm2 ? 'premium' : 'better value'} investments compared to neighbors.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Analytics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Infrastructure Score */}
                        <div className="p-8 rounded-[40px] border shadow-sm" style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}>
                            <h3 className="text-2xl font-black italic mb-8 tracking-tight">Infrastructure Score</h3>
                            <div className="grid grid-cols-2 gap-8">
                                {[
                                    { label: 'Elevators', icon: Building2, value: stats.amenities?.elevator || 0 },
                                    { label: 'Natural Gas', icon: Zap, value: stats.amenities?.gas || 0 },
                                    { label: 'Security', icon: Shield, value: stats.amenities?.security || 0 },
                                    { label: 'Modern Finish', icon: CheckCircle2, value: 85 }, // Simulated
                                ].map((a, i) => (
                                    <div key={i} className="flex flex-col gap-4">
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest opacity-40">
                                                <a.icon size={16} /> {a.label}
                                            </div>
                                            <div className="text-sm font-black italic">{a.value}%</div>
                                        </div>
                                        <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${a.value}%` }}
                                                className="h-full"
                                                style={{ backgroundColor: tokens.colors.primary }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Property Mix */}
                        <div className="p-8 rounded-[40px] border shadow-sm" style={{ backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border }}>
                            <h3 className="text-2xl font-black italic mb-8 tracking-tight">Property Mix</h3>
                            <div className="space-y-6">
                                {stats.categories?.map((c, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-black/5 border border-black/5 group hover:bg-black/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                                <Home size={20} style={{ color: tokens.colors.primary }} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black uppercase tracking-tight">{c.name}s</div>
                                                <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{c.count} Active Units</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black tracking-tighter" style={{ color: tokens.colors.primary }}>{fmtShort(c.avg_price)}</div>
                                            <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">AVG PRICE</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default LocationDashboard;
