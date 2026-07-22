import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../theme/useTheme";
import { useCurrency } from "../context/CurrencyContext";
import { designTokens } from "../theme/tokens";
import { dataManager } from "../data/dataManager";
import { Trash2, PlusCircle, Edit, CheckSquare, Square } from "lucide-react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useLanguage } from "../i18n/LanguageContext";
import PropertyCard from "../components/PropertyCard";
import authService from "../services/authService";
import Skeleton from "../components/Skeleton";
import { PropertyGridSkeleton } from "../components/skeletons/PropertyCardSkeleton";

const ManageListings = () => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const { formatPrice } = useCurrency();
    const tokens = designTokens[themeName];
    const navigate = useNavigate();
    const [myProperties, setMyProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);

    const loadMyProperties = async () => {
        const user = authService.getCurrentUser();
        if (!user) {
            navigate("/login");
            return;
        }
        setIsLoading(true);
        try {
            const props = await dataManager.fetchMyProperties();
            setMyProperties(props);
            setSelectedIds([]); // Reset selection on reload
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMyProperties();
    }, [navigate]);

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) return;

        Swal.fire({
            title: t("manage.deleteConfirm.titleBatch", { count: selectedIds.length }),
            text: t("manage.deleteConfirm.textBatch", { count: selectedIds.length }),
            icon: "warning",
            background: tokens.colors.surface,
            color: tokens.colors.text,
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: tokens.colors.primary,
            confirmButtonText: t("manage.deleteConfirm.confirm")
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await dataManager.batchDeletePropertiesAsync(selectedIds);
                    await loadMyProperties();
                    Swal.fire({
                        title: t("manage.deleteConfirm.successTitle"),
                        text: t("manage.deleteConfirm.successTextBatch", { count: selectedIds.length }),
                        icon: "success",
                        background: tokens.colors.surface,
                        color: tokens.colors.text,
                        confirmButtonColor: tokens.colors.primary
                    });
                } catch (error) {
                    console.error(`[MANAGE DEBUG] Batch delete failed:`, error);
                    Swal.fire({
                        title: t("manage.deleteConfirm.errorTitle"),
                        text: error.response?.data?.message || t("manage.deleteConfirm.errorText"),
                        icon: "error",
                        background: tokens.colors.surface,
                        color: tokens.colors.text,
                        confirmButtonColor: tokens.colors.primary
                    });
                }
            }
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: t("manage.deleteConfirm.title"),
            text: t("manage.deleteConfirm.text"),
            icon: "warning",
            background: tokens.colors.surface,
            color: tokens.colors.text,
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: tokens.colors.primary,
            confirmButtonText: t("manage.deleteConfirm.confirm"),
            cancelButtonText: t("common.cancel")
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await dataManager.deletePropertyAsync(id);
                    await loadMyProperties(); // Reload after delete
                    Swal.fire({
                        title: t("manage.deleteConfirm.successTitle"),
                        text: t("manage.deleteConfirm.successText"),
                        icon: "success",
                        background: tokens.colors.surface,
                        color: tokens.colors.text,
                        confirmButtonColor: tokens.colors.primary
                    });
                } catch (error) {
                    Swal.fire({
                        title: t("manage.deleteConfirm.errorTitle"),
                        text: error.response?.data?.message || t("manage.deleteConfirm.errorText"),
                        icon: "error",
                        background: tokens.colors.surface,
                        color: tokens.colors.text,
                        confirmButtonColor: tokens.colors.primary
                    });
                }
            }
        });
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(myProperties.map(p => p._id || p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleEdit = (id) => {
        navigate(`/edit-listing/${id}`);
    };




    const titlePart1 = t("manage.titlePart1");
    const titlePart2 = t("manage.titlePart2");

    return (
        <div
            style={{ backgroundColor: tokens.colors.bg, color: tokens.colors.text }}
            className="flex flex-col min-h-screen"
        >
            <NavBar />
            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-grow flex flex-col justify-center"
            >
                <div className="w-full px-4 md:px-8 max-w-6xl mx-auto pt-24 pb-12">
                    <div className="text-center mb-10 mt-10">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.45 }}
                            className={`premium-glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                            style={{ color: tokens.colors.textSub }}
                        >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                            {t("manage.badge")}
                        </motion.div>
                        <div className="flex justify-between items-center gap-4">
                            {isLoading ? (
                                <Skeleton width="300px" height="40px" borderRadius="12px" />
                            ) : (
                                <h1 className="animated-page-title text-3xl font-bold flex flex-wrap gap-x-2 gap-y-1 tracking-tight text-center sm:text-left">
                                    <span style={{ color: tokens.colors.text }}>{titlePart1}</span>
                                    <span style={{ color: tokens.colors.primary }}>{titlePart2}</span>
                                </h1>
                            )}

                            <div className="flex items-center gap-4">
                                {!isLoading && myProperties.length > 0 && (
                                    <div
                                        onClick={() => handleSelectAll(!(selectedIds.length === myProperties.length && myProperties.length > 0))}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer hover:bg-black/5"
                                        style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface }}
                                    >
                                        <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${selectedIds.length === myProperties.length && myProperties.length > 0 ? 'text-primary' : 'text-primary/40'}`}>
                                            {selectedIds.length === myProperties.length && myProperties.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </div>
                                        <label className="text-xs font-bold uppercase tracking-wider cursor-pointer" style={{ color: tokens.colors.textSub }}>
                                            {t("manage.selectAll")}
                                        </label>
                                    </div>
                                )}
                                <Link
                                    to="/add-listing"
                                    style={{ backgroundColor: tokens.colors.primary, color: tokens.colors.surface }}
                                    className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                    <PlusCircle size={20} />
                                    {t("manage.addNew")}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <PropertyGridSkeleton count={3} />
                    ) : myProperties.length === 0 ? (
                        <div
                            style={{ backgroundColor: tokens.colors.surface }}
                            className="text-center py-16 rounded-2xl shadow-sm"
                        >
                            <p className="text-xl mb-4">{t("manage.emptyTitle")}</p>
                            <Link
                                to="/add-listing"
                                style={{ color: tokens.colors.primary }}
                                className="font-semibold hover:underline"
                            >
                                {t("manage.emptyAction")}
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr mb-20">
                            {myProperties.map((property) => {
                                const isSelected = selectedIds.includes(property._id || property.id);
                                return (
                                    <div key={property._id || property.id} className="flex flex-col h-full justify-between relative group">
                                        {/* Selection Checkbox */}
                                        <div
                                            onClick={() => handleToggleSelect(property._id || property.id)}
                                            className={`absolute top-4 left-4 z-10 p-2 rounded-xl transition-all cursor-pointer shadow-lg border ${isSelected ? 'bg-primary scale-110' : 'bg-white/80 opacity-0 group-hover:opacity-100'}`}
                                            style={{ borderColor: isSelected ? tokens.colors.primary : 'rgba(0,0,0,0.1)' }}
                                        >
                                            <div className={`w-5 h-5 rounded flex items-center justify-center ${isSelected ? 'text-white' : 'text-primary'}`}>
                                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </div>
                                        </div>

                                        {/* Card */}
                                        <PropertyCard
                                            property={property}
                                            adminView
                                            onDelete={handleDelete}
                                        />

                                        {/* Action Buttons */}
                                        <div className="flex mt-4">
                                            {/* Edit */}
                                            <button
                                                onClick={() => handleEdit(property._id || property.id)}
                                                style={{
                                                    backgroundColor: tokens.colors.primary,
                                                    color: tokens.colors.surface,
                                                }}
                                                className="w-full py-3 rounded-2xl font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                <Edit size={18} />
                                                {t("manage.actions.edit")}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Batch Action Bar */}
                    <AnimatePresence>
                        {selectedIds.length > 0 && (
                            <motion.div
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-8 py-4 rounded-[2rem] shadow-2xl border backdrop-blur-xl"
                                style={{
                                    backgroundColor: tokens.colors.surface + 'CC',
                                    borderColor: tokens.colors.primary + '40',
                                    boxShadow: `0 20px 50px -15px ${tokens.colors.primary}40`
                                }}
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: tokens.colors.textSub }}>{t("manage.batchAction")}</span>
                                    <span className="text-sm font-bold" style={{ color: tokens.colors.primary }}>
                                        {t("manage.selectedCount", { count: selectedIds.length })}
                                    </span>
                                </div>
                                <div className="h-8 w-px bg-border/20" />
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedIds([])}
                                        className="px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all hover:bg-black/5 cursor-pointer"
                                        style={{ color: tokens.colors.textSub }}
                                    >
                                        {t("common.cancel")}
                                    </button>
                                    <button
                                        onClick={handleBatchDelete}
                                        className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                                        style={{
                                            backgroundColor: '#E24B4A',
                                            color: '#fff',
                                            boxShadow: '0 8px 15px -5px rgba(226, 75, 74, 0.4)'
                                        }}
                                    >
                                        <Trash2 size={14} />
                                        {t("manage.actions.deleteSelected")}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </motion.main>

            <Footer />
        </div>
    );
};

export default ManageListings;