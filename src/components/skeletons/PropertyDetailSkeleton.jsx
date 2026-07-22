import React from 'react';
import Skeleton from '../Skeleton';
import { useTheme } from '../../theme/useTheme';
import { designTokens } from '../../theme/tokens';

const PropertyDetailSkeleton = () => {
    const { themeName } = useTheme();
    const tokens = designTokens[themeName];
    const c = tokens.colors;

    return (
        <div className="min-h-screen pb-20 w-full overflow-x-hidden">
            {/* ── HERO SKELETON ── */}
            <div className="relative h-[45vh] sm:h-[50vh] lg:h-[65vh] w-full mt-[0px] bg-bg/50 overflow-hidden">
                <Skeleton height="100%" borderRadius="0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-8">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex gap-2 mb-4">
                            <Skeleton width="100px" height="24px" borderRadius="4px" />
                            <Skeleton width="100px" height="24px" borderRadius="4px" />
                        </div>
                        <Skeleton width="70%" height="48px" className="mb-4" />
                        <Skeleton width="30%" height="24px" />
                    </div>
                </div>
            </div>

            {/* ── BODY SKELETON ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Key Stats */}
                        <div className="grid grid-cols-3 py-8 rounded-3xl border shadow-sm" style={{ borderColor: c.border }}>
                            <div className="flex flex-col items-center border-r space-y-2" style={{ borderColor: c.border }}>
                                <Skeleton width="24px" height="24px" />
                                <Skeleton width="40px" height="20px" />
                            </div>
                            <div className="flex flex-col items-center border-r space-y-2" style={{ borderColor: c.border }}>
                                <Skeleton width="24px" height="24px" />
                                <Skeleton width="40px" height="20px" />
                            </div>
                            <div className="flex flex-col items-center space-y-2">
                                <Skeleton width="24px" height="24px" />
                                <Skeleton width="40px" height="20px" />
                            </div>
                        </div>

                        {/* Detail Chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="p-4 rounded-2xl border space-y-2" style={{ borderColor: c.border }}>
                                    <Skeleton width="40px" height="10px" />
                                    <Skeleton width="70%" height="16px" />
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div className="p-8 rounded-3xl border space-y-6" style={{ borderColor: c.border }}>
                            <Skeleton width="180px" height="28px" />
                            <div className="space-y-3">
                                <Skeleton height="16px" />
                                <Skeleton height="16px" />
                                <Skeleton height="16px" />
                                <Skeleton width="80%" height="16px" />
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="p-8 rounded-3xl border space-y-6" style={{ borderColor: c.border }}>
                            <Skeleton width="150px" height="28px" />
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <Skeleton key={i} height="80px" borderRadius="16px" />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Price Card */}
                        <div className="p-8 rounded-3xl border shadow-sm sticky top-28" style={{ backgroundColor: c.surface, borderColor: c.border }}>
                            <Skeleton width="40px" height="12px" className="mb-4" />
                            <Skeleton width="70%" height="48px" className="mb-10" />
                            <div className="space-y-4">
                                <Skeleton height="56px" borderRadius="16px" />
                                <Skeleton height="56px" borderRadius="16px" />
                            </div>
                        </div>

                        {/* Agent Card Proxy */}
                        <div className="p-8 rounded-3xl border space-y-6" style={{ backgroundColor: c.surface, borderColor: c.border }}>
                            <div className="flex items-center gap-4">
                                <Skeleton width="56px" height="56px" borderRadius="16px" />
                                <div className="space-y-2">
                                    <Skeleton width="120px" height="18px" />
                                    <Skeleton width="80px" height="14px" />
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t" style={{ borderColor: c.border }}>
                                <Skeleton height="50px" borderRadius="12px" />
                                <Skeleton height="50px" borderRadius="12px" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyDetailSkeleton;
