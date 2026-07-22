import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle, Search, Home, Users, BarChart3, Filter, Trash2,
    ShieldCheck, ShieldOff, Star, RotateCcw, ChevronDown, ChevronUp,
    Shield, Bot, RefreshCw, ArrowUpDown, ChevronRight,
    Bed, Bath, Maximize, MapPin, CircleDollarSign, Square, CheckSquare
} from 'lucide-react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import RangeFilterDropdown from '../components/RangeFilterDropdown';
import SelectDropdown from '../components/SelectDropdown';
import adminService from '../services/adminService';
import { cachedGet } from '../services/requestCache';
import { amenitiesList, areaRanges, districtLocations, districts, locations, priceRanges, floorRanges, yearBuiltRanges } from '../data/propertyData';
import { useTheme } from '../theme/useTheme';
import { designTokens } from '../theme/tokens';
import { useLanguage } from '../i18n/LanguageContext';
import Swal from 'sweetalert2';
import LoadingScreen from '../components/LoadingScreen';
import Skeleton from '../components/Skeleton';
import { StatGridSkeleton } from '../components/skeletons/StatSkeleton';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import { displayFormattedPhone } from '../data/countries';
import { useCurrency } from '../context/CurrencyContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

/* ─── Role pill colours ───────────────────────────────────────────────────── */
const ROLE_STYLES = {
    admin: { bg: '#FAECE7', color: '#712B13' },
    seller: { bg: '#E6F1FB', color: '#0C447C' },
    agent: { bg: '#E1F5EE', color: '#085041' },
    user: { bg: '#F1EFE8', color: '#664238' },
};

/* ─── Avatar seed colours ─────────────────────────────────────────────────── */
const AVATAR_SEEDS = [
    { bg: '#FAC775', color: '#633806' },
    { bg: '#F5C4B3', color: '#712B13' },
    { bg: '#9FE1CB', color: '#085041' },
    { bg: '#CED1F6', color: '#3C3489' },
    { bg: '#B5D4F4', color: '#0C447C' },
    { bg: '#C0DD97', color: '#27500A' },
];

import UserAvatar from '../components/UserAvatar';

const ADMIN_MAX_PRICE = 100000000;

const DEFAULT_PROPERTY_FILTERS = {
    type: 'all',
    verification: 'all',
    feature: 'all',
    district: 'All',
    location: 'All Locations',
    minPrice: 0,
    maxPrice: ADMIN_MAX_PRICE,
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
};

const AdminDashboard = () => {
    const { themeName } = useTheme();
    const navigate = useNavigate();
    const tokens = designTokens[themeName];
    const c = tokens.colors;
    const { t, language } = useLanguage();
    const { formatPrice, currency } = useCurrency();

    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [properties, setProperties] = useState([]);
    const [userPropertiesCache, setUserPropertiesCache] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingTray, setLoadingTray] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ totalUsers: 0, totalProperties: 0 });
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [userPropSearch, setUserPropSearch] = useState('');
    const [propPage, setPropPage] = useState(1);
    const [hasMoreProps, setHasMoreProps] = useState(true);
    const [totalPropResults, setTotalPropResults] = useState(0);
    const [showMoreListingsSet, setShowMoreListingsSet] = useState(new Set());
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);

    const toggleShowMore = (userId) => {
        setShowMoreListingsSet(prev => {
            const next = new Set(prev);
            next.has(userId) ? next.delete(userId) : next.add(userId);
            return next;
        });
    };

    const handleBatchDeleteUsers = async () => {
        if (selectedUserIds.length === 0) return;

        Swal.fire({
            title: t('admin.alerts.deleteConfirm.titleBatchUsers', { count: selectedUserIds.length }),
            text: t('admin.alerts.deleteConfirm.textBatchUsers', { count: selectedUserIds.length }),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E24B4A',
            cancelButtonColor: tokens.colors.primary,
            confirmButtonText: t('admin.alerts.confirmDelete'),
            cancelButtonText: t('admin.alerts.cancel'),
            background: c.surface,
            color: c.text
        }).then(async (result) => {
            if (result.isConfirmed) {
                setLoadingTray(true);
                try {
                    await adminService.batchDeleteUsers(selectedUserIds);
                    setSelectedUserIds([]);
                    fetchData();
                    Swal.fire({
                        icon: 'success',
                        title: t('admin.alerts.deleted'),
                        text: t('admin.alerts.batchDeleteSuccess'),
                        background: c.surface,
                        color: c.text,
                        confirmButtonColor: c.primary
                    });
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: t('admin.alerts.error'),
                        text: error.response?.data?.message || 'Failed to delete users',
                        background: c.surface,
                        color: c.text,
                        confirmButtonColor: c.primary
                    });
                } finally {
                    setLoadingTray(false);
                }
            }
        });
    };

    const handleBatchDeleteProperties = async () => {
        if (selectedPropertyIds.length === 0) return;

        Swal.fire({
            title: t('admin.alerts.deleteConfirm.titleBatchProperties', { count: selectedPropertyIds.length }),
            text: t('admin.alerts.deleteConfirm.textBatchProperties', { count: selectedPropertyIds.length }),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E24B4A',
            cancelButtonColor: tokens.colors.primary,
            confirmButtonText: t('admin.alerts.confirmDelete'),
            cancelButtonText: t('admin.alerts.cancel'),
            background: c.surface,
            color: c.text
        }).then(async (result) => {
            if (result.isConfirmed) {
                setLoadingTray(true);
                try {
                    await adminService.batchDeleteProperties(selectedPropertyIds);
                    setSelectedPropertyIds([]);
                    fetchData();
                    Swal.fire({
                        icon: 'success',
                        title: t('admin.alerts.deleted'),
                        text: t('admin.alerts.batchDeleteSuccess'),
                        background: c.surface,
                        color: c.text,
                        confirmButtonColor: c.primary
                    });
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: t('admin.alerts.error'),
                        text: error.response?.data?.message || 'Failed to delete properties',
                        background: c.surface,
                        color: c.text,
                        confirmButtonColor: c.primary
                    });
                } finally {
                    setLoadingTray(false);
                }
            }
        });
    };


    useEffect(() => {
        if (!expandedUserId) return;
        setShowMoreListingsSet(prev => {
            const next = new Set(prev);
            next.delete(expandedUserId);
            return next;
        });
    }, [expandedUserId]);

    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [tempUserRoleFilter, setTempUserRoleFilter] = useState('all');
    const [propFilters, setPropFilters] = useState(DEFAULT_PROPERTY_FILTERS);
    const [tempPropFilters, setTempPropFilters] = useState(DEFAULT_PROPERTY_FILTERS);
    const userRoleOptions = useMemo(() => [
        { value: 'all', label: t('admin.roles.all') },
        { value: 'admin', label: t('admin.roles.adminsOnly') },
        { value: 'agent', label: t('admin.roles.agentsOnly') },
        { value: 'regular', label: t('admin.roles.regularOnly') },
    ], [language]);

    const userSortOptions = useMemo(() => [
        { value: 'newest', label: t('admin.sort.recentUsers') },
        { value: 'oldest', label: t('admin.sort.earlyUsers') },
        { value: 'listings-desc', label: t('admin.sort.listingsHighLow') },
        { value: 'listings-asc', label: t('admin.sort.listingsLowHigh') },
        { value: 'name-asc', label: t('admin.sort.nameAZ') },
        { value: 'name-desc', label: t('admin.sort.nameZA') },
    ], [language]);

    const propertyLocationOptions = useMemo(() => {
        if (tempPropFilters.district === 'All') return locations;
        return ["All Locations", ...(districtLocations[tempPropFilters.district] || [])];
    }, [tempPropFilters.district]);

    const [userSort, setUserSort] = useState('newest');
    const [propSort, setPropSort] = useState('newest');
    const [activePropSearch, setActivePropSearch] = useState('');
    const propertyRequestRef = useRef(null);
    const isFetchingRef = useRef(false);

    // ── Debounced values ──────────────────────────────────────────────────
    const debouncedPropFilters = useDebouncedValue(propFilters, 300);
    const debouncedPropSort = useDebouncedValue(propSort, 300);
    const debouncedPropSearch = useDebouncedValue(activePropSearch, 300);
    const debouncedUserSearch = useDebouncedValue(searchTerm, 300);
    const debouncedUserRoleFilter = useDebouncedValue(userRoleFilter, 300);
    const debouncedUserSort = useDebouncedValue(userSort, 300);

    const handleSelectUser = (id) => {
        // Find the user to check their role
        const target = users.find(u => u._id === id);
        if (target?.role === 'admin') return; // Cannot select admins for batch actions

        setSelectedUserIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const handleSelectAllUsers = (checked) => {
        if (checked) {
            // Only select non-admins
            const eligibleIds = sortedUsers
                .filter(u => u.role !== 'admin')
                .map(u => u._id);
            setSelectedUserIds(eligibleIds);
        } else {
            setSelectedUserIds([]);
        }
    };
    const handleSelectProperty = (id) => {
        setSelectedPropertyIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const handleSelectAllProperties = (checked) => {
        if (checked) setSelectedPropertyIds(sortedProperties.map(p => p._id));
        else setSelectedPropertyIds([]);
    };

    // ── Phone click: Swal dialog → WhatsApp or Call (mirrors AboutUs) ────

    const handlePhoneClick = (phone, name, country = 'EG') => {
        const formatted = displayFormattedPhone(phone, country);
        const cleanPhone = formatted.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}`;
        const telUrl = `tel:${formatted.replace(/[^\d+]/g, '')}`;
        Swal.fire({
            title: t('about.contactOptions'),
            text: t('about.howToReach', { name }),
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: t('about.whatsapp'),
            denyButtonText: t('about.call'),
            cancelButtonText: t('about.cancel'),
            confirmButtonColor: '#25D366',
            denyButtonColor: c.primary,
            background: c.surface,
            color: c.text,
            customClass: {
                popup: 'rounded-3xl border shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold',
                denyButton: 'rounded-xl px-6 py-3 font-bold',
                cancelButton: 'rounded-xl px-6 py-3 font-bold',
            }
        }).then(result => {
            if (result.isConfirmed) window.open(whatsappUrl, '_blank');
            else if (result.isDenied) window.location.href = telUrl;
        });
    };

    // ── Select options built from translations ────────────────────────────
    const typeOptions = useMemo(() => [
        { value: 'all', label: t('admin.allTypes') },
        { value: 'sale', label: t('admin.forSale') },
        { value: 'rent', label: t('admin.forRent') },
    ], [language]);

    const districtOptions = useMemo(() => districts.map(d => ({
        value: d,
        label: d === 'All' ? t('listing.all') : t('districts.' + d, d),
    })), [language]);

    const locationOptions = useMemo(() => propertyLocationOptions.map(loc => ({
        value: loc,
        label: loc === 'All Locations' ? t('listing.allLocations') : t('locations.' + loc, loc),
    })), [propertyLocationOptions, language]);

    const propSortOptions = useMemo(() => [
        { value: 'newest', label: t('admin.newestFirst') },
        { value: 'price-high', label: t('admin.priceHighLow') },
        { value: 'price-low', label: t('admin.priceLowHigh') },
        { value: 'area-large', label: t('admin.areaHighLow') },
        { value: 'area-small', label: t('admin.areaLowHigh') },
        { value: 'most-viewed', label: t('admin.mostViewed') },
        { value: 'title-asc', label: t('admin.titleAZ') },
    ], [language]);

    // ── Status toggle (mirrors FilterSidebar's StatusToggle) ─────────────
    const StatusToggle = ({ icon: Icon, label, active, onClick, danger = false, disabled = false }) => {
        const activeColor = danger ? '#ef4444' : c.primary;
        const iconBg = disabled ? c.border + '30' : active ? activeColor + '20' : c.border + '40';
        const iconColor = disabled ? c.textSub : active ? activeColor : c.textSub;
        const labelColor = disabled ? c.textSub : active ? activeColor : c.text;
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                style={{
                    backgroundColor: disabled ? c.border + '15' : active ? activeColor + '12' : c.surface,
                    borderColor: disabled ? c.border : active ? activeColor : c.border,
                    opacity: disabled ? 0.45 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                }}
                className="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl border-2 transition-all hover:opacity-90"
            >
                <div style={{ backgroundColor: iconBg, color: iconColor }} className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                    <Icon size={16} />
                </div>
                <span style={{ color: labelColor }} className={`text-xs font-bold uppercase tracking-wider flex-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    {label}
                </span>
                {active && !disabled && <CheckCircle size={14} style={{ color: activeColor, flexShrink: 0 }} />}
            </button>
        );
    };

    useEffect(() => { fetchData(); }, []);

    // Set loading immediately when sort/filter changes (before debounce fires)
    // This prevents the flash of client-side sorted results during the 300ms debounce window
    useEffect(() => {
        if (activeTab === 'properties') {
            setLoadingTray(true);
        }
    }, [propSort, propFilters, activePropSearch, activeTab]);

    useEffect(() => {
        if (activeTab === 'properties') {
            setPropPage(1);
            isFetchingRef.current = false;
            propertyRequestRef.current?.abort();
            const controller = new AbortController();
            propertyRequestRef.current = controller;
            fetchProperties(1, false, debouncedPropSearch, debouncedPropFilters, debouncedPropSort, { signal: controller.signal });
            return () => controller.abort();
        }
    }, [debouncedPropFilters, debouncedPropSort, activeTab, debouncedPropSearch]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, propsRes] = await Promise.all([
                adminService.getAllUsers(),
                adminService.getAllProperties(1, 100),
            ]);
            if (usersRes.success) {
                setUsers(usersRes.data);
                setStats(prev => ({ ...prev, totalUsers: usersRes.data.length }));
            }
            if (propsRes.success) {
                setProperties(propsRes.data);
                setStats(prev => ({ ...prev, totalProperties: propsRes.pagination.total }));
                setPropPage(1);
                setHasMoreProps(propsRes.pagination ? propsRes.pagination.page < propsRes.pagination.pages : propsRes.data.length >= 100);
                setTotalPropResults(propsRes.pagination?.total || propsRes.data.length);
            }
            setUserPropertiesCache({});
            setActivePropSearch('');
            setTempPropFilters(DEFAULT_PROPERTY_FILTERS);
            setTempUserRoleFilter('all');
        } catch (err) {
            console.error('Error fetching admin data:', err);
            Swal.fire({ icon: 'error', title: t('admin.alerts.error'), text: 'Failed to fetch administrative data', background: c.bg, color: c.text, confirmButtonColor: c.primary });
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = () => {
        if (activeTab === 'users') setUserRoleFilter(tempUserRoleFilter);
        else setPropFilters(tempPropFilters);
    };

    const fetchProperties = async (page = 1, append = false, searchValue = activePropSearch, filtersState = propFilters, sortValue = propSort, options = {}) => {
        if (isFetchingRef.current && append) return;
        isFetchingRef.current = true;
        setLoadingTray(true);
        try {
            const filters = { sortBy: sortValue };
            const trimmedSearch = searchValue.trim();
            if (trimmedSearch) filters.searchQuery = trimmedSearch;
            if (filtersState.type !== 'all') filters.type = filtersState.type;
            if (filtersState.verification !== 'all') filters.isVerified = filtersState.verification === 'verified';
            if (filtersState.feature !== 'all') filters.isFeatured = filtersState.feature === 'featured';
            if (filtersState.district !== 'All') filters.district = filtersState.district;
            if (filtersState.location !== 'All Locations') filters.location = filtersState.location;
            if (filtersState.minPrice > 0) filters.minPrice = filtersState.minPrice;
            if (filtersState.maxPrice < ADMIN_MAX_PRICE) filters.maxPrice = filtersState.maxPrice;
            if (filtersState.minArea > 0) filters.minArea = filtersState.minArea;
            if (filtersState.maxArea < 1000) filters.maxArea = filtersState.maxArea;
            if (filtersState.minBedrooms > 0) filters.minBedrooms = filtersState.minBedrooms;
            if (filtersState.maxBedrooms < 10) filters.maxBedrooms = filtersState.maxBedrooms;
            if (filtersState.minBathrooms > 0) filters.minBathrooms = filtersState.minBathrooms;
            if (filtersState.maxBathrooms < 10) filters.maxBathrooms = filtersState.maxBathrooms;
            if (filtersState.minFloor !== undefined) filters.minFloor = filtersState.minFloor;
            if (filtersState.maxFloor !== undefined) filters.maxFloor = filtersState.maxFloor;
            if (filtersState.minYearBuilt !== undefined) filters.minYearBuilt = filtersState.minYearBuilt;
            if (filtersState.maxYearBuilt !== undefined) filters.maxYearBuilt = filtersState.maxYearBuilt;
            if (filtersState.amenities.length > 0) filters.amenities = filtersState.amenities.join(',');
            const res = await adminService.getAllProperties(page, 100, filters, options);
            if (options.signal?.aborted) return;
            if (res.success) {
                if (append) {
                    setProperties(prev => {
                        const existingIds = new Set(prev.map(p => p._id));
                        return [...prev, ...res.data.filter(p => !existingIds.has(p._id))];
                    });
                } else {
                    setProperties(res.data);
                }
                setPropPage(page);
                setHasMoreProps(res.pagination ? page < res.pagination.pages : res.data.length >= 100);
                setTotalPropResults(res.pagination?.total || res.data.length);
            }
        } catch (err) {
            if (err?.code !== 'ERR_CANCELED') console.error('Error fetching properties:', err);
        } finally {
            if (!options.signal?.aborted) {
                setLoadingTray(false);
                isFetchingRef.current = false;
            }
        }
    };

    const handleGlobalSearch = () => {
        if (activeTab === 'properties') setActivePropSearch(searchTerm);
    };

    const handleToggleExpandUser = async (user) => {
        if (expandedUserId === user._id) {
            setExpandedUserId(null);
            setUserPropSearch('');
            return;
        }
        setExpandedUserId(user._id);
        if (userPropertiesCache[user._id] !== undefined) return;
        handleSearchUserProperties(user._id);
    };

    const handleSearchUserProperties = async (userId, customSearch = '') => {
        setLoadingTray(true);
        try {
            const searchStr = customSearch || userPropSearch;
            const res = await cachedGet('/properties', {
                params: { owner: userId, searchQuery: searchStr.trim(), limit: 100 },
                ttl: 60 * 1000,
                scope: 'user',
            });
            let userProps = [], total = 0;
            if (res?.success) { userProps = res.data; total = res.pagination?.total || userProps.length; }
            else if (Array.isArray(res)) { userProps = res; total = userProps.length; }
            setUserPropertiesCache(prev => ({ ...prev, [userId]: { data: userProps, total } }));
        } catch (err) {
            console.error('Error searching user properties:', err);
            setUserPropertiesCache(prev => ({ ...prev, [userId]: { data: [], total: 0 } }));
        } finally {
            setLoadingTray(false);
        }
    };

    const handleLoadMoreProperties = async () => {
        if (isFetchingRef.current) return;
        fetchProperties(propPage + 1, true, activePropSearch, propFilters, propSort);
    };

    const handleDeleteUser = async (userId, userName) => {
        const result = await Swal.fire({
            title: t('admin.alerts.deleteUserTitle'), text: t('admin.alerts.deleteUserText', { name: userName }),
            icon: 'warning', showCancelButton: true, confirmButtonColor: c.primary, cancelButtonColor: '#888780',
            confirmButtonText: t('admin.alerts.confirmDelete'), background: c.bg, color: c.text, cancelButtonText: t('admin.alerts.cancel'),
        });
        if (result.isConfirmed) {
            try {
                const res = await adminService.deleteUser(userId);
                if (res.success) {
                    setUsers(prev => prev.filter(u => u._id !== userId));
                    setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
                    Swal.fire({
                        icon: 'success',
                        title: t('admin.alerts.deleted'),
                        text: t('admin.alerts.userRemoved'),
                        background: c.bg,
                        color: c.text,
                        confirmButtonColor: c.primary
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: t('admin.alerts.error'),
                    text: err.response?.data?.message || 'Failed to delete user.',
                    background: c.bg,
                    color: c.text,
                    confirmButtonColor: c.primary
                });
            }
        }
    };

    const handlePromoteToAdmin = async (userId, userName) => {
        const result = await Swal.fire({
            title: t('admin.alerts.promoteTitle'), text: t('admin.alerts.promoteText', { name: userName }),
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#888780',
            confirmButtonText: t('admin.alerts.confirmPromote'), background: c.bg, color: c.text, cancelButtonText: t('admin.alerts.cancel'),
        });
        if (result.isConfirmed) {
            try {
                await adminService.promoteToAdmin(userId);

                setUsers(prev =>
                    prev.map(u =>
                        u._id === userId ? { ...u, role: 'admin' } : u
                    )
                );

                Swal.fire({
                    icon: 'success',
                    title: t('admin.alerts.promoted'),
                    text: t('admin.alerts.userIsAdmin'),
                    background: c.bg,
                    color: c.text,
                    confirmButtonColor: c.primary,
                });
            } catch {
                Swal.fire({
                    icon: 'error',
                    title: t('admin.alerts.error'),
                    text: 'Failed to promote user.',
                    background: c.bg,
                    color: c.text,
                    confirmButtonColor: c.primary,
                });
            }
        }
    };

    const handleDeleteProperty = async (propId, propTitle, ownerUserId = null) => {
        const result = await Swal.fire({
            title: t('admin.alerts.deletePropTitle'), text: t('admin.alerts.deletePropText', { title: propTitle }),
            icon: 'warning', showCancelButton: true, confirmButtonColor: c.primary, cancelButtonColor: '#888780',
            confirmButtonText: t('admin.alerts.confirmDelete'), background: c.bg, color: c.text, cancelButtonText: t('admin.alerts.cancel'),
        });
        if (result.isConfirmed) {
            try {
                await adminService.deleteProperty(propId);
                setProperties(prev => prev.filter(p => p._id !== propId));
                setStats(prev => ({ ...prev, totalProperties: prev.totalProperties - 1 }));
                setUserPropertiesCache(prev => {
                    const next = { ...prev };
                    if (ownerUserId && next[ownerUserId]) {
                        next[ownerUserId].data = next[ownerUserId].data.filter(p => p._id !== propId);
                        next[ownerUserId].total = Math.max(0, next[ownerUserId].total - 1);
                    } else {
                        Object.keys(next).forEach(uid => {
                            if (next[uid]?.data) {
                                next[uid].data = next[uid].data.filter(p => p._id !== propId);
                                next[uid].total = Math.max(0, next[uid].total - 1);
                            }
                        });
                    }
                    return next;
                });
                if (ownerUserId) {
                    setUsers(prev => prev.map(u => u._id === ownerUserId ? { ...u, listingCount: Math.max(0, (u.listingCount || 1) - 1) } : u));
                }
                Swal.fire({
                    icon: 'success',
                    title: t('admin.alerts.deleted'),
                    text: t('admin.alerts.propRemoved'),
                    background: tokens.colors.bg,
                    color: tokens.colors.text,
                    confirmButtonColor: c.primary,
                });
            } catch {
                Swal.fire({
                    icon: 'error',
                    title: t('admin.alerts.error'),
                    text: 'Failed to delete property.',
                    background: c.bg,
                    color: c.text,
                    confirmButtonColor: c.primary,
                });
            }
        }
    };

    const handleVerifyProperty = async (propId) => {
        try {
            const res = await adminService.verifyProperty(propId);
            if (res.success) {
                const updatedObj = { isVerified: res.data.isVerified };
                setProperties(prev => prev.map(p => p._id === propId ? { ...p, ...updatedObj } : p));
                setUserPropertiesCache(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(uid => {
                        if (next[uid]?.data) next[uid].data = next[uid].data.map(p => p._id === propId ? { ...p, ...updatedObj } : p);
                    });
                    return next;
                });
            }
        } catch (err) { console.error('Verify error:', err); }
    };

    const handleToggleFeatured = async (propId) => {
        try {
            const res = await adminService.toggleFeatured(propId);
            if (res.success) {
                const updatedObj = { isFeatured: res.data.isFeatured };
                setProperties(prev => prev.map(p => p._id === propId ? { ...p, ...updatedObj } : p));
                setUserPropertiesCache(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(uid => {
                        if (next[uid]?.data) next[uid].data = next[uid].data.map(p => p._id === propId ? { ...p, ...updatedObj } : p);
                    });
                    return next;
                });
            }
        } catch (err) { console.error('Feature toggle error:', err); }
    };

    const filteredUsers = useMemo(() => users.filter(u => {
        const matchesSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(debouncedUserSearch.toLowerCase());
        let matchesRole = true;
        if (debouncedUserRoleFilter === 'admin') matchesRole = u.role === 'admin';
        else if (debouncedUserRoleFilter === 'agent') matchesRole = u.role === 'agent';
        else if (debouncedUserRoleFilter === 'regular') matchesRole = u.role !== 'admin' && u.role !== 'agent';
        return matchesSearch && matchesRole;
    }), [users, debouncedUserSearch, debouncedUserRoleFilter]);

    const filteredProperties = useMemo(() => properties.filter(p => {
        const matchesVerification = debouncedPropFilters.verification === 'all' || (debouncedPropFilters.verification === 'verified' ? p.isVerified : !p.isVerified);
        const matchesFeatured = debouncedPropFilters.feature === 'all' || (debouncedPropFilters.feature === 'featured' ? p.isFeatured : !p.isFeatured);
        const matchesType = debouncedPropFilters.type === 'all' || p.type === debouncedPropFilters.type;
        const matchesDistrict = debouncedPropFilters.district === 'All' || p.district === debouncedPropFilters.district;
        const matchesLocation = debouncedPropFilters.location === 'All Locations' || p.location === debouncedPropFilters.location;
        const price = Number(p.price) || 0;
        const matchesPrice = price >= debouncedPropFilters.minPrice && price <= debouncedPropFilters.maxPrice;
        const area = Number(p.area) || 0;
        const matchesArea = area >= debouncedPropFilters.minArea && area <= debouncedPropFilters.maxArea;
        const beds = Number(p.bedrooms) || 0;
        const matchesBeds = beds >= debouncedPropFilters.minBedrooms && beds <= debouncedPropFilters.maxBedrooms;
        const baths = Number(p.bathrooms) || 0;
        const matchesBaths = baths >= debouncedPropFilters.minBathrooms && baths <= debouncedPropFilters.maxBathrooms;
        const floor = p.floor !== undefined ? Number(p.floor) : 0;
        const matchesFloor = floor >= debouncedPropFilters.minFloor && floor <= debouncedPropFilters.maxFloor;
        const year = p.yearBuilt !== undefined ? Number(p.yearBuilt) : 0;
        const matchesYear = !p.yearBuilt || (year >= debouncedPropFilters.minYearBuilt && year <= debouncedPropFilters.maxYearBuilt);
        const matchesAmenities = debouncedPropFilters.amenities.every(amenity => p.amenities?.includes(amenity));
        const s = debouncedPropSearch.toLowerCase().trim();
        const matchesSearch = !s || (
            p.title.toLowerCase().includes(s) ||
            p.location.toLowerCase().includes(s) ||
            (p.owner && `${p.owner.firstName} ${p.owner.lastName}`.toLowerCase().includes(s))
        );
        return matchesVerification && matchesFeatured && matchesType && matchesDistrict && matchesLocation &&
            matchesPrice && matchesArea && matchesBeds && matchesBaths && matchesFloor && matchesYear && matchesAmenities && matchesSearch;
    }), [properties, debouncedPropFilters, debouncedPropSearch]);

    const handleSort = (key) => {
        if (loadingTray) return;
        if (activeTab === 'users') {
            const current = userSort;
            if (current === `${key}-asc`) setUserSort(`${key}-desc`);
            else setUserSort(`${key}-asc`);
        } else {
            const current = propSort;
            if (key === 'price') setPropSort(current === 'price-low' ? 'price-high' : 'price-low');
            else if (key === 'area') setPropSort(current === 'area-small' ? 'area-large' : 'area-small');
            else if (current === `${key}-asc`) setPropSort(`${key}-desc`);
            else setPropSort(`${key}-asc`);
        }
    };

    const getSortIcon = (key) => {
        const sort = activeTab === 'users' ? userSort : propSort;
        const isActive = (key === 'price' && (sort === 'price-high' || sort === 'price-low')) ||
            (key === 'area' && (sort === 'area-large' || sort === 'area-small')) ||
            sort.startsWith(key);
        if (!isActive) return <ArrowUpDown size={12} style={{ color: c.textSub }} className="opacity-20" />;
        const isDesc = sort.endsWith('desc') || sort === 'price-high' || sort === 'area-large';
        return <div style={{ color: c.primary }}>{isDesc ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</div>;
    };

    const sortedUsers = useMemo(() => [...filteredUsers].sort((a, b) => {
        const isDesc = userSort.endsWith('desc') || userSort === 'newest' || userSort === 'listings-desc';
        if (userSort.startsWith('name')) {
            const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
            const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
            return isDesc ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
        }
        if (userSort.startsWith('role')) return isDesc ? b.role.localeCompare(a.role) : a.role.localeCompare(b.role);
        if (userSort.startsWith('listings')) return isDesc ? (b.listingCount || 0) - (a.listingCount || 0) : (a.listingCount || 0) - (b.listingCount || 0);
        if (userSort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        return new Date(b.createdAt) - new Date(a.createdAt);
    }), [filteredUsers, userSort]);

    const sortedProperties = useMemo(() => {
        // While a fetch is in progress, don't re-sort client-side — let the
        // loading skeleton take over. This prevents the brief "flash of
        // optimistic sort" before the real API results arrive.
        if (loadingTray) return filteredProperties;
        return [...filteredProperties].sort((a, b) => {
            const isDesc = propSort.endsWith('desc') || propSort === 'newest' || propSort === 'price-high' || propSort === 'area-large' || propSort === 'most-viewed';
            if (propSort.startsWith('title')) return isDesc ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
            if (propSort.startsWith('price')) return isDesc ? b.price - a.price : a.price - b.price;
            if (propSort.startsWith('area')) return isDesc ? b.area - a.area : a.area - b.area;
            if (propSort.startsWith('location')) return isDesc ? b.location.localeCompare(a.location) : a.location.localeCompare(b.location);
            if (propSort.startsWith('owner')) {
                const ownerA = typeof a.owner === 'object' ? `${a.owner.firstName} ${a.owner.lastName}` : (a.ownerName || '');
                const ownerB = typeof b.owner === 'object' ? `${b.owner.firstName} ${b.owner.lastName}` : (b.ownerName || '');
                return isDesc ? ownerB.localeCompare(ownerA) : ownerA.localeCompare(ownerB);
            }
            if (propSort === 'most-viewed') return (b.views || 0) - (a.views || 0);
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [filteredProperties, propSort, loadingTray]);

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



    if (loading) return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: c.bg }}>
            <NavBar />
            <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 mt-14">
                {/* Header Skeleton */}
                <div className="mb-10 text-left">
                    <Skeleton width="120px" height="32px" borderRadius="100px" className="mb-4" />
                    <Skeleton width="400px" height="48px" className="mb-2" />
                    <Skeleton width="200px" height="20px" />
                </div>

                <StatGridSkeleton />

                <div className="space-y-6">
                    <div className="flex justify-between">
                        <Skeleton width="300px" height="50px" borderRadius="16px" />
                        <Skeleton width="400px" height="50px" borderRadius="16px" />
                    </div>
                    <TableSkeleton rows={8} cols={4} colWidths={['35%', '20%', '20%', '25%']} />
                </div>
            </div>
        </div>
    );

    const metricCards = [
        { label: t('admin.metrics.networkUsers'), val: stats.totalUsers.toLocaleString(), sub: t('admin.metrics.activeAccounts'), icon: Users, accent: '#BA7517', accentBg: '#FAEEDA', accentText: '#633806', desc: t('admin.metrics.totalRegistered') },
        { label: t('admin.metrics.totalListings'), val: stats.totalProperties.toLocaleString(), sub: t('admin.metrics.verifiedPending'), icon: Home, accent: '#378ADD', accentBg: '#E6F1FB', accentText: '#0C447C', desc: t('admin.metrics.liveProperties') },
        { label: t('admin.metrics.aiAnalysis'), val: 'Gemini-2.5', sub: t('admin.metrics.flashEngine'), icon: Bot, accent: '#7F77DD', accentBg: '#EEEDFE', accentText: '#3C3489', desc: t('admin.metrics.proprietaryLogic') },
    ];

    const hasActivePropertyFilters =
        propFilters.type !== 'all' || propFilters.verification !== 'all' || propFilters.feature !== 'all' ||
        propFilters.district !== 'All' || propFilters.location !== 'All Locations' ||
        propFilters.minPrice > 0 || propFilters.maxPrice < ADMIN_MAX_PRICE ||
        propFilters.minArea > 0 || propFilters.maxArea < 1000 ||
        propFilters.minBedrooms > 0 || propFilters.maxBedrooms < 10 ||
        propFilters.minBathrooms > 0 || propFilters.maxBathrooms < 10 ||
        propFilters.minFloor > 0 || propFilters.maxFloor < 20 ||
        propFilters.minYearBuilt > 1900 || propFilters.maxYearBuilt < 2036 ||
        propFilters.amenities.length > 0;

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: c.bg }}>
            <NavBar />
            <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 mt-14">
                {/* Header */}
                <div className={`flex flex-col md:flex-row md:items-end gap-6 mb-10 ${language === 'ar' ? 'justify-start' : 'justify-start'}`}>
                    <div className={`w-full overflow-visible ${language === 'ar' ? 'flex flex-col items-start' : 'flex flex-col items-start'}`}>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.45 }}
                            className={`premium-glass mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase ${language === 'ar' ? '' : 'tracking-[0.18em]'}`}
                            style={{ color: c.textSub }}
                        >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.primary }} />
                            {t("admin.badge")}
                        </motion.div>
                        <motion.h1
                            className={`animated-page-title text-4xl font-bold tracking-tight mb-2 flex flex-wrap gap-x-3 gap-y-1 ${language === 'ar' ? 'justify-start w-full' : ''}`}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {t("admin.titlePart1").split(" ").map((word, index) => (
                                <motion.span
                                    key={`p1-${index}`}
                                    variants={letterVariants}
                                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                    className="inline-block"
                                    style={{ color: c.text }}
                                >
                                    {word}
                                </motion.span>
                            ))}
                            {t("admin.titlePart2").split(" ").map((word, index) => (
                                <motion.span
                                    key={`p2-${index}`}
                                    variants={letterVariants}
                                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                    className="inline-block"
                                    style={{ color: c.primary }}
                                >
                                    {word}
                                </motion.span>
                            ))}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{ color: c.textSub }}
                            className={`flex items-center gap-2 font-medium ${language === 'ar' ? 'self-start' : ''}`}
                        >
                            {language === 'ar' ? (
                                <>{t('admin.subtitle')} <Shield style={{ color: c.primary }} size={16} /></>
                            ) : (
                                <><Shield style={{ color: c.primary }} size={16} /> {t('admin.subtitle')}</>
                            )}
                        </motion.p>
                    </div>
                </div>

                {/* Metric cards */}
                {loading ? (
                    <div className="mb-8 md:mb-12">
                        <StatGridSkeleton count={3} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                        {metricCards.map((m, i) => (
                            <motion.div key={i}
                                style={{ backgroundColor: c.surface, borderColor: c.border }}
                                className="p-6 rounded-[2rem] border shadow-xl shadow-primary/5 group hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
                            >
                                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity" style={{ backgroundColor: m.accent }} />
                                <div className="flex justify-between items-start mb-4 md:mb-6">
                                    <div className="space-y-1">
                                        <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] opacity-40" style={{ color: c.text }}>{m.label}</p>
                                        <p className="text-[10px] md:text-xs font-bold" style={{ color: m.accent }}>{m.desc}</p>
                                    </div>
                                    <div className="p-2.5 md:p-3 rounded-2xl shadow-inner shrink-0" style={{ backgroundColor: m.accentBg, color: m.accent }}>
                                        <m.icon size={18} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="flex items-end justify-between gap-2">
                                    <div className="text-3xl md:text-4xl font-bold tracking-tighter shrink-0" style={{ color: c.text }}>{m.val}</div>
                                    <div className="text-[9px] md:text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 whitespace-nowrap" style={{ backgroundColor: m.accentBg, color: m.accentText }}>
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: m.accent }} />
                                        {m.sub}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Main table panel */}
                <motion.div
                    style={{ backgroundColor: c.surface, borderColor: c.border }}
                    className="rounded-3xl border shadow-sm overflow-visible"
                >
                    {/* Toolbar */}
                    <div style={{ borderColor: c.border, backgroundColor: c.bg + '50' }} className="px-4 sm:px-6 py-6 border-b space-y-6">
                        {/* Row 1: Tabs & Search */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                            <div style={{ backgroundColor: c.surface, borderColor: c.border }} className="grid grid-cols-2 p-1.5 rounded-2xl border w-full xl:w-fit gap-1 shadow-sm">
                                {[
                                    { key: 'users', label: t('admin.tabs.users'), count: stats.totalUsers, icon: Users },
                                    { key: 'properties', label: t('admin.tabs.properties'), count: stats.totalProperties, icon: Home },
                                ].map(tab => (
                                    <button key={tab.key}
                                        onClick={() => { setActiveTab(tab.key); setSearchTerm(''); if (tab.key === 'properties') setActivePropSearch(''); }}
                                        style={activeTab === tab.key ? { backgroundColor: c.primary, color: 'white', borderColor: c.primary } : { color: c.textSub, backgroundColor: 'transparent', borderColor: 'transparent' }}
                                        className="min-w-0 flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-6 py-2.5 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-normal sm:tracking-widest border transition-all duration-300 cursor-pointer whitespace-nowrap shadow-sm active:scale-95"
                                    >
                                        <tab.icon size={16} className="shrink-0" />
                                        <span>{tab.label}</span>
                                        <span className="ml-0.5 sm:ml-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] shrink-0" style={activeTab === tab.key ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: c.primary + '10', color: c.primary }}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                                <div className="flex items-center gap-3 border rounded-2xl px-4 py-3 text-sm w-full sm:w-[320px] transition-all focus-within:ring-2 focus-within:ring-primary/20"
                                    style={{ borderColor: c.border, backgroundColor: c.surface }}>
                                    <Search size={18} style={{ color: c.primary }} className="opacity-60" />
                                    <input
                                        type="text"
                                        placeholder={activeTab === 'users' ? t('admin.searchUsers') : t('admin.searchProperties')}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
                                        style={{ backgroundColor: 'transparent', color: c.text, outline: 'none' }}
                                        className="text-sm w-full font-bold placeholder:opacity-30"
                                    />
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button onClick={handleGlobalSearch}
                                        className="flex-1 sm:flex-none h-12 px-8 rounded-2xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl cursor-pointer"
                                        style={{ backgroundColor: c.primary, color: '#fff', boxShadow: `0 10px 25px -8px ${c.primary}60` }}
                                    >
                                        {t('admin.search')}
                                    </button>
                                    <button onClick={fetchData}
                                        style={{ color: c.primary, backgroundColor: c.surface, borderColor: c.border }}
                                        className="h-12 w-12 flex items-center justify-center rounded-2xl border transition-all hover:rotate-180 cursor-pointer shadow-sm active:scale-90"
                                        title={t('admin.refreshAll')}
                                    >
                                        <RotateCcw size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Filters */}
                        <div className="px-4 sm:px-6 py-6" style={{ backgroundColor: c.bg + '20' }}>
                            <div className="space-y-6">
                                {activeTab === 'users' ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-50 whitespace-nowrap" style={{ color: c.text }}>{t('listing.filters')}</span>
                                            <div className="min-w-[200px]">
                                                <SelectDropdown
                                                    value={userRoleFilter}
                                                    onChange={val => { setTempUserRoleFilter(val); setUserRoleFilter(val); }}
                                                    options={userRoleOptions}
                                                    tokens={tokens}
                                                    minWidth={0}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-50 whitespace-nowrap" style={{ color: c.text }}>{t('admin.sortBy')}</span>
                                            <div className="min-w-[200px]">
                                                <SelectDropdown
                                                    value={userSort}
                                                    onChange={val => setUserSort(val)}
                                                    options={userSortOptions}
                                                    tokens={tokens}
                                                    minWidth={0}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-50 whitespace-nowrap" style={{ color: c.text }}>{t('listing.filters')}</span>
                                                <div className="h-[1px] flex-grow opacity-10" style={{ backgroundColor: c.text }} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-6 gap-y-6">

                                                {/* Type — SelectDropdown */}
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <Home size={14} className="opacity-70" />
                                                        {t('admin.type')}
                                                    </label>
                                                    <SelectDropdown
                                                        value={tempPropFilters.type}
                                                        onChange={val => setTempPropFilters(prev => ({ ...prev, type: val }))}
                                                        options={typeOptions}
                                                        tokens={tokens}
                                                        minWidth={0}
                                                    />
                                                </div>

                                                {/* District — SelectDropdown */}
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <MapPin size={14} className="opacity-70" />
                                                        {t('listing.district')}
                                                    </label>
                                                    <SelectDropdown
                                                        value={tempPropFilters.district}
                                                        onChange={val => setTempPropFilters(prev => ({ ...prev, district: val, location: 'All Locations' }))}
                                                        options={districtOptions}
                                                        tokens={tokens}
                                                        minWidth={0}
                                                    />
                                                </div>

                                                {/* Location — SelectDropdown */}
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <MapPin size={14} className="opacity-70" />
                                                        {t('listing.location')}
                                                    </label>
                                                    <SelectDropdown
                                                        value={tempPropFilters.location}
                                                        onChange={val => setTempPropFilters(prev => ({ ...prev, location: val }))}
                                                        options={locationOptions}
                                                        tokens={tokens}
                                                        minWidth={0}
                                                    />
                                                </div>

                                                {/* Verification & Featured */}
                                                <div>
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3 opacity-60" style={{ color: c.text }}>
                                                        <ShieldCheck size={14} className="opacity-70" />
                                                        {t('admin.verification')}
                                                    </label>
                                                    <div className="space-y-2">
                                                        <StatusToggle
                                                            icon={ShieldCheck}
                                                            label={t('admin.verified')}
                                                            active={tempPropFilters.verification === 'verified'}
                                                            onClick={() => setTempPropFilters(prev => ({ ...prev, verification: prev.verification === 'verified' ? 'all' : 'verified' }))}
                                                        />
                                                        <StatusToggle
                                                            icon={ShieldOff}
                                                            label={t('admin.notVerified')}
                                                            active={tempPropFilters.verification === 'unverified'}
                                                            danger
                                                            disabled={tempPropFilters.feature === 'featured'}
                                                            onClick={() => {
                                                                if (tempPropFilters.feature === 'featured') return;
                                                                setTempPropFilters(prev => ({ ...prev, verification: prev.verification === 'unverified' ? 'all' : 'unverified' }));
                                                            }}
                                                        />
                                                        <StatusToggle
                                                            icon={Star}
                                                            label={t('admin.featuredOnly')}
                                                            active={tempPropFilters.feature === 'featured'}
                                                            disabled={tempPropFilters.verification === 'unverified'}
                                                            onClick={() => {
                                                                if (tempPropFilters.verification === 'unverified') return;
                                                                setTempPropFilters(prev => ({ ...prev, feature: prev.feature === 'featured' ? 'all' : 'featured' }));
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Price Range */}
                                                <div className="sm:col-span-2">
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <CircleDollarSign size={14} className="opacity-70" />
                                                        {t('admin.priceRange')} ({currency})
                                                    </label>
                                                    <RangeFilterDropdown
                                                        tempFilters={tempPropFilters} setTempFilters={setTempPropFilters}
                                                        minKey="minPrice" maxKey="maxPrice" minValue={0} maxValue={ADMIN_MAX_PRICE}
                                                        label={t('listing.price')} isPrice={true} ranges={priceRanges}
                                                    />
                                                </div>

                                                {/* Area Range */}
                                                <div className="sm:col-span-2">
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <Maximize size={14} className="opacity-70" />
                                                        {t('admin.areaM2')}
                                                    </label>
                                                    <RangeFilterDropdown
                                                        tempFilters={tempPropFilters} setTempFilters={setTempPropFilters}
                                                        minKey="minArea" maxKey="maxArea" minValue={0} maxValue={1000} step={10}
                                                        label={t('listing.area')} ranges={areaRanges}
                                                    />
                                                </div>

                                                {/* Bedrooms */}
                                                <div className="sm:col-span-1">
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <Bed size={14} className="opacity-70" />
                                                        {t('admin.bedrooms')}
                                                    </label>
                                                    <RangeFilterDropdown
                                                        tempFilters={tempPropFilters} setTempFilters={setTempPropFilters}
                                                        minKey="minBedrooms" maxKey="maxBedrooms" minValue={0} maxValue={10} step={1}
                                                        label={t('listing.bedrooms')}
                                                    />
                                                </div>

                                                {/* Bathrooms */}
                                                <div className="sm:col-span-1">
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <Bath size={14} className="opacity-70" />
                                                        {t('admin.bathrooms')}
                                                    </label>
                                                    <RangeFilterDropdown
                                                        tempFilters={tempPropFilters} setTempFilters={setTempPropFilters}
                                                        minKey="minBathrooms" maxKey="maxBathrooms" minValue={0} maxValue={10} step={1}
                                                        label={t('listing.bathrooms')}
                                                    />
                                                </div>

                                                {/* Floor */}
                                                <div className="sm:col-span-1">
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <Home size={14} className="opacity-70" />
                                                        {t('listing.floor') || 'Floor'}
                                                    </label>
                                                    <RangeFilterDropdown
                                                        tempFilters={tempPropFilters} setTempFilters={setTempPropFilters}
                                                        minKey="minFloor" maxKey="maxFloor" minValue={0} maxValue={20} step={1}
                                                        label={t('listing.floor') || 'Floor'} ranges={floorRanges}
                                                    />
                                                </div>

                                                {/* Year Built */}
                                                <div className="sm:col-span-1">
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <Maximize size={14} className="opacity-70" />
                                                        {t('listing.yearBuilt') || 'Year Built'}
                                                    </label>
                                                    <RangeFilterDropdown
                                                        tempFilters={tempPropFilters} setTempFilters={setTempPropFilters}
                                                        minKey="minYearBuilt" maxKey="maxYearBuilt" minValue={1900} maxValue={2036} step={1}
                                                        label={t('listing.yearBuilt') || 'Year Built'} ranges={yearBuiltRanges}
                                                    />
                                                </div>

                                                {/* Amenities */}
                                                <div className="sm:col-span-4">
                                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60" style={{ color: c.text }}>
                                                        <Filter size={14} className="opacity-70" />
                                                        {t('admin.amenities')}
                                                    </label>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {amenitiesList.map(amenity => {
                                                            const isSelected = tempPropFilters.amenities.includes(amenity);
                                                            return (
                                                                <button key={amenity} type="button"
                                                                    onClick={() => {
                                                                        const next = isSelected
                                                                            ? tempPropFilters.amenities.filter(a => a !== amenity)
                                                                            : [...tempPropFilters.amenities, amenity];
                                                                        setTempPropFilters(p => ({ ...p, amenities: next }));
                                                                    }}
                                                                    style={isSelected ? { backgroundColor: c.primary, borderColor: c.primary, color: '#fff' } : { backgroundColor: c.surface, borderColor: c.border, color: c.text }}
                                                                    className="px-2.5 py-1.5 rounded-lg border-2 text-[10px] font-bold transition-all hover:opacity-80 cursor-pointer"
                                                                >
                                                                    {t('amenities.' + amenity, amenity)}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sort & Actions — Sort By uses SelectDropdown */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-dashed" style={{ borderColor: c.border }}>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-50 whitespace-nowrap" style={{ color: c.text }}>{t('admin.sortBy')}</span>
                                                <div className="min-w-[220px]">
                                                    <SelectDropdown
                                                        value={propSort}
                                                        onChange={val => setPropSort(val)}
                                                        options={propSortOptions}
                                                        tokens={tokens}
                                                        minWidth={0}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {hasActivePropertyFilters && (
                                                    <button
                                                        onClick={() => { setTempPropFilters(DEFAULT_PROPERTY_FILTERS); setPropFilters(DEFAULT_PROPERTY_FILTERS); }}
                                                        className="px-6 h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all cursor-pointer hover:bg-red-50"
                                                        style={{ color: '#ef4444', borderColor: '#ef444420' }}
                                                    >
                                                        {t('admin.reset')}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleApplyFilters}
                                                    disabled={loadingTray}
                                                    className="px-10 h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                                                    style={{ backgroundColor: c.primary }}
                                                >
                                                    {t('admin.applyFilters')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {activeTab === 'properties' && (
                        <div className={`px-6 py-4 flex items-center justify-between border-b border-dashed ${language === 'ar' ? 'flex-row-reverse' : ''}`} style={{ borderColor: c.border, backgroundColor: c.bg + '20' }}>
                            <div className="flex items-center gap-2">
                                <Filter size={14} style={{ color: c.primary }} className="opacity-60" />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: c.text }}>{t('admin.propertiesMonitoring')}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border" style={{ backgroundColor: c.surface, color: c.primary, borderColor: c.border }}>
                                {t('admin.resultsFound', { count: totalPropResults.toLocaleString() })}
                            </div>
                        </div>
                    )}

                    {/* Table Container */}
                    <div className="overflow-x-auto relative">
                        {loadingTray ? (
                            <div className="p-4">
                                <TableSkeleton
                                    rows={10}
                                    cols={activeTab === 'users' ? 4 : 5}
                                    colWidths={activeTab === 'users' ? ['35%', '20%', '20%', '25%'] : ['30%', '20%', '15%', '15%', '20%']}
                                />
                            </div>
                        ) : (
                            <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse min-w-[800px]`}>
                                <thead>
                                    <tr style={{ backgroundColor: c.bg + '40', borderColor: c.border }} className="border-b">
                                        <th className="px-4 md:px-6 py-4 w-10">
                                            <div
                                                onClick={() => {
                                                    const isAllSelected = activeTab === 'users'
                                                        ? (selectedUserIds.length === sortedUsers.length && sortedUsers.length > 0)
                                                        : (selectedPropertyIds.length === sortedProperties.length && sortedProperties.length > 0);
                                                    activeTab === 'users' ? handleSelectAllUsers(!isAllSelected) : handleSelectAllProperties(!isAllSelected);
                                                }}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:bg-primary/5 active:scale-95"
                                                style={{ color: c.primary }}
                                            >
                                                {(activeTab === 'users'
                                                    ? (selectedUserIds.length > 0 && selectedUserIds.length === sortedUsers.filter(u => u.role !== 'admin').length)
                                                    : (selectedPropertyIds.length === sortedProperties.length && sortedProperties.length > 0)) ? <CheckSquare size={18} /> : <Square size={18} className="opacity-40" />}
                                            </div>
                                        </th>
                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-100 transition-all group" style={{ color: c.textSub }} onClick={() => handleSort(activeTab === 'users' ? 'name' : 'title')}>
                                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100">{t('admin.entry')}{getSortIcon(activeTab === 'users' ? 'name' : 'title')}</div>
                                        </th>

                                        <th className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-100 transition-all group" style={{ color: c.textSub }} onClick={() => handleSort(activeTab === 'users' ? 'role' : 'price')}>
                                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100">{activeTab === 'users' ? t('admin.role') : t('admin.financials')}{getSortIcon(activeTab === 'users' ? 'role' : 'price')}</div>
                                        </th>
                                        <th className="table-cell px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-100 transition-all group" style={{ color: c.textSub }} onClick={() => handleSort(activeTab === 'users' ? 'listings' : 'location')}>
                                            <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100">{activeTab === 'users' ? t('admin.listings') : t('admin.geography')}{getSortIcon(activeTab === 'users' ? 'listings' : 'location')}</div>
                                        </th>
                                        {activeTab === 'properties' && (
                                            <th className="table-cell px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:opacity-100 transition-all group" style={{ color: c.textSub }} onClick={() => handleSort('owner')}>
                                                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100">{t('admin.owner')}{getSortIcon('owner')}</div>
                                            </th>
                                        )}
                                        <th className={`px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest ${language === 'ar' ? 'text-left' : 'text-right'}`} style={{ color: c.textSub }}>
                                            <span className="opacity-50">{t('admin.actionsHeader')}</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="wait">
                                        {activeTab === 'users'
                                            ? sortedUsers.map((user, i) => {
                                                const seed = AVATAR_SEEDS[i % AVATAR_SEEDS.length];
                                                const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.user;
                                                const isExpanded = expandedUserId === user._id;

                                                // Resilient phone and listing count calculation
                                                const userPhone = user.phone || user.agentProfile?.phone;
                                                const listingCount = user.listingCount ?? 0;
                                                const hasListings = listingCount > 0;
                                                const showingMore = showMoreListingsSet.has(user._id);
                                                const trayInfo = userPropertiesCache[user._id] || { data: [], total: 0 };
                                                const cachedProps = trayInfo.data;
                                                const totalResults = trayInfo.total;

                                                return (
                                                    <React.Fragment key={user._id}>
                                                        <motion.tr exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                                                            style={{ borderColor: c.border }} className={`border-b last:border-b-0 hover:brightness-95 transition-all ${isExpanded ? 'bg-primary/5' : ''}`}
                                                        >
                                                            <td className="px-4 md:px-6 py-4">
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (user.role !== 'admin') handleSelectUser(user._id);
                                                                    }}
                                                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${user.role === 'admin' ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-primary/5 active:scale-95'}`}
                                                                    style={{ color: user.role === 'admin' ? c.textSub : c.primary }}
                                                                >
                                                                    {user.role === 'admin' ? (
                                                                        <Shield size={16} className="opacity-30" />
                                                                    ) : (
                                                                        selectedUserIds.includes(user._id) ? <CheckSquare size={18} /> : <Square size={18} className="opacity-20 hover:opacity-50" />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 md:px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <UserAvatar
                                                                        user={user}
                                                                        size="sm"
                                                                        showHoverEffect={false}
                                                                    />

                                                                    <div>
                                                                        <div className="font-bold text-sm" style={{ color: c.text }}>{user.firstName} {user.lastName}</div>
                                                                        <div style={{ color: c.textSub }} className="text-[10px] font-mono flex flex-col gap-0.5 mt-1 opacity-70">
                                                                            <a
                                                                                href={`mailto:${user.email}`}
                                                                                onClick={e => e.stopPropagation()}
                                                                                className="hover:opacity-100 hover:underline transition-opacity cursor-pointer"
                                                                                style={{ color: c.textSub }}
                                                                            >
                                                                                {user.email}
                                                                            </a>
                                                                            {userPhone && (
                                                                                <button
                                                                                    onClick={e => { e.stopPropagation(); handlePhoneClick(userPhone, `${user.firstName} ${user.lastName}`, user.country || 'EG'); }}
                                                                                    className="text-left font-mono text-[10px] hover:opacity-100 hover:underline transition-opacity cursor-pointer bg-transparent border-none p-0"
                                                                                    style={{ color: c.textSub }}
                                                                                    dir="ltr"
                                                                                >
                                                                                    {displayFormattedPhone(userPhone, user.country || 'EG')}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 md:px-6 py-4">
                                                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: roleStyle.bg, color: roleStyle.color }}>
                                                                    {t('about.roles.' + user.role.toLowerCase(), user.role)}
                                                                </span>
                                                            </td>
                                                            <td className="table-cell px-4 md:px-6 py-4">
                                                                <button
                                                                    onClick={() => hasListings && handleToggleExpandUser(user)}
                                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border ${hasListings ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-35'}`}
                                                                    style={isExpanded ? { backgroundColor: c.primary, color: 'white', borderColor: c.primary } : hasListings ? { backgroundColor: c.bg, color: c.text, borderColor: c.border } : { backgroundColor: c.bg, color: c.textSub, borderColor: c.border }}
                                                                    disabled={!hasListings}
                                                                    title={hasListings ? t('admin.viewListings') : t('admin.noListingsTitle')}
                                                                >
                                                                    <Home size={14} />
                                                                    <span className="font-bold text-xs">
                                                                        {listingCount}
                                                                        <span className={`hidden sm:inline ${language === 'ar' ? 'mr-1' : 'ml-1'}`}>{listingCount === 1 ? t('admin.property') : t('admin.properties')}</span>
                                                                    </span>
                                                                    {hasListings && <ChevronRight size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />}
                                                                </button>
                                                            </td>
                                                            <td className={`px-4 md:px-6 py-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                                                                <div className="flex justify-end gap-2 min-w-[100px]">
                                                                    {user.role !== 'admin' && (
                                                                        <>
                                                                            <button onClick={() => handlePromoteToAdmin(user._id, `${user.firstName} ${user.lastName}`)} className="p-2 rounded-xl transition-all hover:scale-110 cursor-pointer" style={{ color: '#10b981', backgroundColor: '#ecfdf5' }} title={t('admin.makeAdmin')}>
                                                                                <Shield size={15} />
                                                                            </button>
                                                                            <button onClick={() => handleDeleteUser(user._id, `${user.firstName} ${user.lastName}`)} className="p-2 rounded-xl transition-all hover:scale-110 cursor-pointer" style={{ color: '#E24B4A', backgroundColor: '#FCEBEB' }} title={t('admin.deleteUser')}>
                                                                                <Trash2 size={15} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </motion.tr>

                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ backgroundColor: c.bg + '40' }}>
                                                                    <td colSpan="5" className="px-6 py-4 bg-primary/5">
                                                                        {loadingTray && userPropertiesCache[user._id] === undefined ? (
                                                                            <div className="flex items-center justify-center py-8 gap-3">
                                                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: c.primary }}></div>
                                                                                <span className="text-sm font-bold opacity-50">{t('admin.fetchingListings')}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-col gap-6">
                                                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-[2rem] shadow-xl border transition-all"
                                                                                    style={{ backgroundColor: c.surface, borderColor: c.border + '40', boxShadow: `0 20px 40px -15px ${c.primary}10` }}>
                                                                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                                                                        <div className="flex items-center gap-4">
                                                                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style={{ backgroundColor: c.primary + '10', color: c.primary }}>
                                                                                                <BarChart3 size={24} />
                                                                                            </div>
                                                                                            <div className="flex flex-col">
                                                                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50" style={{ color: c.textSub }}>{t('admin.adminInsights')}</span>
                                                                                                <h4 className="text-lg font-bold tracking-tight" style={{ color: c.text }} dir="auto">{language === 'ar' ? `${t('admin.listings')} ${user.firstName}` : `${user.firstName}'s ${t('admin.listings')}`}</h4>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="hidden md:block h-10 w-px bg-border/40" />
                                                                                        <div className="flex-1 flex items-center gap-3 border rounded-2xl px-4 py-2.5 group transition-all focus-within:ring-2 focus-within:ring-primary/20"
                                                                                            style={{ backgroundColor: c.bg + '40', borderColor: c.border }}>
                                                                                            <Search size={16} style={{ color: c.primary }} className="opacity-30 group-focus-within:opacity-100 transition-opacity" />
                                                                                            <input
                                                                                                type="text"
                                                                                                placeholder={t('admin.searchListings')}
                                                                                                className="bg-transparent border-none outline-none text-sm w-full font-bold placeholder:opacity-30"
                                                                                                style={{ color: c.text }}
                                                                                                value={userPropSearch}
                                                                                                onChange={e => setUserPropSearch(e.target.value)}
                                                                                                onKeyDown={e => e.key === 'Enter' && handleSearchUserProperties(user._id)}
                                                                                            />
                                                                                        </div>
                                                                                        <button onClick={() => handleSearchUserProperties(user._id)} className="w-full md:w-auto h-12 px-8 rounded-2xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg cursor-pointer" style={{ backgroundColor: c.primary, color: '#fff', boxShadow: `0 10px 25px -8px ${c.primary}60` }}>
                                                                                            {t('admin.search')}
                                                                                        </button>
                                                                                    </div>
                                                                                    <div className="px-4 py-2 rounded-2xl border flex items-center gap-3" style={{ backgroundColor: c.primary + '05', borderColor: c.primary + '20' }}>
                                                                                        <div className={`flex flex-col ${language === 'ar' ? 'items-start' : 'items-end'}`}>
                                                                                            <span className="text-[9px] font-bold uppercase opacity-60" style={{ color: c.textSub }}>{t('admin.totalRecords')}</span>
                                                                                            <span className="text-sm font-bold" style={{ color: c.primary }}>{totalResults.toLocaleString()}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {cachedProps.length > 0 ? (
                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                                        {cachedProps.slice(0, showingMore ? 100 : 15).map(prop => (
                                                                                            <div key={prop._id} className="flex items-center gap-3 p-3 rounded-2xl border shadow-sm group/prop cursor-pointer transition-all hover:scale-[1.02] relative"
                                                                                                style={{ backgroundColor: c.surface, borderColor: c.border }} onClick={() => window.open(`/property/${prop._id}`, '_blank')}>
                                                                                                <div className="relative overflow-hidden rounded-xl shrink-0">
                                                                                                    <img
                                                                                                        src={prop.images?.[0] || 'https://via.placeholder.com/60'}
                                                                                                        className="w-16 h-12 object-cover transition-transform group-hover/prop:scale-110"
                                                                                                        alt=""
                                                                                                        style={{
                                                                                                            imageRendering: 'auto',
                                                                                                            WebkitBackfaceVisibility: 'hidden',
                                                                                                            backfaceVisibility: 'hidden',
                                                                                                            transform: 'translateZ(0)'
                                                                                                        }}
                                                                                                    />
                                                                                                    <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                                                                                                        {prop.isVerified && <CheckCircle size={10} className="text-emerald-500 bg-white rounded-full" />}
                                                                                                        {prop.isFeatured && <Star size={10} className="text-amber-500 bg-white rounded-full fill-amber-500" />}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="font-bold text-xs truncate" style={{ color: c.text }}>{prop.title}</div>
                                                                                                    <div className="font-bold text-[11px] mt-1" style={{ color: c.primary }}>{formatPrice(prop.price)}</div>
                                                                                                </div>
                                                                                                <div className="flex flex-col gap-1 shrink-0">
                                                                                                    <button onClick={(e) => { e.stopPropagation(); handleToggleFeatured(prop._id); }} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ backgroundColor: prop.isFeatured ? '#FAEEDA' : c.bg, color: prop.isFeatured ? '#BA7517' : c.textSub }} title={prop.isFeatured ? t('admin.removeFeature') : t('admin.markFeature')}>
                                                                                                        <Star size={12} fill={prop.isFeatured ? '#BA7517' : 'none'} />
                                                                                                    </button>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); handleVerifyProperty(prop._id); }} className="p-1.5 rounded-lg transition-colors cursor-pointer" style={{ backgroundColor: prop.isVerified ? '#E1F5EE' : c.bg, color: prop.isVerified ? '#085041' : c.textSub }} title={prop.isVerified ? t('admin.revokeVerify') : t('admin.verifyProperty')}>
                                                                                                        <ShieldCheck size={12} />
                                                                                                    </button>
                                                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteProperty(prop._id, prop.title, user._id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                                                                                                        <Trash2 size={12} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="py-8 text-center rounded-2xl border border-dashed" style={{ backgroundColor: c.bg + '40', borderColor: c.border }}>
                                                                                        <Home size={24} className="mx-auto mb-2" style={{ color: c.textSub, opacity: 0.2 }} />
                                                                                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: c.textSub, opacity: 0.4 }}>{t('admin.noListings')}</p>
                                                                                    </div>
                                                                                )}

                                                                                {cachedProps.length > 15 && !showingMore && (
                                                                                    <button onClick={() => toggleShowMore(user._id)} className="mx-auto px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all hover:scale-105 cursor-pointer" style={{ borderColor: c.border, color: c.primary, backgroundColor: c.surface }}>
                                                                                        {t('admin.showMore', { count: Math.min(cachedProps.length, 100) - 15 })}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </motion.tr>
                                                            )}
                                                        </AnimatePresence>
                                                    </React.Fragment>
                                                );
                                            })
                                            : sortedProperties.map((prop) => (
                                                <motion.tr key={prop._id} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                                                    style={{ borderColor: c.border }} className="border-b last:border-b-0 hover:brightness-95 transition-all">
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div
                                                            onClick={() => handleSelectProperty(prop._id)}
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:bg-primary/5 active:scale-95"
                                                            style={{ color: c.primary }}
                                                        >
                                                            {selectedPropertyIds.includes(prop._id) ? <CheckSquare size={18} /> : <Square size={18} className="opacity-20 hover:opacity-50" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">

                                                        <div className="flex items-center gap-3">
                                                            <div className="relative shrink-0">
                                                                <img
                                                                    src={prop.images?.[0] || 'https://via.placeholder.com/48'}
                                                                    alt=""
                                                                    className="w-12 h-10 rounded-xl object-cover cursor-pointer"
                                                                    style={{
                                                                        borderColor: c.border,
                                                                        border: `1px solid ${c.border}`,
                                                                        imageRendering: 'auto',
                                                                        WebkitBackfaceVisibility: 'hidden',
                                                                        backfaceVisibility: 'hidden',
                                                                        transform: 'translateZ(0)'
                                                                    }}
                                                                    onClick={() => window.open(`/property/${prop._id}`, '_blank')}
                                                                />
                                                                {prop.isVerified && <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm"><CheckCircle size={8} strokeWidth={4} /></div>}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm line-clamp-1 max-w-[200px] cursor-pointer hover:text-primary transition-colors mt-1" style={{ color: c.text }} onClick={() => window.open(`/property/${prop._id}`, '_blank')}>
                                                                    {prop.title}
                                                                </div>
                                                                <div style={{ color: c.textSub }} className="text-[10px] font-mono flex flex-col gap-0.5 mt-0.5 opacity-60">
                                                                    <span>ID: {prop._id.slice(-6)} · {prop.isVerified ? t('admin.verified') : t('admin.notVerified')}</span>
                                                                    <span className="md:hidden font-bold" style={{ color: c.primary }}>{t('admin.owner')}: {prop.owner?.firstName} {prop.owner?.lastName}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <div className="font-bold text-sm" style={{ color: c.primary }}>{formatPrice(prop.price)}</div>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-primary/20" style={{ backgroundColor: c.primary + '10' }}>
                                                                <Maximize size={10} style={{ color: c.primary }} />
                                                                <span style={{ color: c.primary }} className="text-[10px] font-bold">{prop.area} {language === 'ar' ? 'م²' : 'm²'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-primary/20" style={{ backgroundColor: c.primary + '10' }}>
                                                                <Bed size={10} style={{ color: c.primary }} />
                                                                <span className="text-[10px] font-bold" style={{ color: c.primary }}>{prop.bedrooms}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-primary/20" style={{ backgroundColor: c.primary + '10' }}>
                                                                <Bath size={10} style={{ color: c.primary }} />
                                                                <span className="text-[10px] font-bold" style={{ color: c.primary }}>{prop.bathrooms}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="table-cell px-4 md:px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full w-fit" style={{ backgroundColor: '#FAEEDA', color: '#633806' }}>
                                                                {t('districts.' + prop.district, prop.district)}
                                                            </span>
                                                            <span style={{ color: c.textSub }} className="text-xs truncate max-w-[120px]">{t('locations.' + prop.location, prop.location)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="table-cell px-4 md:px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <UserAvatar
                                                                user={prop.owner}
                                                                size="sm"
                                                                showHoverEffect={false}
                                                            />
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="text-xs font-bold leading-tight truncate max-w-[100px]" style={{ color: c.text }}>{prop.owner ? `${prop.owner.firstName} ${prop.owner.lastName}` : t('admin.unknown')}</span>
                                                                {prop.owner?.email && (
                                                                    <a
                                                                        href={`mailto:${prop.owner.email}`}
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="text-[9px] truncate max-w-[100px] opacity-70 hover:opacity-100 hover:underline transition-opacity cursor-pointer"
                                                                        style={{ color: c.textSub }}
                                                                    >
                                                                        {prop.owner.email}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-4 md:px-6 py-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                                                        <div className="flex items-center justify-end gap-2 sm:min-w-[140px]">
                                                            <button onClick={() => handleToggleFeatured(prop._id)} className="p-2.25 rounded-xl transition-all hover:scale-110 cursor-pointer shadow-sm" style={prop.isFeatured ? { color: '#BA7517', backgroundColor: '#FAEEDA', border: '1px solid #FAC775' } : { color: c.textSub, backgroundColor: c.bg, border: `1px solid ${c.border}` }} title={prop.isFeatured ? t('admin.removeFeature') : t('admin.markFeature')}>
                                                                <Star size={16} fill={prop.isFeatured ? '#BA7517' : 'none'} strokeWidth={prop.isFeatured ? 2.5 : 2} />
                                                            </button>
                                                            <button onClick={() => handleVerifyProperty(prop._id)} className="p-2.25 rounded-xl transition-all hover:scale-110 cursor-pointer shadow-sm" style={prop.isVerified ? { color: '#085041', backgroundColor: '#E1F5EE', border: '1px solid #9FE1CB' } : { color: c.textSub, backgroundColor: c.bg, border: `1px solid ${c.border}` }} title={prop.isVerified ? t('admin.revokeVerify') : t('admin.verifyProperty')}>
                                                                <ShieldCheck size={16} strokeWidth={prop.isVerified ? 2.5 : 2} />
                                                            </button>
                                                            <button onClick={() => handleDeleteProperty(prop._id, prop.title)} className="p-2.25 rounded-xl transition-all hover:scale-110 cursor-pointer shadow-sm" style={{ color: '#E24B4A', backgroundColor: '#FCEBEB', border: '1px solid #F5C4B3' }} title={t('admin.deleteListing')}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        }
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        )}

                        {activeTab === 'properties' && hasMoreProps && properties.length >= 100 && (
                            <div className="p-8 border-t flex justify-center" style={{ borderColor: c.border }}>
                                <button onClick={handleLoadMoreProperties} className="px-8 py-3 rounded-2xl font-bold uppercase tracking-widest transition-all hover:scale-105 cursor-pointer shadow-lg flex items-center gap-3" style={{ backgroundColor: c.primary, color: '#fff', boxShadow: `0 10px 25px -8px ${c.primary}60` }} disabled={loadingTray}>
                                    {loadingTray ? (
                                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{t('common.loading')}</>
                                    ) : (
                                        <><RefreshCw size={16} />{t('admin.actions.loadMore')}</>
                                    )}
                                </button>
                            </div>
                        )}

                        {(activeTab === 'users' ? filteredUsers : filteredProperties).length === 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 flex flex-col items-center gap-3" style={{ color: c.textSub }}>
                                <Search size={36} className="opacity-20" />
                                <p className="font-bold text-sm">{t('admin.noResults')}</p>
                                <p className="text-xs opacity-60">{t('admin.noResultsSub')}</p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Batch Action Bar */}
            <AnimatePresence>
                {((activeTab === 'users' && selectedUserIds.length > 0) || (activeTab === 'properties' && selectedPropertyIds.length > 0)) && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-8 py-4 rounded-[2rem] shadow-2xl border backdrop-blur-xl"
                        style={{
                            backgroundColor: c.surface + 'CC',
                            borderColor: c.primary + '40',
                            boxShadow: `0 20px 50px -15px ${c.primary}40`
                        }}
                    >
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: c.textSub }}>{t('admin.batchAction')}</span>
                            <span className="text-sm font-bold" style={{ color: c.primary }}>
                                {activeTab === 'users'
                                    ? t('admin.selectedUsersCount', { count: selectedUserIds.length })
                                    : t('admin.selectedPropertiesCount', { count: selectedPropertyIds.length })}
                            </span>
                        </div>
                        <div className="h-8 w-px bg-border/20" />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => activeTab === 'users' ? setSelectedUserIds([]) : setSelectedPropertyIds([])}
                                className="px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all hover:bg-black/5 cursor-pointer"
                                style={{ color: c.textSub }}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={activeTab === 'users' ? handleBatchDeleteUsers : handleBatchDeleteProperties}
                                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                                style={{
                                    backgroundColor: '#E24B4A',
                                    color: '#fff',
                                    boxShadow: '0 8px 15px -5px rgba(226, 75, 74, 0.4)'
                                }}
                            >
                                <Trash2 size={14} />
                                {t('admin.actions.deleteSelected')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};


export default AdminDashboard;
