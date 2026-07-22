import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import authService from "../services/authService";
import { SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import NavBar from "./NavBar";
import Footer from "./Footer";
import SearchBar from "./SearchBar";
import FilterSidebar from "./FilterSidebar";
import PropertyCard from "./PropertyCard";
import SortByDropdown from "./SortByDropdown";
import LoadingScreen from "./LoadingScreen";
import { Trash2, CheckSquare, Square } from "lucide-react";
import { PropertyGridSkeleton } from "./skeletons/PropertyCardSkeleton";
import MotionReveal from "./MotionReveal";
import { dataManager } from "../data/dataManager";
import { useTheme } from "../theme/useTheme";
import { designTokens } from "../theme/tokens";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useLanguage } from "../i18n/LanguageContext";

const ITEMS_PER_PAGE = 20;

// Component-level memory cache to persist filters across SPA navigation without surviving a hard refresh
const listingCache = {};

// Sentinel constants — never translated, used only for internal comparison
const ALL_LOCATIONS = "__ALL_LOCATIONS__";
const ALL_DISTRICTS = "__ALL__";

const PropertyListingPage = ({
    pageTitle,
    pageSubtitle,
    listingType,
    defaultMaxPrice = 50000000,
}) => {
    const { themeName } = useTheme();
    const { t, language } = useLanguage();
    const tokens = designTokens[themeName];
    const { page: pageParam } = useParams();
    const navigate = useNavigate();
    const basePath = listingType === "sale" ? "/buy" : "/rent";

    const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
    const [properties, setProperties] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const user = authService.getCurrentUser();
        setIsAdmin(user?.role === 'admin');
    }, []);

    const [currentPage, setCurrentPage] = useState(() => {
        if (pageParam) return parseInt(pageParam, 10);
        return 1;
    });

    // Sync currentPage with URL pageParam
    useEffect(() => {
        const p = pageParam ? parseInt(pageParam, 10) : 1;
        if (p !== currentPage) {
            setCurrentPage(p);
        }
    }, [pageParam]); // Reduced dependencies to avoid infinite loops

    // Enforce /buy/1 or /rent/1 if no page is specified
    useEffect(() => {
        if (!pageParam) {
            navigate(`${basePath}/1`, { replace: true });
        }
    }, [pageParam, basePath, navigate]);

    // Use stable sentinel values instead of translated strings for "all" states
    const defaultFilters = useRef({
        location: ALL_LOCATIONS,
        district: ALL_DISTRICTS,
        minPrice: 0,
        maxPrice: defaultMaxPrice,
        minArea: 0,
        maxArea: 1000,
        minBedrooms: 0,
        maxBedrooms: 10,
        minBathrooms: 0,
        maxBathrooms: 10,
        minFloor: 0,
        maxFloor: 20,
        minYearBuilt: 1900,
        maxYearBuilt: 2036,
        amenities: [],
        searchQuery: "",
        verification: "all",
        isFeatured: false,
    }).current;

    const [filters, setFilters] = useState(() => {
        return listingCache[`${listingType}_filters`] || { ...defaultFilters };
    });

    const [tempFilters, setTempFilters] = useState(() => {
        return listingCache[`${listingType}_filters`] || { ...defaultFilters };
    });

    const [sortBy, setSortBy] = useState(() => {
        return listingCache[`${listingType}_sort`] || "default";
    });

    // Update cache when filters or sort change
    useEffect(() => {
        listingCache[`${listingType}_filters`] = filters;
    }, [filters, listingType]);

    useEffect(() => {
        listingCache[`${listingType}_sort`] = sortBy;
    }, [sortBy, listingType]);

    const debouncedFilters = useDebouncedValue(filters, 300);
    const debouncedSortBy = useDebouncedValue(sortBy, 300);

    /**
     * Build bounded server query params.
     * Sentinels (ALL_LOCATIONS, ALL_DISTRICTS) are stripped — never sent to server.
     */
    const buildParams = useCallback((page, activeFilters, activeSort) => {
        const params = {
            type: listingType,
            page,
            limit: ITEMS_PER_PAGE,
        };

        if (activeFilters.location && activeFilters.location !== ALL_LOCATIONS) {
            params.location = activeFilters.location;
        }
        if (activeFilters.district && activeFilters.district !== ALL_DISTRICTS) {
            params.district = activeFilters.district;
        }
        if (activeFilters.minPrice > 0) params.minPrice = activeFilters.minPrice;
        if (activeFilters.maxPrice < defaultMaxPrice) params.maxPrice = activeFilters.maxPrice;
        if (activeFilters.minArea > 0) params.minArea = activeFilters.minArea;
        if (activeFilters.maxArea < 1000) params.maxArea = activeFilters.maxArea;
        if (activeFilters.minBedrooms > 0) params.minBedrooms = activeFilters.minBedrooms;
        if (activeFilters.maxBedrooms < 10) params.maxBedrooms = activeFilters.maxBedrooms;
        if (activeFilters.minBathrooms > 0) params.minBathrooms = activeFilters.minBathrooms;
        if (activeFilters.maxBathrooms < 10) params.maxBathrooms = activeFilters.maxBathrooms;
        if (activeFilters.minFloor !== undefined) params.minFloor = activeFilters.minFloor;
        if (activeFilters.maxFloor !== undefined) params.maxFloor = activeFilters.maxFloor;
        if (activeFilters.minYearBuilt !== undefined) params.minYearBuilt = activeFilters.minYearBuilt;
        if (activeFilters.maxYearBuilt !== undefined) params.maxYearBuilt = activeFilters.maxYearBuilt;
        if (activeFilters.amenities?.length > 0) params.amenities = activeFilters.amenities.join(",");
        if (activeFilters.searchQuery?.trim()) params.searchQuery = activeFilters.searchQuery.trim();
        if (activeFilters.verification === "verified") params.isVerified = true;
        if (activeFilters.verification === "unverified") params.isVerified = false;
        if (activeFilters.isFeatured) params.isFeatured = true;
        if (activeSort && activeSort !== "default") params.sortBy = activeSort;

        return params;
    }, [listingType, defaultMaxPrice, ALL_LOCATIONS, ALL_DISTRICTS]);

    const fetchProperties = useCallback(async (page, activeFilters, activeSort, signal) => {
        setIsLoading(true);
        try {
            const params = buildParams(page, activeFilters, activeSort);
            let result;
            try {
                result = await dataManager.fetchProperties(params, { signal });
            } catch (err) {
                // If it was canceled but our OWN signal is not aborted, 
                // it means we hit a shared promise that was canceled by an older mount.
                // We should retry once to get a fresh promise.
                if (err?.code === "ERR_CANCELED" && !signal?.aborted) {
                    console.log("Shared request was canceled, retrying for fresh data...");
                    result = await dataManager.fetchProperties(params, { signal, force: true });
                } else {
                    throw err;
                }
            }

            if (signal?.aborted) return;

            const nextPagination = result.pagination || { page, pages: 1, total: result.data?.length || 0 };
            setProperties(result.data || []);
            setPagination({
                page: nextPagination.page || page,
                pages: Math.max(1, nextPagination.pages || 1),
                total: nextPagination.total || 0,
            });

            if ((nextPagination.page || page) < (nextPagination.pages || 1)) {
                dataManager.prefetchProperties(buildParams(page + 1, activeFilters, activeSort));
            }
        } catch (err) {
            if (err?.code === "ERR_CANCELED") return;
            console.error("Error fetching properties:", err);
            setProperties([]);
            setPagination({ page: 1, pages: 1, total: 0 });
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }, [buildParams]);

    useEffect(() => {
        const controller = new AbortController();
        setIsLoading(true);
        setSelectedIds([]); // Clear selection when data re-fetched
        fetchProperties(currentPage, debouncedFilters, debouncedSortBy, controller.signal);
        return () => controller.abort();
    }, [currentPage, debouncedFilters, debouncedSortBy, fetchProperties, listingType]);


    const handleApplyFilters = () => {
        setCurrentPage(1);
        navigate(`${basePath}/1`);
        setFilters({ ...tempFilters });
    };

    const handleClearFilters = () => {
        const clearedFilters = { ...defaultFilters };
        setTempFilters(clearedFilters);
        setFilters(clearedFilters);
        setCurrentPage(1);
        setSortBy("default");
        navigate(`${basePath}`);
    };

    const handleSetFilters = (updatedFilters) => {
        setTempFilters(updatedFilters);
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(properties.map(p => p._id || p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) return;

        const result = await Swal.fire({
            title: t("manage.deleteConfirm.titleBatch", { count: selectedIds.length }),
            text: t("manage.deleteConfirm.textBatch", { count: selectedIds.length }),
            icon: "warning",
            background: tokens.colors.surface,
            color: tokens.colors.text,
            showCancelButton: true,
            confirmButtonColor: "#E24B4A",
            cancelButtonColor: tokens.colors.primary,
            confirmButtonText: t("manage.deleteConfirm.confirm"),
            cancelButtonText: t("common.cancel")
        });

        if (result.isConfirmed) {
            try {
                await dataManager.batchDeletePropertiesAsync(selectedIds);
                setSelectedIds([]);
                const controller = new AbortController();
                fetchProperties(currentPage, filters, sortBy, controller.signal);
                Swal.fire({
                    title: t("manage.deleteConfirm.successTitle"),
                    text: t("manage.deleteConfirm.successTextBatch", { count: selectedIds.length }),
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
    };

    const handleDeleteSingle = (id, title) => {
        Swal.fire({
            title: t("manage.deleteConfirm.title"),
            text: t("manage.deleteConfirm.text"),
            icon: "warning",
            background: tokens.colors.surface,
            color: tokens.colors.text,
            showCancelButton: true,
            confirmButtonColor: "#E24B4A",
            cancelButtonColor: tokens.colors.primary,
            confirmButtonText: t("manage.deleteConfirm.confirm"),
            cancelButtonText: t("common.cancel")
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await dataManager.deletePropertyAsync(id);
                    const controller = new AbortController();
                    fetchProperties(currentPage, filters, sortBy, controller.signal);
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

    const goToPage = (page) => {
        if (page < 1 || page > pagination.pages) return;
        setCurrentPage(page);
        navigate(`${basePath}/${page}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const getPageNumbers = () => {
        const total = pagination.pages;
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

        const pages = [];
        const current = currentPage;

        pages.push(1);

        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
            pages.push(i);
        }

        if (current < total - 2) pages.push("JUMP");

        if (total > 1) pages.push(total);

        return pages;
    };

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

    return (
        <div
            style={{
                backgroundColor: tokens.colors.bg,
                minHeight: "100vh",
            }}
            className="premium-page-bg overflow-x-hidden"
        >
            <NavBar />
            <motion.main
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="pt-24 px-4 md:px-6 lg:px-8 max-w-[1600px] mx-auto"
            >
                <div className="text-center py-10 md:py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45 }}
                        className={`premium-glass mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                        style={{ color: tokens.colors.textSub }}
                    >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.colors.primary }} />
                        {t("listing.badge")}
                    </motion.div>
                    <motion.h1
                        style={{ fontFamily: tokens.typography.fontFamily, lineHeight: 1.16 }}
                        className="animated-page-title text-4xl md:text-6xl font-black mb-5 flex justify-center flex-wrap gap-x-3 gap-y-1"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {pageTitle.split(" ").map((word, wordIndex) => (
                            <motion.span
                                key={wordIndex}
                                variants={letterVariants}
                                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                className="inline-block"
                                style={{ color: wordIndex >= pageTitle.split(" ").length - 1 ? tokens.colors.primary : tokens.colors.text }}
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
                        {pageSubtitle}
                    </motion.p>
                </div>

                <SearchBar
                    tempFilters={tempFilters}
                    setTempFilters={setTempFilters}
                    onApplyFilters={handleApplyFilters}
                    onClearFilters={handleClearFilters}
                    defaultMaxPrice={defaultMaxPrice}
                    ALL_LOCATIONS={ALL_LOCATIONS}
                    ALL_DISTRICTS={ALL_DISTRICTS}
                />

                <div className="relative z-30 flex gap-2 mb-4 items-center">
                    <button
                        onClick={() => setFilterSidebarOpen(true)}
                        dir="ltr"
                        style={{
                            backgroundColor: tokens.colors.surfaceGlass || tokens.colors.surface,
                            color: tokens.colors.text,
                            borderColor: tokens.colors.border,
                            backdropFilter: "blur(14px)",
                        }}
                        className="premium-focus lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold border hover:opacity-80 transition-all text-sm cursor-pointer whitespace-nowrap"
                    >
                        <SlidersHorizontal size={16} />
                        <span>{t("listing.statusAndAmenities")}</span>
                    </button>

                    <div className="ml-auto flex items-center gap-4">
                        {isAdmin && properties.length > 0 && (
                            <div
                                onClick={() => handleSelectAll(!(selectedIds.length === properties.length && properties.length > 0))}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer hover:bg-black/5"
                                style={{ borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface }}
                            >
                                <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${selectedIds.length === properties.length && properties.length > 0 ? 'text-primary' : 'text-primary/40'}`}>
                                    {selectedIds.length === properties.length && properties.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                                </div>
                                <label className="text-xs font-bold uppercase tracking-wider cursor-pointer" style={{ color: tokens.colors.textSub }}>
                                    {t("manage.selectAll")}
                                </label>
                            </div>
                        )}
                        <SortByDropdown sortBy={sortBy} setSortBy={setSortBy} />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 pb-12">
                    <FilterSidebar
                        tempFilters={tempFilters}
                        setTempFilters={setTempFilters}
                        onApplyFilters={handleApplyFilters}
                        onClearFilters={handleClearFilters}
                        isOpen={filterSidebarOpen}
                        setIsOpen={setFilterSidebarOpen}
                        ALL_LOCATIONS={ALL_LOCATIONS}
                        ALL_DISTRICTS={ALL_DISTRICTS}
                    />

                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <p
                                style={{ color: tokens.colors.textSub }}
                                className="text-sm premium-glass rounded-full px-4 py-2"
                            >
                                <span
                                    style={{ color: tokens.colors.text }}
                                    className="font-bold text-base"
                                >
                                    {t("listing.propertiesFoundCount", { count: pagination.total })}
                                </span>
                                {pagination.pages > 1 && (
                                    <span className={language === 'ar' ? 'mr-2' : 'ml-2'}>
                                        — {t("listing.pageOf")} {currentPage} {t("listing.of")} {pagination.pages}
                                    </span>
                                )}
                            </p>
                        </div>

                        {isLoading ? (
                            <PropertyGridSkeleton count={6} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" />
                        ) : properties.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {properties.map((property, index) => {
                                        const isSelected = selectedIds.includes(property._id || property.id);
                                        return (
                                            <MotionReveal key={property._id || property.id} delay={Math.min(index, 8) * 0.025} distance={12}>
                                                <div className="relative group h-full">
                                                    {isAdmin && (
                                                        <div
                                                            onClick={() => handleToggleSelect(property._id || property.id)}
                                                            className={`absolute top-4 ${language === 'ar' ? 'right-4' : 'left-4'} z-10 p-2 rounded-xl transition-all cursor-pointer shadow-lg border ${isSelected ? 'bg-primary scale-110' : 'bg-white/80 opacity-0 group-hover:opacity-100'}`}
                                                            style={{ borderColor: isSelected ? tokens.colors.primary : 'rgba(0,0,0,0.1)' }}
                                                        >
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center ${isSelected ? 'text-white' : 'text-primary'}`}>
                                                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <PropertyCard
                                                        property={property}
                                                        adminView={isAdmin}
                                                        onDelete={handleDeleteSingle}
                                                    />
                                                </div>
                                            </MotionReveal>
                                        );
                                    })}
                                </div>

                                {/* Pagination Controls */}
                                {pagination.pages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-10 mb-4 flex-wrap">
                                        {/* Previous Button */}
                                        <motion.button
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
                                            whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
                                            style={{
                                                backgroundColor: tokens.colors.surface,
                                                color: currentPage === 1 ? tokens.colors.textSub : tokens.colors.text,
                                                borderColor: tokens.colors.border,
                                                opacity: currentPage === 1 ? 0.5 : 1,
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft size={16} className={language === 'ar' ? 'rotate-180' : ''} />
                                            {t("listing.prev")}
                                        </motion.button>

                                        {/* Page Numbers */}
                                        {getPageNumbers().map((pageNum, index) =>
                                            pageNum === "..." ? (
                                                <span
                                                    key={`dots-${index}`}
                                                    style={{ color: tokens.colors.textSub }}
                                                    className="px-2 py-2 text-sm"
                                                >
                                                    ...
                                                </span>
                                            ) : pageNum === "JUMP" ? (
                                                <input
                                                    key={`jump-${index}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="..."
                                                    title={`${t("listing.jumpToPage")} (${t("listing.maxPageInfo")}: ${pagination.pages})`}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                                        if (val !== "") {
                                                            let num = parseInt(val, 10);
                                                            if (num > pagination.pages) val = pagination.pages.toString();
                                                        }
                                                        e.target.value = val;
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            const p = parseInt(e.target.value, 10);
                                                            if (!isNaN(p) && p >= 1 && p <= pagination.pages) {
                                                                goToPage(p);
                                                                e.target.value = "";
                                                                e.target.blur();
                                                            }
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const p = parseInt(e.target.value, 10);
                                                        if (!isNaN(p) && p >= 1 && p <= pagination.pages) {
                                                            goToPage(p);
                                                        }
                                                        e.target.value = "";
                                                    }}
                                                    style={{
                                                        backgroundColor: tokens.colors.surface,
                                                        color: tokens.colors.textSub,
                                                        borderColor: tokens.colors.border,
                                                    }}
                                                    className="w-10 h-10 rounded-lg border-2 text-sm font-semibold text-center focus:outline-none focus:border-blue-500 hover:opacity-80 transition-all cursor-text"
                                                />
                                            ) : (
                                                <motion.button
                                                    key={pageNum}
                                                    onClick={() => goToPage(pageNum)}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    style={{
                                                        backgroundColor: pageNum === currentPage
                                                            ? tokens.colors.primary
                                                            : tokens.colors.surface,
                                                        color: pageNum === currentPage
                                                            ? "#fff"
                                                            : tokens.colors.text,
                                                        borderColor: pageNum === currentPage
                                                            ? tokens.colors.primary
                                                            : tokens.colors.border,
                                                    }}
                                                    className="w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-colors cursor-pointer"
                                                >
                                                    {pageNum}
                                                </motion.button>
                                            )
                                        )}

                                        {/* Next Button */}
                                        <motion.button
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === pagination.pages}
                                            whileHover={currentPage !== pagination.pages ? { scale: 1.05 } : {}}
                                            whileTap={currentPage !== pagination.pages ? { scale: 0.95 } : {}}
                                            style={{
                                                backgroundColor: tokens.colors.surface,
                                                color: currentPage === pagination.pages ? tokens.colors.textSub : tokens.colors.text,
                                                borderColor: tokens.colors.border,
                                                opacity: currentPage === pagination.pages ? 0.5 : 1,
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            {t("listing.next")}
                                            <ChevronRight size={16} className={language === 'ar' ? 'rotate-180' : ''} />
                                        </motion.button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div
                                style={{
                                    backgroundColor: tokens.colors.surface,
                                    borderRadius: tokens.borderRadius.lg,
                                }}
                                className="premium-glass text-center py-16 px-4"
                            >
                                <p
                                    style={{ color: tokens.colors.text }}
                                    className="text-lg font-semibold mb-2"
                                >
                                    {t("listing.noProperties")}
                                </p>
                                <p style={{ color: tokens.colors.textSub }} className="text-sm">
                                    {t("listing.tryAdjusting")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Batch Action Bar for Admins */}
                <AnimatePresence>
                    {isAdmin && selectedIds.length > 0 && (
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
            </motion.main>
            <Footer />
        </div>
    );
};

export default PropertyListingPage;